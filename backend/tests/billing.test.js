// Tests for the 10-day trial, payments and the superadmin panel.
const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('./helpers/db');
const app = require('../src/app');
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');

let orgToken;
let orgTenantId;
let superToken;

beforeAll(async () => {
  await db.connect();

  // A normal organization (starts on a 10-day trial)
  const reg = await request(app).post('/api/auth/register').send({
    tenantName: 'Billing Co',
    name: 'Owner',
    email: 'owner@billingco.com',
    password: 'secret123',
  });
  orgToken = reg.body.data.token;
  orgTenantId = reg.body.data.tenant.id;

  // The platform superadmin (created directly, like the seed script does)
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
});

afterAll(() => db.close());

describe('Trial and subscription', () => {
  test('a new organization is on trial and can use the app', async () => {
    const status = await request(app)
      .get('/api/billing/status')
      .set('Authorization', `Bearer ${orgToken}`);
    expect(status.body.data.status).toBe('trial');
    expect(status.body.data.trialDaysLeft).toBeGreaterThan(0);

    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(200);
  });

  test('when the trial expires the app is blocked with 402', async () => {
    // Simulate time passing: move the trial end into the past
    await Tenant.updateOne({ _id: orgTenantId }, { $set: { trialEndsAt: new Date('2020-01-01') } });

    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(402);
    expect(res.body.message).toContain('trial');
  });

  test('billing routes still work while blocked (so the org can pay)', async () => {
    const res = await request(app)
      .get('/api/billing/status')
      .set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(200);
  });

  test('paying (demo Razorpay) reactivates the organization for 30 days', async () => {
    // No Razorpay keys in tests -> demo mode order
    const order = await request(app)
      .post('/api/billing/order')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ method: 'razorpay' });
    expect(order.status).toBe(201);
    expect(order.body.data.mode).toBe('demo');

    const confirm = await request(app)
      .post('/api/billing/confirm')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ method: 'razorpay', orderId: order.body.data.orderId });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.status).toBe('active');

    // App access is restored
    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Superadmin', () => {
  test('superadmin can list all organizations (paginated)', async () => {
    const res = await request(app).get('/api/admin/tenants').set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('tenants');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('pages');
    const names = res.body.data.tenants.map((t) => t.name);
    expect(names).toContain('Billing Co');
    expect(names).not.toContain('Platform'); // the platform itself is hidden
  });

  test('tenants list supports search', async () => {
    const res = await request(app)
      .get('/api/admin/tenants')
      .query({ search: 'Billing' })
      .set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tenants.every((t) => t.name.includes('Billing'))).toBe(true);
  });

  test('superadmin can list all users across tenants (paginated)', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('users');
    const emails = res.body.data.users.map((u) => u.email);
    expect(emails).toContain('owner@billingco.com');
  });

  test('dashboard stats return platform-wide counts', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalTenants).toBeGreaterThanOrEqual(1);
    expect(res.body.data.statusBreakdown).toHaveProperty('trial');
    expect(res.body.data.statusBreakdown).toHaveProperty('active');
    expect(res.body.data.statusBreakdown).toHaveProperty('suspended');
  });

  test('a normal org admin cannot access the admin panel', async () => {
    const res = await request(app).get('/api/admin/tenants').set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(403);
  });

  test('deactivating an organization blocks it immediately', async () => {
    const res = await request(app)
      .post(`/api/admin/tenants/${orgTenantId}/deactivate`)
      .set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);

    const blocked = await request(app).get('/api/employees').set('Authorization', `Bearer ${orgToken}`);
    expect(blocked.status).toBe(402);
    expect(blocked.body.message).toContain('deactivated');
  });

  test('activating it restores access and adds 30 days', async () => {
    const res = await request(app)
      .post(`/api/admin/tenants/${orgTenantId}/activate`)
      .set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);

    const ok = await request(app).get('/api/employees').set('Authorization', `Bearer ${orgToken}`);
    expect(ok.status).toBe(200);
  });

  test('superadmin can record a manual payment', async () => {
    const res = await request(app)
      .post(`/api/admin/tenants/${orgTenantId}/record-payment`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ amount: 999, note: 'Bank transfer ref #123' });
    expect(res.status).toBe(201);
    expect(res.body.data.method).toBe('manual');

    const payments = await request(app).get('/api/admin/payments').set('Authorization', `Bearer ${superToken}`);
    expect(payments.body.data.length).toBeGreaterThanOrEqual(2); // demo razorpay + manual
  });
});
