// The rule-based fatigue engine (docs section 8).
// This is deliberately deterministic (no AI) so the safety scoring is auditable.
// It takes one shift + the employee's other shifts + the tenant's rules,
// and returns a score, level and list of violated rules ("flags").

const HOUR = 1000 * 60 * 60;

function hoursBetween(a, b) {
  return (b - a) / HOUR;
}

function shiftHours(shift) {
  return hoursBetween(new Date(shift.startTime), new Date(shift.endTime));
}

// Check 1: enough rest before this shift?
// Finds the shift that ends closest before this one starts and measures the gap.
function checkRest(shift, otherShifts, rule) {
  const start = new Date(shift.startTime);
  let latestEndBefore = null;

  for (const other of otherShifts) {
    const otherEnd = new Date(other.endTime);
    if (otherEnd <= start && (!latestEndBefore || otherEnd > latestEndBefore)) {
      latestEndBefore = otherEnd;
    }
  }

  if (!latestEndBefore) return null; // no earlier shift, nothing to check
  const restHours = hoursBetween(latestEndBefore, start);
  if (restHours < rule.minRestHours) {
    return `Only ${restHours.toFixed(1)}h rest before this shift (minimum is ${rule.minRestHours}h).`;
  }
  return null;
}

// Check 2: does this shift overlap another shift?
function checkOverlap(shift, otherShifts) {
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);

  for (const other of otherShifts) {
    if (new Date(other.startTime) < end && new Date(other.endTime) > start) {
      return 'This shift overlaps another shift for the same employee.';
    }
  }
  return null;
}

// Check 3: total hours in the 7 days ending at this shift's end.
function checkWeeklyHours(shift, otherShifts, rule) {
  const windowEnd = new Date(shift.endTime);
  const windowStart = new Date(windowEnd - 7 * 24 * HOUR);

  let total = shiftHours(shift);
  for (const other of otherShifts) {
    const s = new Date(other.startTime);
    if (s >= windowStart && s < windowEnd) total += shiftHours(other);
  }

  if (total > rule.maxWeeklyHours) {
    return `${total.toFixed(1)}h worked in the last 7 days (maximum is ${rule.maxWeeklyHours}h).`;
  }
  return null;
}

// Check 4: how many days in a row (ending at this shift's day) have shifts?
function checkConsecutiveDays(shift, otherShifts, rule) {
  // Collect all days (as YYYY-MM-DD strings) that have a shift
  const days = new Set();
  for (const s of [shift, ...otherShifts]) {
    days.add(new Date(s.startTime).toISOString().slice(0, 10));
  }

  // Count backwards day by day from this shift's day
  let count = 0;
  const day = new Date(shift.startTime);
  while (days.has(day.toISOString().slice(0, 10))) {
    count += 1;
    day.setDate(day.getDate() - 1);
  }

  if (count > rule.maxConsecutiveShifts) {
    return `${count} days in a row with shifts (maximum is ${rule.maxConsecutiveShifts}).`;
  }
  return null;
}

const FatigueEngine = {
  // Returns { riskScore, riskLevel, flags }
  assess(shift, otherShifts, rule) {
    const flags = [
      checkRest(shift, otherShifts, rule),
      checkOverlap(shift, otherShifts),
      checkWeeklyHours(shift, otherShifts, rule),
      checkConsecutiveDays(shift, otherShifts, rule),
    ].filter(Boolean); // drop the nulls (checks that passed)

    // Each violated rule adds riskWeight points, capped at 100
    const riskScore = Math.min(100, flags.length * rule.riskWeight);
    let riskLevel = 'low';
    if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    return { riskScore, riskLevel, flags };
  },
};

module.exports = FatigueEngine;
