// Pure unit tests for the rule engine — no database or server needed.
const FatigueEngine = require('../src/services/ai/FatigueEngine');

// Default rule set used across the tests
const rule = {
  minRestHours: 11,
  maxConsecutiveShifts: 5,
  maxWeeklyHours: 48,
  riskWeight: 25,
};

function shift(startTime, endTime) {
  return { startTime, endTime };
}

describe('FatigueEngine', () => {
  test('a lone shift with no history is low risk', () => {
    const result = FatigueEngine.assess(
      shift('2026-07-10T09:00:00Z', '2026-07-10T17:00:00Z'),
      [],
      rule
    );
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('low');
    expect(result.flags).toHaveLength(0);
  });

  test('flags too little rest between shifts', () => {
    const previous = shift('2026-07-09T14:00:00Z', '2026-07-09T22:00:00Z');
    const next = shift('2026-07-10T04:00:00Z', '2026-07-10T12:00:00Z'); // only 6h after previous

    const result = FatigueEngine.assess(next, [previous], rule);
    expect(result.flags.join(' ')).toContain('rest');
    expect(result.riskScore).toBe(25);
    expect(result.riskLevel).toBe('medium');
  });

  test('flags overlapping shifts', () => {
    const other = shift('2026-07-10T12:00:00Z', '2026-07-10T20:00:00Z');
    const current = shift('2026-07-10T09:00:00Z', '2026-07-10T17:00:00Z');

    const result = FatigueEngine.assess(current, [other], rule);
    expect(result.flags.join(' ')).toContain('overlaps');
  });

  test('flags too many hours in a 7-day window', () => {
    // Five previous 10h shifts = 50h, over the 48h cap even before the new shift
    const history = [
      shift('2026-07-05T08:00:00Z', '2026-07-05T18:00:00Z'),
      shift('2026-07-06T08:00:00Z', '2026-07-06T18:00:00Z'),
      shift('2026-07-07T08:00:00Z', '2026-07-07T18:00:00Z'),
      shift('2026-07-08T08:00:00Z', '2026-07-08T18:00:00Z'),
      shift('2026-07-09T08:00:00Z', '2026-07-09T18:00:00Z'),
    ];
    const current = shift('2026-07-10T08:00:00Z', '2026-07-10T18:00:00Z');

    const result = FatigueEngine.assess(current, history, rule);
    expect(result.flags.join(' ')).toContain('7 days');
  });

  test('flags too many consecutive days with shifts', () => {
    // 6 previous days in a row + the new one = 7 consecutive days (max is 5)
    const history = [
      shift('2026-07-04T09:00:00Z', '2026-07-04T13:00:00Z'),
      shift('2026-07-05T09:00:00Z', '2026-07-05T13:00:00Z'),
      shift('2026-07-06T09:00:00Z', '2026-07-06T13:00:00Z'),
      shift('2026-07-07T09:00:00Z', '2026-07-07T13:00:00Z'),
      shift('2026-07-08T09:00:00Z', '2026-07-08T13:00:00Z'),
      shift('2026-07-09T09:00:00Z', '2026-07-09T13:00:00Z'),
    ];
    const current = shift('2026-07-10T09:00:00Z', '2026-07-10T13:00:00Z');

    const result = FatigueEngine.assess(current, history, rule);
    expect(result.flags.join(' ')).toContain('days in a row');
  });

  test('multiple violations raise the level to high', () => {
    // Overlap + short rest + long week all at once
    const history = [
      shift('2026-07-09T20:00:00Z', '2026-07-10T06:00:00Z'), // overlaps + recent
      shift('2026-07-05T08:00:00Z', '2026-07-05T20:00:00Z'),
      shift('2026-07-06T08:00:00Z', '2026-07-06T20:00:00Z'),
      shift('2026-07-07T08:00:00Z', '2026-07-07T20:00:00Z'),
      shift('2026-07-08T08:00:00Z', '2026-07-08T20:00:00Z'),
    ];
    const current = shift('2026-07-10T05:00:00Z', '2026-07-10T13:00:00Z');

    const result = FatigueEngine.assess(current, history, rule);
    expect(result.riskScore).toBeGreaterThanOrEqual(50);
    expect(result.riskLevel).toBe('high');
  });
});
