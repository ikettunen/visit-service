const mongoose = require('mongoose');
const VisitTemplate = require('../models/VisitTemplate');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Visit Templates organized by visit type (5 templates per type)
const visitTemplates = [
  // Medical Assessment Templates (5)
  {
    name: 'comprehensive_medical_assessment',
    displayName: 'Comprehensive Medical Assessment',
    description: 'Full medical evaluation including history, physical exam, and care plan review',
    visitType: 'medical_assessment',
    category: 'medical',
    defaultDuration: 45,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Check vital signs', isRequired: true, order: 1 },
      { taskTitle: 'Review medical history', isRequired: true, order: 2 },
      { taskTitle: 'Physical examination', isRequired: true, order: 3 },
      { taskTitle: 'Review medications', isRequired: true, order: 4 },
      { taskTitle: 'Update care plan', isRequired: true, order: 5 },
      { taskTitle: 'Document findings', isRequired: true, order: 6 }
    ]
  },
  {
    name: 'focused_medical_assessment',
    displayName: 'Focused Medical Assessment',
    description: 'Targeted assessment for specific health concern or symptom',
    visitType: 'medical_assessment',
    category: 'medical',
    defaultDuration: 30,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'post_hospitalization_assessment',
    displayName: 'Post-Hospitalization Assessment',
    description: 'Assessment following hospital discharge or ER visit',
    visitType: 'medical_assessment',
    category: 'medical',
    defaultDuration: 40,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'quarterly_medical_review',
    displayName: 'Quarterly Medical Review',
    description: 'Routine quarterly health status evaluation',
    visitType: 'medical_assessment',
    category: 'assessment',
    defaultDuration: 35,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'new_resident_assessment',
    displayName: 'New Resident Assessment',
    description: 'Initial comprehensive assessment for new facility residents',
    visitType: 'medical_assessment',
    category: 'assessment',
    defaultDuration: 60,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },

  // Medication Administration Templates (5)
  {
    name: 'routine_medication_administration',
    displayName: 'Routine Medication Administration',
    description: 'Scheduled medication administration per care plan',
    visitType: 'medication_administration',
    category: 'medical',
    defaultDuration: 15,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Verify patient identity', isRequired: true, order: 1 },
      { taskTitle: 'Check medication order', isRequired: true, order: 2 },
      { taskTitle: 'Administer medication', isRequired: true, order: 3 },
      { taskTitle: 'Document administration', isRequired: true, order: 4 },
      { taskTitle: 'Monitor for adverse reactions', isRequired: false, order: 5 }
    ]
  },
  {
    name: 'prn_medication_administration',
    displayName: 'PRN Medication Administration',
    description: 'As-needed medication administration based on patient request or symptoms',
    visitType: 'medication_administration',
    category: 'medical',
    defaultDuration: 20,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'controlled_substance_administration',
    displayName: 'Controlled Substance Administration',
    description: 'Administration of controlled medications with required documentation',
    visitType: 'medication_administration',
    category: 'medical',
    defaultDuration: 25,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'iv_medication_administration',
    displayName: 'IV Medication Administration',
    description: 'Intravenous medication administration and line management',
    visitType: 'medication_administration',
    category: 'medical',
    defaultDuration: 30,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'medication_reconciliation',
    displayName: 'Medication Reconciliation',
    description: 'Review and update medication list, check for interactions',
    visitType: 'medication_administration',
    category: 'assessment',
    defaultDuration: 20,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },

  // Wound Care Templates (5)
  {
    name: 'pressure_ulcer_care',
    displayName: 'Pressure Ulcer Care',
    description: 'Assessment and treatment of pressure injuries',
    visitType: 'wound_care',
    category: 'medical',
    defaultDuration: 30,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'surgical_wound_care',
    displayName: 'Surgical Wound Care',
    description: 'Post-operative wound assessment and dressing change',
    visitType: 'wound_care',
    category: 'medical',
    defaultDuration: 25,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'diabetic_wound_care',
    displayName: 'Diabetic Wound Care',
    description: 'Specialized care for diabetic foot ulcers and wounds',
    visitType: 'wound_care',
    category: 'medical',
    defaultDuration: 35,
    requiredStaffRole: 'wound_care_specialist',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'wound_vac_management',
    displayName: 'Wound VAC Management',
    description: 'Negative pressure wound therapy device management',
    visitType: 'wound_care',
    category: 'medical',
    defaultDuration: 40,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'minor_wound_care',
    displayName: 'Minor Wound Care',
    description: 'Care for minor cuts, abrasions, and skin tears',
    visitType: 'wound_care',
    category: 'medical',
    defaultDuration: 15,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },

  // Vital Signs Monitoring Templates (5)
  {
    name: 'routine_vital_signs',
    displayName: 'Routine Vital Signs Check',
    description: 'Standard vital signs monitoring per care plan',
    visitType: 'vital_signs_monitoring',
    category: 'assessment',
    defaultDuration: 10,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'cardiac_monitoring',
    displayName: 'Cardiac Monitoring',
    description: 'Enhanced vital signs with cardiac assessment',
    visitType: 'vital_signs_monitoring',
    category: 'assessment',
    defaultDuration: 20,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'post_fall_vitals',
    displayName: 'Post-Fall Vital Signs',
    description: 'Vital signs assessment following a fall or injury',
    visitType: 'vital_signs_monitoring',
    category: 'assessment',
    defaultDuration: 15,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'hypertension_monitoring',
    displayName: 'Hypertension Monitoring',
    description: 'Blood pressure monitoring for hypertensive patients',
    visitType: 'vital_signs_monitoring',
    category: 'assessment',
    defaultDuration: 15,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'fever_monitoring',
    displayName: 'Fever Monitoring',
    description: 'Temperature monitoring for febrile patients',
    visitType: 'vital_signs_monitoring',
    category: 'assessment',
    defaultDuration: 10,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },

  // Physical Therapy Templates (5)
  {
    name: 'gait_training',
    displayName: 'Gait Training Session',
    description: 'Walking and balance training exercises',
    visitType: 'physical_therapy',
    category: 'therapy',
    defaultDuration: 45,
    requiredStaffRole: 'physical_therapist',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'strength_training',
    displayName: 'Strength Training',
    description: 'Resistance exercises to improve muscle strength',
    visitType: 'physical_therapy',
    category: 'therapy',
    defaultDuration: 60,
    requiredStaffRole: 'physical_therapist',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'range_of_motion',
    displayName: 'Range of Motion Exercises',
    description: 'Joint mobility and flexibility exercises',
    visitType: 'physical_therapy',
    category: 'therapy',
    defaultDuration: 30,
    requiredStaffRole: 'physical_therapist',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'post_surgery_rehab',
    displayName: 'Post-Surgery Rehabilitation',
    description: 'Rehabilitation following surgical procedures',
    visitType: 'physical_therapy',
    category: 'therapy',
    defaultDuration: 60,
    requiredStaffRole: 'physical_therapist',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'fall_prevention_therapy',
    displayName: 'Fall Prevention Therapy',
    description: 'Balance and coordination exercises to prevent falls',
    visitType: 'physical_therapy',
    category: 'therapy',
    defaultDuration: 45,
    requiredStaffRole: 'physical_therapist',
    requiresLicense: true,
    isActive: true
  },

  // Injection Administration Templates (5)
  {
    name: 'insulin_injection',
    displayName: 'Insulin Injection',
    description: 'Subcutaneous insulin administration',
    visitType: 'injection_administration',
    category: 'medical',
    defaultDuration: 10,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'vaccine_administration',
    displayName: 'Vaccine Administration',
    description: 'Immunization administration and documentation',
    visitType: 'injection_administration',
    category: 'medical',
    defaultDuration: 15,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'anticoagulant_injection',
    displayName: 'Anticoagulant Injection',
    description: 'Blood thinner injection (e.g., Lovenox, Heparin)',
    visitType: 'injection_administration',
    category: 'medical',
    defaultDuration: 15,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'vitamin_b12_injection',
    displayName: 'Vitamin B12 Injection',
    description: 'Intramuscular vitamin B12 supplementation',
    visitType: 'injection_administration',
    category: 'medical',
    defaultDuration: 10,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'pain_management_injection',
    displayName: 'Pain Management Injection',
    description: 'Injectable pain medication administration',
    visitType: 'injection_administration',
    category: 'medical',
    defaultDuration: 20,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },

  // Blood Glucose Monitoring Templates (5)
  {
    name: 'routine_glucose_check',
    displayName: 'Routine Glucose Check',
    description: 'Scheduled blood glucose monitoring',
    visitType: 'blood_glucose_monitoring',
    category: 'assessment',
    defaultDuration: 10,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'ac_hs_glucose_monitoring',
    displayName: 'AC/HS Glucose Monitoring',
    description: 'Before meals and bedtime glucose checks',
    visitType: 'blood_glucose_monitoring',
    category: 'assessment',
    defaultDuration: 15,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'hypoglycemia_response',
    displayName: 'Hypoglycemia Response',
    description: 'Blood glucose check and treatment for low blood sugar',
    visitType: 'blood_glucose_monitoring',
    category: 'medical',
    defaultDuration: 20,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'hyperglycemia_management',
    displayName: 'Hyperglycemia Management',
    description: 'Blood glucose check and insulin sliding scale administration',
    visitType: 'blood_glucose_monitoring',
    category: 'medical',
    defaultDuration: 25,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'diabetes_education_check',
    displayName: 'Diabetes Education Check',
    description: 'Glucose monitoring with patient education',
    visitType: 'blood_glucose_monitoring',
    category: 'assessment',
    defaultDuration: 30,
    requiredStaffRole: 'diabetes_educator',
    requiresLicense: true,
    isActive: true
  },

  // Respiratory Therapy Templates (5)
  {
    name: 'nebulizer_treatment',
    displayName: 'Nebulizer Treatment',
    description: 'Breathing treatment with nebulized medication',
    visitType: 'respiratory_therapy',
    category: 'therapy',
    defaultDuration: 30,
    requiredStaffRole: 'respiratory_therapist',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'oxygen_therapy_management',
    displayName: 'Oxygen Therapy Management',
    description: 'Oxygen delivery system setup and monitoring',
    visitType: 'respiratory_therapy',
    category: 'therapy',
    defaultDuration: 25,
    requiredStaffRole: 'respiratory_therapist',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'chest_physiotherapy',
    displayName: 'Chest Physiotherapy',
    description: 'Chest percussion and postural drainage',
    visitType: 'respiratory_therapy',
    category: 'therapy',
    defaultDuration: 45,
    requiredStaffRole: 'respiratory_therapist',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'incentive_spirometry',
    displayName: 'Incentive Spirometry',
    description: 'Breathing exercises with spirometer',
    visitType: 'respiratory_therapy',
    category: 'therapy',
    defaultDuration: 20,
    requiredStaffRole: 'respiratory_therapist',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'copd_management',
    displayName: 'COPD Management',
    description: 'Comprehensive respiratory care for COPD patients',
    visitType: 'respiratory_therapy',
    category: 'therapy',
    defaultDuration: 50,
    requiredStaffRole: 'respiratory_therapist',
    requiresLicense: true,
    isActive: true
  },

  // Catheter Care Templates (5)
  {
    name: 'foley_catheter_care',
    displayName: 'Foley Catheter Care',
    description: 'Urinary catheter maintenance and cleaning',
    visitType: 'catheter_care',
    category: 'medical',
    defaultDuration: 20,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'catheter_insertion',
    displayName: 'Catheter Insertion',
    description: 'Sterile urinary catheter insertion procedure',
    visitType: 'catheter_care',
    category: 'medical',
    defaultDuration: 30,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'catheter_removal',
    displayName: 'Catheter Removal',
    description: 'Urinary catheter removal and post-removal assessment',
    visitType: 'catheter_care',
    category: 'medical',
    defaultDuration: 20,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'suprapubic_catheter_care',
    displayName: 'Suprapubic Catheter Care',
    description: 'Care and maintenance of suprapubic catheter',
    visitType: 'catheter_care',
    category: 'medical',
    defaultDuration: 25,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'catheter_irrigation',
    displayName: 'Catheter Irrigation',
    description: 'Bladder irrigation through catheter',
    visitType: 'catheter_care',
    category: 'medical',
    defaultDuration: 25,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },

  // Emergency Response Templates (5)
  {
    name: 'fall_response',
    displayName: 'Fall Response',
    description: 'Immediate assessment and care following a fall',
    visitType: 'emergency_response',
    category: 'emergency',
    defaultDuration: 30,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'chest_pain_response',
    displayName: 'Chest Pain Response',
    description: 'Emergency cardiac assessment and intervention',
    visitType: 'emergency_response',
    category: 'emergency',
    defaultDuration: 30,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'respiratory_distress_response',
    displayName: 'Respiratory Distress Response',
    description: 'Emergency breathing difficulty assessment and treatment',
    visitType: 'emergency_response',
    category: 'emergency',
    defaultDuration: 30,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'altered_mental_status',
    displayName: 'Altered Mental Status Response',
    description: 'Emergency assessment for confusion or consciousness changes',
    visitType: 'emergency_response',
    category: 'emergency',
    defaultDuration: 30,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },
  {
    name: 'bleeding_response',
    displayName: 'Bleeding Response',
    description: 'Emergency care for significant bleeding or hemorrhage',
    visitType: 'emergency_response',
    category: 'emergency',
    defaultDuration: 25,
    requiredStaffRole: 'nurse',
    requiresLicense: true,
    isActive: true
  },

  // Personal Care Assistance Templates (5)
  {
    name: 'morning_care_routine',
    displayName: 'Morning Care Routine',
    description: 'Morning bathing, dressing, and grooming assistance',
    visitType: 'personal_care_assistance',
    category: 'care',
    defaultDuration: 45,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true,
    defaultTasks: [
      { taskTitle: 'Wake patient gently', isRequired: true, order: 1 },
      { taskTitle: 'Assist with toileting', isRequired: true, order: 2 },
      { taskTitle: 'Help with bathing/washing', isRequired: true, order: 3 },
      { taskTitle: 'Assist with dressing', isRequired: true, order: 4 },
      { taskTitle: 'Help with grooming', isRequired: true, order: 5 },
      { taskTitle: 'Prepare for breakfast', isRequired: false, order: 6 }
    ]
  },
  {
    name: 'evening_care_routine',
    displayName: 'Evening Care Routine',
    description: 'Evening hygiene and bedtime preparation',
    visitType: 'personal_care_assistance',
    category: 'care',
    defaultDuration: 30,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'shower_assistance',
    displayName: 'Shower Assistance',
    description: 'Help with showering and personal hygiene',
    visitType: 'personal_care_assistance',
    category: 'care',
    defaultDuration: 40,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'toileting_assistance',
    displayName: 'Toileting Assistance',
    description: 'Help with bathroom use and incontinence care',
    visitType: 'personal_care_assistance',
    category: 'care',
    defaultDuration: 20,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'grooming_assistance',
    displayName: 'Grooming Assistance',
    description: 'Hair care, shaving, nail care, and appearance',
    visitType: 'personal_care_assistance',
    category: 'care',
    defaultDuration: 25,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },

  // Meal Assistance Templates (5)
  {
    name: 'breakfast_assistance',
    displayName: 'Breakfast Assistance',
    description: 'Help with eating breakfast meal',
    visitType: 'meal_assistance',
    category: 'care',
    defaultDuration: 30,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'lunch_assistance',
    displayName: 'Lunch Assistance',
    description: 'Help with eating lunch meal',
    visitType: 'meal_assistance',
    category: 'care',
    defaultDuration: 30,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'dinner_assistance',
    displayName: 'Dinner Assistance',
    description: 'Help with eating dinner meal',
    visitType: 'meal_assistance',
    category: 'care',
    defaultDuration: 30,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'feeding_assistance',
    displayName: 'Feeding Assistance',
    description: 'Full feeding support for dependent residents',
    visitType: 'meal_assistance',
    category: 'care',
    defaultDuration: 40,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'snack_assistance',
    displayName: 'Snack Assistance',
    description: 'Help with between-meal snacks and hydration',
    visitType: 'meal_assistance',
    category: 'care',
    defaultDuration: 15,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },

  // Mobility Assistance Templates (5)
  {
    name: 'transfer_assistance',
    displayName: 'Transfer Assistance',
    description: 'Help with bed to chair transfers',
    visitType: 'mobility_assistance',
    category: 'care',
    defaultDuration: 15,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'walking_assistance',
    displayName: 'Walking Assistance',
    description: 'Supervised walking and ambulation support',
    visitType: 'mobility_assistance',
    category: 'care',
    defaultDuration: 20,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'wheelchair_assistance',
    displayName: 'Wheelchair Assistance',
    description: 'Help with wheelchair mobility and positioning',
    visitType: 'mobility_assistance',
    category: 'care',
    defaultDuration: 15,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'repositioning_care',
    displayName: 'Repositioning Care',
    description: 'Regular repositioning to prevent pressure ulcers',
    visitType: 'mobility_assistance',
    category: 'care',
    defaultDuration: 10,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'lift_assistance',
    displayName: 'Mechanical Lift Assistance',
    description: 'Transfer using mechanical lift equipment',
    visitType: 'mobility_assistance',
    category: 'care',
    defaultDuration: 20,
    requiredStaffRole: 'care_assistant',
    requiresLicense: false,
    isActive: true
  },

  // Social Activity Templates (5)
  {
    name: 'group_activity',
    displayName: 'Group Activity Session',
    description: 'Participation in group recreational activities',
    visitType: 'social_activity',
    category: 'social',
    defaultDuration: 60,
    requiredStaffRole: 'activity_coordinator',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'arts_and_crafts',
    displayName: 'Arts and Crafts',
    description: 'Creative art projects and crafts',
    visitType: 'social_activity',
    category: 'social',
    defaultDuration: 60,
    requiredStaffRole: 'activity_coordinator',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'music_therapy',
    displayName: 'Music Therapy',
    description: 'Music listening, singing, or instrument playing',
    visitType: 'social_activity',
    category: 'social',
    defaultDuration: 45,
    requiredStaffRole: 'activity_coordinator',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'exercise_class',
    displayName: 'Exercise Class',
    description: 'Group exercise and movement activities',
    visitType: 'social_activity',
    category: 'social',
    defaultDuration: 45,
    requiredStaffRole: 'activity_coordinator',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'game_activity',
    displayName: 'Game Activity',
    description: 'Board games, cards, or other recreational games',
    visitType: 'social_activity',
    category: 'social',
    defaultDuration: 60,
    requiredStaffRole: 'activity_coordinator',
    requiresLicense: false,
    isActive: true
  },

  // Companionship Templates (5)
  {
    name: 'one_on_one_visit',
    displayName: 'One-on-One Visit',
    description: 'Individual companionship and conversation',
    visitType: 'companionship',
    category: 'social',
    defaultDuration: 45,
    requiredStaffRole: 'volunteer',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'reading_companionship',
    displayName: 'Reading Companionship',
    description: 'Reading books, newspapers, or magazines together',
    visitType: 'companionship',
    category: 'social',
    defaultDuration: 30,
    requiredStaffRole: 'volunteer',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'reminiscence_therapy',
    displayName: 'Reminiscence Therapy',
    description: 'Sharing memories and life stories',
    visitType: 'companionship',
    category: 'social',
    defaultDuration: 45,
    requiredStaffRole: 'companion',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'outdoor_companionship',
    displayName: 'Outdoor Companionship',
    description: 'Outdoor walks or patio time with companion',
    visitType: 'companionship',
    category: 'social',
    defaultDuration: 30,
    requiredStaffRole: 'volunteer',
    requiresLicense: false,
    isActive: true
  },
  {
    name: 'spiritual_support',
    displayName: 'Spiritual Support',
    description: 'Prayer, meditation, or spiritual conversation',
    visitType: 'companionship',
    category: 'social',
    defaultDuration: 30,
    requiredStaffRole: 'volunteer',
    requiresLicense: false,
    isActive: true
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
