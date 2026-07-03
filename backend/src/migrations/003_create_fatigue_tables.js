// Migration 003: create the fatigue rules and assessments collections.
module.exports = {
  name: '003_create_fatigue_tables',
  description: 'Create fatigueRules and fatigueAssessments collections with tenant indexes',

  async up(db) {
    await db.createCollection('fatiguerules').catch(() => {});
    await db.createCollection('fatigueassessments').catch(() => {});
    await db.collection('fatiguerules').createIndex({ tenantId: 1 });
    await db.collection('fatigueassessments').createIndex({ tenantId: 1, generatedAt: -1 });
  },

  async down(db) {
    await db.collection('fatigueassessments').drop().catch(() => {});
    await db.collection('fatiguerules').drop().catch(() => {});
  },
};
