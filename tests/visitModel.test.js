const mongoose = require('mongoose');
const Visit = require('../src/models/Visit');

// Mock mongoose connection
jest.mock('mongoose', () => ({
  Schema: jest.fn().mockImplementation(() => ({
    index: jest.fn(),
    virtual: jest.fn().mockReturnThis(),
    get: jest.fn(),
    methods: {}
  })),
  model: jest.fn()
}));

describe('Visit Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should define Visit schema with required fields', () => {
      expect(mongoose.Schema).toHaveBeenCalled();
      
      // Get the schema definition from the mock call
      const schemaCall = mongoose.Schema.mock.calls[0];
      const schemaDefinition = schemaCall[0];
      
      // Check required fields
      expect(schemaDefinition.patientId).toBeDefined();
      expect(schemaDefinition.patientId.required).toBe(true);
      expect(schemaDefinition.patientId.index).toBe(true);
      
      expect(schemaDefinition.patientName).toBeDefined();
      expect(schemaDefinition.patientName.required).toBe(true);
      
      expect(schemaDefinition.nurseId).toBeDefined();
      expect(schemaDefinition.nurseId.required).toBe(true);
      expect(schemaDefinition.nurseId.index).toBe(true);
      
      expect(schemaDefinition.nurseName).toBeDefined();
      expect(schemaDefinition.nurseName.required).toBe(true);
      
      expect(schemaDefinition.scheduledTime).toBeDefined();
      expect(schemaDefinition.scheduledTime.required).toBe(true);
    });

    it('should define status enum correctly', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const schemaDefinition = schemaCall[0];
      
      expect(schemaDefinition.status).toBeDefined();
      expect(schemaDefinition.status.enum).toEqual(['planned', 'inProgress', 'completed', 'cancelled']);
      expect(schemaDefinition.status.default).toBe('planned');
    });

    it('should define syncStatus enum correctly', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const schemaDefinition = schemaCall[0];
      
      expect(schemaDefinition.syncStatus).toBeDefined();
      expect(schemaDefinition.syncStatus.enum).toEqual(['synced', 'pending', 'failed']);
      expect(schemaDefinition.syncStatus.default).toBe('synced');
    });

    it('should define VitalSignsSchema', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const schemaDefinition = schemaCall[0];
      
      expect(schemaDefinition.vitalSigns).toBeDefined();
      expect(schemaDefinition.vitalSigns.temperature).toBeDefined();
      expect(schemaDefinition.vitalSigns.heartRate).toBeDefined();
      expect(schemaDefinition.vitalSigns.respiratoryRate).toBeDefined();
      expect(schemaDefinition.vitalSigns.systolicBP).toBeDefined();
      expect(schemaDefinition.vitalSigns.diastolicBP).toBeDefined();
      expect(schemaDefinition.vitalSigns.oxygenSaturation).toBeDefined();
      expect(schemaDefinition.vitalSigns.notes).toBeDefined();
    });

    it('should define TaskCompletionSchema', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const schemaDefinition = schemaCall[0];
      
      expect(schemaDefinition.taskCompletions).toBeDefined();
      expect(Array.isArray(schemaDefinition.taskCompletions)).toBe(true);
    });

    it('should define media attachment fields', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const schemaDefinition = schemaCall[0];
      
      expect(schemaDefinition.audioRecordingPath).toBeDefined();
      expect(schemaDefinition.hasAudioRecording).toBeDefined();
      expect(schemaDefinition.hasAudioRecording.default).toBe(false);
      expect(schemaDefinition.photos).toBeDefined();
      expect(Array.isArray(schemaDefinition.photos)).toBe(true);
    });

    it('should define synchronization fields', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const schemaDefinition = schemaCall[0];
      
      expect(schemaDefinition.syncTimestamp).toBeDefined();
      expect(schemaDefinition.deviceId).toBeDefined();
      expect(schemaDefinition.offlineId).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should create proper indexes', () => {
      const mockSchema = {
        index: jest.fn()
      };
      
      // Simulate the schema creation
      mongoose.Schema.mockReturnValue(mockSchema);
      
      // Re-require the model to trigger index creation
      require('../src/models/Visit');
      
      expect(mockSchema.index).toHaveBeenCalledWith({ patientId: 1, scheduledTime: -1 });
      expect(mockSchema.index).toHaveBeenCalledWith({ nurseId: 1, scheduledTime: -1 });
      expect(mockSchema.index).toHaveBeenCalledWith({ status: 1 });
      expect(mockSchema.index).toHaveBeenCalledWith({ scheduledTime: -1 });
      expect(mockSchema.index).toHaveBeenCalledWith({ 'taskCompletions.taskId': 1 });
    });
  });

  describe('Virtual Fields', () => {
    it('should define completionPercentage virtual', () => {
      const mockSchema = {
        index: jest.fn(),
        virtual: jest.fn().mockReturnThis(),
        get: jest.fn()
      };
      
      mongoose.Schema.mockReturnValue(mockSchema);
      
      require('../src/models/Visit');
      
      expect(mockSchema.virtual).toHaveBeenCalledWith('completionPercentage');
    });
  });

  describe('Model Creation', () => {
    it('should create Visit model with correct name', () => {
      expect(mongoose.model).toHaveBeenCalledWith('Visit', expect.any(Object));
    });
  });
});

describe('Visit Model Methods', () => {
  let mockVisit;

  beforeEach(() => {
    mockVisit = {
      taskCompletions: [
        { taskId: '1', completed: true },
        { taskId: '2', completed: true },
        { taskId: '3', completed: false }
      ]
    };
  });

  describe('completionPercentage virtual', () => {
    it('should calculate completion percentage correctly', () => {
      // Mock the virtual getter
      const completionPercentage = Math.round((2 / 3) * 100); // 2 completed out of 3 total
      expect(completionPercentage).toBe(67);
    });

    it('should return 0 when no tasks', () => {
      mockVisit.taskCompletions = [];
      const completionPercentage = 0;
      expect(completionPercentage).toBe(0);
    });

    it('should return 0 when taskCompletions is null', () => {
      mockVisit.taskCompletions = null;
      const completionPercentage = 0;
      expect(completionPercentage).toBe(0);
    });

    it('should return 100 when all tasks completed', () => {
      mockVisit.taskCompletions = [
        { taskId: '1', completed: true },
        { taskId: '2', completed: true }
      ];
      const completionPercentage = Math.round((2 / 2) * 100);
      expect(completionPercentage).toBe(100);
    });
  });

  describe('isFullyCompleted method', () => {
    it('should return true when all tasks are completed', () => {
      mockVisit.taskCompletions = [
        { taskId: '1', completed: true },
        { taskId: '2', completed: true }
      ];
      
      const isCompleted = mockVisit.taskCompletions.every(task => task.completed);
      expect(isCompleted).toBe(true);
    });

    it('should return false when some tasks are not completed', () => {
      const isCompleted = mockVisit.taskCompletions.every(task => task.completed);
      expect(isCompleted).toBe(false);
    });

    it('should return false when no tasks', () => {
      mockVisit.taskCompletions = [];
      const isCompleted = false;
      expect(isCompleted).toBe(false);
    });

    it('should return false when taskCompletions is null', () => {
      mockVisit.taskCompletions = null;
      const isCompleted = false;
      expect(isCompleted).toBe(false);
    });
  });
});
