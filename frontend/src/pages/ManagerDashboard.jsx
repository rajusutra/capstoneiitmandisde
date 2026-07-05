// Dashboard: quick stats + shortcuts, plus a tenant-wide analytics overview.
// Risk level is a STATE field (reserved status palette, fixed/never themed);
// shift type is nominal (single-hue bar); upcoming shift volume is a
// count-over-time trend (single-hue bar) — everything else follows the
// current light/dark theme via CHART_COLORS.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CHART_COLORS } from '../theme/chartColors';

const STATUS_COLORS = { low: '#0ca30c', medium: '#fab219', high: '#d03b3b' };
const RISK_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

function ChartCard({ title, children }) {
  return (
    <div className="bg-surface-card border border-line/10 rounded-2xl p-6">
      <h2 className="font-semibold text-ink mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function ManagerDashboard() {
  const { tenant } = useAuth();
  const { theme } = useTheme();
  const c = CHART_COLORS[theme];
  const tooltipStyle = {
    fontSize: 13,
    borderRadius: 8,
    backgroundColor: c.surface,
    border: `1px solid ${c.tooltipBorder}`,
    color: c.ink,
  };
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    async function load() {
      const [empRes, shiftRes, fatigueRes] = await Promise.all([
        axiosClient.get('/employees'),
        axiosClient.get('/shifts'),
        axiosClient.get('/fatigue/assessments'),
      ]);
      setEmployees(empRes.data.data);
      setShifts(shiftRes.data.data);
      setAssessments(fatigueRes.data.data);
    }
    load().catch(console.error);
  }, []);

  const highRiskCount = assessments.filter((a) => a.riskLevel === 'high').length;
  const cards = [
    { label: 'Employees', value: employees.length, to: '/employees' },
    { label: 'Shifts', value: shifts.length, to: '/shifts' },
    { label: 'High-risk assessments', value: highRiskCount, to: '/fatigue' },
  ];

  // Chart A — assessments by risk level (status is a STATE field, reserved palette)
  const riskData = useMemo(
    () =>
      ['low', 'medium', 'high'].map((level) => ({
        level,
        label: RISK_LABELS[level],
        count: assessments.filter((a) => a.riskLevel === level).length,
      })),
    [assessments]
  );

  // Chart B — shifts by type (nominal categories, one measure -> single hue)
  const shiftTypeData = useMemo(
    () =>
      ['morning', 'evening', 'night', 'custom'].map((type) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: shifts.filter((s) => s.shiftType === type).length,
      })),
    [shifts]
  );

  // Chart C — shift volume for the next 14 days (a forward-looking planning
  // tool cares about upcoming coverage, not trailing history)
  const upcomingData = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() + i);
      const dayKey = day.toDateString();
      const count = shifts.filter((s) => new Date(s.startTime).toDateString() === dayKey).length;
      days.push({ date: day.toISOString(), count });
    }
    return days;
  }, [shifts]);

  const hasData = employees.length > 0 || shifts.length > 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Welcome to {tenant?.name}</h1>
      <p className="text-ink-secondary">
        Plan shifts, manage your team and keep fatigue risk under control.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-surface-card border border-line/10 rounded-2xl p-6 hover:border-accent/50 transition"
          >
            <p className="text-3xl font-bold text-ink">{card.value}</p>
            <p className="text-ink-muted mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Assessments by risk level">
            {assessments.length === 0 ? (
              <p className="text-ink-muted text-sm py-8 text-center">No assessments yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid stroke={c.gridline} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: c.inkMuted, fontSize: 12 }} axisLine={{ stroke: c.gridline }} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fill: c.ink, fontSize: 13 }} axisLine={{ stroke: c.gridline }} tickLine={false} width={70} />
                  <Tooltip cursor={{ fill: c.cursorWash }} contentStyle={tooltipStyle} formatter={(v) => [`${v} assessment${v === 1 ? '' : 's'}`, '']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: c.ink, fontSize: 12 }}>
                    {riskData.map((entry) => (
                      <Cell key={entry.level} fill={STATUS_COLORS[entry.level]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Shifts by type">
            {shifts.length === 0 ? (
              <p className="text-ink-muted text-sm py-8 text-center">No shifts yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={shiftTypeData} margin={{ left: -12 }}>
                  <CartesianGrid stroke={c.gridline} vertical={false} />
                  <XAxis dataKey="type" tick={{ fill: c.ink, fontSize: 13 }} axisLine={{ stroke: c.gridline }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: c.inkMuted, fontSize: 12 }} axisLine={{ stroke: c.gridline }} tickLine={false} />
                  <Tooltip cursor={{ fill: c.cursorWash }} contentStyle={tooltipStyle} formatter={(v) => [`${v} shift${v === 1 ? '' : 's'}`, '']} />
                  <Bar dataKey="count" fill={c.accent} radius={[4, 4, 0, 0]} barSize={48} label={{ position: 'top', fill: c.ink, fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="lg:col-span-2">
            <ChartCard title="Upcoming shift coverage (next 14 days)">
              {shifts.length === 0 ? (
                <p className="text-ink-muted text-sm py-8 text-center">No shifts yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={upcomingData} margin={{ left: -12 }}>
                    <CartesianGrid stroke={c.gridline} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: c.inkMuted, fontSize: 11 }}
                      axisLine={{ stroke: c.gridline }}
                      tickLine={false}
                      tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: c.inkMuted, fontSize: 12 }} axisLine={{ stroke: c.gridline }} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: c.cursorWash }}
                      contentStyle={tooltipStyle}
                      labelFormatter={(d) => new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      formatter={(v) => [`${v} shift${v === 1 ? '' : 's'}`, '']}
                    />
                    <Bar dataKey="count" fill={c.accent} radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}

      <div className="bg-surface-card border border-line/10 rounded-2xl p-6">
        <h2 className="font-semibold text-ink mb-2">How to use</h2>
        <ol className="list-decimal list-inside text-ink-secondary space-y-1 text-sm">
          <li>Add your team members on the <Link to="/employees" className="text-accent hover:underline">Employees</Link> page.</li>
          <li>Assign shifts on the <Link to="/shifts" className="text-accent hover:underline">Shift Calendar</Link>.</li>
          <li>Fatigue risk is assessed automatically in the background as shifts are added.</li>
          <li>Review results and safer alternatives in the <Link to="/fatigue" className="text-accent hover:underline">Fatigue Report</Link>.</li>
        </ol>
      </div>
    </div>
  );
}
