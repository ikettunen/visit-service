const request = require('supertest');
const express = require('express');
const visitController = require('../src/controllers/visitController');

// Mock the models
jest.mock('../src/models/Encounter');
jest.mock('../src/models/VisitTask');
jest.mock('../src/models/Visit');

const Encounter = require('../src/models/Encounter');
const VisitTask = require('../src/models/VisitTask');
const Visit = require('../src/models/Visit');

const app = express();
app.use(express.json());

// Add routes manually for testing
app.get('/api/visits', visitController.getVisits);
app.get('/api/visits/:id', visitController.getVisitById);
app.post('/api/visits', visitController.createVisit);
app.put('/api/visits/:id/start', visitController.startVisit);

describe('Visit Controller Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/visits', () => {
    it('should return paginated visits with task completion data', async () => {
      const mockVisits = [
        {
          _id: 'visit-1',
          patientId: 'P123',
          patientName: 'John Doe',
          status: 'planned',
          nurseId: 'N123',
          scheduledTime: new Date()
        }
      ];

      // Mock the MongoDB Visit.find chain
      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockVisits)
      });
      Visit.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/visits')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].patientId).toBe('P123');
    });

    it('should handle database errors', async () => {
      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const response = await request(app)
        .get('/api/visits')
        .expect(500);

      expect(response.body.error.code).toBe('FETCH_VISITS_ERROR');
    });
  });

  describe('POST /api/visits', () => {
    it('should create a new visit successfully', async () => {
      const visitData = {
        patient_id: 'P123',
        patient_name: 'John Doe',
        scheduled_time: '2024-01-15T10:00:00Z'
      };

      const mockEncounter = {
        id: 'visit-123',
        ...visitData,
        save: jest.fn().mockResolvedValue()
      };

      // Mock constructor
      Encounter.mockImplementation(() => mockEncounter);
      Encounter.findById.mockResolvedValue(mockEncounter);
      VisitTask.findByVisitId.mockResolvedValue([]);
      VisitTask.getCompletionStats.mockResolvedValue({ total_tasks: 0, completed_tasks: 0, completion_percentage: 0 });
      Visit.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/visits')
        .send(visitData)
        .expect(201);

      expect(response.body.message).toBe('Visit created successfully');
      expect(mockEncounter.save).toHaveBeenCalled();
    });

    it('should return validation error for missing required fields', async () => {
      const invalidData = {
        patient_name: 'John Doe'
        // Missing patient_id and scheduled_time
      };

      const response = await request(app)
        .post('/api/visits')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/visits/:id/start', () => {
    it('should start visit successfully', async () => {
      const mockEncounter = {
        id: 'visit-123',
        start: jest.fn().mockResolvedValue(),
        start_time: new Date()
      };

      Encounter.findById.mockResolvedValue(mockEncounter);
      Visit.findOneAndUpdate.mockResolvedValue();
      VisitTask.findByVisitId.mockResolvedValue([]);
      VisitTask.getCompletionStats.mockResolvedValue({ total_tasks: 0, completed_tasks: 0, completion_percentage: 0 });
      Visit.findOne.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/visits/visit-123/start')
        .expect(200);

      expect(response.body.message).toBe('Visit started successfully');
      expect(mockEncounter.start).toHaveBeenCalled();
    });

    it('should return 404 when visit not found', async () => {
      Encounter.findById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/visits/nonexistent/start')
        .expect(404);

      expect(response.body.error.code).toBe('VISIT_NOT_FOUND');
    });
  });
});