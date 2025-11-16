const mongoose = require('mongoose');

const VitalSignsSchema = new mongoose.Schema({
  temperature: { type: Number },
  heartRate: { type: Number },
  respiratoryRate: { type: Number },
  systolicBP: { type: Number },
  diastolicBP: { type: Number },
  oxygenSaturation: { type: Number },
  notes: { type: String },
});

const TaskCompletionSchema = new mongoose.Schema({
  taskId: { type: String, required: true }, // Can be TaskTemplate._id or PatientTask._id
  taskType: { 
    type: String, 
    enum: ['template', 'patient_specific'], 
    required: true 
  },
  taskTitle: { type: String, required: true },
  taskCategory: { type: String },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  completed: { type: Boolean, required: true, default: false },
  completedAt: { type: Date },
  completedBy: {
    userId: { type: String },
    userName: { type: String }
  },
  startedAt: { type: Date },
  duration: { type: Number }, // actual time taken in minutes
  notes: { type: String },
  // For tasks that require verification or supervision
  verifiedBy: {
    userId: { type: String },
    userName: { type: String },
    verifiedAt: { type: Date }
  },
  // Issues or complications encountered
  issues: [{
    description: { type: String },
    severity: { 
      type: String, 
      enum: ['minor', 'moderate', 'major', 'critical'] 
    },
    reportedAt: { type: Date, default: Date.now },
    reportedBy: {
      userId: { type: String },
      userName: { type: String }
    }
  }]
});

const VisitSchema = new mongoose.Schema(
  {
    // Core visit info
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    nurseId: { type: String, required: true, index: true },
    nurseName: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    startTime: { type: Date },
    endTime: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ['planned', 'inProgress', 'completed', 'cancelled'],
      default: 'planned',
    },
    location: { type: String },
    
    // Visit classification
    visitType: { type: String }, // Reference to VisitType name
    visitTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitTemplate' },
    isRegulated: { 
      type: Boolean, 
      required: true, 
      default: false,
      index: true 
    }, // If true, must also be stored in MySQL as FHIR Encounter
    requiresLicense: { type: Boolean, default: false }, // Requires licensed healthcare worker
    mysqlVisitId: { type: String, index: true }, // Reference to MySQL visits.id if isRegulated=true
    
    // Visit details
    taskCompletions: [TaskCompletionSchema],
    vitalSigns: VitalSignsSchema,
    notes: { type: String },
    
    // Media attachments
    audioRecordingPath: { type: String },
    hasAudioRecording: { type: Boolean, default: false },
    photos: [{ type: String }], // URLs to stored photos
    
    // Synchronization fields
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'failed'],
      default: 'synced',
    },
    syncTimestamp: { type: Date },
    deviceId: { type: String },
    offlineId: { type: String }, // ID generated on device for offline operations
  },
  { timestamps: true } // adds createdAt and updatedAt
);

// Indexes
VisitSchema.index({ patientId: 1, scheduledTime: -1 });
VisitSchema.index({ nurseId: 1, scheduledTime: -1 });
VisitSchema.index({ status: 1 });
VisitSchema.index({ scheduledTime: -1 });
VisitSchema.index({ 'taskCompletions.taskId': 1 });
VisitSchema.index({ isRegulated: 1 });
VisitSchema.index({ mysqlVisitId: 1 });
VisitSchema.index({ visitType: 1 });

// Virtual for completion percentage
VisitSchema.virtual('completionPercentage').get(function() {
  if (!this.taskCompletions || this.taskCompletions.length === 0) return 0;
  
  const completedCount = this.taskCompletions.filter(task => task.completed).length;
  return Math.round((completedCount / this.taskCompletions.length) * 100);
});

// Method to check if all required tasks are completed
VisitSchema.methods.isFullyCompleted = function() {
  if (!this.taskCompletions || this.taskCompletions.length === 0) return false;
  return this.taskCompletions.every(task => task.completed);
};

module.exports = mongoose.model('Visit', VisitSchema, 'visit_data');
