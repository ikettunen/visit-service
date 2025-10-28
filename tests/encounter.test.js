const Encounter = require('../src/models/Encounter');
const VisitTask = require('../src/models/VisitTask');
const { testConnection, executeQuery } = require('../src/config/database');

// Mock the database module for unit tests
jest.mock('../src/config/database', () => ({
  testConnection: jest.fn(),
  executeQuery: jest.fn(),
  executeTransaction: jest.fn()
}));

describe('Encounter Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create an encounter with default values', () => {
      const data = {
        patient_id: 'P123',
        patient_name: 'John Doe',
        scheduled_time: '2024-01-15T10:00:00Z'
      };

      const encounter = new Encounter(data);

      expect(encounter.patient_id).toBe('P123');
      expect(encounter.patient_name).toBe('John Doe');
      expect(encounter.status).toBe('planned');
      expect(encounter.has_audio_recording).toBe(false);
      expect(encounter.id).toBeDefined();
      expect(encounter.fhir_id).toContain('encounter-');
    });

    it('should create an encounter with provided ID', () => {
      const data = {
        id: 'custom-id',
        fhir_id: 'custom-fhir-id',
        patient_id: 'P123',
        patient_name: 'John Doe'
      };

      const encounter = new Encounter(data);

      expect(encounter.id).toBe('custom-id');
      expect(encounter.fhir_id).toBe('custom-fhir-id');
    });
  });

  describe('FHIR Conversion', () => {
    it('should convert to FHIR Encounter resource', () => {
      const data = {
        id: 'encounter-123',
        fhir_id: 'encounter-fhir-123',
        patient_id: 'P123',
        patient_name: 'John Doe',
        nurse_id: 'N456',
        nurse_name: 'Jane Smith',
        scheduled_time: '2024-01-15T10:00:00Z',
        start_time: '2024-01-15T10:05:00Z',
        end_time: '2024-01-15T10:30:00Z',
        status: 'finished',
        location: 'Room 204A',
        notes: 'Patient was cooperative'
      };

      const encounter = new Encounter(data);
      const fhirResource = encounter.toFHIR();

      expect(fhirResource.resourceType).toBe('Encounter');
      expect(fhirResource.id).toBe('encounter-fhir-123');
      expect(fhirResource.status).toBe('finished');
      expect(fhirResource.subject.reference).toBe('Patient/P123');
      expect(fhirResource.subject.display).toBe('John Doe');
      expect(fhirResource.participant[0].individual.reference).toBe('Practitioner/N456');
      expect(fhirResource.participant[0].individual.display).toBe('Jane Smith');
      expect(fhirResource.period.start).toBe('2024-01-15T10:05:00Z');
      expect(fhirResource.period.end).toBe('2024-01-15T10:30:00Z');
      expect(fhirResource.location[0].location.display).toBe('Room 204A');
    });

    it('should handle encounter without nurse', () => {
      const data = {
        patient_id: 'P123',
        patient_name: 'John Doe',
        scheduled_time: '2024-01-15T10:00:00Z'
      };

      const encounter = new Encounter(data);
      const fhirResource = encounter.toFHIR();

      expect(fhirResource.participant).toEqual([]);
    });

    it('should handle encounter without location', () => {
      const data = {
        patient_id: 'P123',
        patient_name: 'John Doe',
        scheduled_time: '2024-01-15T10:00:00Z'
      };

      const encounter = new Encounter(data);
      const fhirResource = encounter.toFHIR();

      expect(fhirResource.location).toEqual([]);
    });
  });

  describe('Status Mapping', () => {
    it('should map internal status to FHIR status correctly', () => {
      const encounter = new Encounter({});

      expect(encounter.mapStatusToFHIR('planned')).toBe('planned');
      expect(encounter.mapStatusToFHIR('in-progress')).toBe('in-progress');
      expect(encounter.mapStatusToFHIR('finished')).toBe('finished');
      expect(encounter.mapStatusToFHIR('cancelled')).toBe('cancelled');
      expect(encounter.mapStatusToFHIR('invalid-status')).toBe('unknown');
    });
  });

  describe('Database Operations', () => {
    it('should save encounter to database', async () => {
      const mockResult = { insertId: 1 };
      executeQuery.mockResolvedValue(mockResult);

      const encounter = new Encounter({
        patient_id: 'P123',
        patient_name: 'John Doe',
        scheduled_time: '2024-01-15T10:00:00Z'
      });

      await encounter.save();

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO visits'),
        expect.arrayContaining([
          encounter.id,
          encounter.fhir_id,
          'P123',
          'John Doe'
        ])
      );
    });

    it('should find encounter by ID', async () => {
      const mockRow = {
        id: 'encounter-123',
        patient_id: 'P123',
        patient_name: 'John Doe',
        status: 'planned'
      };
      executeQuery.mockResolvedValue([mockRow]);

      const encounter = await Encounter.findById('encounter-123');

      expect(executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM visits WHERE id = ? OR fhir_id = ?',
        ['encounter-123', 'encounter-123']
      );
      expect(encounter).toBeInstanceOf(Encounter);
      expect(encounter.id).toBe('encounter-123');
    });

    it('should return null when encounter not found', async () => {
      executeQuery.mockResolvedValue([]);

      const encounter = await Encounter.findById('nonexistent');

      expect(encounter).toBeNull();
    });

    it('should find encounters by patient ID', async () => {
      const mockRows = [
        { id: 'encounter-1', patient_id: 'P123', status: 'planned' },
        { id: 'encounter-2', patient_id: 'P123', status: 'finished' }
      ];
      executeQuery.mockResolvedValue(mockRows);

      const encounters = await Encounter.findByPatientId('P123', 10, 0);

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE patient_id = ?'),
        ['P123', 10, 0]
      );
      expect(encounters).toHaveLength(2);
      expect(encounters[0]).toBeInstanceOf(Encounter);
    });

    it('should find encounters by nurse ID', async () => {
      const mockRows = [
        { id: 'encounter-1', nurse_id: 'N456', status: 'planned' }
      ];
      executeQuery.mockResolvedValue(mockRows);

      const encounters = await Encounter.findByNurseId('N456', 10, 0);

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE nurse_id = ?'),
        ['N456', 10, 0]
      );
      expect(encounters).toHaveLength(1);
    });

    it('should find today\'s encounters', async () => {
      const mockRows = [
        { id: 'encounter-1', scheduled_time: '2024-01-15T10:00:00Z' }
      ];
      executeQuery.mockResolvedValue(mockRows);

      const encounters = await Encounter.findTodaysEncounters(10, 0);

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('DATE(scheduled_time) = CURDATE()'),
        [10, 0]
      );
      expect(encounters).toHaveLength(1);
    });

    it('should count encounters with filters', async () => {
      executeQuery.mockResolvedValue([{ total: 5 }]);

      const count = await Encounter.count({ status: 'planned' });

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as total'),
        ['planned']
      );
      expect(count).toBe(5);
    });

    it('should update encounter', async () => {
      const mockRow = {
        id: 'encounter-123',
        patient_id: 'P123',
        status: 'planned'
      };
      executeQuery.mockResolvedValue([mockRow]);

      const encounter = new Encounter(mockRow);
      await encounter.update({ status: 'in-progress', notes: 'Updated notes' });

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visits SET'),
        expect.arrayContaining(['in-progress', 'Updated notes', 'encounter-123'])
      );
    });

    it('should delete encounter', async () => {
      const encounter = new Encounter({ id: 'encounter-123' });
      await encounter.delete();

      expect(executeQuery).toHaveBeenCalledWith(
        'DELETE FROM visits WHERE id = ?',
        ['encounter-123']
      );
    });

    it('should start encounter', async () => {
      const encounter = new Encounter({
        id: 'encounter-123',
        status: 'planned'
      });

      await encounter.start();

      expect(encounter.status).toBe('in-progress');
      expect(encounter.start_time).toBeInstanceOf(Date);
    });

    it('should complete encounter', async () => {
      const encounter = new Encounter({
        id: 'encounter-123',
        status: 'in-progress'
      });

      await encounter.complete();

      expect(encounter.status).toBe('finished');
      expect(encounter.end_time).toBeInstanceOf(Date);
    });

    it('should cancel encounter', async () => {
      const encounter = new Encounter({
        id: 'encounter-123',
        status: 'planned'
      });

      await encounter.cancel();

      expect(encounter.status).toBe('cancelled');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      executeQuery.mockRejectedValue(dbError);

      await expect(Encounter.findById('test-id')).rejects.toThrow('Database connection failed');
    });
  });
});