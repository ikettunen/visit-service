const Encounter = require('../models/Encounter');
const VisitTask = require('../models/VisitTask');
const Visit = require('../models/Visit'); // MongoDB model for flexible data
const { executeQuery } = require('../config/database');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Get all visits with pagination and filtering
async function getVisits(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build MongoDB query filters
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.patient_id) query.patientId = req.query.patient_id;
    if (req.query.nurse_id) query.nurseId = req.query.nurse_id;
    if (req.query.visit_type || req.query.type) {
      query.visitType = req.query.visit_type || req.query.type;
    }
    if (req.query.date_from || req.query.date_to) {
      query.scheduledTime = {};
      if (req.query.date_from) query.scheduledTime.$gte = new Date(req.query.date_from);
      if (req.query.date_to) query.scheduledTime.$lte = new Date(req.query.date_to);
    }
    
    // Special handling for date=today
    if (req.query.date === 'today') {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      query.scheduledTime = { $gte: startOfDay, $lt: endOfDay };
    }

    // Fetch from MongoDB
    const [visits, total] = await Promise.all([
      Visit.find(query)
        .sort({ scheduledTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Visit.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      data: visits,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages
      }
    });
  } catch (error) {
    logger.error('Error fetching visits:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_VISITS_ERROR',
        message: 'Failed to fetch visits',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Get visit by ID
async function getVisitById(req, res) {
  try {
    const { id } = req.params;

    const encounter = await Encounter.findById(id);
    if (!encounter) {
      return res.status(404).json({
        error: {
          code: 'VISIT_NOT_FOUND',
          message: `Visit with ID ${id} not found`,
          details: {
            service: 'visits-service',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    // Get associated tasks
    const tasks = await VisitTask.findByVisitId(encounter.id);
    const stats = await VisitTask.getCompletionStats(encounter.id);

    // Try to get MongoDB flexible data if exists
    let flexibleData = null;
    try {
      flexibleData = await Visit.findOne({
        $or: [
          { _id: id },
          { offlineId: id }
        ]
      });
    } catch (mongoError) {
      logger.warn('MongoDB visit data not found:', mongoError.message);
    }

    const enrichedEncounter = {
      ...encounter,
      taskCompletions: tasks,
      completionStats: stats,
      flexibleData: flexibleData ? {
        vitalSigns: flexibleData.vitalSigns,
        photos: flexibleData.photos,
        syncStatus: flexibleData.syncStatus,
        deviceId: flexibleData.deviceId
      } : null
    };

    res.status(200).json({ data: enrichedEncounter });
  } catch (error) {
    logger.error('Error fetching visit by ID:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_VISIT_ERROR',
        message: 'Failed to fetch visit',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Get visits by patient ID with tasks (MongoDB only)
async function getVisitsByPatientWithTasks(req, res) {
  try {
    logger.info('getVisitsByPatientWithTasks function called');
    const { patientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    logger.info(`Fetching visits with tasks for patient ${patientId}, page ${page}, limit ${limit}`);

    // Query MongoDB only (has full data including taskCompletions)
    const [mongoVisits, total] = await Promise.all([
      Visit.find({ patientId })
        .sort({ scheduledTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Visit.countDocuments({ patientId })
    ]);

    logger.info(`Found ${mongoVisits.length} visits in MongoDB for patient ${patientId}`);
    
    if (mongoVisits.length > 0) {
      logger.info(`First visit sample:`, {
        id: mongoVisits[0]._id,
        patientId: mongoVisits[0].patientId,
        patientName: mongoVisits[0].patientName,
        taskCompletions: mongoVisits[0].taskCompletions?.length || 0,
        status: mongoVisits[0].status
      });
    }
    
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      data: mongoVisits,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching visits with tasks:', error.message);
    res.status(500).json({
      error: {
        code: 'FETCH_PATIENT_VISITS_WITH_TASKS_ERROR',
        message: 'Failed to fetch patient visits with tasks',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString(),
          patientId: req.params.patientId,
          error: error.message
        }
      }
    });
  }
}

// Get visits by patient ID (enhanced version with MongoDB data)
async function getVisitsByPatient(req, res) {
  try {
    logger.info('getVisitsByPatient function called');
    const { patientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    logger.info(`Fetching visits for patient ${patientId}, page ${page}, limit ${limit}`);

    // Try MongoDB first (has full data including taskCompletions)
    try {
      logger.info(`Searching MongoDB for patient: ${patientId}`);
      
      // Debug: Check what patients exist in MongoDB
      const allPatients = await Visit.distinct('patientId');
      logger.info(`MongoDB has visits for patients: ${allPatients.join(', ')}`);
      
      const [mongoVisits, total] = await Promise.all([
        Visit.find({ patientId })
          .sort({ scheduledTime: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Visit.countDocuments({ patientId })
      ]);

      logger.info(`MongoDB query result: ${mongoVisits.length} visits found for patient ${patientId}`);
      
      if (mongoVisits && mongoVisits.length > 0) {
        logger.info(`Found ${mongoVisits.length} visits in MongoDB for patient ${patientId}`);
        logger.info(`First visit sample:`, {
          id: mongoVisits[0]._id,
          patientId: mongoVisits[0].patientId,
          patientName: mongoVisits[0].patientName,
          taskCompletions: mongoVisits[0].taskCompletions?.length || 0
        });
        
        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
          data: mongoVisits,
          pagination: {
            total,
            page,
            limit,
            pages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        });
      }

      logger.info('No visits found in MongoDB, falling back to MySQL');
    } catch (mongoError) {
      logger.warn('MongoDB query failed, falling back to MySQL:', mongoError.message);
    }

    // Fallback to MySQL if MongoDB has no data
    const offset = (page - 1) * limit;
    
    logger.info('Executing MySQL query with params:', { patientId, limit, offset });
    const visits = await executeQuery(
      `SELECT * FROM visits WHERE patient_id = ? ORDER BY scheduled_time DESC LIMIT ${limit} OFFSET ${offset}`,
      [patientId]
    );
    logger.info('MySQL query executed successfully, found visits:', visits.length);

    // Get total count from MySQL
    const countResult = await executeQuery(
      'SELECT COUNT(*) as total FROM visits WHERE patient_id = ?',
      [patientId]
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    logger.info(`Found ${visits.length} visits in MySQL for patient ${patientId}`);

    res.status(200).json({
      data: visits,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.log('=== DETAILED ERROR INFO ===');
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    console.log('Error errno:', error.errno);
    console.log('Error sqlState:', error.sqlState);
    console.log('Error sqlMessage:', error.sqlMessage);
    console.log('Full error object:', error);
    console.log('Error stack:', error.stack);
    console.log('=== END ERROR INFO ===');

    logger.error('Error fetching visits by patient:', error.message);
    res.status(500).json({
      error: {
        code: 'FETCH_PATIENT_VISITS_ERROR',
        message: 'Failed to fetch patient visits',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString(),
          patientId: req.params.patientId,
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      }
    });
  }
}

// Get visits by nurse ID
async function getVisitsByNurse(req, res) {
  try {
    const { nurseId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const encounters = await Encounter.findByNurseId(nurseId, limit, offset);

    // Enrich with task completion data
    const enrichedEncounters = await Promise.all(
      encounters.map(async (encounter) => {
        const stats = await VisitTask.getCompletionStats(encounter.id);
        return {
          ...encounter,
          completionStats: stats
        };
      })
    );

    res.status(200).json({ data: enrichedEncounters });
  } catch (error) {
    logger.error('Error fetching visits by nurse:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_NURSE_VISITS_ERROR',
        message: 'Failed to fetch nurse visits',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Get active (non-completed) visits by nurse ID from MongoDB
async function getActiveVisitsByNurse(req, res) {
  try {
    const { nurseId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Query for visits that are NOT completed or cancelled
    const query = {
      nurseId: nurseId,
      status: { $in: ['planned', 'inProgress'] }
    };

    // Add date filter if provided (useful for getting today's visits)
    if (req.query.date_from || req.query.date_to) {
      query.scheduledTime = {};
      if (req.query.date_from) query.scheduledTime.$gte = new Date(req.query.date_from);
      if (req.query.date_to) query.scheduledTime.$lte = new Date(req.query.date_to);
    }

    // Fetch from MongoDB
    const [visits, total] = await Promise.all([
      Visit.find(query)
        .sort({ scheduledTime: 1 }) // Sort by scheduled time ascending (earliest first)
        .skip(skip)
        .limit(limit)
        .lean(),
      Visit.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.info(`Found ${visits.length} active visits for nurse ${nurseId}`);

    res.status(200).json({
      success: true,
      data: visits,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching active visits by nurse:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ACTIVE_NURSE_VISITS_ERROR',
        message: 'Failed to fetch active nurse visits',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Get today's visits
async function getVisitsForToday(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const encounters = await Encounter.findTodaysEncounters(limit, offset);

    // Enrich with task completion data
    const enrichedEncounters = await Promise.all(
      encounters.map(async (encounter) => {
        const stats = await VisitTask.getCompletionStats(encounter.id);
        return {
          ...encounter,
          completionStats: stats
        };
      })
    );

    res.status(200).json({ data: enrichedEncounters });
  } catch (error) {
    logger.error('Error fetching today\'s visits:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_TODAY_VISITS_ERROR',
        message: 'Failed to fetch today\'s visits',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Create new visit
async function createVisit(req, res) {
  try {
    const visitData = req.body;

    // Validate required fields
    if (!visitData.patient_id || !visitData.scheduled_time) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: patient_id, scheduled_time',
          details: {
            service: 'visits-service',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    // Create encounter in MySQL
    const encounter = new Encounter(visitData);
    await encounter.save();

    // Create tasks if provided (skip if table doesn't exist or no tasks)
    if (visitData.taskCompletions && visitData.taskCompletions.length > 0) {
      try {
        await VisitTask.createBulk(encounter.id, visitData.taskCompletions);
      } catch (taskError) {
        // Log but don't fail if visit_tasks table doesn't exist
        logger.warn('Failed to create tasks (table may not exist):', taskError.message);
      }
    }

    // Create MongoDB record for flexible data (always create if we have tasks or other MongoDB fields)
    if (visitData.taskCompletions || visitData.vitalSigns || visitData.photos || visitData.syncStatus) {
      try {
        const mongoVisit = new Visit({
          _id: encounter.id,
          patientId: encounter.patient_id,
          patientName: encounter.patient_name,
          nurseId: encounter.nurse_id,
          nurseName: encounter.nurse_name,
          scheduledTime: encounter.scheduled_time,
          startTime: encounter.start_time,
          endTime: encounter.end_time,
          status: encounter.status,
          location: encounter.location,
          visitType: visitData.visit_type,
          visitTemplateId: visitData.visitTemplateId,
          isRegulated: visitData.isRegulated !== undefined ? visitData.isRegulated : true,
          requiresLicense: visitData.requiresLicense !== undefined ? visitData.requiresLicense : true,
          taskCompletions: visitData.taskCompletions || [],
          vitalSigns: visitData.vitalSigns,
          notes: encounter.notes,
          hasAudioRecording: visitData.hasAudioRecording || false,
          audioRecordingPath: visitData.audioRecordingPath,
          photos: visitData.photos || [],
          syncStatus: visitData.syncStatus || 'synced',
          deviceId: visitData.deviceId,
          offlineId: visitData.offlineId
        });
        await mongoVisit.save();
        logger.info(`Created MongoDB visit record with ${visitData.taskCompletions?.length || 0} tasks`);
      } catch (mongoError) {
        logger.warn('Failed to create MongoDB record:', mongoError.message);
        logger.warn('MongoDB error details:', mongoError);
      }
    }

    // Get the complete visit data
    const completeVisit = await getCompleteVisitData(encounter.id);

    res.status(201).json({
      message: 'Visit created successfully',
      data: completeVisit
    });
  } catch (error) {
    logger.error('Error creating visit:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({
      error: {
        code: 'CREATE_VISIT_ERROR',
        message: 'Failed to create visit',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString(),
          errorMessage: error.message,
          sqlMessage: error.sqlMessage
        }
      }
    });
  }
}

// Update visit
async function updateVisit(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const encounter = await Encounter.findById(id);
    if (!encounter) {
      return res.status(404).json({
        error: {
          code: 'VISIT_NOT_FOUND',
          message: `Visit with ID ${id} not found`,
          details: {
            service: 'visits-service',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    // Update encounter
    await encounter.update(updateData);

    // Update tasks if provided
    if (updateData.taskCompletions) {
      await VisitTask.updateBulk(encounter.id, updateData.taskCompletions);
    }

    // Update MongoDB record if needed
    if (updateData.vitalSigns || updateData.photos || updateData.syncStatus) {
      try {
        await Visit.findOneAndUpdate(
          { _id: encounter.id },
          {
            vitalSigns: updateData.vitalSigns,
            photos: updateData.photos,
            syncStatus: updateData.syncStatus,
            deviceId: updateData.deviceId
          },
          { upsert: true, new: true }
        );
      } catch (mongoError) {
        logger.warn('Failed to update MongoDB record:', mongoError.message);
      }
    }

    // Get the complete updated visit data
    const completeVisit = await getCompleteVisitData(encounter.id);

    res.status(200).json({
      message: 'Visit updated successfully',
      data: completeVisit
    });
  } catch (error) {
    logger.error('Error updating visit:', error);
    res.status(500).json({
      error: {
        code: 'UPDATE_VISIT_ERROR',
        message: 'Failed to update visit',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Start visit
async function startVisit(req, res) {
  try {
    const { id } = req.params;

    const encounter = await Encounter.findById(id);
    if (!encounter) {
      return res.status(404).json({
        error: {
          code: 'VISIT_NOT_FOUND',
          message: `Visit with ID ${id} not found`,
          details: {
            service: 'visits-service',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    await encounter.start();

    // Update MongoDB record if exists
    try {
      await Visit.findOneAndUpdate(
        { _id: encounter.id },
        {
          status: 'inProgress',
          startTime: encounter.start_time
        }
      );
    } catch (mongoError) {
      logger.warn('Failed to update MongoDB record:', mongoError.message);
    }

    const completeVisit = await getCompleteVisitData(encounter.id);

    res.status(200).json({
      message: 'Visit started successfully',
      data: completeVisit
    });
  } catch (error) {
    logger.error('Error starting visit:', error);
    res.status(500).json({
      error: {
        code: 'START_VISIT_ERROR',
        message: 'Failed to start visit',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Complete visit
async function completeVisit(req, res) {
  try {
    const { id } = req.params;

    const encounter = await Encounter.findById(id);
    if (!encounter) {
      return res.status(404).json({
        error: {
          code: 'VISIT_NOT_FOUND',
          message: `Visit with ID ${id} not found`,
          details: {
            service: 'visits-service',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    await encounter.complete();

    // Update MongoDB record if exists
    try {
      await Visit.findOneAndUpdate(
        { _id: encounter.id },
        {
          status: 'completed',
          endTime: encounter.end_time
        }
      );
    } catch (mongoError) {
      logger.warn('Failed to update MongoDB record:', mongoError.message);
    }

    const completeVisit = await getCompleteVisitData(encounter.id);

    res.status(200).json({
      message: 'Visit completed successfully',
      data: completeVisit
    });
  } catch (error) {
    logger.error('Error completing visit:', error);
    res.status(500).json({
      error: {
        code: 'COMPLETE_VISIT_ERROR',
        message: 'Failed to complete visit',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Cancel visit
async function cancelVisit(req, res) {
  try {
    const { id } = req.params;

    const encounter = await Encounter.findById(id);
    if (!encounter) {
      return res.status(404).json({
        error: {
          code: 'VISIT_NOT_FOUND',
          message: `Visit with ID ${id} not found`,
          details: {
            service: 'visits-service',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    await encounter.cancel();

    // Update MongoDB record if exists
    try {
      await Visit.findOneAndUpdate(
        { _id: encounter.id },
        { status: 'cancelled' }
      );
    } catch (mongoError) {
      logger.warn('Failed to update MongoDB record:', mongoError.message);
    }

    const completeVisit = await getCompleteVisitData(encounter.id);

    res.status(200).json({
      message: 'Visit cancelled successfully',
      data: completeVisit
    });
  } catch (error) {
    logger.error('Error cancelling visit:', error);
    res.status(500).json({
      error: {
        code: 'CANCEL_VISIT_ERROR',
        message: 'Failed to cancel visit',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Delete visit
async function deleteVisit(req, res) {
  try {
    const { id } = req.params;

    const encounter = await Encounter.findById(id);
    if (!encounter) {
      return res.status(404).json({
        error: {
          code: 'VISIT_NOT_FOUND',
          message: `Visit with ID ${id} not found`,
          details: {
            service: 'visits-service',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    // Delete from MySQL (cascade will handle tasks)
    await encounter.delete();

    // Delete from MongoDB if exists
    try {
      await Visit.findOneAndDelete({ _id: encounter.id });
    } catch (mongoError) {
      logger.warn('Failed to delete MongoDB record:', mongoError.message);
    }

    res.status(200).json({
      message: 'Visit deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting visit:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_VISIT_ERROR',
        message: 'Failed to delete visit',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Sync visits from mobile devices
async function syncVisits(req, res) {
  try {
    const { visits, deviceId } = req.body;

    if (!visits || !Array.isArray(visits)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid visits data provided',
          details: {
            service: 'visits-service',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    const syncResults = [];

    for (const visitData of visits) {
      try {
        let encounter;

        // Check if visit exists by offline ID or regular ID
        if (visitData.offlineId) {
          encounter = await Encounter.findById(visitData.offlineId);
        }

        if (!encounter && visitData.id) {
          encounter = await Encounter.findById(visitData.id);
        }

        if (encounter) {
          // Update existing visit
          await encounter.update(visitData);

          // Update tasks
          if (visitData.taskCompletions) {
            await VisitTask.updateBulk(encounter.id, visitData.taskCompletions);
          }
        } else {
          // Create new visit
          encounter = new Encounter(visitData);
          await encounter.save();

          // Create tasks
          if (visitData.taskCompletions) {
            await VisitTask.createBulk(encounter.id, visitData.taskCompletions);
          }
        }

        // Update/create MongoDB record for flexible data
        try {
          await Visit.findOneAndUpdate(
            {
              $or: [
                { _id: encounter.id },
                { offlineId: visitData.offlineId }
              ]
            },
            {
              _id: encounter.id,
              patientId: encounter.patient_id,
              patientName: encounter.patient_name,
              nurseId: encounter.nurse_id,
              nurseName: encounter.nurse_name,
              scheduledTime: encounter.scheduled_time,
              status: encounter.status,
              vitalSigns: visitData.vitalSigns,
              photos: visitData.photos || [],
              syncStatus: 'synced',
              syncTimestamp: new Date(),
              deviceId: deviceId,
              offlineId: visitData.offlineId
            },
            { upsert: true, new: true }
          );
        } catch (mongoError) {
          logger.warn('Failed to sync MongoDB record:', mongoError.message);
        }

        syncResults.push({
          offlineId: visitData.offlineId,
          id: encounter.id,
          status: 'synced'
        });

      } catch (visitError) {
        logger.error('Error syncing individual visit:', visitError);
        syncResults.push({
          offlineId: visitData.offlineId,
          id: visitData.id,
          status: 'failed',
          error: visitError.message
        });
      }
    }

    res.status(200).json({
      message: 'Visits sync completed',
      data: syncResults
    });
  } catch (error) {
    logger.error('Error syncing visits:', error);
    res.status(500).json({
      error: {
        code: 'SYNC_VISITS_ERROR',
        message: 'Failed to sync visits',
        details: {
          service: 'visits-service',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

// Helper function to get complete visit data
async function getCompleteVisitData(visitId) {
  const encounter = await Encounter.findById(visitId);
  
  // Try to get tasks (may not exist if visit_tasks table doesn't exist)
  let tasks = [];
  let stats = null;
  try {
    tasks = await VisitTask.findByVisitId(visitId);
    stats = await VisitTask.getCompletionStats(visitId);
  } catch (taskError) {
    logger.warn('Failed to load tasks (table may not exist):', taskError.message);
  }

  let flexibleData = null;
  try {
    flexibleData = await Visit.findOne({ _id: visitId });
  } catch (mongoError) {
    logger.warn('MongoDB visit data not found:', mongoError.message);
  }

  return {
    ...encounter,
    taskCompletions: tasks,
    completionStats: stats,
    flexibleData: flexibleData ? {
      vitalSigns: flexibleData.vitalSigns,
      photos: flexibleData.photos,
      syncStatus: flexibleData.syncStatus,
      deviceId: flexibleData.deviceId
    } : null
  };
}

// Get medication visits for today or specific date
async function getMedicationVisits(req, res) {
  try {
    const targetDate = req.query.date || 'today';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // Build date query
    let dateQuery = {};
    if (targetDate === 'today') {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      dateQuery = { $gte: startOfDay, $lt: endOfDay };
    } else {
      const date = new Date(targetDate);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      dateQuery = { $gte: startOfDay, $lt: endOfDay };
    }

    // Query for medication visits
    const query = {
      visitType: 'medication_administration',
      scheduledTime: dateQuery
    };

    // Add additional filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.nurse_id) query.nurseId = req.query.nurse_id;

    const [visits, total] = await Promise.all([
      Visit.find(query)
        .sort({ scheduledTime: 1 }) // Sort by time ascending for medication rounds
        .skip(skip)
        .limit(limit)
        .lean(),
      Visit.countDocuments(query)
    ]);

    // Group visits by time slots (medication rounds)
    const rounds = {
      morning: { time: '08:00', visits: [] },
      afternoon: { time: '14:00', visits: [] },
      evening: { time: '20:00', visits: [] }
    };

    visits.forEach(visit => {
      const hour = new Date(visit.scheduledTime).getHours();
      if (hour >= 6 && hour < 12) {
        rounds.morning.visits.push(visit);
      } else if (hour >= 12 && hour < 18) {
        rounds.afternoon.visits.push(visit);
      } else {
        rounds.evening.visits.push(visit);
      }
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        date: targetDate === 'today' ? new Date().toISOString().split('T')[0] : targetDate,
        visits: visits,
        rounds: rounds,
        summary: {
          totalVisits: total,
          morningVisits: rounds.morning.visits.length,
          afternoonVisits: rounds.afternoon.visits.length,
          eveningVisits: rounds.evening.visits.length
        }
      },
      pagination: {
        total,
        page,
        limit,
        pages: totalPages
      }
    });

  } catch (error) {
    logger.error('Error fetching medication visits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medication visits',
      details: error.message
    });
  }
}

module.exports = {
  getVisits,
  getVisitById,
  getVisitsByPatient,
  getVisitsByPatientWithTasks,
  getVisitsByNurse,
  getActiveVisitsByNurse,
  getVisitsForToday,
  getMedicationVisits,
  createVisit,
  updateVisit,
  startVisit,
  completeVisit,
  cancelVisit,
  deleteVisit,
  syncVisits,
};
