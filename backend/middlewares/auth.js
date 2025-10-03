const { verifyToken } = require('../services/authService');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Access denied',
      error: 'No token provided'
    });
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(403).json({
      message: 'Access denied', 
      error: 'Invalid or expired token'
    });
  }
}

module.exports = { authenticateToken };
