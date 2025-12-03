const request = require('supertest');
const app = require('../src/server'); // Adjust path as needed
const mongoose = require('mongoose');

describe('Add Note to Visit API', () => {
  let authToken;
  let testVisitId;
  
  beforeAll(async () => {
    // Get authentication token
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'maria.nieminen@hoitokoti.fi',
        password: 'nursing123'
      });
    
    expect(authResponse.status).toBe(200);
    expect(authResponse.body.success).toBe(true);
    authToken = authResponse.body.data.token;
  });

  beforeEach(async () => {
    // Get a test visit assigned to Anna Virtanen (staff-1001)
    const visitsResponse = await request(app)
      .get('/api/visits?nurse_id=staff-1001&limit=1')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(visitsResponse.status).toBe(200);
    expect(visitsResponse.body.data.length).toBeGreaterThan(0);
    testVisitId = visitsResponse.body.data[0]._id;
  });

  describe('POST /api/visits/:id/notes', () => {
    it('should successfully add a note to a visit', async () => {
      const noteData = {
        noteText: "Patient's blood sugar levels are stable today. No issues with medication compliance.",
        staffId: 'staff-1001',
        staffName: 'Anna Virtanen',
        noteType: 'medical'
      };

      const response = await request(app)
        .post(`/api/visits/${testVisitId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(noteData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Note added to visit successfully');
      expect(response.body.data).toHaveProperty('visitId', testVisitId);
      expect(response.body.data).toHaveProperty('noteAdded');
      expect(response.body.data).toHaveProperty('totalNotes');
      
      // Check note format
      const noteAdded = response.body.data.noteAdded;
      expect(noteAdded).toContain('Anna Virtanen (medical)');
      expect(noteAdded).toContain(noteData.noteText);
      expect(noteAdded).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/); // ISO timestamp
    });

    it('should append note to existing notes', async () => {
      const firstNote = {
        noteText: "First note about patient condition.",
        staffId: 'staff-1001',
        staffName: 'Anna Virtanen',
        noteType: 'general'
      };

      const secondNote = {
        noteText: "Second note with additional observations.",
        staffId: 'staff-1001', 
        staffName: 'Anna Virtanen',
        noteType: 'observation'
      };

      // Add first note
      const firstResponse = await request(app)
        .post(`/api/visits/${testVisitId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(firstNote);

      expect(firstResponse.status).toBe(200);

      // Add second note
      const secondResponse = await request(app)
        .post(`/api/visits/${testVisitId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(secondNote);

      expect(secondResponse.status).toBe(200);
      
      // Check that both notes are in totalNotes
      const totalNotes = secondResponse.body.data.totalNotes;
      expect(totalNotes).toContain(firstNote.noteText);
      expect(totalNotes).toContain(secondNote.noteText);
      expect(totalNotes).toContain('(general)');
      expect(totalNotes).toContain('(observation)');
    });

    it('should require noteText and staffId', async () => {
      const incompleteNote = {
        staffName: 'Anna Virtanen',
        noteType: 'general'
        // Missing noteText and staffId
      };

      const response = await request(app)
        .post(`/api/visits/${testVisitId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteNote);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Missing required fields: noteText, staffId');
    });

    it('should handle non-existent visit ID', async () => {
      const noteData = {
        noteText: "Test note for non-existent visit.",
        staffId: 'staff-1001',
        staffName: 'Anna Virtanen',
        noteType: 'test'
      };

      const fakeVisitId = 'non-existent-visit-id';
      const response = await request(app)
        .post(`/api/visits/${fakeVisitId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(noteData);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('VISIT_NOT_FOUND');
    });

    it('should default noteType to general if not provided', async () => {
      const noteData = {
        noteText: "Note without explicit type.",
        staffId: 'staff-1001',
        staffName: 'Anna Virtanen'
        // noteType not provided
      };

      const response = await request(app)
        .post(`/api/visits/${testVisitId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(noteData);

      expect(response.status).toBe(200);
      expect(response.body.data.noteAdded).toContain('(general)');
    });

    it('should require authentication', async () => {
      const noteData = {
        noteText: "Unauthorized note attempt.",
        staffId: 'staff-1001',
        staffName: 'Anna Virtanen',
        noteType: 'test'
      };

      const response = await request(app)
        .post(`/api/visits/${testVisitId}/notes`)
        // No Authorization header
        .send(noteData);

      expect(response.status).toBe(401);
    });

    it('should handle different note types correctly', async () => {
      const noteTypes = ['medical', 'observation', 'medication', 'general', 'emergency'];
      
      for (const noteType of noteTypes) {
        const noteData = {
          noteText: `Test note of type ${noteType}.`,
          staffId: 'staff-1001',
          staffName: 'Anna Virtanen',
          noteType: noteType
        };

        const response = await request(app)
          .post(`/api/visits/${testVisitId}/notes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(noteData);

        expect(response.status).toBe(200);
        expect(response.body.data.noteAdded).toContain(`(${noteType})`);
      }
    });
  });

  afterAll(async () => {
    // Clean up database connections
    await mongoose.connection.close();
  });
});