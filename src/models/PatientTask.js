const mongoose = require('mongoose');

const PatientTaskSchema = new mongoose.Schema(
  {
    patientId: { 
      type: String, 
      required: true,
      index: true
    },
    patientName: { 
      type: String, 
      required: true 
    },
    title: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 200
    },
    description: { 
      type: String,
      trim: true,
      maxlength: 1000
    },
    category: {
      type: String,
      required: true,
      enum: [
        'vital_signs',
        'medication',
        'hygiene',
        'mobility',
        'nutrition',
        'safety',
        'documentation',
        'communication',
        'assessment',
        'therapy',
        'social',
        'other'
      ],
      default: 'other'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'on_hold'],
      default: 'active'
    },
    // Scheduling information
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly', 'as_needed', 'custom'],
      default: 'once'
    },
    startDate: { 
      type: Date,
      default: Date.now
    },
    endDate: { 
      type: Date 
    },
    // For recurring tasks
    recurringPattern: {
      interval: { type: Number }, // e.g., every 2 days
      daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday, 6 = Saturday
      timeOfDay: { type: String }, // e.g., "09:00", "14:30"
    },
    estimatedDuration: { 
      type: Number, // in minutes
      min: 1,
      max: 480
    },
    instructions: { 
      type: String,
      trim: true,
      maxlength: 2000
    },
    notes: { 
      type: String,
      trim: true,
      maxlength: 2000
    },
    // Assignment information
    assignedTo: {
      userId: { type: String },
      userName: { type: String },
      role: { type: String }
    },
    createdBy: {
      userId: { type: String, required: true },
      userName: { type: String, required: true },
      role: { type: String }
    },
    // Completion tracking
    completions: [{
      completedAt: { type: Date, required: true },
      completedBy: {
        userId: { type: String, required: true },
        userName: { type: String, required: true }
      },
      visitId: { type: String }, // Link to the visit where this was completed
      notes: { type: String },
      duration: { type: Number }, // actual time taken in minutes
    }],
    // Alerts and reminders
    alerts: [{
      type: {
        type: String,
        enum: ['reminder', 'overdue', 'critical', 'custom']
      },
      message: { type: String },
      triggeredAt: { type: Date },
      acknowledgedBy: { type: String },
      acknowledgedAt: { type: Date }
    }],
    // Tags for organization
    tags: [{ 
      type: String,
      trim: true,
      lowercase: true
    }],
    // Metadata
    isUrgent: { 
      type: Boolean, 
      default: false 
    },
    requiresSupervision: { 
      type: Boolean, 
      default: false 
    },
    requiredEquipment: [{ 
      type: String,
      trim: true
    }],
    requiredSkills: [{ 
      type: String,
      trim: true
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
PatientTaskSchema.index({ patientId: 1, status: 1 });
PatientTaskSchema.index({ category: 1, priority: 1 });
PatientTaskSchema.index({ startDate: 1, endDate: 1 });
PatientTaskSchema.index({ 'assignedTo.userId': 1 });
PatientTaskSchema.index({ frequency: 1, status: 1 });
PatientTaskSchema.index({ isUrgent: 1, priority: 1 });
PatientTaskSchema.index({ title: 'text', description: 'text', instructions: 'text' });

// Virtual for completion count
PatientTaskSchema.virtual('completionCount').get(function() {
  return this.completions ? this.completions.length : 0;
});

// Virtual for last completion
PatientTaskSchema.virtual('lastCompletion').get(function() {
  if (!this.completions || this.completions.length === 0) return null;
  return this.completions[this.completions.length - 1];
});

// Virtual for next due date (for recurring tasks)
PatientTaskSchema.virtual('nextDueDate').get(function() {
  if (this.frequency === 'once' || this.status !== 'active') return null;
  
  const lastCompletion = this.lastCompletion;
  const baseDate = lastCompletion ? lastCompletion.completedAt : this.startDate;
  
  switch (this.frequency) {
    case 'daily':
      return new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      const nextMonth = new Date(baseDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    default:
      return null;
  }
});

// Virtual for overdue status
PatientTaskSchema.virtual('isOverdue').get(function() {
  const nextDue = this.nextDueDate;
  return nextDue && new Date() > nextDue;
});

// Method to mark task as completed
PatientTaskSchema.methods.markCompleted = function(completedBy, visitId = null, notes = '', duration = null) {
  const completion = {
    completedAt: new Date(),
    completedBy,
    visitId,
    notes,
    duration
  };
  
  this.completions.push(completion);
  
  // If it's a one-time task, mark as completed
  if (this.frequency === 'once') {
    this.status = 'completed';
  }
  
  return this.save();
};

// Method to get tasks due for a patient
PatientTaskSchema.statics.getDueTasks = function(patientId, date = new Date()) {
  return this.find({
    patientId,
    status: 'active',
    startDate: { $lte: date },
    $or: [
      { endDate: { $exists: false } },
      { endDate: { $gte: date } }
    ]
  }).sort({ priority: -1, isUrgent: -1, startDate: 1 });
};

// Method to get overdue tasks
PatientTaskSchema.statics.getOverdueTasks = function(patientId = null) {
  const query = {
    status: 'active',
    frequency: { $ne: 'once' }
  };
  
  if (patientId) {
    query.patientId = patientId;
  }
  
  return this.find(query).then(tasks => {
    return tasks.filter(task => task.isOverdue);
  });
};

// Method to create task from template
PatientTaskSchema.statics.createFromTemplate = function(templateData, patientData, createdBy, customizations = {}) {
  const taskData = {
    patientId: patientData.patientId,
    patientName: patientData.patientName,
    title: customizations.title || templateData.title,
    description: customizations.description || templateData.description,
    category: customizations.category || templateData.category,
    priority: customizations.priority || templateData.priority,
    estimatedDuration: customizations.estimatedDuration || templateData.estimatedDuration,
    instructions: customizations.instructions || templateData.instructions,
    requiredEquipment: customizations.requiredEquipment || templateData.requiredEquipment,
    requiredSkills: customizations.requiredSkills || templateData.requiredSkills,
    tags: customizations.tags || templateData.tags,
    createdBy,
    ...customizations
  };
  
  return new this(taskData);
};

module.exports = mongoose.model('PatientTask', PatientTaskSchema, 'patient_tasks');