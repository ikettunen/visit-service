const mongoose = require('mongoose');
const VisitType = require('../models/VisitType');
const VisitTemplate = require('../models/VisitTemplate');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// 10 Regulated Visit Types (require licensed healthcare workers)
const regulatedVisitTypes = [
  {
    name: 'medical_assessment',
    displayName: 'Medical Assessment',
    description: 'Comprehensive medical evaluation by licensed healthcare professional',
    category: 'medical',
    icon: 'FaStethoscope',
    color: '#e64a19',
    requiresLicense: true,
    allowedStaffRoles: ['nurse', 'doctor', 'physician_assistant'],
    isBillable: true,
    defaultDuration: 45,
    isActive: true,
    sortOrder: 1
  },
  {
    name: 'medication_administration',
    displayName: 'Medication Administration',
    description: 'Administration of prescribed medications',
    category: 'medical',
    icon: 'FaPills',
    color: '#f4511e',
    requiresLicense: true,
    allowedStaffRoles: ['nurse', 'doctor'],
    isBillable: true,
    defaultDuration: 20,
    isActive: true,
    sortOrder: 2
  },
  {
    name: 'wound_care',
    displayName: 'Wound Care',
    description: 'Professional wound assessment, cleaning, and dressing',
    category: 'medical',
    icon: 'FaBandAid',
    color: '#ff5722',
    requiresLicense: true,
    allowedStaffRoles: ['nurse', 'doctor', 'wound_care_specialist'],
    isBillable: true,
    defaultDuration: 30,
    isActive: true,
    sortOrder: 3
  },
  {
    name: 'vital_signs_monitoring',
    displayName: 'Vital Signs Monitoring',
    description: 'Regular monitoring and recording of vital signs',
    category: 'assessment',
    icon: 'FaHeartbeat',
    color: '#ff7043',
    requiresLicense: true,
    allowedStaffRoles: ['nurse', 'doctor', 'medical_assistant'],
    isBillable: true,
    defaultDuration: 15,
    isActive: true,
    sortOrder: 4
  },
  {
    name: 'physical_therapy',
    displayName: 'Physical Therapy Session',
    description: 'Therapeutic exercises and rehabilitation',
    category: 'therapy',
    icon: 'FaDumbbell',
    color: '#ff8a65',
    requiresLicense: true,
    allowedStaffRoles: ['physical_therapist', 'occupational_therapist'],
    isBillable: true,
    defaultDuration: 60,
    isActive: true,
    sortOrder: 5
  },
  {
    name: 'injection_administration',
    displayName: 'Injection Administration',
    description: 'Administration of injectable medications or vaccines',
    category: 'medical',
    icon: 'FaSyringe',
    color: '#d84315',
    requiresLicense: true,
    allowedStaffRoles: ['nurse', 'doctor'],
    isBillable: true,
    defaultDuration: 15,
    isActive: true,
    sortOrder: 6
  },
  {
    name: 'blood_glucose_monitoring',
    displayName: 'Blood Glucose Monitoring',
    description: 'Blood sugar testing and insulin administration if needed',
    category: 'medical',
    icon: 'FaTint',
    color: '#bf360c',
    requiresLicense: true,
    allowedStaffRoles: ['nurse', 'doctor', 'diabetes_educator'],
    isBillable: true,
    defaultDuration: 20,
    isActive: true,
    sortOrder: 7
  },
  {
    name: 'respiratory_therapy',
    displayName: 'Respiratory Therapy',
    description: 'Breathing treatments, oxygen therapy, and respiratory assessment',
    category: 'therapy',
    icon: 'FaLungs',
    color: '#e64a19',
    requiresLicense: true,
    allowedStaffRoles: ['respiratory_therapist', 'nurse', 'doctor'],
    isBillable: true,
    defaultDuration: 40,
    isActive: true,
    sortOrder: 8
  },
  {
    name: 'catheter_care',
    displayName: 'Catheter Care',
    description: 'Catheter insertion, maintenance, and removal',
    category: 'medical',
    icon: 'FaHospital',
    color: '#f4511e',
    requiresLicense: true,
    allowedStaffRoles: ['nurse', 'doctor'],
    isBillable: true,
    defaultDuration: 25,
    isActive: true,
    sortOrder: 9
  },
  {
    name: 'emergency_response',
    displayName: 'Emergency Response',
    description: 'Immediate medical response to urgent health situations',
    category: 'emergency',
    icon: 'FaAmbulance',
    color: '#dd2c00',
    requiresLicense: true,
    allowedStaffRoles: ['nurse', 'doctor', 'paramedic'],
    isBillable: true,
    defaultDuration: 30,
    isActive: true,
    sortOrder: 10
  }
];

// 5 Non-Regulated Visit Types (care activities)
const nonRegulatedVisitTypes = [
  {
    name: 'personal_care_assistance',
    displayName: 'Personal Care Assistance',
    description: 'Help with bathing, dressing, grooming, and hygiene',
    category: 'care',
    icon: 'FaBath',
    color: '#3f51b5',
    requiresLicense: false,
    allowedStaffRoles: ['care_assistant', 'nursing_aide', 'personal_care_worker'],
    isBillable: false,
    defaultDuration: 45,
    isActive: true,
    sortOrder: 11
  },
  {
    name: 'meal_assistance',
    displayName: 'Meal Assistance',
    description: 'Help with eating, meal preparation, and feeding',
    category: 'care',
    icon: 'FaUtensils',
    color: '#5c6bc0',
    requiresLicense: false,
    allowedStaffRoles: ['care_assistant', 'dietary_aide', 'volunteer'],
    isBillable: false,
    defaultDuration: 30,
    isActive: true,
    sortOrder: 12
  },
  {
    name: 'mobility_assistance',
    displayName: 'Mobility Assistance',
    description: 'Help with walking, transfers, and positioning',
    category: 'care',
    icon: 'FaWalking',
    color: '#7986cb',
    requiresLicense: false,
    allowedStaffRoles: ['care_assistant', 'nursing_aide'],
    isBillable: false,
    defaultDuration: 20,
    isActive: true,
    sortOrder: 13
  },
  {
    name: 'social_activity',
    displayName: 'Social Activity',
    description: 'Recreational activities, companionship, and social engagement',
    category: 'social',
    icon: 'FaUsers',
    color: '#9fa8da',
    requiresLicense: false,
    allowedStaffRoles: ['activity_coordinator', 'volunteer', 'care_assistant'],
    isBillable: false,
    defaultDuration: 60,
    isActive: true,
    sortOrder: 14
  },
  {
    name: 'companionship',
    displayName: 'Companionship Visit',
    description: 'Conversation, reading, games, and emotional support',
    category: 'social',
    icon: 'FaComments',
    color: '#c5cae9',
    requiresLicense: false,
    allowedStaffRoles: ['volunteer', 'companion', 'care_assistant'],
    isBillable: false,
    defaultDuration: 45,
    isActive: true,
    sortOrder: 15
  }
];

async function seedVisitTypes() {
  try {
    logger.info('Starting Visit Types seeding...');

    // Ensure MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nursing_home_visits');
      logger.info('Connected to MongoDB');
    }

    // Clear existing visit types
    await VisitType.deleteMany({});
    logger.info('Cleared existing visit types');

    // Insert regulated visit types
    const regulatedTypes = await VisitType.insertMany(regulatedVisitTypes);
    logger.info(`Created ${regulatedTypes.length} regulated visit types`);

    // Insert non-regulated visit types
    const nonRegulatedTypes = await VisitType.insertMany(nonRegulatedVisitTypes);
    logger.info(`Created ${nonRegulatedTypes.length} non-regulated visit types`);

    // Summary
    const totalCount = await VisitType.countDocuments();
    const regulatedCount = await VisitType.countDocuments({ requiresLicense: true });
    const nonRegulatedCount = await VisitType.countDocuments({ requiresLicense: false });

    logger.info(`
Visit Types Seeding Complete:
  - Total: ${totalCount}
  - Regulated (requires license): ${regulatedCount}
  - Non-regulated (care activities): ${nonRegulatedCount}
    `);

    return {
      success: true,
      total: totalCount,
      regulated: regulatedCount,
      nonRegulated: nonRegulatedCount
    };

  } catch (error) {
    logger.error('Visit Types seeding failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedVisitTypes()
    .then((result) => {
      console.log('✅ Visit Types seeding completed successfully');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Visit Types seeding failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedVisitTypes };
