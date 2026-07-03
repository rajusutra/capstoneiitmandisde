// Billing page: shows trial/subscription status, lets the org admin pick a
// subscription plan (tenure) and pay with Razorpay, PayPal, or see instructions
// for a manual payment.
// When the backend has no gateway keys, payments run in demo mode (instant success).
import { useEffect, useState } from 'react';
import axiosClient, { errorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const STATUS_TONE = { trial: 'warning', active: 'good', suspended: 'critical' };

// Loads the Razorpay checkout script once (only needed for real payments)
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Billing() {
  const { user, tenant } = useAuth();
  const [status, setStatus] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paypalOrder, setPaypalOrder] = useState(null); // real PayPal: waiting for approval

  const isAdmin = user?.role === 'admin';

  async function load() {
    const res = await axiosClient.get('/billing/status');
    setStatus(res.data.data);
    // Pre-select the first plan if nothing is selected yet
    if (res.data.data.plans.length > 0) {
      setSelectedPlanId((current) => current || res.data.data.plans[0]._id);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(errorMessage(err)));
  }, []);

  const selectedPlan = status?.plans.find((p) => p._id === selectedPlanId) || status?.plans[0];

  async function confirmPayment(body) {
    const res = await axiosClient.post('/billing/confirm', body);
    setMessage(res.data.message);
    setPaypalOrder(null);
    await load();
  }

  async function payRazorpay() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await axiosClient.post('/billing/order', { method: 'razorpay', planId: selectedPlan?._id });
      const order = res.data.data;

      if (order.mode === 'demo') {
        await confirmPayment({ method: 'razorpay', orderId: order.orderId, planId: order.planId });
        return;
      }

      await loadRazorpayScript();
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount * 100,
        currency: order.currency,
        name: 'Shift Planner',
        description: `${order.planName} subscription (${order.durationDays} days)`,
        order_id: order.orderId,
        prefill: { name: user?.name, email: user?.email },
        handler: (response) =>
          confirmPayment({
            method: 'razorpay',
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            planId: order.planId,
          }).catch((err) => setError(errorMessage(err))),
      });
      rzp.open();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function payPaypal() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await axiosClient.post('/billing/order', { method: 'paypal', planId: selectedPlan?._id });
      const order = res.data.data;

      if (order.mode === 'demo') {
        await confirmPayment({ method: 'paypal', orderId: order.orderId, planId: order.planId });
        return;
      }

      window.open(order.approveUrl, '_blank');
      setPaypalOrder(order);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!status) return <div className="p-8 text-ink-muted">Loading billing info…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Billing & Subscription</h1>

      {/* Status card */}
      <div className="bg-surface-card border border-white/10 rounded-2xl p-6 space-y-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg text-ink">{tenant?.name}</span>
          <StatusBadge tone={STATUS_TONE[status.status]} label={status.status} />
        </div>
        {status.status === 'trial' && (
          <p className="text-ink-secondary">
            Free trial — <b className="text-ink">{status.trialDaysLeft} day{status.trialDaysLeft === 1 ? '' : 's'} left</b>{' '}
            (ends {new Date(status.trialEndsAt).toLocaleDateString()}).
          </p>
        )}
        {status.subscriptionEndsAt && (
          <p className="text-ink-secondary">
            Subscription paid until <b className="text-ink">{new Date(status.subscriptionEndsAt).toLocaleDateString()}</b>.
          </p>
        )}
        {status.status === 'suspended' && (
          <p className="text-status-critical">
            This organization was deactivated by the platform admin. Contact support.
          </p>
        )}
      </div>

      {message && <p className="text-status-good bg-status-good/10 p-3 rounded-lg">{message}</p>}
      {error && <p className="text-status-critical bg-status-critical/10 p-3 rounded-lg">{error}</p>}

      {/* Plan picker + payment options (org admin only) */}
      {isAdmin && status.status !== 'suspended' && (
        <div className="bg-surface-card border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-ink">Choose a plan</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {status.plans.map((plan) => (
              <button
                key={plan._id || plan.name}
                onClick={() => setSelectedPlanId(plan._id)}
                className={`text-left border rounded-xl p-4 transition ${
                  selectedPlan?._id === plan._id
                    ? 'border-accent bg-accent/10'
                    : 'border-white/10 hover:border-accent/50'
                }`}
              >
                <p className="font-bold text-ink">{plan.name}</p>
                <p className="text-2xl font-bold mt-1 text-ink">₹{plan.priceINR}</p>
                <p className="text-xs text-ink-muted">or ${plan.priceUSD} via PayPal</p>
                <p className="text-sm text-ink-secondary mt-2">{plan.durationDays} days of access</p>
                {plan.description && <p className="text-xs text-ink-muted mt-1">{plan.description}</p>}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={payRazorpay}
              disabled={busy || !selectedPlan}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold transition"
            >
              Pay ₹{selectedPlan?.priceINR} with Razorpay
            </button>
            <button
              onClick={payPaypal}
              disabled={busy || !selectedPlan}
              className="bg-status-warning hover:brightness-110 disabled:opacity-50 text-black px-5 py-2 rounded-lg font-semibold transition"
            >
              Pay ${selectedPlan?.priceUSD} with PayPal
            </button>
          </div>

          {paypalOrder && (
            <div className="border border-white/10 rounded-xl p-3 text-sm space-y-2 bg-status-warning/10">
              <p className="text-ink-secondary">A PayPal window was opened. Approve the payment there, then click:</p>
              <button
                onClick={() =>
                  confirmPayment({ method: 'paypal', orderId: paypalOrder.orderId, planId: paypalOrder.planId }).catch(
                    (err) => setError(errorMessage(err))
                  )
                }
                className="bg-status-good hover:brightness-110 text-white px-4 py-1 rounded-lg"
              >
                I completed the PayPal payment
              </button>
            </div>
          )}

          <div className="border-t border-white/10 pt-4 text-sm text-ink-secondary">
            <b className="text-ink">Manual payment (bank transfer / UPI):</b> pay ₹{selectedPlan?.priceINR} for the{' '}
            {selectedPlan?.name} plan offline and share the reference with the platform admin — they will
            activate your subscription from the admin panel.
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="bg-surface-card border border-white/10 rounded-2xl p-6">
        <h2 className="font-semibold text-ink mb-3">Payment history</h2>
        {status.payments.length === 0 && <p className="text-ink-muted text-sm">No payments yet.</p>}
        <ul className="divide-y divide-white/10 text-sm">
          {status.payments.map((p) => (
            <li key={p._id} className="py-2 flex justify-between">
              <span className="capitalize text-ink-secondary">
                {p.method}
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
