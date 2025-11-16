const mongoose = require('mongoose');

const VisitTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  description: { type: String },
  visitType: { type: String, required: true }, // Reference to VisitType
  defaultDuration: { type: Number }, // in minutes
  defaultTasks: [{
    taskTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskTemplate' },
    taskTitle: { type: String },
    isRequired: { type: Boolean, default: false },
    order: { type: Number }
  }],
  requiredStaffRole: { type: String }, // e.g., 'nurse', 'doctor', 'care_assistant'
  requiresLicense: { type: Boolean, default: false },
  category: { 
    type: String, 
    enum: ['medical', 'care', 'social', 'therapy', 'assessment', 'emergency'],
    default: 'care'
  },
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
  createdBy: { type: String },
  updatedBy: { type: String }
}, {
  timestamps: true
});

// Indexes
VisitTemplateSchema.index({ name: 1 });
VisitTemplateSchema.index({ visitType: 1 });
VisitTemplateSchema.index({ category: 1 });
VisitTemplateSchema.index({ isActive: 1 });

module.exports = mongoose.model('VisitTemplate', VisitTemplateSchema);
