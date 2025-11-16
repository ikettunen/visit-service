const request = require('supertest');
const express = require('express');
const visitController = require('../src/controllers/visitController');

// Mock the Visit model (MongoDB)
jest.mock('../src/models/Visit');
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

// Add routes for testing
app.get('/api/visits', visitController.getVisits);

describe('Visit Controller - MongoDB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/visits', () => {
    it('should return paginated visits from MongoDB', async () => {
      const mockVisits = [
        {
          _id: '507f1f77bcf86cd799439011',
          patientId: 'patient-001',
          patientName: 'John Doe',
          nurseId: 'S0001',
          nurseName: 'Anna Virtanen',
          scheduledTime: new Date('2025-11-15T10:00:00Z'),
          status: 'planned',
          location: 'Room 101',
          visitType: 'medical_assessment',
          isRegulated: true,
          requiresLicense: true,
          taskCompletions: [
            {
              taskId: 'task-001',
              taskType: 'template',
              taskTitle: 'Check vital signs',
              taskCategory: 'assessment',
              priority: 'high',
              completed: false
            }
          ],
          syncStatus: 'synced'
        }
      ];

      Visit.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockVisits)
            })
          })
        })
      });

      Visit.countDocuments = jest.fn().mockResolvedValue(1);

      const response = await request(app)
        .get('/api/visits')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].patientName).toBe('John Doe');
      expect(response.body.data[0].visitType).toBe('medical_assessment');
      expect(response.body.pagination.total).toBe(1);
    });

    it('should filter visits by status', async () => {
      Visit.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });

      Visit.countDocuments = jest.fn().mockResolvedValue(0);

      const response = await request(app)
        .get('/api/visits')
        .query({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(Visit.find).toHaveBeenCalledWith({ status: 'completed' });
    });

    it('should handle errors gracefully', async () => {
      Visit.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockRejectedValue(new Error('Database error'))
            })
          })
        })
      });

      const response = await request(app).get('/api/visits');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('FETCH_VISITS_ERROR');
    });
  });
});

module.exports = app;
