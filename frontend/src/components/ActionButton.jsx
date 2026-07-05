// Small capsule-shaped action button used in table rows (Delete, Edit,
// Activate/Deactivate, Impersonate, etc.) — a transparent tint of the tone
// color rather than a plain underlined link, so a row's possible actions
// read as distinct colored pills at a glance.
const TONES = {
  accent: 'bg-accent/10 text-accent hover:bg-accent/20',
  good: 'bg-status-good/10 text-status-good hover:bg-status-good/20',
  warning: 'bg-status-warning/10 text-status-warning hover:bg-status-warning/20',
  critical: 'bg-status-critical/10 text-status-critical hover:bg-status-critical/20',
  neutral: 'bg-line/5 text-ink-secondary hover:bg-line/10',
};

export default function ActionButton({ tone = 'accent', onClick, children, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${TONES[tone]}`}
    >
      {children}
    </button>
  );
}
