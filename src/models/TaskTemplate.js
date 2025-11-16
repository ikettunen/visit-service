const mongoose = require('mongoose');

const TaskTemplateSchema = new mongoose.Schema(
  {
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
        'other'
      ],
      default: 'other'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    estimatedDuration: { 
      type: Number, // in minutes
      min: 1,
      max: 480 // 8 hours max
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    isRequired: { 
      type: Boolean, 
      default: false 
    },
    instructions: { 
      type: String,
      trim: true,
      maxlength: 2000
    },
    // For tasks that require specific equipment or supplies
    requiredEquipment: [{ 
      type: String,
      trim: true
    }],
    // Skills or certifications required to perform this task
    requiredSkills: [{ 
      type: String,
      trim: true
    }],
    // Tags for easy searching and filtering
    tags: [{ 
      type: String,
      trim: true,
      lowercase: true
    }],
    // Who created this template
    createdBy: {
      userId: { type: String, required: true },
      userName: { type: String, required: true }
    },
    // Usage statistics
    usageCount: { 
      type: Number, 
      default: 0 
    },
    lastUsed: { 
      type: Date 
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
TaskTemplateSchema.index({ category: 1, isActive: 1 });
TaskTemplateSchema.index({ priority: 1 });
TaskTemplateSchema.index({ tags: 1 });
TaskTemplateSchema.index({ title: 'text', description: 'text', instructions: 'text' });
TaskTemplateSchema.index({ usageCount: -1 });

// Virtual for formatted duration
TaskTemplateSchema.virtual('formattedDuration').get(function() {
  if (!this.estimatedDuration) return 'Not specified';
  
  const hours = Math.floor(this.estimatedDuration / 60);
  const minutes = this.estimatedDuration % 60;
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
});

// Method to increment usage count
TaskTemplateSchema.methods.recordUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Static method to get popular tasks
TaskTemplateSchema.statics.getPopularTasks = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1 })
    .limit(limit);
};

// Static method to get tasks by category
TaskTemplateSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true })
    .sort({ priority: -1, title: 1 });
};

module.exports = mongoose.model('TaskTemplate', TaskTemplateSchema, 'task_templates');