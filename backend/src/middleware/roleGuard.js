// Step 3 of the middleware chain: only let certain roles through.
// Usage in a route: roleGuard('admin', 'manager')
const ResponseFormatter = require('../views/ResponseFormatter');

function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return ResponseFormatter.error(res, 'You do not have permission for this action.', 403);
    }
    next();
  };
}

module.exports = roleGuard;
