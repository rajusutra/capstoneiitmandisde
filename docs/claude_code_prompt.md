# Claude Code Prompt — Capstone Build

Copy-paste the prompt below into Claude Code to build the project step by step.

---

Read my project documentation in `docs/project_documentation.md` and build the
**Workforce Shift Planning and Fatigue Risk Management System** exactly as
described there.

**Important rules — follow these strictly:**

1. **Keep the code simple.** I am a student working alone. Use plain JavaScript
   (no TypeScript), simple functions, and clear variable names. Avoid clever
   tricks, advanced patterns, or extra libraries I don't need.
2. **Add short comments** explaining what each file and important function does,
   so I can understand and explain every line in my viva/demo.
3. **Build in small steps and confirm each works before moving on:**
   - Step 1: Scaffold `backend/` (Express + Mongoose) and `frontend/` (Vite +
     React + Tailwind) folders matching the structure in the doc (§6 and §9).
   - Step 2: Backend basics — `server.js`, MongoDB connection, error handler,
     `ResponseFormatter`, and the simple migration system from §5.
   - Step 3: All 7 Mongoose models from §4, each with a `tenantId` field.
   - Step 4: Auth — register (creates tenant + admin) and login (JWT with
     `tenantId` + `role`), plus the middleware chain:
     `auth → tenantContext → roleGuard`.
   - Step 5: CRUD APIs for employees, shifts, and availability (§7). Every
     query must filter by `tenantId`.
   - Step 6: Fatigue module (§8) — a rule-based `FatigueEngine` (rest hours,
     consecutive shifts, weekly hour cap, overlap check) and an `AIExplainer`
     that turns the flags into a plain-English explanation. Make the AI part
     work with a simple template fallback if no API key is set.
   - Step 7: Backend tests with an isolated test database — use **Jest +
     mongodb-memory-server** (an in-memory MongoDB that starts fresh for every
     test run, so tests never touch my real database). Write simple tests for:
     auth (register/login), tenant isolation (tenant A must never see tenant
     B's data), shift CRUD, and the FatigueEngine rules. Add an
     `npm test` script.
   - Step 8: Frontend — Login, Register, ManagerDashboard, ShiftCalendar,
     EmployeeList, and FatigueReport pages, with `AuthContext` and an axios
     client that attaches the JWT.
   - Step 9: A seed script with one demo tenant, a few employees, shifts, and
     default fatigue rules so I can demo immediately.
4. After each step, tell me **how to run and test it** with exact commands.
5. Use a `.env.example` file for `MONGO_URI`, `JWT_SECRET`, and `PORT`.
6. Update the README with simple setup instructions at the end.

Start with Step 1 now, and ask me before moving to the next step.
