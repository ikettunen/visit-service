const express = require('express');
const visitController = require('../controllers/visitController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

/**
 * @route GET /api/visits
 * @desc Get all visits with pagination and filtering
 * @access Private
 */
router.get('/', visitController.getVisits); // Temporarily disabled auth for development

/**
 * @route GET /api/visits/:id
 * @desc Get a visit by ID
 * @access Private
 */
router.get('/:id', authenticateJWT, visitController.getVisitById);

/**
 * @route GET /api/visits/patient/:patientId
 * @desc Get visits for a specific patient
 * @access Private (temporarily disabled auth for development)
 */
router.get('/patient/:patientId', visitController.getVisitsByPatient);

/**
 * @route GET /api/visits/nurse/:nurseId
 * @desc Get visits for a specific nurse
 * @access Private
 */
router.get('/nurse/:nurseId', authenticateJWT, visitController.getVisitsByNurse);

/**
 * @route GET /api/visits/nurse/:nurseId/active
 * @desc Get active (non-completed) visits for a specific nurse from MongoDB
 * @access Private
 * @query date_from - Optional start date filter
 * @query date_to - Optional end date filter
 */
router.get('/nurse/:nurseId/active', visitController.getActiveVisitsByNurse);

/**
 * @route GET /api/visits/today
 * @desc Get visits scheduled for today
 * @access Private
 */
router.get('/today', visitController.getVisitsForToday); // Temporarily disabled auth for development

/**
 * @route POST /api/visits
 * @desc Create a new visit
 * @access Private
 */
router.post('/', authenticateJWT, visitController.createVisit);

/**
 * @route PUT /api/visits/:id
 * @desc Update a visit
 * @access Private
 */
router.put('/:id', authenticateJWT, visitController.updateVisit);

/**
 * @route PUT /api/visits/:id/start
 * @desc Start a visit (set status to inProgress)
 * @access Private
 */
router.put('/:id/start', authenticateJWT, visitController.startVisit);

/**
 * @route PUT /api/visits/:id/complete
 * @desc Complete a visit (set status to completed)
 * @access Private
 */
router.put('/:id/complete', authenticateJWT, visitController.completeVisit);

/**
 * @route PUT /api/visits/:id/cancel
 * @desc Cancel a visit (set status to cancelled)
 * @access Private
 */
router.put('/:id/cancel', authenticateJWT, visitController.cancelVisit);

/**
 * @route DELETE /api/visits/:id
 * @desc Delete a visit
 * @access Private
 */
router.delete('/:id', authenticateJWT, visitController.deleteVisit);

/**
 * @route POST /api/visits/sync
 * @desc Sync visits from mobile devices
 * @access Private
 */
router.post('/sync', authenticateJWT, visitController.syncVisits);

module.exports = router;
