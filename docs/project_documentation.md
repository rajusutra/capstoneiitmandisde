# Capstone Project Documentation

## Project 15 — Workforce Shift Planning and Fatigue Risk Management System

**Track:** SDAI
**Team Size:** 5 Members
** Team Members: 
1) Ayushman Singh
2) Raju Sutradhar
3) Aryan Kumar
4) Devansh Saxena
5) Ambika Darare
**Duration:** 10 Days
**Domain:** Workforce safety and scheduling

---

## 1. Project Overview

A multi-tenant shift planning platform where managers from multiple organizations
(tenants) assign shifts to their employees while the system checks workload, rest
time, and fatigue risk. An AI module explains risky schedules and suggests safer
alternatives.

Each tenant (company/organization) has its own isolated set of employees, shifts,
availability records, and fatigue rules — but all tenants run on a single shared
deployment of the application.

---

## 2. Tech Stack

| Layer          | Technology                                      |
|----------------|--------------------------------------------------|
| Frontend       | React + Tailwind CSS                              |
| Backend        | Node.js + Express                                 |
| Database       | MongoDB (Mongoose ODM)                            |
| Auth           | JWT (JSON Web Tokens) with tenant context claim    |
| AI Module      | Rule-based fatigue scoring + LLM explanation layer |
| Hosting (opt.) | Render / Vercel / MongoDB Atlas                    |

### Why this stack

- **React + Tailwind** — fast to build responsive dashboards (manager view,
  employee view) with utility-first styling and no custom CSS overhead.
- **Express** — lightweight, unopinionated REST API layer, easy for a 5-person
  team to split into feature routers (auth, employees, shifts, fatigue, AI).
- **MongoDB** — flexible schema fits varying shift/availability structures across
  tenants, and a `tenantId` field on every document is a simple, well-understood
  way to implement multi-tenancy without provisioning separate databases.

---

## 3. Multi-Tenancy Strategy

**Approach: Shared Database, Shared Collections, Discriminator Column**
(a.k.a. "pool model" / row-level multi-tenancy)

Every tenant-scoped collection includes a `tenantId` field referencing the
`Tenant` document. All queries are automatically scoped by `tenantId` so one
tenant can never read or write another tenant's data.

```
Tenant (Organization)
  └── Users (Admin / Manager / Employee) — tenantId
        └── Employees — tenantId
              └── Shifts — tenantId
              └── Availability — tenantId
              └── FatigueRules — tenantId
```

### Why row-level over database-per-tenant

| Criteria            | Shared DB + tenantId (chosen) | Database-per-tenant |
|---------------------|-------------------------------|----------------------|
| Setup complexity    | Low                            | High (per-tenant provisioning) |
| Cost at small scale | Low                            | Higher                |
| Onboarding new tenant | Instant (insert a row)       | Slower (new DB/connection) |
| Data isolation      | Enforced in app layer          | Enforced by infra     |
| Fits 10-day project scope | Yes                       | No — overkill          |

### Tenant Isolation Enforcement

1. **JWT payload** includes `tenantId` and `role` (`superadmin`, `admin`,
   `manager`, `employee`) at login.
2. **Express middleware** (`tenantContext.js`) extracts `tenantId` from the
   verified JWT and attaches it to `req.tenantId` on every request.
3. **Mongoose query middleware / repository layer** injects `{ tenantId: req.tenantId }`
   into every `find`, `findOne`, `update`, and `delete` call — no route handler
   is allowed to query a collection without this filter.
4. **Compound indexes** on `{ tenantId, _id }` (and `{ tenantId, employeeId }`,
   `{ tenantId, date }`) keep tenant-scoped queries fast as data grows.
5. **Superadmin role** (platform owner) is the only role that can query across
   tenants, e.g. for a billing/admin dashboard.

---

## 4. Database Schema (MongoDB Collections)

### `tenants`
```js
{
  _id, name, slug, plan, createdAt
}
```

### `users`
```js
{
  _id, tenantId, name, email, passwordHash, role, createdAt
}
```

### `employees`
```js
{
  _id, tenantId, name, employeeCode, department,
  maxWeeklyHours, contactInfo, createdAt
}
```

### `shifts`
```js
{
  _id, tenantId, employeeId, startTime, endTime,
  shiftType, status, createdBy, createdAt
}
```

### `availability`
```js
{
  _id, tenantId, employeeId, dayOfWeek, availableFrom, availableTo
}
```

### `fatigueRules`
```js
{
  _id, tenantId, ruleName, minRestHours, maxConsecutiveShifts,
  maxWeeklyHours, riskWeight
}
```

### `fatigueAssessments` (AI output log)
```js
{
  _id, tenantId, employeeId, shiftId, riskScore, riskLevel,
  aiExplanation, suggestedAlternative, generatedAt
}
```

---

## 5. Backend API Structure (Express)

```
/api/auth
  POST   /register        → create tenant + first admin user
  POST   /login            → returns JWT with tenantId + role

/api/employees            (tenant-scoped, requires auth)
  GET    /            
  POST   /
  PUT    /:id
  DELETE /:id

/api/shifts                (tenant-scoped)
  GET    /
  POST   /
  PUT    /:id
  DELETE /:id

/api/availability           (tenant-scoped)
  GET    /:employeeId
  POST   /

/api/fatigue                (tenant-scoped, AI module)
  POST   /assess/:shiftId   → run fatigue risk check + AI explanation
  GET    /assessments       → list risk history
```

Middleware order for protected routes:
`authMiddleware → tenantContext → roleGuard(['admin','manager']) → route handler`

---

## 6. AI / Fatigue Risk Module

1. **Rule engine** computes a numeric risk score from `fatigueRules`
   (rest hours between shifts, consecutive shifts, weekly hour caps).
2. **Conflict detector** flags overlapping shifts or violations of
   availability records.
3. **LLM explanation layer** takes the rule engine's raw flags/score and
   generates a plain-English explanation plus a safer schedule suggestion
   (e.g. "swap Employee A's Friday shift with Employee B — reduces rest
   violation from 6h to 11h").

This keeps the deterministic safety logic auditable (rule engine) while using
AI only for explanation/suggestion generation — not for scoring, to avoid
hallucinated risk numbers in a safety-relevant domain.

---

## 7. Frontend Structure (React + Tailwind)

```
capstone/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ManagerDashboard.jsx
│   │   │   ├── ShiftCalendar.jsx
│   │   │   ├── EmployeeList.jsx
│   │   │   └── FatigueReport.jsx
│   │   ├── components/
│   │   ├── context/AuthContext.jsx   (stores JWT + tenant info)
│   │   ├── api/axiosClient.js        (attaches JWT to every request)
│   │   └── App.jsx
│   └── tailwind.config.js
│
├── backend/
│   ├── src/
│   │   ├── models/        (Tenant, User, Employee, Shift, Availability, FatigueRule)
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/     (auth.js, tenantContext.js, roleGuard.js)
│   │   ├── services/ai/    (fatigueEngine.js, aiExplainer.js)
│   │   └── server.js
│   └── package.json
│
└── docs/
    └── project_documentation.md   (this file)
```

---

## 8. Suggested Team Split (5 Members)

| Member | Responsibility |
|--------|----------------|
| 1 | Backend — Auth, Tenant model, JWT + middleware |
| 2 | Backend — Employees, Shifts, Availability APIs |
| 3 | AI Module — Fatigue rule engine + LLM explanation service |
| 4 | Frontend — Manager dashboard, shift calendar UI (React + Tailwind) |
| 5 | Frontend — Employee view, fatigue report UI, integration + testing |

---

## 9. Setup Instructions (to be run once code is scaffolded)

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

Environment variables (`backend/.env`):
```
MONGO_URI=mongodb+srv://<cluster-uri>/workforce_shift_planner
JWT_SECRET=<secret>
PORT=5000
```

---

## 10. Limitations & Responsible Use

- Fatigue risk scoring is rule-based and does not replace medical/occupational
  health judgment.
- AI-generated schedule suggestions must be reviewed by a human manager before
  being applied.
- Multi-tenant isolation is enforced at the application layer; a production
  deployment handling sensitive HR data should add encryption at rest and
  regular security audits.

---

## 11. Future Improvements

- Per-tenant custom fatigue rule configuration UI
- Role-based analytics dashboard for superadmins across tenants
- Push/email notifications for high-risk shift assignments
- Shift swap request workflow between employees
