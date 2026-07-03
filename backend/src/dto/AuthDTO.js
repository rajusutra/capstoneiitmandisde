// Shapes the auth response sent to the frontend (never expose passwordHash).
function toAuthResponse(user, tenant, token) {
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    tenant: {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
    },
  };
}

module.exports = { toAuthResponse };
