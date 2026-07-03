// Organizations table: searchable, paginated (the backend now batches the
// per-tenant usage stats instead of querying once per tenant — see
// AdminService.listTenants — so this stays fast even with 1000+ orgs).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient, { errorMessage } from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import ActionButton from '../../components/ActionButton';

const STATUS_TONE = { trial: 'warning', active: 'good', suspended: 'critical' };

export default function AdminTenants() {
  const { startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function load() {
    const [tenantRes, planRes] = await Promise.all([
      axiosClient.get('/admin/tenants', { params: { page, limit: 20, search } }),
      axiosClient.get('/admin/plans'),
    ]);
    setTenants(tenantRes.data.data.tenants);
    setPages(tenantRes.data.data.pages);
    setTotal(tenantRes.data.data.total);
    setPlans(planRes.data.data);
  }

  useEffect(() => {
    load().catch((err) => setError(errorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function act(fn) {
    setMessage('');
    setError('');
    try {
      const res = await fn();
      setMessage(res.data.message);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function activate(id) {
    act(() => axiosClient.post(`/admin/tenants/${id}/activate`));
  }

  function deactivate(id) {
    if (!confirm('Deactivate this organization? Its users will be blocked immediately.')) return;
    act(() => axiosClient.post(`/admin/tenants/${id}/deactivate`));
  }

  function recordPayment(id) {
    const menu = plans.map((p, i) => `${i + 1}) ${p.name} — ₹${p.priceINR} / ${p.durationDays} days`).join('\n');
    const choice = prompt(`Which plan did the organization pay for?\n${menu}\n\nEnter a number:`, '1');
    if (!choice) return;
    const plan = plans[Number(choice) - 1];
    if (!plan) return setError('Invalid plan number.');
    const note = prompt('Note (e.g. "UPI ref 12345"):', 'Manual payment');
    act(() => axiosClient.post(`/admin/tenants/${id}/record-payment`, { planId: plan._id, note }));
  }

  async function impersonate(id) {
    setError('');
    try {
      const res = await axiosClient.post(`/admin/tenants/${id}/impersonate`);
      startImpersonation(res.data.data);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">Organizations</h1>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or slug…"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-64 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {message && <p className="text-status-good bg-status-good/10 p-3 rounded-lg">{message}</p>}
      {error && <p className="text-status-critical bg-status-critical/10 p-3 rounded-lg">{error}</p>}

      <div className="bg-surface-card border border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-ink-muted text-left">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trial ends</th>
              <th className="px-4 py-3">Paid until</th>
              <th className="px-4 py-3">Users / Employees / Shifts</th>
              <th className="px-4 py-3">Total paid</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-t border-white/10">
                <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={STATUS_TONE[t.status]} label={t.status} />
                </td>
                <td className="px-4 py-3 text-ink-secondary">{fmt(t.trialEndsAt)}</td>
                <td className="px-4 py-3 text-ink-secondary">{fmt(t.subscriptionEndsAt)}</td>
                <td className="px-4 py-3 text-ink-secondary">
                  {t.counts.users} / {t.counts.employees} / {t.counts.shifts}
                </td>
                <td className="px-4 py-3 text-ink-secondary">{t.totalPaid}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex gap-2">
                    {t.status === 'suspended' ? (
                      <ActionButton tone="good" onClick={() => activate(t.id)}>Activate</ActionButton>
                    ) : (
                      <ActionButton tone="critical" onClick={() => deactivate(t.id)}>Deactivate</ActionButton>
                    )}
                    <ActionButton tone="accent" onClick={() => recordPayment(t.id)}>Record payment</ActionButton>
                    <ActionButton tone="warning" onClick={() => impersonate(t.id)}>Impersonate</ActionButton>
                  </div>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-ink-muted">
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-ink-secondary">
        <span>{total} organizations total</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border border-white/10 rounded-lg disabled:opacity-40 hover:border-accent/50"
          >
            Prev
          </button>
          <span>Page {page} of {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border border-white/10 rounded-lg disabled:opacity-40 hover:border-accent/50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
