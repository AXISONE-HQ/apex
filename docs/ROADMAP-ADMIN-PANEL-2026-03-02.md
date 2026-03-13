# ROADMAP — Apex Admin Panel (Master Admin / Platform Ops)

**Date:** 2026-03-02  
**Owner:** Product  
**Audience:** CTO + Engineering + Ops

## Objective
Ship a platform-level **Admin Panel** that gives AxisOne/Master Admin a single place to:
1) see **all clubs** and their health/performance, and
2) manage the **club lifecycle** (onboarding → active ops → offboarding) safely.

## Primary users
- **Master Admin / AxisOne Admin (platform level):** provisions clubs, monitors health, resolves incidents, manages subscriptions/entitlements.
- **(Secondary) Club Director support:** may require escalation tools, but not a primary UI persona for this panel.

## Guiding principles
- **Truth over polish:** start with reliable, DB-backed data + clear permissions.
- **Operationally safe:** every destructive action is gated, logged, and reversible where possible.
- **Metrics are definitions:** every number in the admin panel must have an explicit definition and data source.

---

## Milestone A0 — Access + Guardrails (Prereq)
**Goal:** Admin panel is secure and audit-friendly.

**Scope**
- Platform-level permission: `admin.*` gates (AxisOneAdmin / SuperAdmin)
- Audit log for admin actions (who/what/when)
- Rate limiting and safe error messages

**Exit criteria**
- Only platform admins can access admin pages + endpoints
- Admin actions emit audit records

---

## Milestone A1 — Club Directory (All clubs view)
**Goal:** A single searchable list of every club on the platform.

**Scope**
- List clubs with: name, slug, country/region, status (active/trial/offboarded), created date
- Basic filters: status, country, sport, “needs attention”
- Sort + pagination

**Exit criteria**
- DB-backed directory (no demo-only data)
- API endpoint supports pagination + filters

---

## Milestone A2 — Club Profile (Single club drill-down)
**Goal:** One page that explains a club’s configuration and current health.

**Scope**
- Club details (profile fields + contacts)
- Subscription/entitlements summary
- Admin notes + internal timeline (onboarded, plan changes, incidents)

**Exit criteria**
- Admin can open any club and understand current state in <60 seconds

---

## Milestone A3 — Health / Performance Metrics v1 (Pulse + usage)
**Goal:** Quantify club health with *explainable* metrics.

**Core metrics (proposed v1 definitions)**
- **Pulse score (0–100):** weighted composite (see below)
- **WAU / MAU (club):** distinct active users per club
- **Coach activity:** # coaches active last 7d
- **Scheduling usage:** # events created last 7d / 30d
- **Attendance usage:** % events with attendance recorded
- **Comms usage:** # messages/announcements last 7d (when comms ships)
- **AI usage:** # practice plans generated last 7d (when AI ships)

**Pulse score (proposed weighting)**
- Adoption (logins/active users) — 25%
- Scheduling usage — 20%
- Attendance completeness — 20%
- Coach activity — 15%
- Recency (days since last meaningful action) — 10%
- Support risk flags (errors, payment issues, offboarding signals) — 10%

**Exit criteria**
- Every metric has documented SQL/source and refresh cadence
- Pulse is *explainable*: show top contributors + why it changed

---

## Milestone A4 — Onboarding Console (New clubs)
**Goal:** A repeatable workflow to bring a new club live.

**Scope**
- Create club record + required fields
- Assign initial admin/director accounts
- Import initial teams/rosters (CSV minimal)
- Checklist + status: “Onboarding / Active / Blocked”
- Store links to contracts, kickoff notes, billing plan

**Exit criteria**
- Admin can onboard a club end-to-end without touching raw SQL
- Onboarding artifacts are persisted and discoverable

---

## Milestone A5 — Offboarding / Suspension (Lifecycle control)
**Goal:** Manage risk and churn safely.

**Scope**
- Suspend club access (soft disable)
- Offboard (data export + retention policy + anonymization where required)
- Reactivation path

**Exit criteria**
- Every lifecycle transition is permissioned + logged
- Reversible suspension; controlled offboarding with explicit confirmation

---

## Milestone A6 — Ops Toolkit (Support + Diagnostics)
**Goal:** Reduce engineering interrupts with self-serve admin tools.

**Scope (examples)**
- Impersonate-as (read-only first) or “view as” role simulation
- Session viewer: recent errors, failed jobs, rate-limit events
- Feature flag overrides per club (if used)
- Data integrity checks (missing memberships, orphaned teams)

**Exit criteria**
- Admin can resolve top 5 support issues without engineering involvement

---

## Milestone A7 — Reporting + Exports
**Goal:** Provide simple exports for ops and stakeholders.

**Scope**
- CSV export of club directory and metrics snapshot
- Monthly health report generation (basic)

**Exit criteria**
- Exports are permissioned, watermarked/logged

---

## Recommended build order (fast path)
1) **A0 + A1** (secure directory) — immediate value
2) **A2** (club drilldown)
3) **A4** (onboarding) to scale growth
4) **A3** (metrics/pulse) once data sources are stable
5) **A5** (offboarding)
6) **A6–A7** (ops + reporting)

## Open questions
- Who owns Pulse score definition long-term (Product vs Data/Ops)?
- Do we need real-time metrics, or daily snapshots are fine for v1?
- What is the minimum onboarding import format (CSV fields) we commit to?
