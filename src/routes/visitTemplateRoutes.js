const express = require('express');
const router = express.Router();
const VisitTemplate = require('../models/VisitTemplate');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * @swagger
 * /api/visit-templates:
 *   get:
 *     summary: Get all visit templates
 *     description: Retrieve a list of visit templates with optional filtering and pagination
 *     tags: [Visit Templates]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [medical, assessment, therapy, emergency, care, social]
 *         description: Filter by category
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in template name and description
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of items per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of visit templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VisitTemplate'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const { category, active, search, limit = 100, page = 1 } = req.query;
    
    const query = {};
    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [templates, total] = await Promise.all([
      VisitTemplate.find(query)
        .sort({ sortOrder: 1, displayName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      VisitTemplate.countDocuments(query)
    ]);

    // Transform to match TaskTemplate interface
    const transformedTemplates = templates.map(template => ({
      _id: template._id,
      title: template.displayName,
      description: template.description || '',
      category: template.category,
      priority: 'medium',
      estimatedDuration: template.defaultDuration,
      isActive: template.isActive,
      isRequired: template.requiresLicense,
      instructions: template.description || '',
      requiredEquipment: [],
      requiredSkills: template.requiredStaffRole ? [template.requiredStaffRole] : [],
      tags: [template.visitType],
      createdBy: {
        userId: template.createdBy || 'system',
        userName: template.createdBy || 'System'
      },
      usageCount: template.usageCount || 0,
      lastUsed: template.updatedAt,
      formattedDuration: template.defaultDuration ? `${template.defaultDuration} min` : '',
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: transformedTemplates,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching visit templates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch visit templates'
    });
  }
});


/**
 * @swagger
 * /api/visit-templates/{id}:
 *   get:
 *     summary: Get visit template by ID
 *     description: Retrieve a single visit template by its ID
 *     tags: [Visit Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Visit template details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VisitTemplate'
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const template = await VisitTemplate.findById(req.params.id).lean();
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Visit template not found'
      });
    }

    // Transform to match TaskTemplate interface
    const transformed = {
      _id: template._id,
      title: template.displayName,
      description: template.description || '',
      category: template.category,
      priority: 'medium',
      estimatedDuration: template.defaultDuration,
      isActive: template.isActive,
      isRequired: template.requiresLicense,
      instructions: template.description || '',
      requiredEquipment: [],
      requiredSkills: template.requiredStaffRole ? [template.requiredStaffRole] : [],
      tags: [template.visitType],
      createdBy: {
        userId: template.createdBy || 'system',
        userName: template.createdBy || 'System'
      },
      usageCount: template.usageCount || 0,
      lastUsed: template.updatedAt,
      formattedDuration: template.defaultDuration ? `${template.defaultDuration} min` : '',
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };

    res.status(200).json({
      success: true,
      data: transformed
    });
  } catch (error) {
    logger.error('Error fetching visit template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch visit template'
    });
  }
});

/**
 * @route POST /api/visit-templates
 * @desc Create a new visit template
 * @access Private
 */
router.post('/', async (req, res) => {
  try {
    // Transform from TaskTemplate format to VisitTemplate format
    const visitTemplateData = {
      name: req.body.title?.toLowerCase().replace(/\s+/g, '_') || 'new_template',
      displayName: req.body.title,
      description: req.body.description,
      visitType: req.body.tags?.[0] || 'personal_care_assistance',
      category: req.body.category,
      defaultDuration: req.body.estimatedDuration,
      requiredStaffRole: req.body.requiredSkills?.[0] || 'care_assistant',
      requiresLicense: req.body.isRequired || false,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      createdBy: req.body.createdBy?.userId || 'user'
    };

    const template = new VisitTemplate(visitTemplateData);
    await template.save();

    // Transform back to TaskTemplate format for response
    const transformed = {
      _id: template._id,
      title: template.displayName,
      description: template.description || '',
      category: template.category,
      priority: 'medium',
      estimatedDuration: template.defaultDuration,
      isActive: template.isActive,
      isRequired: template.requiresLicense,
      instructions: template.description || '',
      requiredEquipment: [],
      requiredSkills: template.requiredStaffRole ? [template.requiredStaffRole] : [],
      tags: [template.visitType],
      createdBy: {
        userId: template.createdBy || 'system',
        userName: template.createdBy || 'System'
      },
      usageCount: template.usageCount || 0,
      formattedDuration: template.defaultDuration ? `${template.defaultDuration} min` : '',
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };

    res.status(201).json({
      success: true,
      data: transformed
    });
  } catch (error) {
    logger.error('Error creating visit template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create visit template'
    });
  }
});

/**
 * @route PUT /api/visit-templates/:id
 * @desc Update a visit template
 * @access Private
 */
router.put('/:id', async (req, res) => {
  try {
    // Transform from TaskTemplate format to VisitTemplate format
    const visitTemplateData = {
      displayName: req.body.title,
      description: req.body.description,
      visitType: req.body.tags?.[0],
      category: req.body.category,
      defaultDuration: req.body.estimatedDuration,
      requiredStaffRole: req.body.requiredSkills?.[0],
      requiresLicense: req.body.isRequired,
      isActive: req.body.isActive,
      updatedBy: req.body.createdBy?.userId || 'user',
      defaultTasks: req.body.defaultTasks || undefined
    };

    // Remove undefined values
    Object.keys(visitTemplateData).forEach(key => 
      visitTemplateData[key] === undefined && delete visitTemplateData[key]
    );

    const template = await VisitTemplate.findByIdAndUpdate(
      req.params.id,
      visitTemplateData,
      { new: true, runValidators: true }
    ).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Visit template not found'
      });
    }

    // Transform back to TaskTemplate format for response
    const transformed = {
      _id: template._id,
      title: template.displayName,
      description: template.description || '',
      category: template.category,
      priority: 'medium',
      estimatedDuration: template.defaultDuration,
      isActive: template.isActive,
      isRequired: template.requiresLicense,
      instructions: template.description || '',
      requiredEquipment: [],
      requiredSkills: template.requiredStaffRole ? [template.requiredStaffRole] : [],
      tags: [template.visitType],
      createdBy: {
        userId: template.createdBy || 'system',
        userName: template.createdBy || 'System'
      },
      usageCount: template.usageCount || 0,
      formattedDuration: template.defaultDuration ? `${template.defaultDuration} min` : '',
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };

    res.status(200).json({
      success: true,
      data: transformed
    });
  } catch (error) {
    logger.error('Error updating visit template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update visit template'
    });
  }
});

/**
 * @route DELETE /api/visit-templates/:id
 * @desc Delete a visit template
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const template = await VisitTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Visit template not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Visit template deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting visit template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete visit template'
    });
  }
});

module.exports = router;

/**
 * @swagger
 * /api/visit-templates/{id}/tasks:
 *   get:
 *     summary: Get tasks for a visit template
 *     description: Retrieve all tasks associated with a visit template
 *     tags: [Visit Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: List of template tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VisitTemplateTask'
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
router.get('/:id/tasks', async (req, res) => {
  try {
    const template = await VisitTemplate.findById(req.params.id).lean();
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Visit template not found'
      });
    }

    res.status(200).json({
      success: true,
      data: template.defaultTasks || []
    });
  } catch (error) {
    logger.error('Error fetching template tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch template tasks'
    });
  }
});

/**
 * @route POST /api/visit-templates/:id/tasks
 * @desc Add a task to a visit template
 * @access Private
 */
router.post('/:id/tasks', async (req, res) => {
  try {
    const { taskTitle, isRequired, order } = req.body;

    const template = await VisitTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Visit template not found'
      });
    }

    // Add task to defaultTasks array
    template.defaultTasks.push({
      taskTitle,
      isRequired: isRequired || false,
      order: order || template.defaultTasks.length
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template.defaultTasks
    });
  } catch (error) {
    logger.error('Error adding task to template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add task to template'
    });
  }
});

/**
 * @route PUT /api/visit-templates/:id/tasks/:taskId
 * @desc Update a task in a visit template
 * @access Private
 */
router.put('/:id/tasks/:taskId', async (req, res) => {
  try {
    const { taskTitle, isRequired, order } = req.body;

    const template = await VisitTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Visit template not found'
      });
    }

    const task = template.defaultTasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Update task fields
    if (taskTitle !== undefined) task.taskTitle = taskTitle;
    if (isRequired !== undefined) task.isRequired = isRequired;
    if (order !== undefined) task.order = order;

    await template.save();

    res.status(200).json({
      success: true,
      data: template.defaultTasks
    });
  } catch (error) {
    logger.error('Error updating template task:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update template task'
    });
  }
});

/**
 * @route DELETE /api/visit-templates/:id/tasks/:taskId
 * @desc Remove a task from a visit template
 * @access Private
 */
router.delete('/:id/tasks/:taskId', async (req, res) => {
  try {
    const template = await VisitTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Visit template not found'
      });
    }

    template.defaultTasks.pull(req.params.taskId);
    await template.save();

    res.status(200).json({
      success: true,
      data: template.defaultTasks
    });
  } catch (error) {
    logger.error('Error removing template task:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove template task'
    });
  }
});
