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
| Hosting (opt.) | Google Cloud Run/ Firebase / MongoDB Atlas                    |

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

## 4.1 Database Migrations (Schema Evolution)

To track schema changes and enable team coordination across a 10-day sprint,
implement an **application-level migration system** using a `migrations` collection.

### Migration Strategy

**Approach:** Simple, lightweight migration service that:
1. Maintains a `migrations` collection tracking executed schema changes
2. Auto-runs pending migrations on server startup
3. Supports manual rollback via CLI commands

### `migrations` Collection Schema
```js
{
  _id,
  name: "001_initial_schema",              // semantic name
  version: 1,                               // integer version
  description: "Create initial collections",
  executedAt: Date,
  status: "completed" | "pending",
}
```

### Directory Structure
```
backend/src/
├── migrations/
│   ├── 001_initial_schema.js
│   ├── 002_create_shifts_and_availability.js
│   └── 003_create_fatigue_tables.js
├── services/
│   └── migrations/
│       └── migrationService.js
└── cli/
    └── migrationCLI.js
```

### Migration Lifecycle

1. **Dev creates** a new migration file (`NNNN_description.js`) in `backend/src/migrations/`
2. **Migration service** (initialized in `server.js`) detects pending migrations on startup
3. **Auto-runs** pending migrations in numeric order
4. **Logs execution** to `migrations` collection with timestamp and status
5. **Rollback (optional)** via CLI: `npm run migrate:rollback <migration-name>`

### Sample CLI Commands

```bash
npm run migrate:status    # List pending migrations
npm run migrate:run       # Run all pending migrations
npm run migrate:rollback <name>  # Rollback a specific migration
```

### Benefits for Distributed Team
- **Deterministic setup** — New members run `npm run dev`; migrations auto-initialize
- **Audit trail** — Every schema change logged with timestamp and executor
- **Safe rollback** — Undo breaking changes without manual intervention
- **Low overhead** — Pure Mongoose + Node.js; no external framework dependencies

---

## 4.2 Backend MVC Architecture (Design)

To improve code organization and team coordination, the backend follows a **Model-View-Controller (MVC)** pattern layered on top of Express.

### MVC Concept Overview

```
HTTP Request
    ↓
Router (Route Registration)
    ↓
Middleware (Auth, TenantContext, RoleGuard)
    ↓
Controller (Request Handler)
    ├→ Validate Input (DTO + Validator)
    ├→ Delegate to Service
    └→ Format Response (ResponseFormatter)
         ↓
       Service (Business Logic)
       ├→ Query Model
       ├→ Apply Rules/Checks
       └→ Call AI/External Services
            ↓
          Model (Data Layer)
          └→ MongoDB Collection Query
                ↓
              HTTP Response
```

### MVC Layer Breakdown

| Layer | Responsibility | Examples |
|-------|-----------------|----------|
| **Model** | Data schema and persistence | Mongoose schemas: Shift, Employee, Availability |
| **Controller** | HTTP request handling + input validation | ShiftController, EmployeeController |
| **Service** | Business logic extraction + reuse | ShiftService (create, update, assess fatigue) |
| **Router** | Route registration + middleware ordering | `/api/shifts`, `/api/employees`, `/api/fatigue` |
| **Validator** | Input validation rules | ShiftValidator (validate shift times, employee ID) |
| **DTO** | Data Transfer Objects (request/response contracts) | CreateShiftDTO, ShiftResponseDTO |
| **ResponseFormatter** | Standardized API response structure | {success, data, message, statusCode} |

### Revised Backend Directory Structure

```
backend/src/
├── models/                    (M — Mongoose schemas)
│   ├── Tenant.js
│   ├── User.js
│   ├── Employee.js
│   ├── Shift.js
│   ├── Availability.js
│   ├── FatigueRule.js
│   └── FatigueAssessment.js
│
├── controllers/               (C — HTTP request handlers)
│   ├── AuthController.js
│   ├── ShiftController.js
│   ├── EmployeeController.js
│   ├── AvailabilityController.js
│   └── FatigueController.js
│
├── services/                  (Business logic layer)
│   ├── ShiftService.js
│   ├── EmployeeService.js
│   ├── AuthService.js
│   ├── migrations/
│   │   └── migrationService.js
│   └── ai/
│       ├── FatigueEngine.js
│       └── AIExplainer.js
│
├── routes/                    (Router registration)
│   ├── authRoutes.js
│   ├── shiftRoutes.js
│   ├── employeeRoutes.js
│   ├── availabilityRoutes.js
│   └── fatigueRoutes.js
│
├── middleware/                (Cross-cutting concerns)
│   ├── auth.js
│   ├── tenantContext.js
│   ├── roleGuard.js
│   └── errorHandler.js
│
├── validators/                (Input validation rules)
│   ├── ShiftValidator.js
│   ├── EmployeeValidator.js
│   └── AuthValidator.js
│
├── dto/                       (Data Transfer Objects)
│   ├── ShiftDTO.js
│   ├── EmployeeDTO.js
│   └── FatigueDTO.js
│
├── views/                     (Response formatting)
│   └── ResponseFormatter.js
│
├── cli/                       (CLI utilities)
│   └── migrationCLI.js
│
└── server.js                  (MVC wiring + bootstrap)
```

### Request Flow Example (Shift Creation)

```
1. Client sends POST /api/shifts with shift data
                ↓
2. Router matches route → calls authMiddleware, tenantContext, roleGuard
                ↓
3. ShiftController.createShift(req, res)
   └→ Calls ShiftValidator.validate(req.body)
   └→ Calls ShiftService.createShift(tenantId, data)
                ↓
4. ShiftService
   └→ Queries Model: Shift.findOne(query)
   └→ Applies logic: FatigueEngine.assessShift()
   └→ Returns result
                ↓
5. Controller formats response: ResponseFormatter.success(data)
                ↓
6. HTTP Response: {success: true, data: {...}, statusCode: 201}
```

### MVC Benefits for 10-Day Sprint

✅ **Clear responsibility split** — Controllers handle HTTP, services handle logic, models handle data  
✅ **Parallel development** — Members can work on different controllers/services independently  
✅ **Code reuse** — Services can be called from multiple controllers or background jobs  
✅ **Testability** — Each layer is independently testable (mock services, models)  
✅ **Consistency** — All APIs follow the same pattern (request → validate → service → respond)  
✅ **Maintainability** — Easy to find where a feature lives and what depends on it  

### Middleware Execution Order (for protected routes)

```
authMiddleware    (verify JWT → extract claims)
    ↓
tenantContext     (inject req.tenantId from JWT)
    ↓
roleGuard         (check user role against endpoint requirements)
    ↓
Controller        (handle request with tenant + role context)
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
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── dto/
│   │   ├── views/
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
| 1 | Backend — Models + Auth (Mongoose schemas, User/Tenant/Auth service) |
| 2 | Backend — Controllers + Routes (Shift, Employee, Availability CRUD endpoints) |
| 3 | AI Module — Fatigue service + validators (FatigueEngine, AIExplainer, DTOs) |
| 4 | Frontend — Manager dashboard + shift calendar UI (React components, auth flow) |
| 5 | Frontend — Employee view + fatigue report (UI, integration testing, error handling) |

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
