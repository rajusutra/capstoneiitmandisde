// Fatigue Report: history of all assessments with AI explanations.
import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import StatusBadge from '../components/StatusBadge';

const RISK_TONE = { low: 'good', medium: 'warning', high: 'critical' };

export default function FatigueReport() {
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    axiosClient
      .get('/fatigue/assessments')
      .then((res) => setAssessments(res.data.data))
      .catch(console.error);
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Fatigue Report</h1>
      <p className="text-ink-secondary text-sm">
        Every fatigue assessment is logged here. Scores come from the rule engine; explanations
        are AI-generated and must be reviewed by a human manager before acting on them.
      </p>

      {assessments.length === 0 && (
        <p className="text-ink-muted text-center py-8">
          No assessments yet. Go to the Shift Calendar and click "Assess" on a shift.
        </p>
      )}

      <div className="space-y-4">
        {assessments.map((a) => (
          <div key={a.id} className="bg-surface-card border border-white/10 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-3">
              <StatusBadge tone={RISK_TONE[a.riskLevel]} label={`${a.riskLevel} risk`} />
              <span className="font-semibold text-ink">{a.employeeName}</span>
              <span className="text-ink-muted text-sm ml-auto">
                {new Date(a.generatedAt).toLocaleString()}
              </span>
            </div>

            <p className="text-sm text-ink-muted">Score: {a.riskScore}/100</p>

            {a.flags.length > 0 && (
              <ul className="text-sm text-ink-secondary list-disc list-inside">
                {a.flags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            )}

            <p className="text-sm text-ink-secondary">{a.aiExplanation}</p>
            <p className="text-sm text-ink-secondary">
              <b className="text-ink">Suggestion:</b> {a.suggestedAlternative}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
