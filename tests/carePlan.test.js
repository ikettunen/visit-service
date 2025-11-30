const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const CarePlan = require('../src/models/CarePlan');

describe('Care Plan API', () => {
  let testCarePlanId;
  let testGoalId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nursing_home_visits_test');
    }
  });

  beforeEach(async () => {
    // Clear care plans before each test
    await CarePlan.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
    // Close MySQL pool if it exists
    const db = require('../src/config/database');
    if (db.pool) {
      await db.pool.end();
    }
  });

  describe('POST /api/care-plans', () => {
    it('should create a new care plan', async () => {
      const carePlanData = {
        patientId: 'test-patient-123',
        patientName: 'Test Patient',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        goals: [
          {
            description: 'Improve mobility',
            targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            status: 'in_progress',
            measurableOutcome: 'Walk 50 meters independently',
            progress: 30
          }
        ],
        interventions: [
          {
            visitType: 'Physical Therapy',
            frequency: {
              type: 'weekly',
              times: 3,
              daysOfWeek: [1, 3, 5],
              timeOfDay: ['10:00']
            },
            duration: 45,
            assignedRole: 'physiotherapist'
          }
        ],
        conditions: [
          {
            code: 'M62.81',
            display: 'Muscle weakness',
            severity: 'moderate'
          }
        ],
        careTeam: [
          {
            userId: 'nurse-001',
            userName: 'Test Nurse',
            role: 'Primary Nurse',
            isPrimary: true
          }
        ],
        createdBy: {
          userId: 'admin-001',
          userName: 'Admin User'
        }
      };

      const response = await request(app)
        .post('/api/care-plans')
        .send(carePlanData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlan).toHaveProperty('_id');
      expect(response.body.carePlan.patientId).toBe('test-patient-123');
      expect(response.body.carePlan.goals).toHaveLength(1);
      expect(response.body.carePlan.interventions).toHaveLength(1);

      testCarePlanId = response.body.carePlan._id;
      testGoalId = response.body.carePlan.goals[0]._id;
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/care-plans')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/care-plans', () => {
    beforeEach(async () => {
      // Create test care plans
      await CarePlan.create([
        {
          patientId: 'patient-001',
          patientName: 'Patient One',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          goals: [],
          interventions: [],
          conditions: [],
          careTeam: []
        },
        {
          patientId: 'patient-002',
          patientName: 'Patient Two',
          status: 'completed',
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          goals: [],
          interventions: [],
          conditions: [],
          careTeam: []
        }
      ]);
    });

    it('should get all care plans', async () => {
      const response = await request(app)
        .get('/api/care-plans')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlans).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total', 2);
    });

    it('should filter care plans by status', async () => {
      const response = await request(app)
        .get('/api/care-plans?status=active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlans).toHaveLength(1);
      expect(response.body.carePlans[0].status).toBe('active');
    });

    it('should filter care plans by patientId', async () => {
      const response = await request(app)
        .get('/api/care-plans?patientId=patient-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlans).toHaveLength(1);
      expect(response.body.carePlans[0].patientId).toBe('patient-001');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/care-plans?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlans).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/care-plans/:id', () => {
    let carePlanId;

    beforeEach(async () => {
      const carePlan = await CarePlan.create({
        patientId: 'patient-001',
        patientName: 'Patient One',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        goals: [],
        interventions: [],
        conditions: [],
        careTeam: []
      });
      carePlanId = carePlan._id;
    });

    it('should get a care plan by ID', async () => {
      const response = await request(app)
        .get(`/api/care-plans/${carePlanId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlan._id).toBe(carePlanId.toString());
    });

    it('should return 404 for non-existent care plan', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/care-plans/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/care-plans/patient/:patientId', () => {
    beforeEach(async () => {
      await CarePlan.create([
        {
          patientId: 'patient-001',
          patientName: 'Patient One',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          goals: [],
          interventions: [],
          conditions: [],
          careTeam: []
        },
        {
          patientId: 'patient-001',
          patientName: 'Patient One',
          status: 'completed',
          startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          goals: [],
          interventions: [],
          conditions: [],
          careTeam: []
        }
      ]);
    });

    it('should get all care plans for a patient', async () => {
      const response = await request(app)
        .get('/api/care-plans/patient/patient-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlans).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });
  });

  describe('PUT /api/care-plans/:id', () => {
    let carePlanId;

    beforeEach(async () => {
      const carePlan = await CarePlan.create({
        patientId: 'patient-001',
        patientName: 'Patient One',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        goals: [],
        interventions: [],
        conditions: [],
        careTeam: []
      });
      carePlanId = carePlan._id;
    });

    it('should update a care plan', async () => {
      const response = await request(app)
        .put(`/api/care-plans/${carePlanId}`)
        .send({ status: 'on_hold', notes: 'Patient requested pause' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlan.status).toBe('on_hold');
      expect(response.body.carePlan.notes).toBe('Patient requested pause');
    });

    it('should return 404 for non-existent care plan', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/care-plans/${fakeId}`)
        .send({ status: 'completed' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/care-plans/:id', () => {
    let carePlanId;

    beforeEach(async () => {
      const carePlan = await CarePlan.create({
        patientId: 'patient-001',
        patientName: 'Patient One',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        goals: [],
        interventions: [],
        conditions: [],
        careTeam: []
      });
      carePlanId = carePlan._id;
    });

    it('should delete a care plan', async () => {
      const response = await request(app)
        .delete(`/api/care-plans/${carePlanId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's deleted
      const deleted = await CarePlan.findById(carePlanId);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent care plan', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/care-plans/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/care-plans/:id/goals/:goalId/progress', () => {
    let carePlanId, goalId;

    beforeEach(async () => {
      const carePlan = await CarePlan.create({
        patientId: 'patient-001',
        patientName: 'Patient One',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        goals: [
          {
            description: 'Test goal',
            targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            status: 'in_progress',
            progress: 30
          }
        ],
        interventions: [],
        conditions: [],
        careTeam: []
      });
      carePlanId = carePlan._id;
      goalId = carePlan.goals[0]._id;
    });

    it('should update goal progress', async () => {
      const response = await request(app)
        .put(`/api/care-plans/${carePlanId}/goals/${goalId}/progress`)
        .send({ progress: 75 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlan.goals[0].progress).toBe(75);
    });

    it('should auto-update status when progress reaches 100', async () => {
      const response = await request(app)
        .put(`/api/care-plans/${carePlanId}/goals/${goalId}/progress`)
        .send({ progress: 100 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlan.goals[0].progress).toBe(100);
      expect(response.body.carePlan.goals[0].status).toBe('achieved');
    });

    it('should return 400 for invalid progress', async () => {
      const response = await request(app)
        .put(`/api/care-plans/${carePlanId}/goals/${goalId}/progress`)
        .send({ progress: 150 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/care-plans/:id/notes', () => {
    let carePlanId;

    beforeEach(async () => {
      const carePlan = await CarePlan.create({
        patientId: 'patient-001',
        patientName: 'Patient One',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        goals: [],
        interventions: [],
        conditions: [],
        careTeam: []
      });
      carePlanId = carePlan._id;
    });

    it('should add a progress note', async () => {
      const response = await request(app)
        .post(`/api/care-plans/${carePlanId}/notes`)
        .send({
          note: 'Patient showing good progress',
          author: {
            userId: 'nurse-001',
            userName: 'Test Nurse'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlan.progressNotes).toHaveLength(1);
      expect(response.body.carePlan.progressNotes[0].note).toBe('Patient showing good progress');
    });

    it('should return 400 if note or author is missing', async () => {
      const response = await request(app)
        .post(`/api/care-plans/${carePlanId}/notes`)
        .send({ note: 'Test note' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/care-plans/active', () => {
    beforeEach(async () => {
      await CarePlan.create([
        {
          patientId: 'patient-001',
          patientName: 'Patient One',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          goals: [],
          interventions: [],
          conditions: [],
          careTeam: []
        },
        {
          patientId: 'patient-002',
          patientName: 'Patient Two',
          status: 'completed',
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          goals: [],
          interventions: [],
          conditions: [],
          careTeam: []
        }
      ]);
    });

    it('should get only active care plans', async () => {
      const response = await request(app)
        .get('/api/care-plans/active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlans).toHaveLength(1);
      expect(response.body.carePlans[0].status).toBe('active');
    });
  });

  describe('GET /api/care-plans/expiring', () => {
    beforeEach(async () => {
      await CarePlan.create([
        {
          patientId: 'patient-001',
          patientName: 'Patient One',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          goals: [],
          interventions: [],
          conditions: [],
          careTeam: []
        },
        {
          patientId: 'patient-002',
          patientName: 'Patient Two',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          goals: [],
          interventions: [],
          conditions: [],
          careTeam: []
        }
      ]);
    });

    it('should get care plans expiring within 7 days', async () => {
      const response = await request(app)
        .get('/api/care-plans/expiring')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlans).toHaveLength(1);
      expect(response.body.expiringWithinDays).toBe(7);
    });

    it('should support custom days parameter', async () => {
      const response = await request(app)
        .get('/api/care-plans/expiring?days=60')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.carePlans).toHaveLength(2);
      expect(response.body.expiringWithinDays).toBe(60);
    });
  });
});
