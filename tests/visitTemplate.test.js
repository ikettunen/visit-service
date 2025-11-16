const request = require('supertest');
const express = require('express');
const visitTemplateRoutes = require('../src/routes/visitTemplateRoutes');

// Mock the VisitTemplate model
jest.mock('../src/models/VisitTemplate');
const VisitTemplate = require('../src/models/VisitTemplate');

const app = express();
app.use(express.json());
app.use('/api/visit-templates', visitTemplateRoutes);

describe('Visit Template Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/visit-templates', () => {
    it('should return transformed visit templates', async () => {
      const mockTemplates = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'morning_care',
          displayName: 'Morning Care Routine',
          description: 'Morning bathing and dressing',
          visitType: 'personal_care_assistance',
          category: 'care',
          defaultDuration: 45,
          requiredStaffRole: 'care_assistant',
          requiresLicense: false,
          isActive: true,
          usageCount: 0,
          defaultTasks: [
            { taskTitle: 'Wake patient', isRequired: true, order: 1 },
            { taskTitle: 'Assist with bathing', isRequired: true, order: 2 }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      VisitTemplate.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockTemplates)
            })
          })
        })
      });

      VisitTemplate.countDocuments = jest.fn().mockResolvedValue(1);

      const response = await request(app)
        .get('/api/visit-templates')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      
      // Check transformation
      const template = response.body.data[0];
      expect(template.title).toBe('Morning Care Routine');
      expect(template.category).toBe('care');
      expect(template.estimatedDuration).toBe(45);
      expect(template.isRequired).toBe(false);
      expect(template.requiredSkills).toEqual(['care_assistant']);
      expect(template.tags).toEqual(['personal_care_assistance']);
    });

    it('should filter by category', async () => {
      VisitTemplate.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });

      VisitTemplate.countDocuments = jest.fn().mockResolvedValue(0);

      await request(app)
        .get('/api/visit-templates')
        .query({ category: 'medical' });

      expect(VisitTemplate.find).toHaveBeenCalledWith({ category: 'medical' });
    });
  });

  describe('POST /api/visit-templates', () => {
    it('should create a new visit template', async () => {
      const newTemplate = {
        title: 'New Template',
        description: 'Test template',
        category: 'care',
        estimatedDuration: 30,
        requiredSkills: ['nurse'],
        tags: ['medical_assessment'],
        isRequired: true
      };

      const savedTemplate = {
        _id: '507f1f77bcf86cd799439012',
        name: 'new_template',
        displayName: 'New Template',
        description: 'Test template',
        visitType: 'medical_assessment',
        category: 'care',
        defaultDuration: 30,
        requiredStaffRole: 'nurse',
        requiresLicense: true,
        isActive: true,
        usageCount: 0,
        save: jest.fn().mockResolvedValue(true),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      VisitTemplate.mockImplementation(() => savedTemplate);

      const response = await request(app)
        .post('/api/visit-templates')
        .send(newTemplate);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Template');
    });
  });

  describe('PUT /api/visit-templates/:id', () => {
    it('should update a visit template', async () => {
      const updatedData = {
        title: 'Updated Template',
        description: 'Updated description',
        category: 'medical',
        estimatedDuration: 60
      };

      const updatedTemplate = {
        _id: '507f1f77bcf86cd799439011',
        displayName: 'Updated Template',
        description: 'Updated description',
        category: 'medical',
        defaultDuration: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      VisitTemplate.findByIdAndUpdate = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedTemplate)
      });

      const response = await request(app)
        .put('/api/visit-templates/507f1f77bcf86cd799439011')
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Template');
    });

    it('should return 404 for non-existent template', async () => {
      VisitTemplate.findByIdAndUpdate = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .put('/api/visit-templates/nonexistent')
        .send({ title: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/visit-templates/:id', () => {
    it('should delete a visit template', async () => {
      VisitTemplate.findByIdAndDelete = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011'
      });

      const response = await request(app)
        .delete('/api/visit-templates/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/visit-templates/:id/tasks', () => {
    it('should return tasks for a template', async () => {
      const mockTemplate = {
        _id: '507f1f77bcf86cd799439011',
        defaultTasks: [
          { taskTitle: 'Task 1', isRequired: true, order: 1, _id: 'task1' },
          { taskTitle: 'Task 2', isRequired: false, order: 2, _id: 'task2' }
        ]
      };

      VisitTemplate.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTemplate)
      });

      const response = await request(app)
        .get('/api/visit-templates/507f1f77bcf86cd799439011/tasks');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].taskTitle).toBe('Task 1');
    });
  });
});
