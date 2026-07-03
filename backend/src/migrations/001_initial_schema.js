// Migration 001: create the core collections and their indexes.
module.exports = {
  name: '001_initial_schema',
  description: 'Create tenants and users collections with indexes',

  async up(db) {
    await db.createCollection('tenants').catch(() => {}); // ignore "already exists"
    await db.createCollection('users').catch(() => {});
    await db.collection('tenants').createIndex({ slug: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ tenantId: 1 });
  },

  async down(db) {
    await db.collection('users').drop().catch(() => {});
    await db.collection('tenants').drop().catch(() => {});
  },
};
