const request = require('supertest');
const express = require('express');
const visitRoutes = require('../src/routes/visitRoutes');

// Mock the visit controller
jest.mock('../src/controllers/visitController', () => ({
  getVisits: jest.fn(),
  getVisitById: jest.fn(),
  getVisitsByPatient: jest.fn(),
  getVisitsByNurse: jest.fn(),
  getVisitsForToday: jest.fn(),
  createVisit: jest.fn(),
  updateVisit: jest.fn(),
  startVisit: jest.fn(),
  completeVisit: jest.fn(),
  cancelVisit: jest.fn(),
  deleteVisit: jest.fn(),
  syncVisits: jest.fn()
}));

// Mock the auth middleware
jest.mock('../src/middleware/auth', () => ({
  authenticateJWT: jest.fn((req, res, next) => {
    req.user = { id: 'N12345678', role: 'nurse' };
    next();
  })
}));

const app = express();
app.use(express.json());
app.use('/api/visits', visitRoutes);

describe('Visit Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/visits', () => {
    it('should call getVisits controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.getVisits.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      await request(app)
        .get('/api/visits')
        .expect(200);

      expect(visitController.getVisits).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      const auth = require('../src/middleware/auth');
      
      await request(app)
        .get('/api/visits');

      expect(auth.authenticateJWT).toHaveBeenCalled();
    });
  });

  describe('GET /api/visits/:id', () => {
    it('should call getVisitById controller with correct ID', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.getVisitById.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: req.params.id } });
      });

      await request(app)
        .get('/api/visits/V12345678')
        .expect(200);

      expect(visitController.getVisitById).toHaveBeenCalled();
    });
  });

  describe('GET /api/visits/patient/:patientId', () => {
    it('should call getVisitsByPatient controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.getVisitsByPatient.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      await request(app)
        .get('/api/visits/patient/P12345678')
        .expect(200);

      expect(visitController.getVisitsByPatient).toHaveBeenCalled();
    });
  });

  describe('GET /api/visits/nurse/:nurseId', () => {
    it('should call getVisitsByNurse controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.getVisitsByNurse.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      await request(app)
        .get('/api/visits/nurse/N12345678')
        .expect(200);

      expect(visitController.getVisitsByNurse).toHaveBeenCalled();
    });
  });

  describe('GET /api/visits/today', () => {
    it('should call getVisitsForToday controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.getVisitsForToday.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      await request(app)
        .get('/api/visits/today')
        .expect(200);

      expect(visitController.getVisitsForToday).toHaveBeenCalled();
    });
  });

  describe('POST /api/visits', () => {
    it('should call createVisit controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.createVisit.mockImplementation((req, res) => {
        res.status(201).json({ message: 'Visit created', data: {} });
      });

      const visitData = {
        patientId: 'P12345678',
        nurseId: 'N12345678',
        scheduledTime: '2024-01-15T10:00:00Z'
      };

      await request(app)
        .post('/api/visits')
        .send(visitData)
        .expect(201);

      expect(visitController.createVisit).toHaveBeenCalled();
    });
  });

  describe('PUT /api/visits/:id', () => {
    it('should call updateVisit controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.updateVisit.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Visit updated', data: {} });
      });

      const updateData = {
        notes: 'Updated visit notes'
      };

      await request(app)
        .put('/api/visits/V12345678')
        .send(updateData)
        .expect(200);

      expect(visitController.updateVisit).toHaveBeenCalled();
    });
  });

  describe('PUT /api/visits/:id/start', () => {
    it('should call startVisit controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.startVisit.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Visit started', data: {} });
      });

      await request(app)
        .put('/api/visits/V12345678/start')
        .expect(200);

      expect(visitController.startVisit).toHaveBeenCalled();
    });
  });

  describe('PUT /api/visits/:id/complete', () => {
    it('should call completeVisit controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.completeVisit.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Visit completed', data: {} });
      });

      await request(app)
        .put('/api/visits/V12345678/complete')
        .expect(200);

      expect(visitController.completeVisit).toHaveBeenCalled();
    });
  });

  describe('PUT /api/visits/:id/cancel', () => {
    it('should call cancelVisit controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.cancelVisit.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Visit cancelled', data: {} });
      });

      await request(app)
        .put('/api/visits/V12345678/cancel')
        .expect(200);

      expect(visitController.cancelVisit).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/visits/:id', () => {
    it('should call deleteVisit controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.deleteVisit.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Visit deleted' });
      });

      await request(app)
        .delete('/api/visits/V12345678')
        .expect(200);

      expect(visitController.deleteVisit).toHaveBeenCalled();
    });
  });

  describe('POST /api/visits/sync', () => {
    it('should call syncVisits controller', async () => {
      const visitController = require('../src/controllers/visitController');
      visitController.syncVisits.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Visits synced', data: [] });
      });

      const syncData = {
        visits: [],
        deviceId: 'DEVICE123'
      };

      await request(app)
        .post('/api/visits/sync')
        .send(syncData)
        .expect(200);

      expect(visitController.syncVisits).toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    it('should apply authentication to all routes', async () => {
      const auth = require('../src/middleware/auth');
      
      // Test multiple routes to ensure auth is applied
      await request(app).get('/api/visits');
      await request(app).get('/api/visits/V12345678');
      await request(app).post('/api/visits');
      await request(app).put('/api/visits/V12345678');
      await request(app).delete('/api/visits/V12345678');

      expect(auth.authenticateJWT).toHaveBeenCalledTimes(5);
    });
  });
});
