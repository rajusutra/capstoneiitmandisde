// Billing page: shows trial/subscription status, lets the org admin pick a
// subscription plan (tenure) and pay with Razorpay, PayPal, or see instructions
// for a manual payment.
// When the backend has no gateway keys, payments run in demo mode (instant success).
import { useEffect, useState } from 'react';
import axiosClient, { errorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

const statusBadge = {
  trial: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
};

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
        // No gateway keys on the server -> instant demo payment
        await confirmPayment({ method: 'razorpay', orderId: order.orderId, planId: order.planId });
        return;
      }

      // Real Razorpay checkout popup
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

      // Real PayPal: open the approval page, then the user confirms below
      window.open(order.approveUrl, '_blank');
      setPaypalOrder(order);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!status) return <div className="p-8 text-gray-500">Loading billing info…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Billing & Subscription</h1>

      {/* Status card */}
      <div className="bg-white rounded-xl shadow p-6 space-y-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg">{tenant?.name}</span>
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${statusBadge[status.status]}`}>
            {status.status}
          </span>
        </div>
        {status.status === 'trial' && (
          <p className="text-gray-600">
            Free trial — <b>{status.trialDaysLeft} day{status.trialDaysLeft === 1 ? '' : 's'} left</b>{' '}
            (ends {new Date(status.trialEndsAt).toLocaleDateString()}).
          </p>
        )}
        {status.subscriptionEndsAt && (
          <p className="text-gray-600">
            Subscription paid until <b>{new Date(status.subscriptionEndsAt).toLocaleDateString()}</b>.
          </p>
        )}
        {status.status === 'suspended' && (
          <p className="text-red-600">
            This organization was deactivated by the platform admin. Contact support.
          </p>
        )}
      </div>

      {message && <p className="text-green-700 bg-green-50 p-3 rounded">{message}</p>}
      {error && <p className="text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {/* Plan picker + payment options (org admin only) */}
      {isAdmin && status.status !== 'suspended' && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold">Choose a plan</h2>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {status.plans.map((plan) => (
              <button
                key={plan._id || plan.name}
                onClick={() => setSelectedPlanId(plan._id)}
                className={`text-left border-2 rounded-xl p-4 transition ${
                  selectedPlan?._id === plan._id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <p className="font-bold">{plan.name}</p>
                <p className="text-2xl font-bold mt-1">₹{plan.priceINR}</p>
                <p className="text-xs text-gray-500">or ${plan.priceUSD} via PayPal</p>
                <p className="text-sm text-gray-600 mt-2">{plan.durationDays} days of access</p>
                {plan.description && <p className="text-xs text-gray-400 mt-1">{plan.description}</p>}
              </button>
            ))}
          </div>

          {/* Payment buttons for the selected plan */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={payRazorpay}
              disabled={busy || !selectedPlan}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2 rounded font-semibold"
            >
              Pay ₹{selectedPlan?.priceINR} with Razorpay
            </button>
            <button
              onClick={payPaypal}
              disabled={busy || !selectedPlan}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white px-5 py-2 rounded font-semibold"
            >
              Pay ${selectedPlan?.priceUSD} with PayPal
            </button>
          </div>

          {/* Shown only for a REAL PayPal payment waiting for approval */}
          {paypalOrder && (
            <div className="border rounded p-3 text-sm space-y-2 bg-yellow-50">
              <p>A PayPal window was opened. Approve the payment there, then click:</p>
              <button
                onClick={() =>
                  confirmPayment({ method: 'paypal', orderId: paypalOrder.orderId, planId: paypalOrder.planId }).catch(
                    (err) => setError(errorMessage(err))
                  )
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 rounded"
              >
                I completed the PayPal payment
              </button>
            </div>
          )}

          <div className="border-t pt-4 text-sm text-gray-600">
            <b>Manual payment (bank transfer / UPI):</b> pay ₹{selectedPlan?.priceINR} for the{' '}
            {selectedPlan?.name} plan offline and share the reference with the platform admin — they will
            activate your subscription from the admin panel.
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-3">Payment history</h2>
        {status.payments.length === 0 && <p className="text-gray-400 text-sm">No payments yet.</p>}
        <ul className="divide-y text-sm">
          {status.payments.map((p) => (
            <li key={p._id} className="py-2 flex justify-between">
              <span className="capitalize">
                {p.method}
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
