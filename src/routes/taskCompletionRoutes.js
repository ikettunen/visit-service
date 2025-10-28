const express = require('express');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateJWT, async (req, res) => {
  return res.status(200).json({ data: [] });
});

router.post('/', authenticateJWT, async (req, res) => {
  return res.status(201).json({ message: 'Task completion created', data: req.body || {} });
});

router.put('/:id', authenticateJWT, async (req, res) => {
  return res.status(200).json({ message: 'Task completion updated', data: { id: req.params.id, ...(req.body || {}) } });
});

router.delete('/:id', authenticateJWT, async (req, res) => {
  return res.status(200).json({ message: 'Task completion deleted' });
});

module.exports = router;
