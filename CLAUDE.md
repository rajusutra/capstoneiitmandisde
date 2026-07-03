# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Multi-tenant workforce shift planning platform with rule-based fatigue risk scoring, an AI explanation layer, and subscription billing (trial → paid, enforced per-organization). Full design doc: `docs/project_documentation.md`.

Two independent apps in one repo, run as separate processes:
- `backend/` — Node.js + Express + Mongoose (MVC), port 5001
- `frontend/` — React + Vite + Tailwind, port 5173, proxies `/api` to the backend

## Commands

### Backend (`cd backend`)

```bash
npm run dev                      # start with nodemon, auto-runs pending migrations on boot
npm start                        # start without nodemon
npm test                         # full Jest suite (mongodb-memory-server, no real DB needed)
npx jest tests/shifts.test.js    # run a single test file
npx jest -t "overlapping shift"  # run tests matching a name
npm run seed                     # wipe + recreate demo tenant, superadmin, employees, shifts, plans
npm run migrate:status           # list migrations and whether each has run
npm run migrate:run              # run pending migrations manually (dev normally auto-runs these)
npm run migrate:rollback <name>  # undo one migration by name, e.g. 004_add_subscriptions
```

### Frontend (`cd frontend`)

```bash
npm run dev      # Vite dev server on :5173
npm run build    # production build to dist/
npm run preview  # preview the production build
```

There is no lint/format script configured in either package — don't invent one.

### Local setup gotcha

Port 5000 is occupied by macOS AirPlay Receiver (ControlCenter), which is why the backend runs on **5001**. `.env` (`PORT`) and `frontend/vite.config.js` (proxy target) must stay in sync if this ever changes.

## Architecture

### Backend: MVC + service layer, one folder per concern

Every feature (employees, shifts, availability, fatigue, billing, admin) follows the same file chain:

```
routes/<x>Routes.js → middleware chain → controllers/<X>Controller.js → validators/<X>Validator.js
                                                                       → services/<X>Service.js → models/<X>.js
                                       → dto/<X>DTO.js (shapes the response) → views/ResponseFormatter.js
```

- **Controllers** only parse `req`, call the validator, call the service, format via DTO + `ResponseFormatter`, and `next(err)` on failure. No business logic here.
- **Services** hold all business logic and are the only layer that touches Mongoose models directly.
- **Validators** throw via `httpError(statusCode, message)` from `middleware/errorHandler.js` — this is the standard way to raise an HTTP error anywhere in the stack (services use it too, e.g. 404/409).
- **`ResponseFormatter`** wraps every response as `{ success, message, data }`. Never bypass it with a raw `res.json(...)`.
- **`errorHandler`** is the last middleware in `app.js` and catches everything; it reads `err.statusCode` (default 500).

### Multi-tenancy — the single most important invariant

One shared MongoDB database; every tenant-scoped collection has a `tenantId` field. **Every query in every service must filter by `tenantId`.** There is no ORM-level enforcement of this — it's a discipline enforced by code review and by `tests/tenantIsolation.test.js`, which is the canonical test to extend whenever a new tenant-scoped collection or endpoint is added. When adding a new model/service, copy the pattern from `EmployeeService.js` (every `find`/`findOneAndUpdate`/`findOneAndDelete` includes `tenantId` in the filter).

The only code allowed to query across tenants is `AdminService.js` (superadmin-only, no `tenantContext` in `adminRoutes.js`).

### Middleware chain order (protected routes)

```
auth → tenantContext → subscriptionGuard → roleGuard(...) → controller
```

Defined per-route-file via `router.use(...)`, e.g. `employeeRoutes.js`. Order matters: `auth` verifies the JWT and sets `req.user`; `tenantContext` copies `tenantId` from `req.user` onto `req.tenantId` (this is what services read); `subscriptionGuard` blocks the request with **402** if the tenant's trial/subscription has lapsed or it's suspended; `roleGuard('admin', 'manager')` is applied per-route where write access is restricted.

`billingRoutes.js` and `adminRoutes.js` are the exceptions:
- Billing routes use `auth, tenantContext` but **not** `subscriptionGuard` — an org whose trial expired must still be able to reach `/api/billing/*` to pay.
- Admin routes use `auth, roleGuard('superadmin')` with **no `tenantContext`** — the superadmin operates across all tenants, not within one.

### Subscription/billing model

- `Tenant.status` ∈ `trial | active | suspended`. New tenants get `trialEndsAt` = registration + 10 days (`AuthService.register`).
- `SubscriptionPlan` documents (superadmin CRUD via `/api/admin/plans`) define `priceINR`, `priceUSD`, and `durationDays` (tenure). Seeded defaults: Monthly/30d, Quarterly/90d, Yearly/365d.
- `BillingService.resolvePlan(planId)` falls back to the cheapest active plan, then to an in-code `DEFAULT_PLAN` if no plans exist — never assume a plan document is present.
- Payment methods: `razorpay`, `paypal`, `manual`. **Demo mode**: if `RAZORPAY_KEY_ID`/`SECRET` or `PAYPAL_CLIENT_ID`/`SECRET` are absent from `.env`, that method returns a fake order (`orderId` prefixed `demo_`) and `confirmPayment` skips signature/capture verification — this is intentional so the app is demoable with zero gateway accounts. Real verification (Razorpay HMAC, PayPal capture) only runs when `orderId` doesn't start with `demo_`.
- Every successful payment calls `BillingService.extendSubscription(tenant, days)`, which adds `days` on top of `subscriptionEndsAt` if it's still in the future (doesn't reset to `now + days`), and sets `status = 'active'`.
- Frontend: a 402 response is caught globally in `frontend/src/api/axiosClient.js`'s response interceptor, which redirects to `/billing`.

### Fatigue risk engine — deterministic, not AI

`services/ai/FatigueEngine.js` is pure and synchronous: given a shift, the employee's other shifts, and the tenant's `FatigueRule`, it checks rest hours, overlap, 7-day rolling hours, and consecutive days worked, returning `{ riskScore, riskLevel, flags }`. This is intentionally rule-based (auditable, no hallucination risk) — see `docs/project_documentation.md` §8 for the rationale. Don't fold AI into this file.

`services/ai/AIExplainer.js` is the only place that calls an LLM (Claude via `@anthropic-ai/sdk`), and only to turn the engine's `flags`/score into prose + a suggested alternative — never to produce the score itself. If `ANTHROPIC_API_KEY` is unset or the API call throws, it falls back to `templateExplanation()` (plain string interpolation) so the feature never hard-fails. `FatigueController.assess` is the only caller of both.

### Migrations

Plain JS files in `backend/src/migrations/`, each exporting `{ name, description, up(db), down(db) }`, loaded and sorted by filename by `services/migrations/migrationService.js`. Executed migrations are tracked in a `migrations` collection so `runPending()` (called from `server.js` on every boot) only runs new ones. New migrations must be added as a new numbered file (`006_...js`) — never edit a migration that has already shipped/run.

### Testing

`tests/helpers/db.js` spins up `mongodb-memory-server` per test file (`beforeAll`/`afterAll`) — no real MongoDB connection needed for `npm test`, and this is deliberate so tests never touch the Atlas database referenced in `.env`. Reuse this helper for any new test file. `tests/tenantIsolation.test.js` and `tests/billing.test.js`/`tests/plans.test.js` are the reference examples for testing tenant-scoped and subscription-gated behavior respectively.

### Frontend

- `src/context/AuthContext.jsx` holds `{ user, tenant }` and the JWT in `localStorage`; `src/api/axiosClient.js` is the single axios instance — it attaches `Authorization: Bearer <token>` on every request and redirects to `/billing` on 402.
- `src/App.jsx` routes superadmins (`user.role === 'superadmin'`) straight to `/admin` (`PlatformAdmin.jsx`) instead of the normal `/` dashboard; `Navbar.jsx` swaps its link set the same way.
- Pages call the backend directly via `axiosClient` (no separate API-hook layer) — follow this pattern for new pages rather than introducing a data-fetching library.
