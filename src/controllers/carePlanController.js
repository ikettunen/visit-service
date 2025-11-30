const CarePlan = require('../models/CarePlan');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Get all care plans with optional filtering
 */
async function getAllCarePlans(req, res) {
  try {
    const { status, patientId, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (patientId) query.patientId = patientId;
    
    const skip = (page - 1) * limit;
    
    const [carePlans, total] = await Promise.all([
      CarePlan.find(query)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CarePlan.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      carePlans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching care plans');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch care plans'
    });
  }
}

/**
 * Get a single care plan by ID
 */
async function getCarePlanById(req, res) {
  try {
    const { id } = req.params;
    
    const carePlan = await CarePlan.findById(id)
      .populate('interventions.visitTemplateId')
      .populate('interventions.additionalTasks.taskTemplateId');
    
    if (!carePlan) {
      return res.status(404).json({
        success: false,
        error: 'Care plan not found'
      });
    }
    
    res.json({
      success: true,
      carePlan
    });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Error fetching care plan');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch care plan'
    });
  }
}

/**
 * Get care plans for a specific patient
 */
async function getCarePlansByPatient(req, res) {
  try {
    const { patientId } = req.params;
    
    const carePlans = await CarePlan.find({ patientId })
      .sort({ startDate: -1 })
      .lean();
    
    res.json({
      success: true,
      carePlans,
      total: carePlans.length
    });
  } catch (error) {
    logger.error({ error, patientId: req.params.patientId }, 'Error fetching patient care plans');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient care plans'
    });
  }
}

/**
 * Create a new care plan
 */
async function createCarePlan(req, res) {
  try {
    const carePlanData = req.body;
    
    // Validate required fields
    if (!carePlanData.patientId || !carePlanData.patientName) {
      return res.status(400).json({
        success: false,
        error: 'patientId and patientName are required'
      });
    }
    
    if (!carePlanData.endDate) {
      return res.status(400).json({
        success: false,
        error: 'endDate is required'
      });
    }
    
    const carePlan = new CarePlan(carePlanData);
    await carePlan.save();
    
    logger.info({ carePlanId: carePlan._id, patientId: carePlan.patientId }, 'Care plan created');
    
    res.status(201).json({
      success: true,
      carePlan,
      message: 'Care plan created successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Error creating care plan');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create care plan'
    });
  }
}

/**
 * Update a care plan
 */
async function updateCarePlan(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow updating certain fields
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    
    const carePlan = await CarePlan.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!carePlan) {
      return res.status(404).json({
        success: false,
        error: 'Care plan not found'
      });
    }
    
    logger.info({ carePlanId: id }, 'Care plan updated');
    
    res.json({
      success: true,
      carePlan,
      message: 'Care plan updated successfully'
    });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Error updating care plan');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update care plan'
    });
  }
}

/**
 * Delete a care plan
 */
async function deleteCarePlan(req, res) {
  try {
    const { id } = req.params;
    
    const carePlan = await CarePlan.findByIdAndDelete(id);
    
    if (!carePlan) {
      return res.status(404).json({
        success: false,
        error: 'Care plan not found'
      });
    }
    
    logger.info({ carePlanId: id, patientId: carePlan.patientId }, 'Care plan deleted');
    
    res.json({
      success: true,
      message: 'Care plan deleted successfully'
    });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Error deleting care plan');
    res.status(500).json({
      success: false,
      error: 'Failed to delete care plan'
    });
  }
}

/**
 * Update goal progress
 */
async function updateGoalProgress(req, res) {
  try {
    const { id, goalId } = req.params;
    const { progress, status } = req.body;
    
    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        error: 'Progress must be between 0 and 100'
      });
    }
    
    const carePlan = await CarePlan.findById(id);
    
    if (!carePlan) {
      return res.status(404).json({
        success: false,
        error: 'Care plan not found'
      });
    }
    
    await carePlan.updateGoalProgress(goalId, progress, status);
    
    logger.info({ carePlanId: id, goalId, progress }, 'Goal progress updated');
    
    res.json({
      success: true,
      carePlan,
      message: 'Goal progress updated successfully'
    });
  } catch (error) {
    logger.error({ error, id: req.params.id, goalId: req.params.goalId }, 'Error updating goal progress');
    res.status(500).json({
      success: false,
      error: 'Failed to update goal progress'
    });
  }
}

/**
 * Add progress note
 */
async function addProgressNote(req, res) {
  try {
    const { id } = req.params;
    const { note, author, goalId } = req.body;
    
    if (!note || !author) {
      return res.status(400).json({
        success: false,
        error: 'note and author are required'
      });
    }
    
    const carePlan = await CarePlan.findById(id);
    
    if (!carePlan) {
      return res.status(404).json({
        success: false,
        error: 'Care plan not found'
      });
    }
    
    await carePlan.addProgressNote(note, author, goalId);
    
    logger.info({ carePlanId: id, authorId: author.userId }, 'Progress note added');
    
    res.json({
      success: true,
      carePlan,
      message: 'Progress note added successfully'
    });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Error adding progress note');
    res.status(500).json({
      success: false,
      error: 'Failed to add progress note'
    });
  }
}

/**
 * Get active care plans
 */
async function getActiveCarePlans(req, res) {
  try {
    const carePlans = await CarePlan.getActive();
    
    res.json({
      success: true,
      carePlans,
      total: carePlans.length
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching active care plans');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active care plans'
    });
  }
}

/**
 * Get expiring care plans
 */
async function getExpiringCarePlans(req, res) {
  try {
    const { days = 7 } = req.query;
    
    const carePlans = await CarePlan.getExpiringSoon(parseInt(days));
    
    res.json({
      success: true,
      carePlans,
      total: carePlans.length,
      expiringWithinDays: parseInt(days)
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching expiring care plans');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expiring care plans'
    });
  }
}

module.exports = {
  getAllCarePlans,
  getCarePlanById,
  getCarePlansByPatient,
  createCarePlan,
  updateCarePlan,
  deleteCarePlan,
  updateGoalProgress,
  addProgressNote,
  getActiveCarePlans,
  getExpiringCarePlans
};
