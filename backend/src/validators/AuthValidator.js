// Checks register/login input before it reaches the service layer.
const { httpError } = require('../middleware/errorHandler');

const AuthValidator = {
  validateRegister(body) {
    const { tenantName, name, email, password } = body;
    if (!tenantName || !name || !email || !password) {
      throw httpError(400, 'tenantName, name, email and password are all required.');
    }
    if (password.length < 6) {
      throw httpError(400, 'Password must be at least 6 characters.');
    }
    if (!email.includes('@')) {
      throw httpError(400, 'Please provide a valid email address.');
    }
  },

  validateLogin(body) {
    const { email, password } = body;
    if (!email || !password) {
      throw httpError(400, 'Email and password are required.');
    }
  },
};

module.exports = AuthValidator;
