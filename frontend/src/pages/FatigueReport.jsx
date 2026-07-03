// Fatigue Report: history of all assessments with AI explanations.
import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const levelColors = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

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
      <h1 className="text-2xl font-bold">Fatigue Report</h1>
      <p className="text-gray-600 text-sm">
        Every fatigue assessment is logged here. Scores come from the rule engine; explanations
        are AI-generated and must be reviewed by a human manager before acting on them.
      </p>

      {assessments.length === 0 && (
        <p className="text-gray-400 text-center py-8">
          No assessments yet. Go to the Shift Calendar and click "Assess" on a shift.
        </p>
      )}

      <div className="space-y-4">
        {assessments.map((a) => (
          <div key={a.id} className="bg-white rounded-xl shadow p-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${levelColors[a.riskLevel]}`}>
                {a.riskLevel} risk
              </span>
              <span className="font-semibold">{a.employeeName}</span>
              <span className="text-gray-400 text-sm ml-auto">
                {new Date(a.generatedAt).toLocaleString()}
              </span>
            </div>

            <p className="text-sm text-gray-500">Score: {a.riskScore}/100</p>

            {a.flags.length > 0 && (
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {a.flags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            )}

            <p className="text-sm text-gray-700">{a.aiExplanation}</p>
            <p className="text-sm text-gray-700">
              <b>Suggestion:</b> {a.suggestedAlternative}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
