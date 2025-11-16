const request = require('supertest');
const express = require('express');
const mongoRoutes = require('../src/routes/mongoRoutes');

// Mock mongoose and models
jest.mock('mongoose');
jest.mock('../src/models/Visit');
jest.mock('../src/models/VisitType');
jest.mock('../src/models/VisitTemplate');
jest.mock('../src/db/seedVisitTypes');
jest.mock('../src/db/seedVisitTemplates');

const mongoose = require('mongoose');
const Visit = require('../src/models/Visit');
const { seedVisitTypes } = require('../src/db/seedVisitTypes');
const { seedVisitTemplates } = require('../src/db/seedVisitTemplates');

const app = express();
app.use(express.json());
app.use('/api/mongo', mongoRoutes);

describe('MongoDB Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.connection = {
      readyState: 1,
      name: 'test_db',
      db: {
        collection: jest.fn().mockReturnValue({
          stats: jest.fn().mockResolvedValue({ count: 0, size: 0 }),
          countDocuments: jest.fn().mockResolvedValue(0),
          indexes: jest.fn().mockResolvedValue([])
        })
      }
    };
  });

  describe('POST /api/mongo/setup', () => {
    it('should setup MongoDB collections', async () => {
      Visit.createCollection = jest.fn().mockResolvedValue(true);
      Visit.createIndexes = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/api/mongo/setup');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('setup completed');
    });
  });

  describe('POST /api/mongo/seed-types', () => {
    it('should seed visit types', async () => {
      seedVisitTypes.mockResolvedValue({
        success: true,
        total: 15,
        regulated: 10,
        nonRegulated: 5
      });

      const response = await request(app)
        .post('/api/mongo/seed-types');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(15);
      expect(seedVisitTypes).toHaveBeenCalled();
    });

    it('should handle seeding errors', async () => {
      seedVisitTypes.mockRejectedValue(new Error('Seeding failed'));

      const response = await request(app)
        .post('/api/mongo/seed-types');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/mongo/seed-templates', () => {
    it('should seed visit templates', async () => {
      seedVisitTemplates.mockResolvedValue({
        success: true,
        total: 75,
        regulated: 50,
        nonRegulated: 25
      });

      const response = await request(app)
        .post('/api/mongo/seed-templates');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(75);
      expect(seedVisitTemplates).toHaveBeenCalled();
    });
  });

  describe('POST /api/mongo/seed', () => {
    it('should seed visit data', async () => {
      Visit.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });
      Visit.insertMany = jest.fn().mockResolvedValue([
        { _id: 'visit1' },
        { _id: 'visit2' }
      ]);
      Visit.countDocuments = jest.fn().mockResolvedValue(2);

      const response = await request(app)
        .post('/api/mongo/seed');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalVisits).toBe(2);
    });
  });

  describe('GET /api/mongo/status', () => {
    it('should return MongoDB status', async () => {
      const response = await request(app)
        .get('/api/mongo/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.connection.state).toBe('connected');
    });
  });
});
