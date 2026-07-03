// Business logic for registration and login.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const FatigueRule = require('../models/FatigueRule');
const { httpError } = require('../middleware/errorHandler');

// Turn "Acme Corp!" into "acme-corp" for the tenant slug
function makeSlug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function signToken(user) {
  return jwt.sign(
    { userId: user._id, tenantId: user.tenantId, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

const AuthService = {
  // Creates a new tenant + its first admin user + a default fatigue rule
  async register({ tenantName, name, email, password }) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) throw httpError(409, 'An account with this email already exists.');

    const slug = makeSlug(tenantName);
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) throw httpError(409, 'An organization with this name already exists.');

    // Every new organization starts with a free 10-day trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 10);
    const tenant = await Tenant.create({ name: tenantName, slug, status: 'trial', trialEndsAt });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      tenantId: tenant._id,
      name,
      email,
      passwordHash,
      role: 'admin',
    });

    // Every new tenant starts with a sensible default rule set
    await FatigueRule.create({ tenantId: tenant._id });

    return { user, tenant, token: signToken(user) };
  },

  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw httpError(401, 'Invalid email or password.');

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) throw httpError(401, 'Invalid email or password.');

    const tenant = await Tenant.findById(user.tenantId);
    return { user, tenant, token: signToken(user) };
  },
};

module.exports = AuthService;
