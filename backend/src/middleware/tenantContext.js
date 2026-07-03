// Step 2 of the middleware chain: take tenantId from the verified JWT
// and attach it to the request. Every query after this point must use req.tenantId,
// which is what keeps one tenant's data invisible to other tenants.
const ResponseFormatter = require('../views/ResponseFormatter');

function tenantContext(req, res, next) {
  if (!req.user || !req.user.tenantId) {
    return ResponseFormatter.error(res, 'No tenant context found in token.', 403);
  }
  req.tenantId = req.user.tenantId;
  next();
}

module.exports = tenantContext;
