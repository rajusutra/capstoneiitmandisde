// Catches any error thrown in a route and returns a clean JSON response.
// Errors thrown with err.statusCode keep their code; others become 500.
const ResponseFormatter = require('../views/ResponseFormatter');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  if (statusCode === 500) {
    console.error(err); // log unexpected errors for debugging
  }
  return ResponseFormatter.error(res, err.message || 'Server error', statusCode);
}

// Small helper to create errors with a status code, e.g. httpError(404, 'Not found')
function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { errorHandler, httpError };
