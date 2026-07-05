// One small badge used everywhere something is good/pending/bad: tenant
// status (active/trial/suspended), fatigue risk level (low/medium/high),
// plan visibility, etc. Keeping this in one place is what makes "green
// always means good" true across the whole app instead of every page
// picking its own colors.
const TONES = {
  good: 'bg-status-good/15 text-status-good',
  warning: 'bg-status-warning/15 text-status-warning',
  critical: 'bg-status-critical/15 text-status-critical',
  neutral: 'bg-line/10 text-ink-secondary',
};

export default function StatusBadge({ tone = 'neutral', label }) {
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${TONES[tone]}`}>
      {label}
    </span>
  );
}
