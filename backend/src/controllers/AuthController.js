// Handles HTTP for /api/auth. Validates input, calls the service, formats the response.
const AuthService = require('../services/AuthService');
const AuthValidator = require('../validators/AuthValidator');
const { toAuthResponse } = require('../dto/AuthDTO');
const ResponseFormatter = require('../views/ResponseFormatter');

const AuthController = {
  async register(req, res, next) {
    try {
      AuthValidator.validateRegister(req.body);
      const { user, tenant, token } = await AuthService.register(req.body);
      return ResponseFormatter.success(res, toAuthResponse(user, tenant, token), 'Account created', 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      AuthValidator.validateLogin(req.body);
      const { user, tenant, token } = await AuthService.login(req.body);
      return ResponseFormatter.success(res, toAuthResponse(user, tenant, token), 'Logged in');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
