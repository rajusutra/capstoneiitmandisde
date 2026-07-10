# Workforce Shift Planning & Fatigue Risk Management System

A multi-tenant shift planning platform where managers assign shifts to employees while
the system checks workload, rest time and fatigue risk. A rule-based engine scores each
shift, and an AI layer explains risky schedules and suggests safer alternatives.

Full design documentation: [docs/project_documentation.md](docs/project_documentation.md)

Team testing guide (try the live app, no setup needed): [docs/team_testing_guide.md](docs/team_testing_guide.md)

## Tech Stack

- **Frontend:** React + Tailwind CSS (Vite)
- **Backend:** Node.js + Express (MVC pattern)
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT with tenant context
- **AI:** Rule-based fatigue engine + Claude explanation layer (with offline fallback)
- **Tests:** Jest + Supertest + mongodb-memory-server (isolated in-memory DB)

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then edit .env and set MONGO_URI + JWT_SECRET
npm run dev            # starts on http://localhost:5001 and auto-runs migrations
```

You need a MongoDB database — either install MongoDB locally or create a free
cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and paste its connection
string into `MONGO_URI`.

### 2. Seed demo data (optional but recommended)

```bash
cd backend
npm run seed
# Org demo login   -> admin@demo.com / password123 (10-day trial)
# Superadmin login -> superadmin@platform.com / super123 (Platform Admin page)
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # opens http://localhost:5173 (API calls proxy to :5001)
```

### 4. Run the tests

Tests use an in-memory MongoDB, so they need no database or .env setup:

```bash
cd backend
npm test
```

## Useful Commands

| Command | What it does |
|---|---|
| `npm run dev` (backend) | Start API server with auto-reload |
| `npm run seed` | Create the demo tenant, employees and shifts |
| `npm test` | Run the Jest test suite (isolated in-memory DB) |
| `npm run migrate:status` | List migrations and whether they ran |
| `npm run migrate:run` | Run pending migrations manually |
| `npm run migrate:rollback <name>` | Undo one migration |

## Subscriptions & Payments

- Every new organization starts on a **free 10-day trial**. When it expires (and no
  payment was made), all app APIs return **402 Payment Required** and the frontend
  redirects to the **Billing** page.
- Organizations pay on the Billing page via **Razorpay**, **PayPal**, or a **manual
  payment** (offline, recorded by the superadmin). Each payment extends the
  subscription by 30 days.
- If `RAZORPAY_*` / `PAYPAL_*` keys are missing from `backend/.env`, those methods run
  in **demo mode**: the checkout is skipped and payment succeeds instantly — so the
  demo always works without gateway accounts.
- The **superadmin** (`superadmin@platform.com` / `super123`) has a Platform Admin page
  listing all organizations with usage stats, trial/subscription dates and total
  revenue, plus buttons to **activate / deactivate** any organization and record
  manual payments.

## Demo Walkthrough

> Testing the **deployed app** instead of a local setup? Follow the
> [team testing guide](docs/team_testing_guide.md) — it has the live URL,
> demo logins, and a checklist of things to try.

1. Register a new organization (or log in with the seeded `admin@demo.com` / `password123`).
2. Add employees on the **Employees** page.
3. Assign shifts on the **Shift Calendar**.
4. Click **Assess** on a shift — the rule engine scores it and the AI explains the risk.
5. Review history and safer alternatives in the **Fatigue Report**.
6. Open **Billing** and pay (demo mode) to see the subscription extend by 30 days.
7. Log out, log in as the superadmin, and manage organizations on **Platform Admin**.

> The AI explanation uses the Claude API when `ANTHROPIC_API_KEY` is set in
> `backend/.env`. Without a key it falls back to a built-in template, so the demo
> always works offline.

## Limitations & Responsible Use

- Fatigue scoring is rule-based and does not replace occupational health judgment.
- AI-generated suggestions must be reviewed by a human manager before being applied.
- Tenant isolation is enforced at the application layer (every query filters by `tenantId`).
