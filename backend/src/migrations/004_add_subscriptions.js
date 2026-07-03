// Migration 004: subscription support.
// Gives every EXISTING tenant the new fields (status + a fresh 10-day trial)
// so organizations created before this feature are not locked out.
module.exports = {
  name: '004_add_subscriptions',
  description: 'Create payments collection; give existing tenants trial status',

  async up(db) {
    await db.createCollection('payments').catch(() => {});
    await db.collection('payments').createIndex({ tenantId: 1, paidAt: -1 });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 10);

    await db.collection('tenants').updateMany(
      { status: { $exists: false } },
      { $set: { status: 'trial', trialEndsAt } }
    );
  },

  async down(db) {
    await db.collection('payments').drop().catch(() => {});
    await db.collection('tenants').updateMany(
      {},
      { $unset: { status: '', trialEndsAt: '', subscriptionEndsAt: '' } }
    );
  },
};
