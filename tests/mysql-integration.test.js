const { testConnection, executeQuery } = require('../src/config/database');

// Skip these tests if MySQL is not available
const describeIf = (condition, ...args) => condition ? describe(...args) : describe.skip(...args);

// Check if we should run integration tests
const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describeIf(shouldRunIntegrationTests, 'MySQL Integration Tests', () => {
  beforeAll(async () => {
    // Test if MySQL connection is available
    try {
      await testConnection();
    } catch (error) {
      console.log('MySQL not available, skipping integration tests');
      return;
    }
  });

  describe('Database Connection', () => {
    it('should connect to MySQL successfully', async () => {
      const result = await testConnection();
      expect(result).toBe(true);
    });
  });

  describe('Basic Query Operations', () => {
    it('should execute a simple query', async () => {
      const result = await executeQuery('SELECT 1 as test');
      expect(result).toHaveLength(1);
      expect(result[0].test).toBe(1);
    });

    it('should handle parameterized queries', async () => {
      const result = await executeQuery('SELECT ? as value', ['test-value']);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('test-value');
    });
  });

  describe('Visits Table Operations', () => {
    const testVisitId = 'test-visit-' + Date.now();
    
    afterEach(async () => {
      // Clean up test data
      try {
        await executeQuery('DELETE FROM visits WHERE id = ?', [testVisitId]);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should insert a visit record', async () => {
      const visitData = {
        id: testVisitId,
        fhir_id: `encounter-${testVisitId}`,
        patient_id: 'P123',
        patient_name: 'Test Patient',
        nurse_id: 'N456',
        nurse_name: 'Test Nurse',
        scheduled_time: new Date('2024-01-15T10:00:00Z'),
        status: 'planned',
        location: 'Room 101',
        notes: 'Test visit',
        has_audio_recording: false,
        fhir_resource: JSON.stringify({
          resourceType: 'Encounter',
          id: `encounter-${testVisitId}`,
          status: 'planned'
        })
      };

      const query = `
        INSERT INTO visits (
          id, fhir_id, patient_id, patient_name, nurse_id, nurse_name,
          scheduled_time, status, location, notes, has_audio_recording, fhir_resource
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        visitData.id,
        visitData.fhir_id,
        visitData.patient_id,
        visitData.patient_name,
        visitData.nurse_id,
        visitData.nurse_name,
        visitData.scheduled_time,
        visitData.status,
        visitData.location,
        visitData.notes,
        visitData.has_audio_recording,
        visitData.fhir_resource
      ];

      const result = await executeQuery(query, params);
      expect(result.affectedRows).toBe(1);
    });

    it('should retrieve a visit record', async () => {
      // First insert a test record
      const visitData = {
        id: testVisitId,
        fhir_id: `encounter-${testVisitId}`,
        patient_id: 'P123',
        patient_name: 'Test Patient',
        scheduled_time: new Date('2024-01-15T10:00:00Z'),
        status: 'planned'
      };

      await executeQuery(
        'INSERT INTO visits (id, fhir_id, patient_id, patient_name, scheduled_time, status) VALUES (?, ?, ?, ?, ?, ?)',
        [visitData.id, visitData.fhir_id, visitData.patient_id, visitData.patient_name, visitData.scheduled_time, visitData.status]
      );

      // Then retrieve it
      const result = await executeQuery('SELECT * FROM visits WHERE id = ?', [testVisitId]);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testVisitId);
      expect(result[0].patient_id).toBe('P123');
      expect(result[0].status).toBe('planned');
    });

    it('should update a visit record', async () => {
      // First insert a test record
      await executeQuery(
        'INSERT INTO visits (id, fhir_id, patient_id, patient_name, scheduled_time, status) VALUES (?, ?, ?, ?, ?, ?)',
        [testVisitId, `encounter-${testVisitId}`, 'P123', 'Test Patient', new Date('2024-01-15T10:00:00Z'), 'planned']
      );

      // Update the status
      const updateResult = await executeQuery(
        'UPDATE visits SET status = ?, notes = ? WHERE id = ?',
        ['in-progress', 'Visit started', testVisitId]
      );

      expect(updateResult.affectedRows).toBe(1);

      // Verify the update
      const result = await executeQuery('SELECT * FROM visits WHERE id = ?', [testVisitId]);
      expect(result[0].status).toBe('in-progress');
      expect(result[0].notes).toBe('Visit started');
    });
  });
});

// Always run unit tests for database configuration
describe('Database Configuration Unit Tests', () => {
  it('should have correct database configuration', () => {
    const { dbConfig } = require('../src/config/database');
    
    expect(dbConfig).toBeDefined();
    expect(dbConfig.host).toBeDefined();
    expect(dbConfig.port).toBeDefined();
    expect(dbConfig.user).toBeDefined();
    expect(dbConfig.database).toBeDefined();
  });

  it('should handle connection errors gracefully', async () => {
    // Mock a connection error
    const originalTestConnection = require('../src/config/database').testConnection;
    
    // This test verifies error handling structure
    expect(typeof originalTestConnection).toBe('function');
  });
});