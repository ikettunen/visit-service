const express = require('express');
const TaskTemplate = require('../models/TaskTemplate');
const TaskCategory = require('../models/TaskCategory');
const PatientTask = require('../models/PatientTask');
const pino = require('pino');

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * @route POST /api/tasks/seed/categories
 * @desc Initialize default task categories
 * @access Public (for development)
 */
router.post('/categories', async (req, res) => {
  try {
    await TaskCategory.initializeDefaultCategories();
    
    res.status(200).json({
      success: true,
      message: 'Task categories initialized successfully'
    });
  } catch (error) {
    logger.error('Error initializing task categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize task categories'
    });
  }
});

/**
 * @route POST /api/tasks/seed/templates
 * @desc Create sample task templates
 * @access Public (for development)
 */
router.post('/templates', async (req, res) => {
  try {
    const sampleTemplates = [
      // Vital Signs Tasks
      {
        title: 'Take Blood Pressure',
        description: 'Measure and record patient blood pressure using appropriate cuff size',
        category: 'vital_signs',
        priority: 'high',
        estimatedDuration: 5,
        isRequired: true,
        instructions: '1. Ensure patient is seated comfortably\n2. Use appropriate cuff size\n3. Take reading after 5 minutes of rest\n4. Record systolic and diastolic values',
        requiredEquipment: ['Blood pressure cuff', 'Stethoscope'],
        requiredSkills: ['Vital signs certification'],
        tags: ['blood pressure', 'vitals', 'cardiovascular'],
        createdBy: { userId: 'system', userName: 'System' }
      },
      {
        title: 'Temperature Check',
        description: 'Measure and record patient body temperature',
        category: 'vital_signs',
        priority: 'high',
        estimatedDuration: 3,
        isRequired: true,
        instructions: '1. Use clean thermometer\n2. Follow facility protocol for measurement site\n3. Record temperature and note any fever',
        requiredEquipment: ['Digital thermometer', 'Thermometer covers'],
        tags: ['temperature', 'vitals', 'fever'],
        createdBy: { userId: 'system', userName: 'System' }
      },
      {
        title: 'Pulse and Respiratory Rate',
        description: 'Count and record pulse and breathing rate',
        category: 'vital_signs',
        priority: 'high',
        estimatedDuration: 5,
        isRequired: true,
        instructions: '1. Count pulse for full 60 seconds\n2. Count respirations for 30 seconds and multiply by 2\n3. Note rhythm and quality',
        tags: ['pulse', 'respirations', 'vitals'],
        createdBy: { userId: 'system', userName: 'System' }
      },

      // Medication Tasks
      {
        title: 'Administer Morning Medications',
        description: 'Provide scheduled morning medications according to MAR',
        category: 'medication',
        priority: 'critical',
        estimatedDuration: 15,
        isRequired: true,
        instructions: '1. Verify patient identity using two identifiers\n2. Check MAR for correct medications\n3. Follow 5 rights of medication administration\n4. Document administration',
        requiredSkills: ['Medication administration certification'],
        tags: ['medication', 'MAR', 'morning'],
        createdBy: { userId: 'system', userName: 'System' }
      },
      {
        title: 'Blood Sugar Check',
        description: 'Test blood glucose level and administer insulin if needed',
        category: 'medication',
        priority: 'high',
        estimatedDuration: 10,
        instructions: '1. Use clean lancet and test strip\n2. Follow facility glucose testing protocol\n3. Administer insulin per sliding scale if ordered\n4. Document results',
        requiredEquipment: ['Glucometer', 'Test strips', 'Lancets'],
        requiredSkills: ['Glucose testing certification'],
        tags: ['glucose', 'diabetes', 'insulin'],
        createdBy: { userId: 'system', userName: 'System' }
      },

      // Hygiene Tasks
      {
        title: 'Assist with Personal Hygiene',
        description: 'Help patient with bathing, grooming, and personal care',
        category: 'hygiene',
        priority: 'medium',
        estimatedDuration: 45,
        instructions: '1. Ensure privacy and dignity\n2. Use appropriate water temperature\n3. Assist with washing, hair care, and oral hygiene\n4. Apply moisturizer as needed',
        requiredEquipment: ['Towels', 'Soap', 'Shampoo', 'Toothbrush'],
        tags: ['bathing', 'grooming', 'personal care'],
        createdBy: { userId: 'system', userName: 'System' }
      },
      {
        title: 'Oral Care',
        description: 'Provide or assist with oral hygiene care',
        category: 'hygiene',
        priority: 'medium',
        estimatedDuration: 10,
        instructions: '1. Use soft-bristled toothbrush\n2. Use fluoride toothpaste\n3. Assist with flossing if able\n4. Check for oral health issues',
        requiredEquipment: ['Toothbrush', 'Toothpaste', 'Dental floss', 'Mouthwash'],
        tags: ['oral care', 'teeth', 'dental hygiene'],
        createdBy: { userId: 'system', userName: 'System' }
      },

      // Mobility Tasks
      {
        title: 'Assist with Walking',
        description: 'Help patient with ambulation and mobility exercises',
        category: 'mobility',
        priority: 'medium',
        estimatedDuration: 20,
        instructions: '1. Ensure patient has proper footwear\n2. Use gait belt for safety\n3. Walk at patient\'s pace\n4. Monitor for fatigue or distress',
        requiredEquipment: ['Gait belt', 'Non-slip shoes'],
        requiredSkills: ['Safe patient handling'],
        tags: ['walking', 'exercise', 'mobility'],
        createdBy: { userId: 'system', userName: 'System' }
      },
      {
        title: 'Range of Motion Exercises',
        description: 'Perform passive or active range of motion exercises',
        category: 'mobility',
        priority: 'medium',
        estimatedDuration: 25,
        instructions: '1. Follow prescribed exercise plan\n2. Move joints through full range of motion\n3. Stop if patient experiences pain\n4. Document patient response',
        requiredSkills: ['Physical therapy basics'],
        tags: ['ROM', 'exercises', 'joints'],
        createdBy: { userId: 'system', userName: 'System' }
      },

      // Nutrition Tasks
      {
        title: 'Meal Assistance',
        description: 'Help patient with eating and drinking',
        category: 'nutrition',
        priority: 'medium',
        estimatedDuration: 30,
        instructions: '1. Position patient upright\n2. Check for dietary restrictions\n3. Assist with feeding if needed\n4. Monitor intake and document',
        tags: ['feeding', 'meals', 'nutrition'],
        createdBy: { userId: 'system', userName: 'System' }
      },
      {
        title: 'Fluid Intake Monitoring',
        description: 'Monitor and encourage adequate fluid intake',
        category: 'nutrition',
        priority: 'medium',
        estimatedDuration: 5,
        instructions: '1. Offer fluids regularly\n2. Record intake amounts\n3. Note preferences\n4. Report concerns about dehydration',
        tags: ['fluids', 'hydration', 'intake'],
        createdBy: { userId: 'system', userName: 'System' }
      },

      // Safety Tasks
      {
        title: 'Fall Risk Assessment',
        description: 'Evaluate patient for fall risk factors',
        category: 'safety',
        priority: 'high',
        estimatedDuration: 10,
        instructions: '1. Use facility fall risk assessment tool\n2. Check for environmental hazards\n3. Ensure call light is within reach\n4. Document risk level',
        tags: ['fall risk', 'safety', 'assessment'],
        createdBy: { userId: 'system', userName: 'System' }
      },
      {
        title: 'Bed Safety Check',
        description: 'Ensure bed is in safe position with rails up',
        category: 'safety',
        priority: 'high',
        estimatedDuration: 2,
        instructions: '1. Lower bed to lowest position\n2. Raise side rails as appropriate\n3. Ensure brakes are locked\n4. Check call light accessibility',
        tags: ['bed safety', 'rails', 'positioning'],
        createdBy: { userId: 'system', userName: 'System' }
      },

      // Documentation Tasks
      {
        title: 'Daily Care Documentation',
        description: 'Complete daily nursing documentation and care notes',
        category: 'documentation',
        priority: 'medium',
        estimatedDuration: 15,
        instructions: '1. Document all care provided\n2. Note patient response to interventions\n3. Record any changes in condition\n4. Complete required forms',
        tags: ['documentation', 'charting', 'notes'],
        createdBy: { userId: 'system', userName: 'System' }
      },

      // Assessment Tasks
      {
        title: 'Skin Assessment',
        description: 'Examine skin for pressure sores, rashes, or other issues',
        category: 'assessment',
        priority: 'high',
        estimatedDuration: 15,
        instructions: '1. Inspect all skin surfaces\n2. Pay attention to pressure points\n3. Note any changes from previous assessment\n4. Document findings and take photos if needed',
        tags: ['skin', 'pressure sores', 'assessment'],
        createdBy: { userId: 'system', userName: 'System' }
      },
      {
        title: 'Pain Assessment',
        description: 'Evaluate patient pain level and characteristics',
        category: 'assessment',
        priority: 'high',
        estimatedDuration: 10,
        instructions: '1. Use appropriate pain scale\n2. Ask about pain location, quality, and intensity\n3. Note what makes pain better or worse\n4. Document assessment',
        tags: ['pain', 'assessment', 'comfort'],
        createdBy: { userId: 'system', userName: 'System' }
      }
    ];

    // Clear existing templates (for development)
    await TaskTemplate.deleteMany({});
    
    // Insert sample templates
    const templates = await TaskTemplate.insertMany(sampleTemplates);
    
    res.status(200).json({
      success: true,
      message: `Created ${templates.length} sample task templates`,
      data: templates
    });
  } catch (error) {
    logger.error('Error creating sample templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sample templates'
    });
  }
});

/**
 * @route POST /api/tasks/seed/patient-tasks/:patientId
 * @desc Create sample patient tasks
 * @access Public (for development)
 */
router.post('/patient-tasks/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { patientName = 'Test Patient' } = req.body;
    
    // Get some templates to create tasks from
    const templates = await TaskTemplate.find({ isActive: true }).limit(5);
    
    const sampleTasks = [
      // Custom task
      {
        patientId,
        patientName,
        title: 'Monitor for medication side effects',
        description: 'Watch for any adverse reactions to new medication started yesterday',
        category: 'assessment',
        priority: 'high',
        frequency: 'daily',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        instructions: 'Check for nausea, dizziness, rash, or other side effects every 4 hours',
        isUrgent: true,
        tags: ['medication', 'monitoring', 'side effects'],
        createdBy: { userId: 'nurse001', userName: 'Jane Smith', role: 'nurse' }
      },
      // Another custom task
      {
        patientId,
        patientName,
        title: 'Encourage family visit',
        description: 'Patient has been feeling lonely, encourage family to visit',
        category: 'social',
        priority: 'low',
        frequency: 'as_needed',
        startDate: new Date(),
        instructions: 'Contact family members and arrange convenient visiting times',
        tags: ['family', 'social', 'emotional support'],
        createdBy: { userId: 'social001', userName: 'Mary Johnson', role: 'social_worker' }
      }
    ];
    
    // Add tasks from templates
    templates.forEach(template => {
      sampleTasks.push({
        patientId,
        patientName,
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        frequency: 'daily',
        startDate: new Date(),
        estimatedDuration: template.estimatedDuration,
        instructions: template.instructions,
        requiredEquipment: template.requiredEquipment,
        requiredSkills: template.requiredSkills,
        tags: template.tags,
        createdBy: { userId: 'system', userName: 'System', role: 'system' }
      });
    });
    
    // Clear existing tasks for this patient (for development)
    await PatientTask.deleteMany({ patientId });
    
    // Insert sample tasks
    const tasks = await PatientTask.insertMany(sampleTasks);
    
    res.status(200).json({
      success: true,
      message: `Created ${tasks.length} sample patient tasks`,
      data: tasks
    });
  } catch (error) {
    logger.error('Error creating sample patient tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sample patient tasks'
    });
  }
});

/**
 * @route POST /api/tasks/seed/all
 * @desc Initialize all task data (categories, templates, and sample patient tasks)
 * @access Public (for development)
 */
router.post('/all', async (req, res) => {
  try {
    // Initialize categories
    await TaskCategory.initializeDefaultCategories();
    
    // Create sample templates (this will clear existing ones)
    const templatesResponse = await fetch(`${req.protocol}://${req.get('host')}/api/tasks/seed/templates`, {
      method: 'POST'
    });
    
    res.status(200).json({
      success: true,
      message: 'All task data initialized successfully. Use /api/tasks/seed/patient-tasks/:patientId to create sample patient tasks.'
    });
  } catch (error) {
    logger.error('Error initializing all task data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize task data'
    });
  }
});

module.exports = router;