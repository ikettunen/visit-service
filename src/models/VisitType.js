const mongoose = require('mongoose');

const VisitTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  description: { type: String },
  category: { 
    type: String, 
    enum: ['medical', 'care', 'social', 'therapy', 'assessment', 'emergency'],
    required: true
  },
  icon: { type: String }, // Icon name for UI
  color: { type: String }, // Color code for UI
  requiresLicense: { type: Boolean, default: false },
  allowedStaffRoles: [{ type: String }], // e.g., ['nurse', 'doctor', 'care_assistant']
  isBillable: { type: Boolean, default: false },
  defaultDuration: { type: Number }, // in minutes
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  usageCount: { type: Number, default: 0 },
  createdBy: { type: String },
  updatedBy: { type: String }
}, {
  timestamps: true
});

// Indexes
VisitTypeSchema.index({ name: 1 });
VisitTypeSchema.index({ category: 1 });
VisitTypeSchema.index({ isActive: 1 });
VisitTypeSchema.index({ sortOrder: 1 });

module.exports = mongoose.model('VisitType', VisitTypeSchema);
