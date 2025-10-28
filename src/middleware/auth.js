function authenticateJWT(req, res, next) {
  // In production, validate JWT and set req.user
  req.user = req.user || { id: 'test-user', role: 'nurse' };
  next();
}

module.exports = { authenticateJWT };
