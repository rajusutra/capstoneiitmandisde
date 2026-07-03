// Tests for superadmin impersonation.
const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('./helpers/db');
const app = require('../src/app');
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');
const ImpersonationLog = require('../src/models/ImpersonationLog');

let superToken;
let orgToken;
let orgTenantId;

beforeAll(async () => {
  await db.connect();

  const platformTenant = await Tenant.create({
    name: 'Platform',
    slug: 'platform',
    status: 'active',
    subscriptionEndsAt: new Date('2099-01-01'),
  });
  await User.create({
    tenantId: platformTenant._id,
    name: 'Super',
    email: 'super@platform.com',
    passwordHash: await bcrypt.hash('super123', 10),
    role: 'superadmin',
  });
  const login = await request(app).post('/api/auth/login').send({
    email: 'super@platform.com',
    password: 'super123',
  });
  superToken = login.body.data.token;

  const reg = await request(app).post('/api/auth/register').send({
    tenantName: 'Impersonation Co',
    name: 'Owner',
    email: 'owner@impersonationco.com',
    password: 'secret123',
  });
  orgToken = reg.body.data.token;
  orgTenantId = reg.body.data.tenant.id;

  await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${orgToken}`)
    .send({ name: 'Worker', employeeCode: 'IMP-001' });
});

afterAll(() => db.close());

describe('Impersonation', () => {
  test('superadmin can impersonate an organization', async () => {
    const res = await request(app)
      .post(`/api/admin/tenants/${orgTenantId}/impersonate`)
      .set('Authorization', `Bearer ${superToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tenant.id).toBe(orgTenantId);
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.user.email).toBe('owner@impersonationco.com');
  });

  test('the impersonation token behaves like a real org session', async () => {
    const impersonate = await request(app)
      .post(`/api/admin/tenants/${orgTenantId}/impersonate`)
      .set('Authorization', `Bearer ${superToken}`);
    const impersonationToken = impersonate.body.data.token;

    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${impersonationToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map((e) => e.name)).toContain('Worker');
  });

  test('an impersonation event is logged', async () => {
    const before = await ImpersonationLog.countDocuments({ tenantId: orgTenantId });
    await request(app)
      .post(`/api/admin/tenants/${orgTenantId}/impersonate`)
      .set('Authorization', `Bearer ${superToken}`);
    const after = await ImpersonationLog.countDocuments({ tenantId: orgTenantId });
    expect(after).toBe(before + 1);
  });

  test('a normal org admin cannot impersonate', async () => {
    const res = await request(app)
      .post(`/api/admin/tenants/${orgTenantId}/impersonate`)
      .set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(403);
  });

  test('impersonating a tenant with no admin user fails cleanly', async () => {
    const emptyTenant = await Tenant.create({ name: 'Empty Org', slug: 'empty-org', status: 'trial' });
    const res = await request(app)
      .post(`/api/admin/tenants/${emptyTenant._id}/impersonate`)
      .set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(404);
  });
});
