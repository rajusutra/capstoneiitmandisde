# Checking Out the Deployed App

A quick guide for the team to log in and try out what's live — no setup needed,
just open the link below.

**Live app:** https://iitmandicapstone26.web.app

---

## 1. Log in as an organization (the everyday user view)

| Field | Value |
|---|---|
| Email | `admin@demo.com` |
| Password | `password123` |

This logs you in as **Demo Hospital**, a sample organization with employees
and shifts already set up. Things to try:

- [ ] **Dashboard** — see employee/shift counts at a glance
- [ ] **Employees** — add a new employee, or delete one
- [ ] **Shift Calendar** — add a shift, then click **Assess** on one to run the
      AI fatigue check (look for the risk score + explanation that appears)
- [ ] **Fatigue Report** — see the history of every assessment
- [ ] **Billing** — see the trial/subscription status and try the "Pay with
      Razorpay/PayPal" buttons (see note below — these are safe to click)

Feel free to also register a **brand new organization** from the login page
("Register here") to test the sign-up flow from scratch.

## 2. Log in as the platform superadmin (the "owner" view)

| Field | Value |
|---|---|
| Email | `superadmin@platform.com` |
| Password | `super123` |

This is the platform-owner account — it manages *every* organization on the
platform, not just one. You'll land on a sidebar dashboard instead of the
normal view. Things to try:

- [ ] **Dashboard** — platform-wide stats and charts (organizations by
      status, signups over time, payments by method)
- [ ] **Tenants** — every organization on the platform (there are 1000+ demo
      ones seeded for testing, plus the real "Demo Hospital"). Try searching,
      and try **Activate / Deactivate** on one
- [ ] **Impersonate** — click this on any organization to instantly view the
      app *as that organization's admin*, without a password. A banner at the
      top lets you exit back to your own session
- [ ] **Users** — every login account across all organizations
- [ ] **Subscriptions** — the pricing plans (Monthly/Quarterly/Yearly) and a
      log of every payment made

## Notes

- **Payments are in "demo mode."** No real payment gateway keys are
  configured, so clicking "Pay with Razorpay/PayPal" completes instantly
  without a real transaction — it's safe to click as many times as you like.
- **The AI fatigue explanation** uses a written fallback (not a live AI call)
  unless an API key is configured, so wording may look templated — that's
  expected.
- If something looks broken or behaves unexpectedly, note down **what you
  clicked and what you expected vs. what happened** and share it with the
  team — that's exactly the kind of feedback that's useful before the final
  submission/demo.
