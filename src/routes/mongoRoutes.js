const express = require('express');
const mongoose = require('mongoose');
const Visit = require('../models/Visit');
const pino = require('pino');

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * @route POST /api/mongo/setup
 * @desc Setup MongoDB collections and indexes
 * @access Private
 */
router.post('/setup', async (req, res) => {
  try {
    logger.info('MongoDB setup request received');
    
    // Ensure connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nursing_home_visits');
    }
    
    // Create collection and indexes
    await Visit.createCollection();
    await Visit.createIndexes();
    
    // Get collection stats
    let stats = {};
    try {
      stats = await mongoose.connection.db.collection('visit_data').stats();
    } catch (statsError) {
      // If stats() fails, get basic info instead
      const count = await mongoose.connection.db.collection('visit_data').countDocuments();
      stats = { count: count, size: 0, avgObjSize: 0 };
    }
    
    res.status(200).json({
      success: true,
      message: 'MongoDB setup completed successfully',
      data: {
        database: mongoose.connection.name,
        collection: 'visit_data',
        indexes: await mongoose.connection.db.collection('visit_data').indexes(),
        stats: {
          documents: stats.count || 0,
          size: stats.size || 0,
          avgObjSize: stats.avgObjSize || 0
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('MongoDB setup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'MongoDB setup failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/mongo/seed-types
 * @desc Seed MongoDB with visit types
 * @access Private
 */
router.post('/seed-types', async (req, res) => {
  try {
    logger.info('Visit types seeding request received');
    
    const { seedVisitTypes } = require('../db/seedVisitTypes');
    const result = await seedVisitTypes();
    
    res.status(200).json({
      success: true,
      message: `Visit types seeding completed. ${result.total} types created (${result.regulated} regulated, ${result.nonRegulated} non-regulated).`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Visit types seeding failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Visit types seeding failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/mongo/seed-templates
 * @desc Seed MongoDB with visit templates
 * @access Private
 */
router.post('/seed-templates', async (req, res) => {
  try {
    logger.info('Visit templates seeding request received');
    
    const { seedVisitTemplates } = require('../db/seedVisitTemplates');
    const result = await seedVisitTemplates();
    
    res.status(200).json({
      success: true,
      message: `Visit templates seeding completed. ${result.total} templates created (${result.regulated} regulated, ${result.nonRegulated} non-regulated).`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Visit templates seeding failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Visit templates seeding failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/mongo/seed
 * @desc Seed MongoDB with sample visit data, visit types, and visit templates
 * @access Private
 */
router.post('/seed', async (req, res) => {
  try {
    logger.info('MongoDB seeding request received');
    
    // Ensure connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nursing_home_visits');
    }
    
    // Seed visit types first
    logger.info('Seeding visit types...');
    const { seedVisitTypes } = require('../db/seedVisitTypes');
    const visitTypesResult = await seedVisitTypes();
    logger.info(`Visit types seeded: ${visitTypesResult.total} types created`);
    
    // Seed visit templates
    logger.info('Seeding visit templates...');
    const { seedVisitTemplates } = require('../db/seedVisitTemplates');
    const templatesResult = await seedVisitTemplates();
    logger.info(`Visit templates seeded: ${templatesResult.total} templates created`);
    
    // Clear existing visit data
    await Visit.deleteMany({});
    
    // Get patient IDs from MySQL first (these should exist from SQL seeding)
    // Using hardcoded patient IDs that match the SQL seed data
    const patientData = [
      { id: 'patient-001', name: 'Matti Virtanen', room: '101' },
      { id: 'patient-002', name: 'Aino Korhonen', room: '102' },
      { id: 'patient-003', name: 'Eino Mäkinen', room: '103' },
      { id: 'patient-004', name: 'Helmi Nieminen', room: '104' },
      { id: 'patient-005', name: 'Veikko Lahtinen', room: '105' },
      { id: 'patient-006', name: 'Sirkka Rantanen', room: '106' },
      { id: 'patient-007', name: 'Kalevi Salo', room: '107' },
      { id: 'patient-008', name: 'Liisa Heikkinen', room: '108' },
      { id: 'patient-009', name: 'Pentti Koskinen', room: '109' },
      { id: 'patient-010', name: 'Marjatta Laine', room: '110' }
    ];

    const nurses = [
      { id: 'S0001', name: 'Anna Virtanen' },
      { id: 'S0003', name: 'Liisa Mäkinen' }
    ];

    const visitTypes = [
      { name: 'medical_assessment', displayName: 'Medical Assessment', isRegulated: true, requiresLicense: true },
      { name: 'medication_administration', displayName: 'Medication Administration', isRegulated: true, requiresLicense: true },
      { name: 'wound_care', displayName: 'Wound Care', isRegulated: true, requiresLicense: true },
      { name: 'vital_signs_monitoring', displayName: 'Vital Signs Monitoring', isRegulated: true, requiresLicense: true },
      { name: 'personal_care_assistance', displayName: 'Personal Care Assistance', isRegulated: false, requiresLicense: false },
      { name: 'meal_assistance', displayName: 'Meal Assistance', isRegulated: false, requiresLicense: false },
      { name: 'mobility_assistance', displayName: 'Mobility Assistance', isRegulated: false, requiresLicense: false }
    ];

    const taskTemplates = [
      { id: 'task-001', title: 'Check vital signs', category: 'assessment' },
      { id: 'task-002', title: 'Administer medication', category: 'medical' },
      { id: 'task-003', title: 'Wound care', category: 'medical' },
      { id: 'task-004', title: 'Physical therapy', category: 'therapy' },
      { id: 'task-005', title: 'Bathing assistance', category: 'care' },
      { id: 'task-006', title: 'Meal assistance', category: 'care' },
      { id: 'task-007', title: 'Blood glucose test', category: 'assessment' },
      { id: 'task-008', title: 'Mobility assistance', category: 'care' },
      { id: 'task-009', title: 'Update care notes', category: 'assessment' },
      { id: 'task-010', title: 'Oxygen therapy', category: 'therapy' }
    ];

    // Generate sample visits
    const sampleVisits = [];
    const now = new Date();

    // Create 10-15 visits per patient
    for (const patient of patientData) {
      const numVisits = Math.floor(Math.random() * 6) + 10; // 10-15 visits
      
      for (let i = 0; i < numVisits; i++) {
        // Spread visits over past 30 days and next 7 days
        const daysOffset = i - Math.floor(numVisits * 0.7);
        const scheduledTime = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
        
        // Determine status
        let status, startTime, endTime;
        if (daysOffset < -1) {
          status = 'completed';
          startTime = new Date(scheduledTime.getTime() + 5 * 60 * 1000);
          endTime = new Date(startTime.getTime() + 25 * 60 * 1000);
        } else if (daysOffset === -1 || daysOffset === 0) {
          status = Math.random() > 0.5 ? 'inProgress' : 'completed';
          startTime = new Date(scheduledTime.getTime() + 5 * 60 * 1000);
          endTime = status === 'completed' ? new Date(startTime.getTime() + 25 * 60 * 1000) : null;
        } else {
          status = 'planned';
          startTime = null;
          endTime = null;
        }

        // Random nurse
        const nurse = nurses[Math.floor(Math.random() * nurses.length)];

        // Random visit type
        const visitTypeData = visitTypes[Math.floor(Math.random() * visitTypes.length)];

        // Create 3-7 tasks
        const numTasks = Math.floor(Math.random() * 5) + 3;
        const taskCompletions = [];
        
        for (let j = 0; j < numTasks; j++) {
          const task = taskTemplates[Math.floor(Math.random() * taskTemplates.length)];
          const taskCompleted = status === 'completed' ? (Math.random() > 0.1) : 
                               (status === 'inProgress' ? (Math.random() > 0.5) : false);
          
          taskCompletions.push({
            taskId: `${task.id}-${i}-${j}`,
            taskType: 'template',
            taskTitle: task.title,
            taskCategory: task.category,
            priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            completed: taskCompleted,
            completedAt: taskCompleted ? new Date(startTime.getTime() + j * 5 * 60 * 1000) : null,
            completedBy: taskCompleted ? { userId: nurse.id, userName: nurse.name } : null,
            notes: taskCompleted ? 'Task completed successfully' : ''
          });
        }

        // Vital signs for completed visits
        const vitalSigns = status === 'completed' ? {
          temperature: 36.5 + Math.random() * 2,
          heartRate: 60 + Math.floor(Math.random() * 40),
          respiratoryRate: 12 + Math.floor(Math.random() * 8),
          systolicBP: 120 + Math.floor(Math.random() * 40),
          diastolicBP: 70 + Math.floor(Math.random() * 20),
          oxygenSaturation: 92 + Math.floor(Math.random() * 8),
          notes: 'Vital signs recorded'
        } : null;

        sampleVisits.push({
          patientId: patient.id,
          patientName: patient.name,
          nurseId: nurse.id,
          nurseName: nurse.name,
          scheduledTime,
          startTime,
          endTime,
          status,
          location: patient.room,
          visitType: visitTypeData.name,
          isRegulated: visitTypeData.isRegulated,
          requiresLicense: visitTypeData.requiresLicense,
          taskCompletions,
          vitalSigns,
          notes: `${visitTypeData.displayName} - ${status === 'completed' ? 'Completed' : status === 'inProgress' ? 'In progress' : 'Scheduled'} visit for ${patient.name}`,
          hasAudioRecording: status === 'completed' && Math.random() > 0.7,
          audioRecordingPath: status === 'completed' && Math.random() > 0.7 ? `/recordings/visit-${patient.id}-${i}.mp3` : null,
          photos: status === 'completed' && Math.random() > 0.8 ? [`/photos/visit-${patient.id}-${i}-1.jpg`] : [],
          syncStatus: 'synced'
        });
      }
    }
    
    // Insert sample data
    const insertedVisits = await Visit.insertMany(sampleVisits);
    
    // Get final count
    const totalCount = await Visit.countDocuments();
    
    res.status(200).json({
      success: true,
      message: `MongoDB seeding completed successfully. ${visitTypesResult.total} visit types, ${templatesResult.total} visit templates, and ${totalCount} visits created.`,
      data: {
        visitTypes: visitTypesResult.total,
        visitTemplates: templatesResult.total,
        visitsCreated: insertedVisits.length,
        totalVisits: totalCount,
        sampleVisitIds: insertedVisits.map(v => v._id).slice(0, 5) // Only show first 5 IDs
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('MongoDB seeding failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'MongoDB seeding failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/mongo/reset
 * @desc Reset MongoDB (setup + seed)
 * @access Private
 */
router.post('/reset', async (req, res) => {
  try {
    logger.info('MongoDB reset request received');
    
    // Setup first
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nursing_home_visits');
    await Visit.createCollection();
    await Visit.createIndexes();
    
    // Then seed
    await Visit.deleteMany({});
    
    // Use the same sample data as seed endpoint
    const sampleVisits = [
      {
        patientId: '338db3fc-a7cb-468b-a998-90c0c3a700ce',
        patientName: 'Aino Korhonen',
        nurseId: 'S0001',
        nurseName: 'Anna Virtanen',
        scheduledTime: new Date('2025-10-28T10:00:00Z'),
        startTime: new Date('2025-10-28T10:05:00Z'),
        endTime: new Date('2025-10-28T10:30:00Z'),
        status: 'completed',
        location: 'Room 102',
        taskCompletions: [
          {
            taskId: 'task-001',
            taskTitle: 'Check vital signs',
            completed: true,
            completedAt: new Date('2025-10-28T10:10:00Z'),
            notes: 'All vitals normal'
          }
        ],
        vitalSigns: {
          temperature: 36.8,
          heartRate: 72,
          systolicBP: 130,
          diastolicBP: 85,
          oxygenSaturation: 98
        },
        notes: 'Regular morning visit completed successfully.',
        syncStatus: 'synced'
      }
    ];
    
    await Visit.insertMany(sampleVisits);
    const totalCount = await Visit.countDocuments();
    
    res.status(200).json({
      success: true,
      message: 'MongoDB reset completed successfully (setup + seed)',
      data: {
        visitsCreated: sampleVisits.length,
        totalVisits: totalCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('MongoDB reset failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'MongoDB reset failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/mongo/status
 * @desc Get MongoDB connection and collection status
 * @access Private
 */
router.get('/status', async (req, res) => {
  try {
    const connectionState = mongoose.connection.readyState;
    const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    let collectionStats = null;
    if (connectionState === 1) {
      try {
        let stats = {};
        try {
          stats = await mongoose.connection.db.collection('visit_data').stats();
        } catch (statsError) {
          // If stats() fails, get basic info instead
          const count = await mongoose.connection.db.collection('visit_data').countDocuments();
          stats = { count: count, size: 0, avgObjSize: 0 };
        }
        
        collectionStats = {
          documents: stats.count || 0,
          size: stats.size || 0,
          avgObjSize: stats.avgObjSize || 0,
          indexes: (await mongoose.connection.db.collection('visit_data').indexes()).length
        };
      } catch (statsError) {
        collectionStats = { error: 'Collection does not exist or stats unavailable' };
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        connection: {
          state: stateNames[connectionState] || 'unknown',
          database: mongoose.connection.name || 'not connected',
          host: mongoose.connection.host || 'not connected'
        },
        collection: collectionStats
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('MongoDB status check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'MongoDB status check failed',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;