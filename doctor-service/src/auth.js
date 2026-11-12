const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'medislot-local-dev-secret-0f8a2c91';

// Token is issued by auth-service. We only verify the signature here,
// no call to auth-service needed.
function requireAdmin(req, res, next) {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'login required' });
  }

  let claims;
  try {
    claims = jwt.verify(token, SECRET);
  } catch (e) {
    return res.status(401).json({ message: 'session expired, please login again' });
  }

  if (claims.role !== 'admin') {
    return res.status(403).json({ message: 'only clinic admin can do this' });
  }
  req.user = claims;
  next();
}

module.exports = { requireAdmin };
