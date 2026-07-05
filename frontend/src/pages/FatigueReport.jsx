// Fatigue Report: a chart of each employee's final (most recent) fatigue
// score, plus their full assessment history when you pick one from the list.
// Risk level is a STATE field, so it draws from the reserved
// good/warning/critical steps (fixed, never themed) rather than arbitrary
// categorical hues; everything else in the charts follows the current
// light/dark theme via CHART_COLORS.
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import axiosClient from '../api/axiosClient';
import StatusBadge from '../components/StatusBadge';
import { useTheme } from '../context/ThemeContext';
import { CHART_COLORS } from '../theme/chartColors';

const RISK_TONE = { low: 'good', medium: 'warning', high: 'critical' };
const STATUS_COLORS = { low: '#0ca30c', medium: '#fab219', high: '#d03b3b' };

function ChartCard({ title, children }) {
  return (
    <div className="bg-surface-card border border-line/10 rounded-2xl p-6">
      <h2 className="font-semibold text-ink mb-4">{title}</h2>
      {children}
    </div>
  );
}

function RiskDot(props) {
  const { theme } = useTheme();
  const { cx, cy, payload } = props;
  return <circle cx={cx} cy={cy} r={4} fill={STATUS_COLORS[payload.riskLevel]} stroke={CHART_COLORS[theme].surface} strokeWidth={2} />;
}

export default function FatigueReport() {
  const { theme } = useTheme();
  const c = CHART_COLORS[theme];
  const tooltipStyle = {
    fontSize: 13,
    borderRadius: 8,
    backgroundColor: c.surface,
    border: `1px solid ${c.tooltipBorder}`,
    color: c.ink,
  };
  const [assessments, setAssessments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  useEffect(() => {
    Promise.all([axiosClient.get('/fatigue/assessments'), axiosClient.get('/employees')])
      .then(([assessRes, empRes]) => {
        setAssessments(assessRes.data.data);
        setEmployees(empRes.data.data);
      })
      .catch(console.error);
  }, []);

  // Assessments come back sorted newest-first, so the first one seen per
  // employee is their final (most recent) assessment.
  const latestByEmployee = useMemo(() => {
    const map = {};
    for (const a of assessments) {
      if (!map[a.employeeId]) map[a.employeeId] = a;
    }
    return map;
  }, [assessments]);

  const finalFatigueData = useMemo(() => {
    return employees
      .filter((emp) => latestByEmployee[emp.id])
      .map((emp) => ({
        id: emp.id,
        name: emp.name,
        riskScore: latestByEmployee[emp.id].riskScore,
        riskLevel: latestByEmployee[emp.id].riskLevel,
      }))
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [employees, latestByEmployee]);

  const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId);
  const employeeHistory = useMemo(
    () => assessments.filter((a) => a.employeeId === selectedEmployeeId),
    [assessments, selectedEmployeeId]
  );
  // Chronological order, one point per shift assessment (duplicates are
  // already prevented at the source — see FatigueController.assess). The
  // axis below labels each point by date, not by time of day.
  const historyChartData = useMemo(() => [...employeeHistory].reverse(), [employeeHistory]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Fatigue Report</h1>
      <p className="text-ink-secondary text-sm">
        Scores come from the rule engine; explanations are AI-generated and must be reviewed by a
        human manager before acting on them.
      </p>

      {assessments.length === 0 && (
        <p className="text-ink-muted text-center py-8">
          No assessments yet. Go to the Shift Calendar — fatigue is now assessed automatically.
        </p>
      )}

      {finalFatigueData.length > 0 && (
        <ChartCard title="Final fatigue score by employee">
          <ResponsiveContainer width="100%" height={Math.max(220, finalFatigueData.length * 44)}>
            <BarChart data={finalFatigueData} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid stroke={c.gridline} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: c.inkMuted, fontSize: 12 }}
                axisLine={{ stroke: c.gridline }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: c.ink, fontSize: 13 }}
                axisLine={{ stroke: c.gridline }}
                tickLine={false}
                width={120}
              />
              <Tooltip
                cursor={{ fill: c.cursorWash }}
                contentStyle={tooltipStyle}
                formatter={(value, _name, item) => [`${value}/100 (${item.payload.riskLevel} risk)`, 'Score']}
              />
              <Bar dataKey="riskScore" radius={[0, 4, 4, 0]} barSize={22} minPointSize={3} label={{ position: 'right', fill: c.ink, fontSize: 12 }}>
                {finalFatigueData.map((entry) => (
                  <Cell key={entry.id} fill={STATUS_COLORS[entry.riskLevel]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 text-xs text-ink-muted">
            {['low', 'medium', 'high'].map((level) => (
              <span key={level} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[level] }} />
                {level} risk
              </span>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Employee-wise fatigue history */}
      {employees.length > 0 && (
        <div className="bg-surface-card border border-line/10 rounded-2xl p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-ink-muted block mb-1">Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="bg-line/5 border border-line/10 rounded-lg px-3 py-2 text-sm text-ink min-w-[220px] focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="" className="bg-surface-card">View an employee's fatigue history…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id} className="bg-surface-card">{emp.name}</option>
              ))}
            </select>
          </div>
          {selectedEmployee && (
            <span className="text-sm text-ink-secondary">
              {employeeHistory.length} assessment{employeeHistory.length === 1 ? '' : 's'} on record
            </span>
          )}
        </div>
      )}

      {selectedEmployeeId && employeeHistory.length === 0 && (
        <p className="text-ink-muted text-center py-8">No fatigue history yet for {selectedEmployee?.name}.</p>
      )}

      {selectedEmployeeId && historyChartData.length > 1 && (
        <ChartCard title={`${selectedEmployee?.name}'s fatigue trend`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={historyChartData} margin={{ left: -12 }}>
              <CartesianGrid stroke={c.gridline} vertical={false} />
              <XAxis
                dataKey="generatedAt"
                tick={{ fill: c.inkMuted, fontSize: 11 }}
                axisLine={{ stroke: c.gridline }}
                tickLine={false}
                tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis domain={[0, 100]} tick={{ fill: c.inkMuted, fontSize: 12 }} axisLine={{ stroke: c.gridline }} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(d) => new Date(d).toLocaleString()}
                formatter={(value, _name, item) => [`${value}/100 (${item.payload.riskLevel} risk)`, 'Score']}
              />
              <Line type="monotone" dataKey="riskScore" stroke={c.accent} strokeWidth={2} dot={<RiskDot />} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 text-xs text-ink-muted">
            {['low', 'medium', 'high'].map((level) => (
              <span key={level} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[level] }} />
                {level} risk
              </span>
            ))}
          </div>
        </ChartCard>
      )}

      {selectedEmployeeId && employeeHistory.length > 0 && (
        <div className="space-y-4">
          {employeeHistory.map((a) => (
            <div key={a.id} className="bg-surface-card border border-line/10 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-3">
                <StatusBadge tone={RISK_TONE[a.riskLevel]} label={`${a.riskLevel} risk`} />
                <span className="text-ink-muted text-sm ml-auto">{new Date(a.generatedAt).toLocaleString()}</span>
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
      )}
    </div>
  );
}
