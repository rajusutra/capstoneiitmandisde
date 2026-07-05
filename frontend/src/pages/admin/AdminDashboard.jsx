// Platform overview: KPI stat tiles + three charts, each chosen for the job
// its data actually does (see dataviz skill):
//  - Organizations by status -> status is a STATE field, so it gets the
//    reserved status palette (good/warning/critical), not arbitrary hues.
//  - Weekly signups by status -> trend-over-time with distinct series ->
//    multi-line chart (not stacked area — the form guide only sanctions area
//    for a single series), reusing the same status colors for consistency.
//  - Payments by method -> one measure across 3 nominal categories -> a
//    single-hue bar chart. This is a COUNT, not summed amount: razorpay/manual
//    are INR and paypal is USD, so summing them on one axis would silently
//    mix currencies (the same mistake as a dual-axis chart).
//
// Colors follow the current light/dark theme via CHART_COLORS — status
// colors (active/trial/suspended) are fixed and never themed.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import axiosClient, { errorMessage } from '../../api/axiosClient';
import StatusBadge from '../../components/StatusBadge';
import { useTheme } from '../../context/ThemeContext';
import { CHART_COLORS } from '../../theme/chartColors';

const STATUS_COLORS = { active: '#0ca30c', trial: '#fab219', suspended: '#d03b3b' };
const STATUS_TONE = { active: 'good', trial: 'warning', suspended: 'critical' };
const STATUS_LABELS = { active: 'Active', trial: 'Trial', suspended: 'Suspended' };

function ChartCard({ title, children }) {
  return (
    <div className="bg-surface-card border border-line/10 rounded-2xl p-6">
      <h2 className="font-semibold text-ink mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const { theme } = useTheme();
  const c = CHART_COLORS[theme];
  const tooltipStyle = {
    fontSize: 13,
    borderRadius: 8,
    backgroundColor: c.surface,
    border: `1px solid ${c.tooltipBorder}`,
    color: c.ink,
  };
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosClient
      .get('/admin/dashboard')
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="p-8 text-status-critical">{error}</div>;
  if (!stats) return <div className="p-8 text-ink-muted">Loading dashboard…</div>;

  const cards = [
    { label: 'Total organizations', value: stats.totalTenants, to: '/admin/tenants' },
    { label: 'Total users', value: stats.totalUsers, to: '/admin/users' },
    { label: 'Total employees', value: stats.totalEmployees, to: '/admin/tenants' },
    { label: 'Total revenue', value: stats.totalRevenue, to: '/admin/subscriptions' },
  ];

  const statusData = ['active', 'trial', 'suspended'].map((status) => ({
    status: STATUS_LABELS[status],
    key: status,
    count: stats.statusBreakdown[status] || 0,
  }));

  const methodLabels = { razorpay: 'Razorpay', paypal: 'PayPal', manual: 'Manual' };
  const methodData = Object.entries(stats.paymentsByMethod).map(([method, count]) => ({
    method: methodLabels[method] || method,
    count,
  }));

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Platform Dashboard</h1>

      {/* KPI stat tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-surface-card border border-line/10 rounded-2xl p-6 hover:border-accent/50 transition"
          >
            <p className="text-2xl font-bold text-ink">{card.value}</p>
            <p className="text-ink-muted text-sm mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A — Organizations by status (status palette, axis-labeled) */}
        <ChartCard title="Organizations by status">
          <BarChart width={420} height={220} data={statusData} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid stroke={c.gridline} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: c.inkMuted, fontSize: 12 }} axisLine={{ stroke: c.gridline }} tickLine={false} />
            <YAxis type="category" dataKey="status" tick={{ fill: c.ink, fontSize: 13 }} axisLine={{ stroke: c.gridline }} tickLine={false} width={80} />
            <Tooltip cursor={{ fill: c.cursorWash }} contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: c.ink, fontSize: 12 }}>
              {statusData.map((entry) => (
                <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        {/* Chart B — Weekly signups by status (multi-line, same status colors) */}
        <ChartCard title="New organizations per week (last 12 weeks)">
          <LineChart width={420} height={220} data={stats.signupsByWeek} margin={{ left: -12 }}>
            <CartesianGrid stroke={c.gridline} vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: c.inkMuted, fontSize: 11 }}
              axisLine={{ stroke: c.gridline }}
              tickLine={false}
              tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            />
            <YAxis allowDecimals={false} tick={{ fill: c.inkMuted, fontSize: 12 }} axisLine={{ stroke: c.gridline }} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => `Week of ${new Date(d).toLocaleDateString()}`} />
            <Legend
              formatter={(value) => <span style={{ color: c.inkSecondary, fontSize: 12 }}>{STATUS_LABELS[value]}</span>}
              iconType="line"
            />
            {['active', 'trial', 'suspended'].map((status) => (
              <Line
                key={status}
                type="monotone"
                dataKey={status}
                name={status}
                stroke={STATUS_COLORS[status]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, stroke: c.surface }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ChartCard>

        {/* Chart C — Payments by method (single hue, count not amount — see file header) */}
        <ChartCard title="Payments by method">
          <BarChart width={420} height={220} data={methodData} margin={{ left: -12 }}>
            <CartesianGrid stroke={c.gridline} vertical={false} />
            <XAxis dataKey="method" tick={{ fill: c.ink, fontSize: 13 }} axisLine={{ stroke: c.gridline }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: c.inkMuted, fontSize: 12 }} axisLine={{ stroke: c.gridline }} tickLine={false} />
            <Tooltip cursor={{ fill: c.cursorWash }} contentStyle={tooltipStyle} formatter={(v) => [`${v} payment${v === 1 ? '' : 's'}`, '']} />
            <Bar dataKey="count" fill={c.accent} radius={[4, 4, 0, 0]} barSize={48} label={{ position: 'top', fill: c.ink, fontSize: 12 }} />
          </BarChart>
        </ChartCard>

        {/* Recent activity (text lists, not charts — a list of names/amounts
            has no magnitude/trend/identity job that a chart would serve) */}
        <ChartCard title="Recent activity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase mb-2">Recent organizations</p>
              <ul className="divide-y divide-line/10 text-sm">
                {stats.recentTenants.map((t) => (
                  <li key={t._id} className="py-2 flex justify-between gap-2 items-center">
                    <span className="truncate text-ink-secondary">{t.name}</span>
                    <StatusBadge tone={STATUS_TONE[t.status]} label={t.status} />
                  </li>
                ))}
                {stats.recentTenants.length === 0 && <p className="text-ink-muted text-sm py-2">None yet.</p>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase mb-2">Recent payments</p>
              <ul className="divide-y divide-line/10 text-sm">
                {stats.recentPayments.map((p) => (
                  <li key={p._id} className="py-2 flex justify-between gap-2">
                    <span className="truncate text-ink-secondary">{p.tenantId?.name || 'Unknown org'}</span>
                    <span className="shrink-0 text-ink">{p.amount} {p.currency}</span>
                  </li>
                ))}
                {stats.recentPayments.length === 0 && <p className="text-ink-muted text-sm py-2">None yet.</p>}
              </ul>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
