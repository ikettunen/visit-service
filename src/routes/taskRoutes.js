const express = require('express');
const TaskTemplate = require('../models/TaskTemplate');
const PatientTask = require('../models/PatientTask');
const TaskCategory = require('../models/TaskCategory');
const pino = require('pino');

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ============================================================================
// TASK TEMPLATES
// ============================================================================

/**
 * @route GET /api/tasks/templates
 * @desc Get all task templates
 * @access Private
 */
router.get('/templates', async (req, res) => {
  try {
    const { category, priority, active = 'true', search, limit = 50, page = 1 } = req.query;
    
    const query = {};
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (active !== 'all') query.isActive = active === 'true';
    if (search) {
      query.$text = { $search: search };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const templates = await TaskTemplate.find(query)
      .sort(search ? { score: { $meta: 'textScore' } } : { usageCount: -1, title: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await TaskTemplate.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: templates,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching task templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task templates'
    });
  }
});

/**
 * @route GET /api/tasks/templates/:id
 * @desc Get task template by ID
 * @access Private
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await TaskTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Task template not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error fetching task template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task template'
    });
  }
});

/**
 * @route POST /api/tasks/templates
 * @desc Create new task template
 * @access Private
 */
router.post('/templates', async (req, res) => {
  try {
    const templateData = {
      ...req.body,
      createdBy: {
        userId: req.user?.id || 'system',
        userName: req.user?.name || 'System'
      }
    };
    
    const template = new TaskTemplate(templateData);
    await template.save();
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Task template created successfully'
    });
  } catch (error) {
    logger.error('Error creating task template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task template'
    });
  }
});

/**
 * @route PUT /api/tasks/templates/:id
 * @desc Update task template
 * @access Private
 */
router.put('/templates/:id', async (req, res) => {
  try {
    const template = await TaskTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Task template not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: template,
      message: 'Task template updated successfully'
    });
  } catch (error) {
    logger.error('Error updating task template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task template'
    });
  }
});

/**
 * @route DELETE /api/tasks/templates/:id
 * @desc Delete task template (soft delete - mark as inactive)
 * @access Private
 */
router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await TaskTemplate.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Task template not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Task template deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting task template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task template'
    });
  }
});

/**
 * @route GET /api/tasks/templates/popular
 * @desc Get popular task templates
 * @access Private
 */
router.get('/templates/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const templates = await TaskTemplate.getPopularTasks(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Error fetching popular templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular templates'
    });
  }
});

// ============================================================================
// PATIENT TASKS
// ============================================================================

/**
 * @route GET /api/tasks/patients/:patientId
 * @desc Get tasks for a specific patient
 * @access Private
 */
router.get('/patients/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, category, priority, due = 'all', limit = 50, page = 1 } = req.query;
    
    const query = { patientId };
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    
    let tasks;
    if (due === 'today') {
      tasks = await PatientTask.getDueTasks(patientId, new Date());
    } else if (due === 'overdue') {
      tasks = await PatientTask.getOverdueTasks(patientId);
    } else {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      tasks = await PatientTask.find(query)
        .sort({ priority: -1, isUrgent: -1, startDate: 1 })
        .skip(skip)
        .limit(parseInt(limit));
    }
    
    const total = await PatientTask.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching patient tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient tasks'
    });
  }
});

/**
 * @route POST /api/tasks/patients/:patientId
 * @desc Create new task for patient
 * @access Private
 */
router.post('/patients/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { templateId, patientName, ...customizations } = req.body;
    
    let task;
    
    if (templateId) {
      // Create task from template
      const template = await TaskTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Task template not found'
        });
      }
      
      task = PatientTask.createFromTemplate(
        template,
        { patientId, patientName },
        {
          userId: req.user?.id || 'system',
          userName: req.user?.name || 'System',
          role: req.user?.role || 'staff'
        },
        customizations
      );
      
      // Record template usage
      await template.recordUsage();
    } else {
      // Create custom task
      task = new PatientTask({
        patientId,
        patientName,
        ...req.body,
        createdBy: {
          userId: req.user?.id || 'system',
          userName: req.user?.name || 'System',
          role: req.user?.role || 'staff'
        }
      });
    }
    
    await task.save();
    
    res.status(201).json({
      success: true,
      data: task,
      message: 'Patient task created successfully'
    });
  } catch (error) {
    logger.error('Error creating patient task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create patient task'
    });
  }
});

/**
 * @route PUT /api/tasks/patients/:patientId/:taskId/complete
 * @desc Mark patient task as completed
 * @access Private
 */
router.put('/patients/:patientId/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { visitId, notes, duration } = req.body;
    
    const task = await PatientTask.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Patient task not found'
      });
    }
    
    await task.markCompleted(
      {
        userId: req.user?.id || 'system',
        userName: req.user?.name || 'System'
      },
      visitId,
      notes,
      duration
    );
    
    res.status(200).json({
      success: true,
      data: task,
      message: 'Task marked as completed'
    });
  } catch (error) {
    logger.error('Error completing patient task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete patient task'
    });
  }
});

// ============================================================================
// TASK CATEGORIES
// ============================================================================

/**
 * @route GET /api/tasks/categories
 * @desc Get all task categories
 * @access Private
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await TaskCategory.getActiveCategories();
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error fetching task categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task categories'
    });
  }
});

/**
 * @route POST /api/tasks/categories/initialize
 * @desc Initialize default task categories
 * @access Private
 */
router.post('/categories/initialize', async (req, res) => {
  try {
    await TaskCategory.initializeDefaultCategories();
    
    res.status(200).json({
      success: true,
      message: 'Default task categories initialized successfully'
    });
  } catch (error) {
    logger.error('Error initializing task categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize task categories'
    });
  }
});

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

/**
 * @route GET /api/tasks/dashboard/:patientId
 * @desc Get task dashboard data for patient
 * @access Private
 */
router.get('/dashboard/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const [
      activeTasks,
      dueTasks,
      overdueTasks,
      completedToday
    ] = await Promise.all([
      PatientTask.countDocuments({ patientId, status: 'active' }),
      PatientTask.getDueTasks(patientId),
      PatientTask.getOverdueTasks(patientId),
      PatientTask.find({
        patientId,
        'completions.completedAt': {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      })
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        activeTasks,
        dueTasks: dueTasks.length,
        overdueTasks: overdueTasks.length,
        completedToday: completedToday.length,
        dueTasksList: dueTasks.slice(0, 5), // Next 5 due tasks
        overdueTasksList: overdueTasks.slice(0, 5) // Top 5 overdue tasks
      }
    });
  } catch (error) {
    logger.error('Error fetching task dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task dashboard'
    });
  }
});

module.exports = router;