const mongoose = require('mongoose');

const TaskCategorySchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      unique: true,
      trim: true,
      maxlength: 100
    },
    displayName: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100
    },
    description: { 
      type: String,
      trim: true,
      maxlength: 500
    },
    color: { 
      type: String, 
      default: '#6c757d', // Bootstrap secondary color
      match: /^#[0-9A-F]{6}$/i // Hex color validation
    },
    icon: { 
      type: String, 
      default: 'FaTasks' // FontAwesome icon name
    },
    sortOrder: { 
      type: Number, 
      default: 0 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    // Default settings for tasks in this category
    defaultPriority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    defaultDuration: { 
      type: Number, // in minutes
      min: 1,
      max: 480
    },
    // Permissions and restrictions
    requiredRole: { 
      type: String // e.g., 'nurse', 'doctor', 'admin'
    },
    isSystemCategory: { 
      type: Boolean, 
      default: false // System categories cannot be deleted
    },
    // Statistics
    taskCount: { 
      type: Number, 
      default: 0 
    },
    createdBy: {
      userId: { type: String },
      userName: { type: String }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
TaskCategorySchema.index({ name: 1 });
TaskCategorySchema.index({ sortOrder: 1, displayName: 1 });
TaskCategorySchema.index({ isActive: 1 });

// Static method to get active categories
TaskCategorySchema.statics.getActiveCategories = function() {
  return this.find({ isActive: true })
    .sort({ sortOrder: 1, displayName: 1 });
};

// Static method to initialize default categories
TaskCategorySchema.statics.initializeDefaultCategories = async function() {
  const defaultCategories = [
    {
      name: 'vital_signs',
      displayName: 'Vital Signs',
      description: 'Temperature, blood pressure, heart rate, respiratory rate monitoring',
      color: '#dc3545', // Red
      icon: 'FaHeartbeat',
      sortOrder: 1,
      isSystemCategory: true,
      defaultPriority: 'high',
      defaultDuration: 10
    },
    {
      name: 'medication',
      displayName: 'Medication',
      description: 'Medication administration and monitoring',
      color: '#28a745', // Green
      icon: 'FaPills',
      sortOrder: 2,
      isSystemCategory: true,
      defaultPriority: 'high',
      defaultDuration: 15
    },
    {
      name: 'hygiene',
      displayName: 'Personal Hygiene',
      description: 'Bathing, oral care, grooming assistance',
      color: '#17a2b8', // Cyan
      icon: 'FaBath',
      sortOrder: 3,
      isSystemCategory: true,
      defaultPriority: 'medium',
      defaultDuration: 30
    },
    {
      name: 'mobility',
      displayName: 'Mobility & Exercise',
      description: 'Physical therapy, walking assistance, positioning',
      color: '#ffc107', // Yellow
      icon: 'FaWalking',
      sortOrder: 4,
      isSystemCategory: true,
      defaultPriority: 'medium',
      defaultDuration: 20
    },
    {
      name: 'nutrition',
      displayName: 'Nutrition',
      description: 'Meal assistance, dietary monitoring, hydration',
      color: '#fd7e14', // Orange
      icon: 'FaUtensils',
      sortOrder: 5,
      isSystemCategory: true,
      defaultPriority: 'medium',
      defaultDuration: 25
    },
    {
      name: 'safety',
      displayName: 'Safety & Security',
      description: 'Fall prevention, safety checks, security measures',
      color: '#e83e8c', // Pink
      icon: 'FaShieldAlt',
      sortOrder: 6,
      isSystemCategory: true,
      defaultPriority: 'high',
      defaultDuration: 10
    },
    {
      name: 'documentation',
      displayName: 'Documentation',
      description: 'Record keeping, care plan updates, reporting',
      color: '#6f42c1', // Purple
      icon: 'FaFileAlt',
      sortOrder: 7,
      isSystemCategory: true,
      defaultPriority: 'medium',
      defaultDuration: 15
    },
    {
      name: 'communication',
      displayName: 'Communication',
      description: 'Family contact, patient interaction, team coordination',
      color: '#20c997', // Teal
      icon: 'FaComments',
      sortOrder: 8,
      isSystemCategory: true,
      defaultPriority: 'medium',
      defaultDuration: 10
    },
    {
      name: 'assessment',
      displayName: 'Assessment',
      description: 'Health assessments, condition monitoring, evaluations',
      color: '#6610f2', // Indigo
      icon: 'FaClipboardCheck',
      sortOrder: 9,
      isSystemCategory: true,
      defaultPriority: 'high',
      defaultDuration: 20
    },
    {
      name: 'therapy',
      displayName: 'Therapy',
      description: 'Physical, occupational, speech therapy sessions',
      color: '#e21e80', // Custom pink
      icon: 'FaDumbbell',
      sortOrder: 10,
      isSystemCategory: true,
      defaultPriority: 'medium',
      defaultDuration: 45
    },
    {
      name: 'social',
      displayName: 'Social Activities',
      description: 'Recreation, social interaction, mental stimulation',
      color: '#795548', // Brown
      icon: 'FaUsers',
      sortOrder: 11,
      isSystemCategory: true,
      defaultPriority: 'low',
      defaultDuration: 30
    },
    {
      name: 'other',
      displayName: 'Other',
      description: 'Miscellaneous tasks not covered by other categories',
      color: '#6c757d', // Gray
      icon: 'FaTasks',
      sortOrder: 99,
      isSystemCategory: true,
      defaultPriority: 'medium',
      defaultDuration: 15
    }
  ];

  for (const categoryData of defaultCategories) {
    await this.findOneAndUpdate(
      { name: categoryData.name },
      categoryData,
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('TaskCategory', TaskCategorySchema, 'task_categories');