// Platform Admin page (superadmin only):
// 1. Subscription plans CRUD — name, prices, tenure in days
// 2. Every organization with activate / deactivate / record payment actions
// 3. Recent payments across all organizations
import { useEffect, useState } from 'react';
import axiosClient, { errorMessage } from '../api/axiosClient';

const statusBadge = {
  trial: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
};

const emptyPlanForm = { name: '', priceINR: '', priceUSD: '', durationDays: '', description: '' };

export default function PlatformAdmin() {
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [editingPlanId, setEditingPlanId] = useState(null); // null = adding a new plan
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [tenantRes, paymentRes, planRes] = await Promise.all([
      axiosClient.get('/admin/tenants'),
      axiosClient.get('/admin/payments'),
      axiosClient.get('/admin/plans'),
    ]);
    setTenants(tenantRes.data.data);
    setPayments(paymentRes.data.data);
    setPlans(planRes.data.data);
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

  // ---- Plan CRUD handlers ----

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
      editingPlanId
        ? axiosClient.put(`/admin/plans/${editingPlanId}`, body)
        : axiosClient.post('/admin/plans', body)
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

  // ---- Tenant handlers ----

  function activate(id) {
    act(() => axiosClient.post(`/admin/tenants/${id}/activate`));
  }

  function deactivate(id) {
    if (!confirm('Deactivate this organization? Its users will be blocked immediately.')) return;
    act(() => axiosClient.post(`/admin/tenants/${id}/deactivate`));
  }

  function recordPayment(id) {
    // Let the superadmin pick which plan the offline payment was for
    const menu = plans.map((p, i) => `${i + 1}) ${p.name} — ₹${p.priceINR} / ${p.durationDays} days`).join('\n');
    const choice = prompt(`Which plan did the organization pay for?\n${menu}\n\nEnter a number:`, '1');
    if (!choice) return;
    const plan = plans[Number(choice) - 1];
    if (!plan) return setError('Invalid plan number.');
    const note = prompt('Note (e.g. "UPI ref 12345"):', 'Manual payment');
    act(() => axiosClient.post(`/admin/tenants/${id}/record-payment`, { planId: plan._id, note }));
  }

  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Platform Admin</h1>
      <p className="text-gray-600 text-sm">
        Manage subscription plans and organizations. New organizations get a 10-day free trial;
        each payment adds the plan's tenure to their subscription.
      </p>

      {message && <p className="text-green-700 bg-green-50 p-3 rounded">{message}</p>}
      {error && <p className="text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {/* ---- Subscription plans CRUD ---- */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-lg">Subscription plans</h2>

        {/* Add / edit form */}
        <form onSubmit={savePlan} className="flex flex-wrap gap-3 items-end border-b pb-4">
          <div>
            <label className="text-xs text-gray-500 block">Plan name</label>
            <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              className="border rounded px-3 py-2 w-32" placeholder="Monthly" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Price (INR)</label>
            <input type="number" value={planForm.priceINR} onChange={(e) => setPlanForm({ ...planForm, priceINR: e.target.value })}
              className="border rounded px-3 py-2 w-28" placeholder="999" min="1" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Price (USD)</label>
            <input type="number" value={planForm.priceUSD} onChange={(e) => setPlanForm({ ...planForm, priceUSD: e.target.value })}
              className="border rounded px-3 py-2 w-24" placeholder="12" min="1" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Tenure (days)</label>
            <input type="number" value={planForm.durationDays} onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
              className="border rounded px-3 py-2 w-28" placeholder="30" min="1" required />
          </div>
          <div className="flex-1 min-w-40">
            <label className="text-xs text-gray-500 block">Description</label>
            <input value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              className="border rounded px-3 py-2 w-full" placeholder="Billed every month" />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold">
            {editingPlanId ? 'Save changes' : 'Add plan'}
          </button>
          {editingPlanId && (
            <button type="button" onClick={cancelEditPlan} className="text-gray-500 hover:underline px-2 py-2">
              Cancel
            </button>
          )}
        </form>

        {/* Plans table */}
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-left">
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
              <tr key={plan._id} className="border-t">
                <td className="py-2 font-medium">{plan.name}</td>
                <td className="py-2">₹{plan.priceINR} / ${plan.priceUSD}</td>
                <td className="py-2">{plan.durationDays} days</td>
                <td className="py-2 text-gray-500">{plan.description}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {plan.isActive ? 'ACTIVE' : 'HIDDEN'}
                  </span>
                </td>
                <td className="py-2 space-x-2 whitespace-nowrap">
                  <button onClick={() => startEditPlan(plan)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => togglePlanActive(plan)} className="text-amber-600 hover:underline">
                    {plan.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => deletePlan(plan)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan="6" className="py-4 text-center text-gray-400">No plans yet — add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Organizations table ---- */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
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
              <tr key={t.id} className="border-t">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${statusBadge[t.status]}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3">{fmt(t.trialEndsAt)}</td>
                <td className="px-4 py-3">{fmt(t.subscriptionEndsAt)}</td>
                <td className="px-4 py-3">
                  {t.counts.users} / {t.counts.employees} / {t.counts.shifts}
                </td>
                <td className="px-4 py-3">{t.totalPaid}</td>
                <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                  {t.status === 'suspended' ? (
                    <button onClick={() => activate(t.id)} className="text-green-600 hover:underline">
                      Activate
                    </button>
                  ) : (
                    <button onClick={() => deactivate(t.id)} className="text-red-600 hover:underline">
                      Deactivate
                    </button>
                  )}
                  <button onClick={() => recordPayment(t.id)} className="text-blue-600 hover:underline">
                    Record payment
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-gray-400">
                  No organizations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Recent payments ---- */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-3">Recent payments (all organizations)</h2>
        {payments.length === 0 && <p className="text-gray-400 text-sm">No payments yet.</p>}
        <ul className="divide-y text-sm">
          {payments.map((p) => (
            <li key={p._id} className="py-2 flex justify-between">
              <span>
                <b>{p.tenantId?.name || 'Unknown org'}</b>{' '}
                <span className="capitalize text-gray-500">via {p.method}</span>
                {p.planName && <span className="text-gray-500"> · {p.planName} ({p.durationDays}d)</span>}
                {p.note && <span className="text-gray-400"> — {p.note}</span>}
              </span>
              <span>
                {p.amount} {p.currency} · {new Date(p.paidAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
