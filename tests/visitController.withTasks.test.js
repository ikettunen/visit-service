/**
 * Tests for getVisitsByPatientWithTasks endpoint
 * Tests the new MongoDB-only endpoint for visits with tasks
 */

const request = require('supertest');
const express = require('express');
const visitController = require('../src/controllers/visitController');
const Visit = require('../src/models/Visit');

// Mock the Visit model
jest.mock('../src/models/Visit');

// Create express app for testing
const app = express();
app.use(express.json());
app.get('/api/visits/patient/:patientId/with-tasks', visitController.getVisitsByPatientWithTasks);

describe('GET /api/visits/patient/:patientId/with-tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should return visits with tasks from MongoDB', async () => {
      const patientId = 'patient-123';
      const mockVisits = [
        {
          _id: 'visit-1',
          patientId: 'patient-123',
          patientName: 'Eino Mäkinen',
          nurseId: 'staff-1001',
          nurseName: 'Anna Virtanen',
          scheduledTime: new Date('2025-11-30T08:00:00Z'),
          status: 'planned',
          visitType: 'Blood Sugar Check',
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
              taskTitle: 'Check medication orders',
              taskCategory: 'medication',
              priority: 'high',
              completed: false
            }
          ],
          notes: 'Scheduled from care plan',
          createdAt: new Date('2025-11-30T22:18:52Z'),
          updatedAt: new Date('2025-11-30T22:18:52Z')
        },
        {
          _id: 'visit-2',
          patientId: 'patient-123',
          patientName: 'Eino Mäkinen',
          nurseId: 'staff-1002',
          nurseName: 'Liisa Mäkinen',
          scheduledTime: new Date('2025-11-30T14:00:00Z'),
          status: 'completed',
          visitType: 'Medication Administration',
          taskCompletions: [
            {
              taskId: 'template-id-2',
              taskType: 'template',
              taskTitle: 'Administer morning medications',
              taskCategory: 'medication',
              priority: 'critical',
              completed: true,
              completedAt: new Date('2025-11-30T14:15:00Z'),
              completedBy: {
                userId: 'staff-1002',
                userName: 'Liisa Mäkinen'
              },
              duration: 10,
              notes: 'All medications administered successfully'
            }
          ],
          vitalSigns: {
            temperature: 36.8,
            heartRate: 72,
            systolicBP: 120,
            diastolicBP: 80
          },
          notes: 'Visit completed successfully',
          createdAt: new Date('2025-11-30T22:18:52Z'),
          updatedAt: new Date('2025-11-30T14:20:00Z')
        }
      ];

      // Mock MongoDB queries
      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockVisits)
            })
          })
        })
      });
      Visit.countDocuments.mockResolvedValue(2);

      const response = await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks`)
        .expect(200);

      expect(response.body).toEqual({
        data: mockVisits,
        pagination: {
          total: 2,
          page: 1,
          limit: 50,
          pages: 1,
          hasNext: false,
          hasPrev: false
        }
      });

      // Verify MongoDB queries were called correctly
      expect(Visit.find).toHaveBeenCalledWith({ patientId });
      expect(Visit.countDocuments).toHaveBeenCalledWith({ patientId });
    });

    it('should handle pagination parameters', async () => {
      const patientId = 'patient-123';
      const mockVisits = [{ _id: 'visit-1', patientId, taskCompletions: [] }];

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockVisits)
            })
          })
        })
      });
      Visit.countDocuments.mockResolvedValue(25);

      const response = await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks?page=2&limit=10`)
        .expect(200);

      expect(response.body.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        pages: 3,
        hasNext: true,
        hasPrev: true
      });

      // Verify skip and limit were calculated correctly
      const mockChain = Visit.find().sort().skip().limit();
      expect(mockChain.skip).toHaveBeenCalledWith(10); // (page 2 - 1) * limit 10
      expect(mockChain.limit).toHaveBeenCalledWith(10);
    });

    it('should return empty array when no visits found', async () => {
      const patientId = 'patient-no-visits';

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      Visit.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks`)
        .expect(200);

      expect(response.body).toEqual({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 50,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    });

    it('should validate task completion structure', async () => {
      const patientId = 'patient-123';
      const mockVisits = [
        {
          _id: 'visit-1',
          patientId: 'patient-123',
          patientName: 'Test Patient',
          taskCompletions: [
            {
              taskId: 'task-1',
              taskType: 'template',
              taskTitle: 'Test Task',
              taskCategory: 'assessment',
              priority: 'medium',
              completed: true,
              completedAt: new Date('2025-11-30T10:00:00Z'),
              completedBy: {
                userId: 'staff-1001',
                userName: 'Test Nurse'
              },
              duration: 15,
              notes: 'Task completed successfully'
            }
          ]
        }
      ];

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockVisits)
            })
          })
        })
      });
      Visit.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks`)
        .expect(200);

      const visit = response.body.data[0];
      const task = visit.taskCompletions[0];

      // Verify task structure
      expect(task).toHaveProperty('taskId');
      expect(task).toHaveProperty('taskType');
      expect(task).toHaveProperty('taskTitle');
      expect(task).toHaveProperty('taskCategory');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('completed');
      expect(task).toHaveProperty('completedAt');
      expect(task).toHaveProperty('completedBy');
      expect(task).toHaveProperty('duration');
      expect(task).toHaveProperty('notes');

      // Verify completedBy structure
      expect(task.completedBy).toHaveProperty('userId');
      expect(task.completedBy).toHaveProperty('userName');
    });
  });

  describe('Error Cases', () => {
    it('should handle MongoDB connection errors', async () => {
      const patientId = 'patient-123';
      const mongoError = new Error('MongoDB connection failed');

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockRejectedValue(mongoError)
            })
          })
        })
      });

      const response = await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks`)
        .expect(500);

      expect(response.body).toEqual({
        error: {
          code: 'FETCH_PATIENT_VISITS_WITH_TASKS_ERROR',
          message: 'Failed to fetch patient visits with tasks',
          details: {
            service: 'visits-service',
            timestamp: expect.any(String),
            patientId: patientId,
            error: 'MongoDB connection failed'
          }
        }
      });
    });

    it('should handle invalid patient ID format', async () => {
      const invalidPatientId = '';

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      Visit.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get(`/api/visits/patient/${invalidPatientId}/with-tasks`)
        .expect(200);

      // Should still return empty result for invalid ID
      expect(response.body.data).toEqual([]);
    });

    it('should handle countDocuments error', async () => {
      const patientId = 'patient-123';
      const mockVisits = [{ _id: 'visit-1', taskCompletions: [] }];

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockVisits)
            })
          })
        })
      });
      Visit.countDocuments.mockRejectedValue(new Error('Count failed'));

      const response = await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks`)
        .expect(500);

      expect(response.body.error.code).toBe('FETCH_PATIENT_VISITS_WITH_TASKS_ERROR');
    });
  });

  describe('Query Parameters', () => {
    it('should use default pagination values', async () => {
      const patientId = 'patient-123';

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      Visit.countDocuments.mockResolvedValue(0);

      await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks`)
        .expect(200);

      const mockChain = Visit.find().sort().skip().limit();
      expect(mockChain.skip).toHaveBeenCalledWith(0); // (1-1) * 50
      expect(mockChain.limit).toHaveBeenCalledWith(50);
    });

    it('should handle string pagination parameters', async () => {
      const patientId = 'patient-123';

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      Visit.countDocuments.mockResolvedValue(0);

      await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks?page=3&limit=20`)
        .expect(200);

      const mockChain = Visit.find().sort().skip().limit();
      expect(mockChain.skip).toHaveBeenCalledWith(40); // (3-1) * 20
      expect(mockChain.limit).toHaveBeenCalledWith(20);
    });

    it('should handle invalid pagination parameters', async () => {
      const patientId = 'patient-123';

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      Visit.countDocuments.mockResolvedValue(0);

      await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks?page=invalid&limit=abc`)
        .expect(200);

      // Should fall back to defaults
      const mockChain = Visit.find().sort().skip().limit();
      expect(mockChain.skip).toHaveBeenCalledWith(0); // Default page 1
      expect(mockChain.limit).toHaveBeenCalledWith(50); // Default limit
    });
  });

  describe('Data Integrity', () => {
    it('should preserve MongoDB document structure', async () => {
      const patientId = 'patient-123';
      const mockVisit = {
        _id: 'visit-1',
        patientId: 'patient-123',
        patientName: 'Eino Mäkinen',
        nurseId: 'staff-1001',
        nurseName: 'Anna Virtanen',
        scheduledTime: new Date('2025-11-30T08:00:00Z'),
        startTime: new Date('2025-11-30T08:05:00Z'),
        endTime: new Date('2025-11-30T08:30:00Z'),
        status: 'completed',
        location: 'Room 101',
        visitType: 'Blood Sugar Check',
        taskCompletions: [],
        vitalSigns: {
          temperature: 36.8,
          heartRate: 72
        },
        notes: 'Visit completed',
        audioRecordingPath: '/recordings/visit-1.mp3',
        hasAudioRecording: true,
        photos: ['/photos/visit-1-1.jpg'],
        generatedFromCarePlan: true,
        createdAt: new Date('2025-11-30T22:18:52Z'),
        updatedAt: new Date('2025-11-30T08:35:00Z')
      };

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockVisit])
            })
          })
        })
      });
      Visit.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks`)
        .expect(200);

      const returnedVisit = response.body.data[0];

      // Verify all MongoDB fields are preserved
      expect(returnedVisit._id).toBe(mockVisit._id);
      expect(returnedVisit.patientId).toBe(mockVisit.patientId);
      expect(returnedVisit.patientName).toBe(mockVisit.patientName);
      expect(returnedVisit.nurseId).toBe(mockVisit.nurseId);
      expect(returnedVisit.nurseName).toBe(mockVisit.nurseName);
      expect(returnedVisit.status).toBe(mockVisit.status);
      expect(returnedVisit.location).toBe(mockVisit.location);
      expect(returnedVisit.visitType).toBe(mockVisit.visitType);
      expect(returnedVisit.taskCompletions).toEqual(mockVisit.taskCompletions);
      expect(returnedVisit.vitalSigns).toEqual(mockVisit.vitalSigns);
      expect(returnedVisit.notes).toBe(mockVisit.notes);
      expect(returnedVisit.audioRecordingPath).toBe(mockVisit.audioRecordingPath);
      expect(returnedVisit.hasAudioRecording).toBe(mockVisit.hasAudioRecording);
      expect(returnedVisit.photos).toEqual(mockVisit.photos);
      expect(returnedVisit.generatedFromCarePlan).toBe(mockVisit.generatedFromCarePlan);
    });

    it('should sort visits by scheduledTime descending', async () => {
      const patientId = 'patient-123';

      Visit.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      Visit.countDocuments.mockResolvedValue(0);

      await request(app)
        .get(`/api/visits/patient/${patientId}/with-tasks`)
        .expect(200);

      const mockChain = Visit.find().sort();
      expect(mockChain.sort).toHaveBeenCalledWith({ scheduledTime: -1 });
    });
  });
});