/**
 * Integration Tests for Visits Service
 * 
 * These tests verify the main endpoints work correctly with MongoDB
 * Run with: npm test -- integration.test.js
 */

const request = require('supertest');

// Use actual server URL for integration tests
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3008';

describe('Visits Service Integration Tests', () => {
  
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(BASE_URL).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('visits-service');
    });
  });

  describe('Visit Templates API', () => {
    it('should fetch visit templates', async () => {
      const response = await request(BASE_URL)
        .get('/api/visit-templates')
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const template = response.body.data[0];
        expect(template).toHaveProperty('title');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('estimatedDuration');
      }
    });

    it('should filter templates by category', async () => {
      const response = await request(BASE_URL)
        .get('/api/visit-templates')
        .query({ category: 'medical', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      response.body.data.forEach(template => {
        expect(template.category).toBe('medical');
      });
    });

    it('should search templates', async () => {
      const response = await request(BASE_URL)
        .get('/api/visit-templates')
        .query({ search: 'assessment', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Visits API', () => {
    it('should fetch visits with pagination', async () => {
      const response = await request(BASE_URL)
        .get('/api/visits')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const visit = response.body.data[0];
        expect(visit).toHaveProperty('patientId');
        expect(visit).toHaveProperty('nurseId');
        expect(visit).toHaveProperty('status');
        expect(visit).toHaveProperty('visitType');
      }
    });

    it('should filter visits by status', async () => {
      const response = await request(BASE_URL)
        .get('/api/visits')
        .query({ status: 'completed', limit: 5 });

      expect(response.status).toBe(200);
      
      response.body.data.forEach(visit => {
        expect(visit.status).toBe('completed');
      });
    });
  });

  describe('MongoDB Management API', () => {
    it('should return MongoDB status', async () => {
      const response = await request(BASE_URL)
        .get('/api/mongo/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('connection');
      expect(response.body.data.connection.state).toBe('connected');
    });
  });

  describe('Task Categories API', () => {
    it('should fetch task categories', async () => {
      const response = await request(BASE_URL)
        .get('/api/tasks/categories');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const category = response.body.data[0];
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('displayName');
        expect(category).toHaveProperty('category');
      }
    });
  });
});
