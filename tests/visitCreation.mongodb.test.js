/**
 * Visit Creation with MongoDB and TaskCompletions Tests
 * Tests the enhanced createVisit that creates in both MySQL and MongoDB
 */

const request = require('supertest');
const express = require('express');
const visitController = require('../src/controllers/visitController');

// Mock the models
jest.mock('../src/models/Encounter');
jest.mock('../src/models/Visit');
jest.mock('../src/models/VisitTask');

const Encounter = require('../src/models/Encounter');
const Visit = require('../src/models/Visit');
const VisitTask = require('../src/models/VisitTask');

// Mock auth middleware
jest.mock('../src/middleware/auth', () => ({
  authenticateJWT: jest.fn((req, res, next) => {
    req.user = { id: 'N12345678', role: 'nurse' };
    next();
  })
}));

const app = express();
app.use(express.json());
app.post('/api/visits', visitController.createVisit);

describe('Visit Creation - MongoDB Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/visits with taskCompletions', () => {
    it('should create visit in both MySQL and MongoDB with tasks', async () => {
      const visitData = {
        patient_id: 'patient-123',
        patient_name: 'John Doe',
        nurse_id: 'nurse-1',
        nurse_name: 'Anna Virtanen',
        scheduled_time: '2025-11-30 10:00:00',
        status: 'planned',
        visit_type: 'Medication Round',
        taskCompletions: [
          {
            taskId: 'task-1',
            taskType: 'template',
            taskTitle: 'Verify patient identity',
            taskCategory: 'assessment',
            priority: 'high',
            completed: false
          },
          {
            taskId: 'task-2',
            taskType: 'template',
            taskTitle: 'Administer medication',
            taskCategory: 'medication',
            priority: 'high',
            completed: false
          }
        ],
        syncStatus: 'synced'
      };

      // Mock MySQL Encounter creation
      const mockEncounter = {
        id: 'visit-uuid-123',
        patient_id: visitData.patient_id,
        patient_name: visitData.patient_name,
        nurse_id: visitData.nurse_id,
        nurse_name: visitData.nurse_name,
        scheduled_time: visitData.scheduled_time,
        status: visitData.status,
        save: jest.fn().mockResolvedValue()
      };
      Encounter.mockImplementation(() => mockEncounter);

      // Mock MongoDB Visit creation
      const mockMongoVisit = {
        _id: 'visit-uuid-123',
        patientId: visitData.patient_id,
        taskCompletions: visitData.taskCompletions,
        save: jest.fn().mockResolvedValue()
      };
      Visit.mockImplementation(() => mockMongoVisit);

      // Mock getCompleteVisitData
      global.getCompleteVisitData = jest.fn().mockResolvedValue({
        ...mockEncounter,
        taskCompletions: visitData.taskCompletions
      });

      const response = await request(app)
        .post('/api/visits')
        .send(visitData)
        .expect(201);

      // Verify MySQL Encounter was created
      expect(Encounter).toHaveBeenCalled();
      expect(mockEncounter.save).toHaveBeenCalled();

      // Verify MongoDB Visit was created with tasks
      expect(Visit).toHaveBeenCalledWith(expect.objectContaining({
        _id: 'visit-uuid-123',
        patientId: visitData.patient_id,
        taskCompletions: visitData.taskCompletions
      }));
      expect(mockMongoVisit.save).toHaveBeenCalled();

      // Verify response includes tasks
      expect(response.body.message).toBe('Visit created successfully');
    });

    it('should create MongoDB record when taskCompletions provided', async () => {
      const visitData = {
        patient_id: 'patient-123',
        patient_name: 'John Doe',
        nurse_id: 'nurse-1',
        nurse_name: 'Anna Virtanen',
        scheduled_time: '2025-11-30 10:00:00',
        taskCompletions: [
          {
            taskId: 'task-1',
            taskTitle: 'Test Task',
            completed: false
          }
        ],
        syncStatus: 'synced'
      };

      const mockEncounter = {
        id: 'visit-123',
        ...visitData,
        save: jest.fn().mockResolvedValue()
      };
      Encounter.mockImplementation(() => mockEncounter);

      const mockMongoVisit = {
        save: jest.fn().mockResolvedValue()
      };
      Visit.mockImplementation(() => mockMongoVisit);

      global.getCompleteVisitData = jest.fn().mockResolvedValue(mockEncounter);

      await request(app)
        .post('/api/visits')
        .send(visitData)
        .expect(201);

      // Verify MongoDB Visit was created because taskCompletions present
      expect(Visit).toHaveBeenCalled();
      expect(mockMongoVisit.save).toHaveBeenCalled();
    });

    it('should handle visit creation from care-plan-scheduler', async () => {
      const schedulerVisitData = {
        patient_id: 'patient-123',
        patient_name: 'John Doe',
        nurse_id: 'nurse-1',
        nurse_name: 'Anna Virtanen',
        scheduled_time: '2025-11-30 10:00:00',
        status: 'planned',
        visit_type: 'Blood Sugar Check',
        taskCompletions: [
          {
            taskId: 'template-id-0',
            taskType: 'template',
            taskTitle: 'Verify patient identity',
            taskCategory: 'assessment',
            priority: 'high',
            completed: false
          },
          {
            taskId: 'template-id-1',
            taskType: 'template',
            taskTitle: 'Prepare glucometer',
            taskCategory: 'preparation',
            priority: 'high',
            completed: false
          },
          {
            taskId: 'template-id-2',
            taskType: 'template',
            taskTitle: 'Perform blood glucose test',
            taskCategory: 'assessment',
            priority: 'high',
            completed: false
          },
          {
            taskId: 'template-id-3',
            taskType: 'template',
            taskTitle: 'Document results',
            taskCategory: 'documentation',
            priority: 'high',
            completed: false
          }
        ],
        visitTemplateId: 'template-id',
        generatedFromCarePlan: true,
        syncStatus: 'synced'
      };

      const mockEncounter = {
        id: 'visit-123',
        save: jest.fn().mockResolvedValue()
      };
      Encounter.mockImplementation(() => mockEncounter);

      const mockMongoVisit = {
        save: jest.fn().mockResolvedValue()
      };
      Visit.mockImplementation(() => mockMongoVisit);

      global.getCompleteVisitData = jest.fn().mockResolvedValue({
        ...mockEncounter,
        taskCompletions: schedulerVisitData.taskCompletions
      });

      const response = await request(app)
        .post('/api/visits')
        .send(schedulerVisitData)
        .expect(201);

      // Verify MongoDB was created with all 4 tasks
      expect(Visit).toHaveBeenCalledWith(expect.objectContaining({
        taskCompletions: expect.arrayContaining([
          expect.objectContaining({ taskTitle: 'Verify patient identity' }),
          expect.objectContaining({ taskTitle: 'Prepare glucometer' }),
          expect.objectContaining({ taskTitle: 'Perform blood glucose test' }),
          expect.objectContaining({ taskTitle: 'Document results' })
        ])
      }));
    });

    it('should validate required fields', async () => {
      const invalidData = {
        patient_name: 'John Doe'
        // Missing patient_id and scheduled_time
      };

      const response = await request(app)
        .post('/api/visits')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Missing required fields');
    });

    it('should handle MongoDB creation failure gracefully', async () => {
      const visitData = {
        patient_id: 'patient-123',
        patient_name: 'John Doe',
        scheduled_time: '2025-11-30 10:00:00',
        taskCompletions: [{ taskId: 'task-1', taskTitle: 'Test', completed: false }],
        syncStatus: 'synced'
      };

      const mockEncounter = {
        id: 'visit-123',
        save: jest.fn().mockResolvedValue()
      };
      Encounter.mockImplementation(() => mockEncounter);

      // Mock MongoDB failure
      const mockMongoVisit = {
        save: jest.fn().mockRejectedValue(new Error('MongoDB connection failed'))
      };
      Visit.mockImplementation(() => mockMongoVisit);

      global.getCompleteVisitData = jest.fn().mockResolvedValue(mockEncounter);

      // Should still succeed (MySQL created, MongoDB failed but logged)
      const response = await request(app)
        .post('/api/visits')
        .send(visitData)
        .expect(201);

      expect(response.body.message).toBe('Visit created successfully');
      // MySQL should still be created
      expect(mockEncounter.save).toHaveBeenCalled();
    });
  });
});

module.exports = {};
