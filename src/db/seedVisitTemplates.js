const mongoose = require('mongoose');
const VisitTemplate = require('../models/VisitTemplate');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Visit Templates for Daily Nursing Home Schedule
// Focused set of 15 templates covering all daily activities
const visitTemplates = [
  // 1. Morning Medication Round (08:00)
  {
    name: 'morning_medication_round',
    displayName: 'Morning Medication Round',
    description: 'Morning medication administration with environmental checks',
    visitType: 'medication_administration',
    category: 'medical',
    defaultDuration: 10,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Verify patient identity', isRequired: true, order: 1 },
      { taskTitle: 'Check medication orders', isRequired: true, order: 2 },
      { taskTitle: 'Check room supplies (toilet paper, towels)', isRequired: true, order: 3 },
      { taskTitle: 'Administer morning medications', isRequired: true, order: 4 },
      { taskTitle: 'Blood glucose test (if diabetic)', isRequired: false, order: 5 },
      { taskTitle: 'Blood pressure check (if hypertensive)', isRequired: false, order: 6 },
      { taskTitle: 'Document administration', isRequired: true, order: 7 }
    ]
  },

  // 2. Afternoon Medication Round (14:00)
  {
    name: 'afternoon_medication_round',
    displayName: 'Afternoon Medication Round',
    description: 'Afternoon medication administration with pain assessment',
    visitType: 'medication_administration',
    category: 'medical',
    defaultDuration: 5,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Verify patient identity', isRequired: true, order: 1 },
      { taskTitle: 'Check medication order', isRequired: true, order: 2 },
      { taskTitle: 'Administer medication', isRequired: true, order: 3 },
      { taskTitle: 'Pain assessment (if arthritis patient)', isRequired: false, order: 4 },
      { taskTitle: 'Document administration', isRequired: true, order: 5 }
    ]
  },

  // 3. Evening Medication Round (20:00)
  {
    name: 'evening_medication_round',
    displayName: 'Evening Medication Round',
    description: 'Evening medication administration with vital signs and environmental checks',
    visitType: 'medication_administration',
    category: 'medical',
    defaultDuration: 10,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Verify patient identity', isRequired: true, order: 1 },
      { taskTitle: 'Check medication orders', isRequired: true, order: 2 },
      { taskTitle: 'Check room supplies (toilet paper, towels)', isRequired: true, order: 3 },
      { taskTitle: 'Administer evening medications', isRequired: true, order: 4 },
      { taskTitle: 'Blood pressure check (if hypertensive)', isRequired: false, order: 5 },
      { taskTitle: 'Pain assessment (if arthritis patient)', isRequired: false, order: 6 },
      { taskTitle: 'Document administration', isRequired: true, order: 7 }
    ]
  },

  // 4. Breakfast Service (07:00)
  {
    name: 'breakfast_service',
    displayName: 'Breakfast Service',
    description: 'Serve breakfast with meal satisfaction check',
    visitType: 'meal_assistance',
    category: 'care',
    defaultDuration: 25,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Serve breakfast', isRequired: true, order: 1 },
      { taskTitle: 'Assist with eating if needed', isRequired: false, order: 2 },
      { taskTitle: 'Ask about previous evening meal', isRequired: true, order: 3 },
      { taskTitle: 'Check if meal finished', isRequired: true, order: 4 },
      { taskTitle: 'Document intake', isRequired: true, order: 5 },
      { taskTitle: 'Note food preferences', isRequired: false, order: 6 }
    ]
  },

  // 5. Lunch Service (12:00)
  {
    name: 'lunch_service',
    displayName: 'Lunch Service',
    description: 'Serve lunch with meal satisfaction check and fluid monitoring',
    visitType: 'meal_assistance',
    category: 'care',
    defaultDuration: 25,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Serve lunch', isRequired: true, order: 1 },
      { taskTitle: 'Assist with eating if needed', isRequired: false, order: 2 },
      { taskTitle: 'Ask about breakfast', isRequired: true, order: 3 },
      { taskTitle: 'Check if meal finished', isRequired: true, order: 4 },
      { taskTitle: 'Document intake', isRequired: true, order: 5 },
      { taskTitle: 'Fluid intake monitoring (if heart failure patient)', isRequired: false, order: 6 }
    ]
  },

  // 6. Dinner Service (18:00)
  {
    name: 'dinner_service',
    displayName: 'Dinner Service',
    description: 'Serve dinner with meal satisfaction check',
    visitType: 'meal_assistance',
    category: 'care',
    defaultDuration: 25,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Serve dinner', isRequired: true, order: 1 },
      { taskTitle: 'Assist with eating if needed', isRequired: false, order: 2 },
      { taskTitle: 'Ask about lunch', isRequired: true, order: 3 },
      { taskTitle: 'Check if meal finished', isRequired: true, order: 4 },
      { taskTitle: 'Document intake', isRequired: true, order: 5 },
      { taskTitle: 'Fluid intake monitoring (if heart failure patient)', isRequired: false, order: 6 }
    ]
  },

  // 7. Morning Personal Care (06:00)
  {
    name: 'morning_personal_care',
    displayName: 'Morning Personal Care',
    description: 'Morning hygiene and dressing assistance',
    visitType: 'personal_care_assistance',
    category: 'care',
    defaultDuration: 25,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Wake patient gently', isRequired: true, order: 1 },
      { taskTitle: 'Assist with toileting', isRequired: true, order: 2 },
      { taskTitle: 'Help with washing/grooming', isRequired: true, order: 3 },
      { taskTitle: 'Assist with dressing', isRequired: true, order: 4 },
      { taskTitle: 'Skin assessment', isRequired: true, order: 5 },
      { taskTitle: 'Check call bell placement', isRequired: true, order: 6 }
    ]
  },

  // 8. Bedtime Care Routine (21:00)
  {
    name: 'bedtime_care_routine',
    displayName: 'Bedtime Care Routine',
    description: 'Evening hygiene and bedtime preparation',
    visitType: 'personal_care_assistance',
    category: 'care',
    defaultDuration: 20,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Assist with toileting', isRequired: true, order: 1 },
      { taskTitle: 'Help with changing into nightwear', isRequired: true, order: 2 },
      { taskTitle: 'Oral care', isRequired: true, order: 3 },
      { taskTitle: 'Position for comfort', isRequired: true, order: 4 },
      { taskTitle: 'Check room temperature', isRequired: true, order: 5 },
      { taskTitle: 'Ensure call bell within reach', isRequired: true, order: 6 },
      { taskTitle: 'Lights out', isRequired: true, order: 7 }
    ]
  },

  // 9. Shower Assistance (2-3x weekly) - Example without tasks
  {
    name: 'shower_assistance',
    displayName: 'Shower Assistance',
    description: 'Full bathing assistance (2-3x weekly)',
    visitType: 'personal_care_assistance',
    category: 'care',
    defaultDuration: 30,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },

  // 10. Caregiver Morning Round (10:00)
  {
    name: 'caregiver_morning_round',
    displayName: 'Caregiver Morning Round',
    description: 'Morning personal care and activity proposal',
    visitType: 'personal_care_assistance',
    category: 'care',
    defaultDuration: 10,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Assist with toileting', isRequired: true, order: 1 },
      { taskTitle: 'Help with mobility', isRequired: true, order: 2 },
      { taskTitle: 'Social interaction', isRequired: true, order: 3 },
      { taskTitle: 'Comfort check (temperature, lighting)', isRequired: true, order: 4 },
      { taskTitle: 'Propose activities', isRequired: true, order: 5 },
      { taskTitle: 'Notify caregiver if interested', isRequired: false, order: 6 }
    ]
  },

  // 11. Caregiver Afternoon Round (15:00)
  {
    name: 'caregiver_afternoon_round',
    displayName: 'Caregiver Afternoon Round',
    description: 'Afternoon personal care and activity band review',
    visitType: 'personal_care_assistance',
    category: 'care',
    defaultDuration: 10,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Assist with toileting', isRequired: true, order: 1 },
      { taskTitle: 'Help with mobility', isRequired: true, order: 2 },
      { taskTitle: 'Social interaction', isRequired: true, order: 3 },
      { taskTitle: 'Propose activities', isRequired: true, order: 4 },
      { taskTitle: 'Activity band review (if applicable)', isRequired: false, order: 5 },
      { taskTitle: 'Comfort check', isRequired: true, order: 6 }
    ]
  },

  // 12. Doctor Medical Examination (11:00, Mon-Fri)
  {
    name: 'doctor_medical_examination',
    displayName: 'Doctor Medical Examination',
    description: 'Comprehensive medical examination by doctor',
    visitType: 'medical_assessment',
    category: 'medical',
    defaultDuration: 20,
    requiredStaffRole: 'doctor',
    requiresLicense: true,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Review medical history', isRequired: true, order: 1 },
      { taskTitle: 'Physical examination', isRequired: true, order: 2 },
      { taskTitle: 'Check vital signs', isRequired: true, order: 3 },
      { taskTitle: 'Review medications', isRequired: true, order: 4 },
      { taskTitle: 'Assess treatment effectiveness', isRequired: true, order: 5 },
      { taskTitle: 'Update care plan if needed', isRequired: true, order: 6 },
      { taskTitle: 'Document findings', isRequired: true, order: 7 }
    ]
  },

  // 13. Comprehensive Vital Signs Check (For heart failure patients)
  {
    name: 'comprehensive_vital_signs_check',
    displayName: 'Comprehensive Vital Signs Check',
    description: 'Full vital signs assessment for heart failure patients',
    visitType: 'vital_signs_monitoring',
    category: 'assessment',
    defaultDuration: 10,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Blood pressure', isRequired: true, order: 1 },
      { taskTitle: 'Heart rate', isRequired: true, order: 2 },
      { taskTitle: 'Temperature', isRequired: true, order: 3 },
      { taskTitle: 'Oxygen saturation', isRequired: true, order: 4 },
      { taskTitle: 'Respiratory rate', isRequired: true, order: 5 },
      { taskTitle: 'Edema assessment', isRequired: true, order: 6 },
      { taskTitle: 'Document all readings', isRequired: true, order: 7 },
      { taskTitle: 'Assess trends', isRequired: true, order: 8 }
    ]
  },

  // 14. Night Monitoring Round - Example without tasks
  {
    name: 'night_monitoring_round',
    displayName: 'Night Monitoring Round',
    description: 'Hourly night safety and comfort checks',
    visitType: 'vital_signs_monitoring',
    category: 'assessment',
    defaultDuration: 5,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },

  // 15. Blood Glucose Test (For diabetic patients)
  {
    name: 'blood_glucose_test',
    displayName: 'Blood Glucose Test',
    description: 'Blood glucose monitoring for diabetic patients',
    visitType: 'blood_glucose_monitoring',
    category: 'assessment',
    defaultDuration: 5,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Prepare glucometer', isRequired: true, order: 1 },
      { taskTitle: 'Clean finger', isRequired: true, order: 2 },
      { taskTitle: 'Perform test', isRequired: true, order: 3 },
      { taskTitle: 'Record result', isRequired: true, order: 4 },
      { taskTitle: 'Assess if insulin needed', isRequired: true, order: 5 },
      { taskTitle: 'Document', isRequired: true, order: 6 }
    ]
  }
];

async function seedVisitTemplates() {
  try {
    logger.info('Starting Visit Templates seeding...');

    // Ensure MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nursing_home_visits');
      logger.info('Connected to MongoDB');
    }

    // Clear existing visit templates
    await VisitTemplate.deleteMany({});
    logger.info('Cleared existing visit templates');

    // Insert all visit templates
    const templates = await VisitTemplate.insertMany(visitTemplates);
    logger.info(`Created ${templates.length} visit templates`);

    // Summary by category
    const categories = await VisitTemplate.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    logger.info('Visit Templates by Category:');
    categories.forEach(cat => {
      logger.info(`  - ${cat._id}: ${cat.count} templates`);
    });

    // Summary by visit type
    const visitTypes = await VisitTemplate.aggregate([
      { $group: { _id: '$visitType', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    logger.info('Visit Templates by Visit Type:');
    visitTypes.forEach(vt => {
      logger.info(`  - ${vt._id}: ${vt.count} templates`);
    });

    const totalCount = await VisitTemplate.countDocuments();
    const regulatedCount = await VisitTemplate.countDocuments({ requiresLicense: true });
    const nonRegulatedCount = await VisitTemplate.countDocuments({ requiresLicense: false });

    logger.info(`
Visit Templates Seeding Complete:
  - Total: ${totalCount}
  - Regulated (requires license): ${regulatedCount}
  - Non-regulated (care activities): ${nonRegulatedCount}
    `);

    return {
      success: true,
      total: totalCount,
      regulated: regulatedCount,
      nonRegulated: nonRegulatedCount,
      byCategory: categories,
      byVisitType: visitTypes
    };

  } catch (error) {
    logger.error('Visit Templates seeding failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedVisitTemplates()
    .then((result) => {
      console.log('✅ Visit Templates seeding completed successfully');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Visit Templates seeding failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedVisitTemplates };
