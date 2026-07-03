// Tests for subscription plan CRUD (superadmin) and tenure-based extension.
const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('./helpers/db');
const app = require('../src/app');
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');

let superToken;
let orgToken;
let orgTenantId;

beforeAll(async () => {
  await db.connect();

  // Superadmin
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

  // A normal organization
  const reg = await request(app).post('/api/auth/register').send({
    tenantName: 'Plan Co',
    name: 'Owner',
    email: 'owner@planco.com',
    password: 'secret123',
  });
  orgToken = reg.body.data.token;
  orgTenantId = reg.body.data.tenant.id;
});

afterAll(() => db.close());

describe('Subscription plan CRUD (superadmin)', () => {
  let planId;

  test('create a plan with tenure', async () => {
    const res = await request(app)
      .post('/api/admin/plans')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ name: 'Quarterly', priceINR: 2499, priceUSD: 30, durationDays: 90, description: '3 months' });

    expect(res.status).toBe(201);
    expect(res.body.data.durationDays).toBe(90);
    planId = res.body.data._id;
  });

  test('create rejects missing tenure', async () => {
    const res = await request(app)
      .post('/api/admin/plans')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ name: 'Broken', priceINR: 100, priceUSD: 2 });
    expect(res.status).toBe(400);
  });

  test('list plans', async () => {
    const res = await request(app).get('/api/admin/plans').set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.name)).toContain('Quarterly');
  });

  test('update a plan', async () => {
    const res = await request(app)
      .put(`/api/admin/plans/${planId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ name: 'Quarterly', priceINR: 2999, priceUSD: 36, durationDays: 90, isActive: true });
    expect(res.status).toBe(200);
    expect(res.body.data.priceINR).toBe(2999);
  });

  test('org admin cannot manage plans', async () => {
    const res = await request(app)
      .post('/api/admin/plans')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ name: 'Hack', priceINR: 1, priceUSD: 1, durationDays: 9999 });
    expect(res.status).toBe(403);
  });

  test('paying for a plan extends the subscription by its tenure (90 days)', async () => {
    // The org sees the plan on its billing status
    const status = await request(app).get('/api/billing/status').set('Authorization', `Bearer ${orgToken}`);
    const plan = status.body.data.plans.find((p) => p.name === 'Quarterly');
    expect(plan).toBeDefined();

    // Demo payment for that plan
    const order = await request(app)
      .post('/api/billing/order')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ method: 'razorpay', planId: plan._id });
    expect(order.body.data.durationDays).toBe(90);

    const confirm = await request(app)
      .post('/api/billing/confirm')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ method: 'razorpay', orderId: order.body.data.orderId, planId: plan._id });
    expect(confirm.status).toBe(200);

    // Subscription should now end roughly 90 days from now (+/- 2 days of slack)
    const endsAt = new Date(confirm.body.data.subscriptionEndsAt);
    const daysFromNow = (endsAt - new Date()) / (1000 * 60 * 60 * 24);
    expect(daysFromNow).toBeGreaterThan(88);
    expect(daysFromNow).toBeLessThan(92);
  });

  test('manual payment with a plan uses its tenure too', async () => {
    const res = await request(app)
      .post(`/api/admin/tenants/${orgTenantId}/record-payment`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ planId, note: 'Bank transfer' });
    expect(res.status).toBe(201);
    expect(res.body.data.durationDays).toBe(90);
    expect(res.body.data.amount).toBe(2999); // defaults to the plan's INR price
  });

  test('delete a plan', async () => {
    const res = await request(app)
      .delete(`/api/admin/plans/${planId}`)
      .set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);

    const list = await request(app).get('/api/admin/plans').set('Authorization', `Bearer ${superToken}`);
    expect(list.body.data.map((p) => String(p._id))).not.toContain(String(planId));
  });
});
