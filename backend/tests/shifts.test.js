// Tests for shift CRUD, overlap detection and the fatigue assessment endpoint.
const request = require('supertest');
const db = require('./helpers/db');
const app = require('../src/app');

let token;
let employeeId;

beforeAll(async () => {
  await db.connect();

  const reg = await request(app).post('/api/auth/register').send({
    tenantName: 'Shift Co',
    name: 'Manager',
    email: 'manager@shiftco.com',
    password: 'secret123',
  });
  token = reg.body.data.token;

  const emp = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Bob', employeeCode: 'S-001' });
  employeeId = emp.body.data.id;
});

afterAll(() => db.close());

describe('Shifts', () => {
  test('create a shift', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeId,
        startTime: '2026-07-10T09:00:00Z',
        endTime: '2026-07-10T17:00:00Z',
        shiftType: 'morning',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.employeeName).toBe('Bob');
  });

  test('rejects an overlapping shift for the same employee', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeId,
        startTime: '2026-07-10T16:00:00Z', // overlaps 09:00-17:00 above
        endTime: '2026-07-10T22:00:00Z',
      });

    expect(res.status).toBe(409);
  });

  test('rejects a shift with endTime before startTime', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeId,
        startTime: '2026-07-11T17:00:00Z',
        endTime: '2026-07-11T09:00:00Z',
      });

    expect(res.status).toBe(400);
  });

  test('fatigue assessment flags a shift with too little rest', async () => {
    // Bob works until 22:00, then again at 04:00 next day -> only 6h rest
    const late = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeId, startTime: '2026-07-12T14:00:00Z', endTime: '2026-07-12T22:00:00Z' });
    expect(late.status).toBe(201);

    const early = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeId, startTime: '2026-07-13T04:00:00Z', endTime: '2026-07-13T12:00:00Z' });
    expect(early.status).toBe(201);

    const res = await request(app)
      .post(`/api/fatigue/assess/${early.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.data.riskScore).toBeGreaterThan(0);
    expect(res.body.data.flags.join(' ')).toContain('rest');
    expect(res.body.data.aiExplanation).toBeTruthy(); // template fallback works without an API key
  });

  test('assessments list returns the saved assessment', async () => {
    const res = await request(app)
      .get('/api/fatigue/assessments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
