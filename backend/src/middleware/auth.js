// Step 1 of the middleware chain: verify the JWT from the Authorization header.
// On success, the decoded payload (userId, tenantId, role, name) is put on req.user.
const jwt = require('jsonwebtoken');
const ResponseFormatter = require('../views/ResponseFormatter');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return ResponseFormatter.error(res, 'No token provided. Please log in.', 401);
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return ResponseFormatter.error(res, 'Invalid or expired token. Please log in again.', 401);
  }
}

module.exports = auth;
