# CTO Tech Brief — EPIC 1: Club Setup & Organizational Structure

**Generated:** 2026-03-04 11:03  
**Repo branch/head:** develop • e3588ac docs: add PM mission brief 0001 for Monday MVP

## 1) Executive summary
EPIC 1 implements the core club onboarding and organizational setup workflow so a new club can join Apex and become operational. The center of gravity is the existing `organizations` multi-tenant model ("club" == organization), plus director-facing setup flows (club profile/settings, coach invites, teams creation) wired into RBAC.

For this iteration, **payments are a stub**: directors select a subscription plan, we store it on the organization, but we do **not** integrate Stripe yet. “Confirmation email” is also a stub: we record an onboarding event and emit a log / notification-center item rather than sending real email.

## 2) Current code reality (signals)
- Notes:
  - This is a quick snapshot (grep-based). Validate with targeted file reads + running the app.



### Grep hints


```
Pattern: organizations|memberships|roles|permissions
Area: service/src
Sample:
service/src/routes/admin/clubs.js:4:import { listOrganizations } from "../../repositories/organizationsRepo.js";
service/src/server.js:102:          roles: session.roles,
service/src/server.js:103:          permissions: session.permissions,
service/src/server.js:122:        req.user = { id: "usr_invalid", roles: [] };
service/src/config/permissions.js:50:  "admin.function.permissions.override",
service/src/authz/engine.js:24:export function can({ roles = [], permission, scope = null, user = null, permissions = null }) {
service/src/authz/engine.js:25:  if (permissions && permissions.includes(permission) && scopeAllowed(user, scope)) {
service/src/authz/engine.js:30:  for (const role of roles) {
service/src/db/seedRbac.js:3:import { permissionCatalog } from "../config/permissions.js";
service/src/db/seedRbac.js:9:    await query(`INSERT INTO permissions (code) VALUES ($1) ON CONFLICT (code) DO NOTHING`, [permission]);
service/src/db/seedRbac.js:15:      `INSERT INTO roles (code) VALUES ($1)
service/src/db/seedRbac.js:28:        `INSERT INTO role_permissions (role_id, permission_id)

---

Pattern: admin/clubs|organizationsRepo|listOrganizations
Area: service/src
Sample:
service/src/routes/admin/clubs.js:4:import { listOrganizations } from "../../repositories/organizationsRepo.js";
service/src/routes/admin/clubs.js:13:    const clubs = await listOrganizations();
service/src/repositories/organizationsRepo.js:14:export async function listOrganizations() {
service/src/server.js:11:import adminClubsRoutes from "./routes/admin/clubs.js";
service/src/server.js:143:app.use("/admin/clubs", adminClubsRoutes);

---

Pattern: admin.clubs.create|admin.page.clubs
Area: service/src
Sample:
service/src/routes/admin/clubs.js:11:  requirePermission("admin.page.clubs.view", () => ({ type: "platform" })),
service/src/config/permissions.js:45:  "admin.page.clubs.view",
service/src/config/permissions.js:46:  "admin.clubs.create",

---

Pattern: organizations
Area: service/sql/migrations
Sample:
service/sql/migrations/004_ai_jobs.sql:5:  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
service/sql/migrations/008_announcements.sql:5:  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
service/sql/migrations/001_auth_core.sql:23:CREATE TABLE IF NOT EXISTS organizations (
service/sql/migrations/001_auth_core.sql:33:  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
service/sql/migrations/002_domain_mvp.sql:5:  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
service/sql/migrations/002_domain_mvp.sql:15:  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
service/sql/migrations/002_domain_mvp.sql:28:  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
service/sql/migrations/007_events_and_attendance.sql:5:  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
service/sql/migrations/009_team_messages.sql:5:  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
service/sql/migrations/006_org_profile_fields.sql:1:-- Adds location + pulse metadata to organizations
service/sql/migrations/006_org_profile_fields.sql:2:ALTER TABLE organizations
service/sql/migrations/006_org_profile_fields.sql:7:UPDATE organizations

---

Pattern: apex/admin/clubs|apex/admin/onboarding
Area: frontend/src
Sample:
frontend/src/app/apex/admin/clubs/page.tsx:159:                      window.location.href = `/apex/admin/clubs/${club.id}`;

---

Pattern: invite|onboard
Area: service/src
Sample:
service/src/config/permissions.js:47:  "admin.function.user.invite",
service/src/config/rbac.js:13:    "admin.function.user.invite",

---

Pattern: email|sendgrid|postmark|mail
Area: service/src
Sample:
service/src/routes/domain/players.js:18:  const { firstName, lastName, email = null, teamId = null } = req.body || {};
service/src/routes/domain/players.js:24:  if (email !== null && typeof email !== "string") {
service/src/routes/domain/players.js:25:    return badRequest(res, "email must be a string when provided");
service/src/routes/domain/players.js:32:    email,
service/src/routes/domain/players.js:40:  const { firstName, lastName, email, teamId, status } = req.body || {};
service/src/routes/domain/players.js:50:  if (email !== undefined && email !== null && typeof email !== "string") {
service/src/routes/domain/players.js:51:    return badRequest(res, "email must be a string when provided");
service/src/routes/domain/players.js:59:    email,
service/src/routes/jobs.js:15:// Future: swap logs for actual delivery (email/push/SMS) while keeping the API stable.
service/src/routes/auth.js:69:      user: { id: user.id, email: user.email, name: user.name },
service/src/routes/auth.js:89:    user: { id: req.user.id, email: req.user.email, name: req.user.name },
service/src/db/seedDomainDemo.js:24:    `INSERT INTO players (org_id, team_id, first_name, last_name, email)

---

Pattern: apex/schedule
Area: frontend
Sample:
frontend/src/app/apex/schedule/page.tsx:406:                      window.location.href = `/apex/schedule/events/${e.id}`;

---

Pattern: attendance
Area: frontend
Sample:
frontend/src/app/api/apex-club-pulse/route.ts:13:            summary: "Club operations are stable with moderate risk around attendance and unpaid subscriptions.",
frontend/src/app/api/apex-club-pulse/route.ts:15:              "U14/U15 attendance trend is below target for upcoming sessions.",
frontend/src/app/api/apex-club-pulse/route.ts:20:              "Send attendance nudges 24h before U14/U15 events.",
frontend/src/app/apex/page.tsx:1370:  const attendanceHealth = useMemo(() => {
frontend/src/app/apex/page.tsx:1402:      return { score: 0, attendancePct: 0, teamUnpaid: 0, label: "Needs attention" };
frontend/src/app/apex/page.tsx:1405:    let attendancePct = attendanceHealth.yesPct;
frontend/src/app/apex/page.tsx:1409:      attendancePct = 52;
frontend/src/app/apex/page.tsx:1411:      return { score: 54, attendancePct, teamUnpaid, label: "Needs attention" };
frontend/src/app/apex/page.tsx:1415:      attendancePct = 94;
frontend/src/app/apex/page.tsx:1417:      return { score: 89, attendancePct, teamUnpaid, label: "Excellent" };
frontend/src/app/apex/page.tsx:1421:      (attendancePct + Math.max(0, 100 - teamUnpaid * 6) + (activeTeam.players >= 14 ? 90 : 65)) / 3,
frontend/src/app/apex/page.tsx:1426:      attendancePct,

---

Pattern: announc
Area: service
Sample:
service/sql/migrations/008_announcements.sql:3:CREATE TABLE IF NOT EXISTS announcements (
service/sql/migrations/008_announcements.sql:12:CREATE INDEX IF NOT EXISTS idx_announcements_org_created_at
service/sql/migrations/008_announcements.sql:13:  ON announcements(org_id, created_at DESC);
service/src/routes/domain/announcements.js:4:import { createAnnouncement, listAnnouncements } from "../../repositories/announcementsRepo.js";
service/src/routes/domain/announcements.js:18:  requirePermission("announcements.view"),
service/src/routes/domain/announcements.js:26:    const announcements = await listAnnouncements({ orgId, limit: limitNum });
service/src/routes/domain/announcements.js:27:    return res.status(200).json({ announcements });
service/src/routes/domain/announcements.js:34:  requirePermission("announcements.create"),
service/src/routes/domain/announcements.js:45:    const announcement = await createAnnouncement({
service/src/routes/domain/announcements.js:52:    return res.status(201).json({ announcement });
service/src/repositories/announcementsRepo.js:17:     FROM announcements
service/src/repositories/announcementsRepo.js:34:      id: `announcement_${demoAnnouncements.length + 1}`,

---

Pattern: team_messages|team messages
Area: service
Sample:
service/sql/migrations/009_team_messages.sql:3:CREATE TABLE IF NOT EXISTS team_messages (
service/sql/migrations/009_team_messages.sql:12:CREATE INDEX IF NOT EXISTS idx_team_messages_team_created_at
service/sql/migrations/009_team_messages.sql:13:  ON team_messages(team_id, created_at DESC);
service/sql/migrations/009_team_messages.sql:15:CREATE INDEX IF NOT EXISTS idx_team_messages_org_created_at
service/sql/migrations/009_team_messages.sql:16:  ON team_messages(org_id, created_at DESC);
service/test/team-messages.db.test.js:105:    await query("DELETE FROM team_messages WHERE team_id = $1", [teamId]);
service/src/config/permissions.js:28:  "team_messages.view",
service/src/config/permissions.js:29:  "team_messages.create",
service/src/config/rbac.js:9:    "team_messages.*",
service/src/config/rbac.js:22:    "team_messages.view",
service/src/config/rbac.js:23:    "team_messages.create",
service/src/config/rbac.js:55:    "team_messages.view",

---

Pattern: rbac|permission|role
Area: service
Sample:
service/sql/migrations/001_auth_core.sql:38:CREATE TABLE IF NOT EXISTS roles (
service/sql/migrations/001_auth_core.sql:43:CREATE TABLE IF NOT EXISTS permissions (
service/sql/migrations/001_auth_core.sql:48:CREATE TABLE IF NOT EXISTS role_permissions (
service/sql/migrations/001_auth_core.sql:49:  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
service/sql/migrations/001_auth_core.sql:50:  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
service/sql/migrations/001_auth_core.sql:51:  PRIMARY KEY(role_id, permission_id)
service/sql/migrations/001_auth_core.sql:54:CREATE TABLE IF NOT EXISTS membership_roles (
service/sql/migrations/001_auth_core.sql:56:  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
service/sql/migrations/001_auth_core.sql:57:  PRIMARY KEY(membership_id, role_id)
service/sql/migrations/001_auth_core.sql:64:  roles TEXT[] NOT NULL DEFAULT '{}',
service/sql/migrations/001_auth_core.sql:65:  permissions TEXT[] NOT NULL DEFAULT '{}',
service/src/server.js:102:          roles: session.roles,

---

Pattern: events/:id|GET /events
Area: service
Sample:
service/test/events-get-by-id.db.test.js:9:test("GET /events/:id scoping (DB)", async (t) => {
```

## 3) Scope (from product roadmap)
### Epic
- EPIC 1 — Club Setup & Organizational Structure

### Workflows included
- Workflow 1: Create a Club (Master Admin / Club Director) — Status: In progress

## 4) Proposed technical approach

### Architecture decisions
- **Club == organization.** Reuse the existing `organizations` table as the canonical “club” entity. Avoid introducing a parallel `clubs` table.
- **Onboarding is stateful.** Track onboarding steps in a lightweight, queryable way (e.g., `organization_onboarding_events` or an `organizations.onboarding_status` JSONB) so we can power an admin “onboarding status” view.
- **Payments/email are stubs.** We store `subscription_plan` on the org; create a “confirmation” event/notification item and log it. No Stripe, no outbound email provider in this epic.

### Data model changes
- Extend `organizations` with profile + plan fields (min viable for EPIC 1):
  - `logo_url` (nullable)
  - `sport_type` (nullable)
  - `location` fields (already partially present: `state_province`, `country`)
  - `subscription_plan` (text; enum-like values)
- Add onboarding tracking (choose one):
  - Option A: `organization_onboarding_events(org_id, event_code, actor_user_id, created_at, meta jsonb)`
  - Option B: `organizations.onboarding_status jsonb` (simpler, but less auditable)

### API surface (routes/contracts)
- Admin
  - `GET /admin/clubs` (exists)
  - `POST /admin/clubs` (create org + initial director membership) — gated by `admin.clubs.create`
  - `GET /admin/clubs/:orgId` (profile)
  - `PATCH /admin/clubs/:orgId` (update profile/settings)
  - `GET /admin/clubs/onboarding` (exists in frontend usage; confirm backend)
- Domain (director context)
  - `POST /orgs/:orgId/teams` (or existing teams route pattern)
  - `POST /orgs/:orgId/invites` for coaches (stub delivery)

### Frontend changes
- Director-facing flow (minimal, can be ugly-first):
  - Club create/profile form (name, logo upload stub, sport type, location, plan)
  - Club settings screen (age categories, competition levels, season start/end, etc.) — can be stored as JSON initially
  - Coaches invite screen
  - Team create screen
- Admin pages already exist for clubs listing; extend with create/edit and onboarding status.

### Permissions / RBAC
- Reuse existing permission engine; ensure every org-scoped operation uses `{ type: "organization", id: orgId }`.
- Define role codes for Director/Coach/Player/Parent/MasterAdmin in `seedRbac` and map to permissions.
- Add negative tests for cross-org access + role mismatch.

### Notifications / async
- For “confirmation email” and coach invites: write onboarding events + log to jobs endpoint (or notification center table) with stable API so real delivery can be implemented later without changing contracts.

## 5) Implementation plan (PR-sized)

- PR1 — Org profile + plan fields + onboarding tracking
  - Add migrations for `organizations` fields + onboarding events/status
  - Add repo functions + tests

- PR2 — Admin club create/update
  - Implement `POST /admin/clubs` + `GET/PATCH /admin/clubs/:orgId`
  - Ensure it creates initial director membership (if provided)
  - RBAC guards + negative tests

- PR3 — Director setup UI (minimal)
  - Add/extend frontend pages for club create/profile + settings + teams + invites
  - Wire to API

- PR4 — Coach invite stub + onboarding status
  - Add invites table/endpoint if needed; write onboarding events
  - Update admin onboarding view to reflect step completion

## 6) Test plan
- Unit
  - Repo functions for organizations + onboarding tracking
- Integration
  - API: admin clubs create/update/list
- Negative RBAC tests
  - Non-admin cannot create club
  - Admin cannot mutate orgs without platform scope (as defined)
  - Director cannot access/mutate other org
- E2E smoke
  - Create org → set plan → create team → invite coach (stub) and verify onboarding status updates
## 7) Rollout plan
- Staging validation:
- Controlled rollout:
- Backout plan:

## 8) Risks / open questions
- **Club settings scope**: age categories / competition levels / evaluation templates can explode in complexity. Recommendation: store as JSON in v1 with a versioned schema + validate minimally.
- **Logo upload**: implement real upload to **GCP storage** (GCS). Decide bucket + auth model (signed URL vs server-side proxy). Keep the org field as `logo_url`.
- **Invite delivery**: we’ll stub invites and log events; later we can plug in real email without changing the contract.
- **Club creation authority**: for v1, **platform admin only** creates org + assigns initial Director.
