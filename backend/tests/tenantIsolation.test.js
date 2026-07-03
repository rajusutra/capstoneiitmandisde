// The most important test: tenant A must NEVER see tenant B's data.
const request = require('supertest');
const db = require('./helpers/db');
const app = require('../src/app');

let tokenA;
let tokenB;
let employeeAId;

beforeAll(async () => {
  await db.connect();

  // Register two separate organizations
  const resA = await request(app).post('/api/auth/register').send({
    tenantName: 'Tenant A',
    name: 'Admin A',
    email: 'admin@tenant-a.com',
    password: 'secret123',
  });
  tokenA = resA.body.data.token;

  const resB = await request(app).post('/api/auth/register').send({
    tenantName: 'Tenant B',
    name: 'Admin B',
    email: 'admin@tenant-b.com',
    password: 'secret123',
  });
  tokenB = resB.body.data.token;

  // Tenant A creates an employee
  const empRes = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ name: 'Worker A1', employeeCode: 'A-001' });
  employeeAId = empRes.body.data.id;
});

afterAll(() => db.close());

describe('Tenant isolation', () => {
  test("tenant B's employee list does not contain tenant A's employee", async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  test("tenant B cannot update tenant A's employee", async () => {
    const res = await request(app)
      .put(`/api/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hacked Name' });

    expect(res.status).toBe(404); // looks like it doesn't exist to tenant B
  });

  test("tenant B cannot delete tenant A's employee", async () => {
    const res = await request(app)
      .delete(`/api/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  test("tenant B cannot create a shift for tenant A's employee", async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        employeeId: employeeAId,
        startTime: '2026-07-10T09:00:00Z',
        endTime: '2026-07-10T17:00:00Z',
      });

    expect(res.status).toBe(404);
  });

  test('tenant A still sees its own employee', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Worker A1');
  });
});
