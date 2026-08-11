const jwt = require('jsonwebtoken');
const { Contractor } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    // If contractor, resolve and attach contractorId
    if (decoded.role === 'contractor') {
      try {
        const contractor = await Contractor.findOne({ where: { userId: decoded.id } });
        if (contractor) {
          req.user.contractorId = contractor.id;
          req.user.verificationStatus = contractor.verificationStatus;
        }
      } catch (dbError) {
        console.error('Error attaching contractor info:', dbError);
      }
    }

    next();
  });
}

function requireRole(roles) {
  // Support both single role string and array of roles
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Forbidden. Action requires one of these roles: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET
};
