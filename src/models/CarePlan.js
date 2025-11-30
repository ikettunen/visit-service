const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  targetDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'achieved', 'not_achieved'],
    default: 'not_started'
  },
  measurableOutcome: {
    type: String,
    trim: true,
    maxlength: 300
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, { _id: true });

const InterventionSchema = new mongoose.Schema({
  visitTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VisitTemplate'
  },
  visitType: {
    type: String,
    required: true
  },
  frequency: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'as_needed'],
      required: true
    },
    times: Number,
    daysOfWeek: [Number], // 0-6 for Sunday-Saturday
    daysOfMonth: [Number], // 1-31
    timeOfDay: [String] // e.g., ["08:00", "14:00", "20:00"]
  },
  duration: {
    type: Number, // minutes
    min: 5,
    max: 480
  },
  assignedRole: {
    type: String,
    enum: ['nurse', 'doctor', 'care_assistant', 'physiotherapist', 'any'],
    default: 'nurse'
  },
  additionalTasks: [{
    taskTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskTemplate'
    },
    taskTitle: String,
    isRequired: {
      type: Boolean,
      default: false
    }
  }]
}, { _id: true });

const ConditionSchema = new mongoose.Schema({
  code: {
    type: String,
    trim: true
  },
  display: {
    type: String,
    required: true,
    trim: true
  },
  severity: {
    type: String,
    enum: ['mild', 'moderate', 'severe'],
    default: 'moderate'
  },
  onsetDate: Date
}, { _id: true });

const CareTeamMemberSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const ProgressNoteSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  author: {
    userId: String,
    userName: String
  },
  note: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  goalId: mongoose.Schema.Types.ObjectId
}, { _id: true });

const CarePlanSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    index: true
  },
  patientName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'on_hold'],
    default: 'active',
    index: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Care goals
  goals: [GoalSchema],
  
  // Scheduled interventions (visits)
  interventions: [InterventionSchema],
  
  // Conditions being addressed
  conditions: [ConditionSchema],
  
  // Team members involved
  careTeam: [CareTeamMemberSchema],
  
  // Progress notes
  progressNotes: [ProgressNoteSchema],
  
  // Metadata
  createdBy: {
    userId: String,
    userName: String
  },
  lastReviewedDate: Date,
  nextReviewDate: Date,
  
  // Notes
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
CarePlanSchema.index({ patientId: 1, status: 1 });
CarePlanSchema.index({ status: 1, endDate: 1 });
CarePlanSchema.index({ 'careTeam.userId': 1 });
CarePlanSchema.index({ startDate: 1, endDate: 1 });

// Virtual for days remaining
CarePlanSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate) return null;
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
});

// Virtual for overall progress
CarePlanSchema.virtual('overallProgress').get(function() {
  if (!this.goals || this.goals.length === 0) return 0;
  const totalProgress = this.goals.reduce((sum, goal) => sum + (goal.progress || 0), 0);
  return Math.round(totalProgress / this.goals.length);
});

// Method to check if care plan is expired
CarePlanSchema.methods.isExpired = function() {
  return this.endDate && new Date() > new Date(this.endDate);
};

// Method to add progress note
CarePlanSchema.methods.addProgressNote = function(note, author, goalId = null) {
  this.progressNotes.push({
    note,
    author,
    goalId,
    date: new Date()
  });
  return this.save();
};

// Method to update goal progress
CarePlanSchema.methods.updateGoalProgress = function(goalId, progress, status = null) {
  const goal = this.goals.id(goalId);
  if (goal) {
    goal.progress = progress;
    if (status) {
      goal.status = status;
    }
    // Auto-update status based on progress
    if (progress === 100 && !status) {
      goal.status = 'achieved';
    } else if (progress > 0 && goal.status === 'not_started') {
      goal.status = 'in_progress';
    }
  }
  return this.save();
};

// Static method to get active care plans
CarePlanSchema.statics.getActive = function() {
  return this.find({ status: 'active' })
    .sort({ startDate: -1 });
};

// Static method to get care plans by patient
CarePlanSchema.statics.getByPatient = function(patientId) {
  return this.find({ patientId })
    .sort({ startDate: -1 });
};

// Static method to get expiring care plans
CarePlanSchema.statics.getExpiringSoon = function(days = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    endDate: {
      $gte: now,
      $lte: futureDate
    }
  }).sort({ endDate: 1 });
};

module.exports = mongoose.model('CarePlan', CarePlanSchema, 'care_plans');
