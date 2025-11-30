const express = require('express');
const router = express.Router();
const carePlanController = require('../controllers/carePlanController');

/**
 * @route GET /api/care-plans
 * @desc Get all care plans with optional filtering
 * @query status - Filter by status (active, completed, cancelled, on_hold)
 * @query patientId - Filter by patient ID
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 */
router.get('/', carePlanController.getAllCarePlans);

/**
 * @route GET /api/care-plans/active
 * @desc Get all active care plans
 */
router.get('/active', carePlanController.getActiveCarePlans);

/**
 * @route GET /api/care-plans/expiring
 * @desc Get care plans expiring soon
 * @query days - Number of days to look ahead (default: 7)
 */
router.get('/expiring', carePlanController.getExpiringCarePlans);

/**
 * @route GET /api/care-plans/patient/:patientId
 * @desc Get all care plans for a specific patient
 */
router.get('/patient/:patientId', carePlanController.getCarePlansByPatient);

/**
 * @route GET /api/care-plans/:id
 * @desc Get a single care plan by ID
 */
router.get('/:id', carePlanController.getCarePlanById);

/**
 * @route POST /api/care-plans
 * @desc Create a new care plan
 */
router.post('/', carePlanController.createCarePlan);

/**
 * @route PUT /api/care-plans/:id
 * @desc Update a care plan
 */
router.put('/:id', carePlanController.updateCarePlan);

/**
 * @route DELETE /api/care-plans/:id
 * @desc Delete a care plan
 */
router.delete('/:id', carePlanController.deleteCarePlan);

/**
 * @route PUT /api/care-plans/:id/goals/:goalId/progress
 * @desc Update goal progress
 * @body progress - Progress percentage (0-100)
 * @body status - Optional status update
 */
router.put('/:id/goals/:goalId/progress', carePlanController.updateGoalProgress);

/**
 * @route POST /api/care-plans/:id/notes
 * @desc Add a progress note to a care plan
 * @body note - The progress note text
 * @body author - Author object { userId, userName }
 * @body goalId - Optional goal ID this note relates to
 */
router.post('/:id/notes', carePlanController.addProgressNote);

module.exports = router;
