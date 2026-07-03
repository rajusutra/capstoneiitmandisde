// Migration 005: create the subscription plans collection with three default
// plans (only when the collection is empty, so re-runs never duplicate them).
module.exports = {
  name: '005_create_subscription_plans',
  description: 'Create subscriptionplans collection with default Monthly/Quarterly/Yearly plans',

  async up(db) {
    await db.createCollection('subscriptionplans').catch(() => {});

    const count = await db.collection('subscriptionplans').countDocuments();
    if (count === 0) {
      const now = new Date();
      await db.collection('subscriptionplans').insertMany([
        { name: 'Monthly', priceINR: 999, priceUSD: 12, durationDays: 30, description: 'Billed every month', isActive: true, createdAt: now },
        { name: 'Quarterly', priceINR: 2499, priceUSD: 30, durationDays: 90, description: 'Save 17% vs monthly', isActive: true, createdAt: now },
        { name: 'Yearly', priceINR: 8999, priceUSD: 108, durationDays: 365, description: 'Best value — save 25%', isActive: true, createdAt: now },
      ]);
    }
  },

  async down(db) {
    await db.collection('subscriptionplans').drop().catch(() => {});
  },
};
