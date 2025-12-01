/**
 * Visit Controller MongoDB Integration Tests
 * Tests the MongoDB-first approach for getVisitsByPatient
 */

const request = require('supertest');
const express = require('express');
const visitController = require('../src/controllers/visitController');

// Mock the models
jest.mock('../src/models/Visit');
jest.mock('../src/config/database');

const Visit = require('../src/models/Visit');
const { executeQuery } = require('../src/config/database');

const app = express();
app.use(express.json());

// Add route for testing
app.get('/api/visits/patient/:patientId', visitController.getVisitsByPatient);

describe('Visit Controller - MongoDB Priority', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/visits/patient/:patientId', () => {
    it('should return MongoDB visits when available', async () => {
      const mockMongoVisits = [
        {
          _id: 'visit-1',
          patientId: 'patient-123',
          patientName: 'John Doe',
          nurseId: 'nurse-1',
          nurseName: 'Anna Virtanen',
          scheduledTime: new Date('2025-11-30T10:00:00Z'),
          status: 'planned',
          taskCompletions: [
            {
              taskId: 'task-1',
              taskTitle: 'Blood Pressure Check',
              taskCategory: 'vital_signs',
              priority: 'high',
              completed: false
            },
            {
              taskId: 'task-2',
              taskTitle: 'Medication Administration',
              taskCategory: 'medication',
              priority: 'high',
              completed: false
            }
          ]
        },
        {
          _id: 'visit-2',
          patientId: 'patient-123',
          patientName: 'John Doe',
          nurseId: 'nurse-1',
          nurseName: 'Anna Virtanen',
          scheduledTime: new Date('2025-11-30T14:00:00Z'),
          status: 'completed',
          taskCompletions: [
            {
              taskId: 'task-3',
              taskTitle: 'Vital Signs Check',
              completed: true,
              completedAt: new Date('2025-11-30T14:05:00Z')
            }
          ]
        }
      ];

      // Mock MongoDB query
      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMongoVisits)
      });
      Visit.countDocuments.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/visits/patient/patient-123')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].taskCompletions).toHaveLength(2);
      expect(response.body.data[0].taskCompletions[0].taskTitle).toBe('Blood Pressure Check');
      expect(response.body.data[1].taskCompletions).toHaveLength(1);
      expect(response.body.pagination.total).toBe(2);
      
      // Verify MongoDB was queried
      expect(Visit.find).toHaveBeenCalledWith({ patientId: 'patient-123' });
      
      // Verify MySQL was NOT queried (MongoDB had data)
      expect(executeQuery).not.toHaveBeenCalled();
    });

    it('should fallback to MySQL when MongoDB has no data', async () => {
      const mockMySQLVisits = [
        {
          id: 'visit-1',
          patient_id: 'patient-123',
          patient_name: 'John Doe',
          nurse_id: 'nurse-1',
          nurse_name: 'Anna Virtanen',
          scheduled_time: '2025-11-30 10:00:00',
          status: 'planned'
        }
      ];

      // Mock MongoDB returns empty
      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });
      Visit.countDocuments.mockResolvedValue(0);

      // Mock MySQL query
      executeQuery.mockResolvedValueOnce(mockMySQLVisits);
      executeQuery.mockResolvedValueOnce([{ total: 1 }]);

      const response = await request(app)
        .get('/api/visits/patient/patient-123')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].patient_id).toBe('patient-123');
      expect(response.body.pagination.total).toBe(1);
      
      // Verify MongoDB was tried first
      expect(Visit.find).toHaveBeenCalled();
      
      // Verify MySQL was queried as fallback
      expect(executeQuery).toHaveBeenCalled();
    });

    it('should handle MongoDB errors and fallback to MySQL', async () => {
      const mockMySQLVisits = [
        {
          id: 'visit-1',
          patient_id: 'patient-123',
          patient_name: 'John Doe',
          scheduled_time: '2025-11-30 10:00:00',
          status: 'planned'
        }
      ];

      // Mock MongoDB throws error
      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('MongoDB connection failed'))
      });

      // Mock MySQL query
      executeQuery.mockResolvedValueOnce(mockMySQLVisits);
      executeQuery.mockResolvedValueOnce([{ total: 1 }]);

      const response = await request(app)
        .get('/api/visits/patient/patient-123')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      
      // Verify fallback to MySQL worked
      expect(executeQuery).toHaveBeenCalled();
    });

    it('should include taskCompletions in MongoDB visits', async () => {
      const mockVisit = {
        _id: 'visit-1',
        patientId: 'patient-123',
        patientName: 'John Doe',
        taskCompletions: [
          {
            taskId: 'task-1',
            taskType: 'template',
            taskTitle: 'Verify patient identity',
            taskCategory: 'assessment',
            priority: 'high',
            completed: false,
            notes: ''
          },
          {
            taskId: 'task-2',
            taskType: 'template',
            taskTitle: 'Check medication orders',
            taskCategory: 'medication',
            priority: 'high',
            completed: false,
            notes: ''
          },
          {
            taskId: 'task-3',
            taskType: 'patient_specific',
            taskTitle: 'Monitor blood sugar',
            taskCategory: 'care_plan',
            priority: 'critical',
            completed: false,
            notes: 'Patient is diabetic'
          }
        ]
      };

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockVisit])
      });
      Visit.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/visits/patient/patient-123')
        .expect(200);

      const visit = response.body.data[0];
      expect(visit.taskCompletions).toHaveLength(3);
      expect(visit.taskCompletions[0].taskTitle).toBe('Verify patient identity');
      expect(visit.taskCompletions[1].taskCategory).toBe('medication');
      expect(visit.taskCompletions[2].priority).toBe('critical');
    });

    it('should handle pagination correctly', async () => {
      const mockVisits = Array.from({ length: 5 }, (_, i) => ({
        _id: `visit-${i}`,
        patientId: 'patient-123',
        patientName: 'John Doe',
        scheduledTime: new Date(),
        taskCompletions: []
      }));

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockVisits)
      });
      Visit.countDocuments.mockResolvedValue(15);

      const response = await request(app)
        .get('/api/visits/patient/patient-123?page=2&limit=5')
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination).toEqual({
        total: 15,
        page: 2,
        limit: 5,
        pages: 3,
        hasNext: true,
        hasPrev: true
      });
    });
  });
});

module.exports = {};
