// Safety rules the fatigue engine checks shifts against. One set per tenant.
const mongoose = require('mongoose');

const fatigueRuleSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  ruleName: { type: String, default: 'Default fatigue rules' },
  minRestHours: { type: Number, default: 11 },        // minimum rest between two shifts
  maxConsecutiveShifts: { type: Number, default: 5 }, // max days in a row with shifts
  maxWeeklyHours: { type: Number, default: 48 },      // max worked hours in any 7-day window
  riskWeight: { type: Number, default: 25 },          // score added per violated rule
});

fatigueRuleSchema.index({ tenantId: 1 });

module.exports = mongoose.model('FatigueRule', fatigueRuleSchema);
