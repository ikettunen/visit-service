const express = require('express');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateJWT, async (req, res) => {
  return res.status(200).json({ message: 'Upload received', data: {} });
});

module.exports = router;
