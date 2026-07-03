// Migration 002: create employees, shifts and availability collections.
module.exports = {
  name: '002_create_shifts_and_availability',
  description: 'Create employees, shifts and availability collections with tenant indexes',

  async up(db) {
    await db.createCollection('employees').catch(() => {});
    await db.createCollection('shifts').catch(() => {});
    await db.createCollection('availabilities').catch(() => {});
    await db.collection('employees').createIndex({ tenantId: 1, employeeCode: 1 }, { unique: true });
    await db.collection('shifts').createIndex({ tenantId: 1, employeeId: 1, startTime: 1 });
    await db.collection('availabilities').createIndex({ tenantId: 1, employeeId: 1, dayOfWeek: 1 });
  },

  async down(db) {
    await db.collection('availabilities').drop().catch(() => {});
    await db.collection('shifts').drop().catch(() => {});
    await db.collection('employees').drop().catch(() => {});
  },
};
