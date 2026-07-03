# Workforce Shift Planning & Fatigue Risk Management System

A multi-tenant shift planning platform where managers assign shifts to employees while
the system checks workload, rest time and fatigue risk. A rule-based engine scores each
shift, and an AI layer explains risky schedules and suggests safer alternatives.

Full design documentation: [docs/project_documentation.md](docs/project_documentation.md)

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
npm run dev            # starts on http://localhost:5000 and auto-runs migrations
```

You need a MongoDB database — either install MongoDB locally or create a free
cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and paste its connection
string into `MONGO_URI`.

### 2. Seed demo data (optional but recommended)

```bash
cd backend
npm run seed
# Demo login -> email: admin@demo.com  password: password123
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # opens http://localhost:5173 (API calls proxy to :5000)
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

## Demo Walkthrough

1. Register a new organization (or log in with the seeded `admin@demo.com` / `password123`).
2. Add employees on the **Employees** page.
3. Assign shifts on the **Shift Calendar**.
4. Click **Assess** on a shift — the rule engine scores it and the AI explains the risk.
5. Review history and safer alternatives in the **Fatigue Report**.

> The AI explanation uses the Claude API when `ANTHROPIC_API_KEY` is set in
> `backend/.env`. Without a key it falls back to a built-in template, so the demo
> always works offline.

## Limitations & Responsible Use

- Fatigue scoring is rule-based and does not replace occupational health judgment.
- AI-generated suggestions must be reviewed by a human manager before being applied.
- Tenant isolation is enforced at the application layer (every query filters by `tenantId`).
