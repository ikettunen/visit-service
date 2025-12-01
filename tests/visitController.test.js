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

// Mock the auth middleware
jest.mock('../src/middleware/auth', () => ({
  authenticateJWT: jest.fn((req, res, next) => {
    req.user = { id: 'N12345678', role: 'nurse' };
    next();
  })
}));

const app = express();
app.use(express.json());

// Add routes manually for testing
app.get('/api/visits', visitController.getVisits);
app.get('/api/visits/:id', visitController.getVisitById);
app.get('/api/visits/nurse/:nurseId/active', visitController.getActiveVisitsByNurse);
app.post('/api/visits', visitController.createVisit);
app.put('/api/visits/:id/start', visitController.startVisit);
app.put('/api/visits/:id/complete', visitController.completeVisit);
app.put('/api/visits/:id/cancel', visitController.cancelVisit);
app.delete('/api/visits/:id', visitController.deleteVisit);

describe('Visit Controller', () => {
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
        nurse_id: 'N123',
        nurse_name: 'Anna Virtanen',
        scheduled_time: '2024-01-15T10:00:00Z',
        status: 'planned',
        visit_type: 'Medication Round'
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

  describe('PUT /api/visits/:id/complete', () => {
    it('should complete visit successfully', async () => {
      const mockEncounter = {
        id: 'visit-123',
        complete: jest.fn().mockResolvedValue(),
        end_time: new Date()
      };

      Encounter.findById.mockResolvedValue(mockEncounter);
      Visit.findOneAndUpdate.mockResolvedValue();
      VisitTask.findByVisitId.mockResolvedValue([]);
      VisitTask.getCompletionStats.mockResolvedValue({ total_tasks: 2, completed_tasks: 2, completion_percentage: 100 });
      Visit.findOne.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/visits/visit-123/complete')
        .expect(200);

      expect(response.body.message).toBe('Visit completed successfully');
      expect(mockEncounter.complete).toHaveBeenCalled();
    });
  });

  describe('PUT /api/visits/:id/cancel', () => {
    it('should cancel visit successfully', async () => {
      const mockEncounter = {
        id: 'visit-123',
        cancel: jest.fn().mockResolvedValue()
      };

      Encounter.findById.mockResolvedValue(mockEncounter);
      Visit.findOneAndUpdate.mockResolvedValue();
      VisitTask.findByVisitId.mockResolvedValue([]);
      VisitTask.getCompletionStats.mockResolvedValue({ total_tasks: 1, completed_tasks: 0, completion_percentage: 0 });
      Visit.findOne.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/visits/visit-123/cancel')
        .expect(200);

      expect(response.body.message).toBe('Visit cancelled successfully');
      expect(mockEncounter.cancel).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/visits/:id', () => {
    it('should delete visit successfully', async () => {
      const mockEncounter = {
        id: 'visit-123',
        delete: jest.fn().mockResolvedValue()
      };

      Encounter.findById.mockResolvedValue(mockEncounter);
      Visit.findOneAndDelete.mockResolvedValue();

      const response = await request(app)
        .delete('/api/visits/visit-123')
        .expect(200);

      expect(response.body.message).toBe('Visit deleted successfully');
      expect(mockEncounter.delete).toHaveBeenCalled();
      expect(Visit.findOneAndDelete).toHaveBeenCalledWith({ _id: 'visit-123' });
    });
  });

  describe('GET /api/visits/nurse/:nurseId/active', () => {
    it('should return only active visits for nurse', async () => {
      const mockVisits = [
        {
          _id: 'visit-1',
          nurseId: 'N12345678',
          patientId: 'P123',
          patientName: 'John Doe',
          status: 'planned',
          scheduledTime: new Date('2024-01-15T10:00:00Z')
        },
        {
          _id: 'visit-2',
          nurseId: 'N12345678',
          patientId: 'P456',
          patientName: 'Jane Smith',
          status: 'inProgress',
          scheduledTime: new Date('2024-01-15T11:00:00Z')
        }
      ];

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockVisits)
      });
      Visit.countDocuments.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/visits/nurse/N12345678/active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].status).toBe('planned');
      expect(response.body.data[1].status).toBe('inProgress');
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter by date range when provided', async () => {
      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });
      Visit.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/visits/nurse/N12345678/active')
        .query({
          date_from: '2024-01-15T00:00:00Z',
          date_to: '2024-01-15T23:59:59Z'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Visit.find).toHaveBeenCalledWith(
        expect.objectContaining({
          nurseId: 'N12345678',
          status: { $in: ['planned', 'inProgress'] },
          scheduledTime: expect.any(Object)
        })
      );
    });

    it('should handle pagination correctly', async () => {
      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });
      Visit.countDocuments.mockResolvedValue(100);

      const response = await request(app)
        .get('/api/visits/nurse/N12345678/active')
        .query({ page: 2, limit: 20 })
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.pages).toBe(5);
      expect(response.body.pagination.hasNext).toBe(true);
      expect(response.body.pagination.hasPrev).toBe(true);
    });

    it('should handle database errors', async () => {
      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('MongoDB error'))
      });

      const response = await request(app)
        .get('/api/visits/nurse/N12345678/active')
        .expect(500);

      expect(response.body.error.code).toBe('FETCH_ACTIVE_NURSE_VISITS_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      Encounter.findAll.mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app)
        .get('/api/visits')
        .expect(500);

      expect(response.body.error.code).toBe('FETCH_VISITS_ERROR');
      expect(response.body.error.details.service).toBe('visits-service');
      expect(response.body.error.details.timestamp).toBeDefined();
    });
  });
});