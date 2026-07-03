// Tests for register and login (/api/auth)
const request = require('supertest');
const db = require('./helpers/db');
const app = require('../src/app');

beforeAll(() => db.connect());
afterAll(() => db.close());

describe('Auth', () => {
  test('register creates a tenant + admin user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      tenantName: 'Acme Corp',
      name: 'Alice',
      email: 'alice@acme.com',
      password: 'secret123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.tenant.slug).toBe('acme-corp');
  });

  test('register rejects a duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      tenantName: 'Other Corp',
      name: 'Alice Again',
      email: 'alice@acme.com',
      password: 'secret123',
    });
    expect(res.status).toBe(409);
  });

  test('login works with correct password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@acme.com',
      password: 'secret123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  test('login fails with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@acme.com',
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
  });

  test('protected route rejects requests without a token', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(401);
  });
});
