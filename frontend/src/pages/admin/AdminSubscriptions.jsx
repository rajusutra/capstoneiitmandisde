// Subscription plan CRUD (name, prices, tenure in days) + a platform-wide
// payment history. Moved out of the old single-page PlatformAdmin.jsx.
import { useEffect, useState } from 'react';
import axiosClient, { errorMessage } from '../../api/axiosClient';
import ActionButton from '../../components/ActionButton';

const emptyPlanForm = { name: '', priceINR: '', priceUSD: '', durationDays: '', description: '' };
const inputClass =
  'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent';

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [editingPlanId, setEditingPlanId] = useState(null); // null = adding a new plan
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [planRes, paymentRes] = await Promise.all([
      axiosClient.get('/admin/plans'),
      axiosClient.get('/admin/payments'),
    ]);
    setPlans(planRes.data.data);
    setPayments(paymentRes.data.data);
  }

  useEffect(() => {
    load().catch((err) => setError(errorMessage(err)));
  }, []);

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

  function startEditPlan(plan) {
    setEditingPlanId(plan._id);
    setPlanForm({
      name: plan.name,
      priceINR: plan.priceINR,
      priceUSD: plan.priceUSD,
      durationDays: plan.durationDays,
      description: plan.description || '',
    });
  }

  function cancelEditPlan() {
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm);
  }

  async function savePlan(e) {
    e.preventDefault();
    const body = {
      name: planForm.name,
      priceINR: Number(planForm.priceINR),
      priceUSD: Number(planForm.priceUSD),
      durationDays: Number(planForm.durationDays),
      description: planForm.description,
      isActive: true,
    };
    await act(() =>
      editingPlanId ? axiosClient.put(`/admin/plans/${editingPlanId}`, body) : axiosClient.post('/admin/plans', body)
    );
    cancelEditPlan();
  }

  function togglePlanActive(plan) {
    act(() => axiosClient.put(`/admin/plans/${plan._id}`, { ...plan, isActive: !plan.isActive }));
  }

  function deletePlan(plan) {
    if (!confirm(`Delete the "${plan.name}" plan?`)) return;
    act(() => axiosClient.delete(`/admin/plans/${plan._id}`));
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Subscriptions</h1>

      {message && <p className="text-status-good bg-status-good/10 p-3 rounded-lg">{message}</p>}
      {error && <p className="text-status-critical bg-status-critical/10 p-3 rounded-lg">{error}</p>}

      {/* ---- Subscription plans CRUD ---- */}
      <div className="bg-surface-card border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-ink text-lg">Subscription plans</h2>

        <form onSubmit={savePlan} className="flex flex-wrap gap-3 items-end border-b border-white/10 pb-4">
          <div>
            <label className="text-xs text-ink-muted block mb-1">Plan name</label>
            <input
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              className={`${inputClass} w-32`}
              placeholder="Monthly"
              required
            />
          </div>
          <div>
            <label className="text-xs text-ink-muted block mb-1">Price (INR)</label>
            <input
              type="number"
              value={planForm.priceINR}
              onChange={(e) => setPlanForm({ ...planForm, priceINR: e.target.value })}
              className={`${inputClass} w-28`}
              placeholder="999"
              min="1"
              required
            />
          </div>
          <div>
            <label className="text-xs text-ink-muted block mb-1">Price (USD)</label>
            <input
              type="number"
              value={planForm.priceUSD}
              onChange={(e) => setPlanForm({ ...planForm, priceUSD: e.target.value })}
              className={`${inputClass} w-24`}
              placeholder="12"
              min="1"
              required
            />
          </div>
          <div>
            <label className="text-xs text-ink-muted block mb-1">Tenure (days)</label>
            <input
              type="number"
              value={planForm.durationDays}
              onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
              className={`${inputClass} w-28`}
              placeholder="30"
              min="1"
              required
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="text-xs text-ink-muted block mb-1">Description</label>
            <input
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              className={`${inputClass} w-full`}
              placeholder="Billed every month"
            />
          </div>
          <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-semibold transition">
            {editingPlanId ? 'Save changes' : 'Add plan'}
          </button>
          {editingPlanId && (
            <button type="button" onClick={cancelEditPlan} className="text-ink-muted hover:text-ink px-2 py-2">
              Cancel
            </button>
          )}
        </form>

        <table className="w-full text-sm">
          <thead className="text-ink-muted text-left">
            <tr>
              <th className="py-2">Plan</th>
              <th className="py-2">Price</th>
              <th className="py-2">Tenure</th>
              <th className="py-2">Description</th>
              <th className="py-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan._id} className="border-t border-white/10">
                <td className="py-2 font-medium text-ink">{plan.name}</td>
                <td className="py-2 text-ink-secondary">₹{plan.priceINR} / ${plan.priceUSD}</td>
                <td className="py-2 text-ink-secondary">{plan.durationDays} days</td>
                <td className="py-2 text-ink-muted">{plan.description}</td>
                <td className="py-2">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-bold ${
                      plan.isActive ? 'bg-status-good/15 text-status-good' : 'bg-white/10 text-ink-muted'
                    }`}
                  >
                    {plan.isActive ? 'ACTIVE' : 'HIDDEN'}
                  </span>
                </td>
                <td className="py-2 whitespace-nowrap">
                  <div className="flex gap-2">
                    <ActionButton tone="accent" onClick={() => startEditPlan(plan)}>Edit</ActionButton>
                    <ActionButton tone="warning" onClick={() => togglePlanActive(plan)}>
                      {plan.isActive ? 'Hide' : 'Show'}
                    </ActionButton>
                    <ActionButton tone="critical" onClick={() => deletePlan(plan)}>Delete</ActionButton>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan="6" className="py-4 text-center text-ink-muted">No plans yet — add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Recent payments ---- */}
      <div className="bg-surface-card border border-white/10 rounded-2xl p-6">
        <h2 className="font-semibold text-ink mb-3">Recent payments (all organizations)</h2>
        {payments.length === 0 && <p className="text-ink-muted text-sm">No payments yet.</p>}
        <ul className="divide-y divide-white/10 text-sm">
          {payments.map((p) => (
            <li key={p._id} className="py-2 flex justify-between">
              <span className="text-ink-secondary">
                <b className="text-ink">{p.tenantId?.name || 'Unknown org'}</b>{' '}
                <span className="capitalize text-ink-muted">via {p.method}</span>
                {p.planName && <span className="text-ink-muted"> · {p.planName} ({p.durationDays}d)</span>}
                {p.note && <span className="text-ink-muted"> — {p.note}</span>}
              </span>
              <span className="text-ink">
                {p.amount} {p.currency} · {new Date(p.paidAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
