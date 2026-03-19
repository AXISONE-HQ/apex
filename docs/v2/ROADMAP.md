# ROADMAP v2 — Apex (Living)

**Purpose:** single source of truth for *what exists*, *what’s in progress*, and *what’s next*.

- Keep this doc **current** (update weekly or after major PRs).
- Status tags: ✅ Done | 🟡 In progress | ⏭️ Next | ⛔ Blocked | 🔜 Later

## 0) Product framing

**Guiding principle (from roadmap v1):** deliver the *club operating system* first (structure + communication + scheduling), then differentiators (AI practice planning + progression + insights), then monetization/modules.

**Primary roles:** Director, Coach, Player, Parent, Master Admin.

## 1) Current state summary (as of 2026-03-04)

### Shipped / working now (evidence: recent merged PRs)
- 🟡 Scheduling UI
  - ✅ Events list (read-only) at `/apex/schedule`
  - ✅ Create event form (client validation + toast)
  - ✅ Event detail route
  - ✅ Attendance response (yes/no/maybe)
  - ✅ Backend: `GET /events/:id` + metadata surfaced
- 🟡 Communication
  - ✅ Announcements CRUD API with RBAC + rate limit
  - ✅ Team messages (team-scoped chat) with RBAC + rate limit
  - ✅ teamScopes semantics aligned with events-style guard + tests
- 🟡 Notifications
  - 🟡 Scheduling reminders job endpoint exists (currently **log-only**, not full delivery)

### Not yet confirmed from code/history slice
- Club/team/season primitives
- Invitations / onboarding flows
- Parent↔player linking UX
- Master Admin UI
- Notification preferences UX + reliable delivery channel(s)

> NOTE: This summary is based on git history (last ~20 PRs). It should be validated by checking current API routes, DB schema, and frontend routes.

## 2) Roadmap (features by milestone) — with living status

### Milestone 0 — Foundations (Platform + Roles + Data Model)
Objective: secure multi-tenant base so all other features ship safely.

- ⏭️ Club primitive (create/read/update)
- ⏭️ Team primitive (create/read/update)
- ⏭️ Season primitive (create/read/update)
- 🟡 RBAC enforcement (Director/Coach/Player/Parent/Master Admin)
- ⏭️ Parent↔player linking
- ⏭️ Audit logging baseline
- ⏭️ Environment/config readiness

Exit criteria
- ⏭️ Club can be created; users assigned roles; roster managed
- 🟡 Permissions enforced per role (happy + negative tests)
- ⏭️ Minimal Master Admin visibility

### Milestone 1 — Club & Team Management (MVP Admin)
Objective: directors and coaches manage org in one place.

- ⏭️ Club profile
- ⏭️ Multi-team structure
- ⏭️ Roster management UI/flows
- ⏭️ Invitations / onboarding (role-based)

Exit criteria
- ⏭️ Director creates teams + adds coaches/players/parents
- ⏭️ Coach manages team roster
- ⏭️ Parent sees linked players

### Milestone 2 — Scheduling + Attendance
Objective: single source of truth for events.

- ✅ Events list UI (`/apex/schedule`)
- ✅ Create event UI
- ✅ Event detail UI
- ✅ Attendance yes/no/maybe
- 🟡 Calendar views (confirm scope)
- 🟡 Notifications (reminders job exists but log-only)

Exit criteria
- 🟡 Users can create/view events by role (needs validation across roles)
- 🟡 Attendance works end-to-end
- 🟡 Notifications reliable + preferences

### Milestone 3 — Communication System
Objective: role-aware comms for clarity + engagement.

- ✅ Team chat/messages (API + UI wiring)
- ✅ Club announcements (API + UI wiring)
- ⏭️ Parent-specific channels (if distinct from team chat)
- ⏭️ Notification center UX
- 🟡 Basic moderation / rate limiting (present at API level)

Exit criteria
- 🟡 Director broadcasts announcements (confirm UI)
- 🟡 Coach messages team; parent-targeted comms (confirm targeting rules)
- 🟡 Moderation/rate limiting (validate behavior)

### Milestone 4 — AI Practice Planner
- 🔜 Later

### Milestone 5 — Player Analysis & Progression
- 🔜 Later

### Milestone 6 — Club Insights Dashboard
- 🔜 Later

### Milestone 7 — Monetization (Subscriptions + Payments)
- 🔜 Later

### Milestone 8 — Optional Modules
- 🔜 Later

## 3) Next checkpoints (update as you learn)

- ⏭️ Validate Milestone 0/1 coverage in current code (entities, DB schema, routes, UI).
- ⏭️ Decide notification channel(s) for MVP (in-app vs email vs push) and implement non-log delivery.
- ⏭️ Clarify what “parent-specific channels” means in comms.

## 4) Change log
- 2026-03-04: Created ROADMAP v2 skeleton from roadmap v1 + recent git history (scheduling/comms progress).
