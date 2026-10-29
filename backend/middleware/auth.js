const jwt = require('jsonwebtoken');

// Verifies "Authorization: Bearer <token>" and the token purpose
const requireAuth = (purpose = 'access') => (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required: no token provided' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== purpose) {
      return res.status(401).json({ success: false, message: 'Invalid token for this operation' });
    }
    req.user = payload; // { sub, username, role, purpose }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Allows only the listed roles
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Forbidden: role '${req.user ? req.user.role : 'none'}' cannot perform this action`
    });
  }
  next();
};

module.exports = { requireAuth, requireRole };
