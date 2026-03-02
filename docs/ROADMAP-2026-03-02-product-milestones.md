# ROADMAP — Apex Product Milestones (Draft)

**Date:** 2026-03-02  
**Owner:** Product  
**Source:** Project description provided in Slack (#C0AHW95QVCM)

## Guiding principle
Apex wins by delivering a *club operating system* first (structure + communication + scheduling), then layering in the *development differentiators* (AI practice planning + progression + insights), then monetization modules.

## Milestone 0 — Foundations (Platform + Roles + Data Model)
**Objective:** Establish secure multi-tenant club/team/user foundations so all other features can ship safely.

**In scope**
- Club, team, season primitives
- Role-based access control (Director, Coach, Player, Parent, Master Admin)
- Player-parent linking
- Baseline audit/logging + environment/config readiness

**Exit criteria**
- A club can be created; users assigned roles; a team roster managed
- Permissions are enforced per role (happy path + negative tests)
- Minimal admin visibility for Master Admin

## Milestone 1 — Club & Team Management (MVP Admin)
**Objective:** Directors and coaches can manage their organization in one place.

**In scope**
- Club profile
- Multi-team structure
- Roster management
- Invitations / onboarding flows (role-based)

**Exit criteria**
- Director can create teams, add coaches/players/parents
- Coach can manage their team roster
- Parent can see linked player(s)

## Milestone 2 — Scheduling + Attendance (Retention Baseline)
**Objective:** Replace fragmented calendars with a single source of truth.

**In scope**
- Events: practices, games, tournaments, tryouts, custom
- Smart calendar views
- Attendance tracking
- Notifications

**Exit criteria**
- Users can create/view events by role
- Attendance works end-to-end
- Notifications are reliable (basic delivery + preferences)

## Milestone 3 — Communication System (Adoption + Engagement)
**Objective:** Improve clarity and reduce admin overhead via role-aware comms.

**In scope**
- Team chat
- Club-wide announcements
- Parent-specific channels
- Notification center

**Exit criteria**
- Director can broadcast announcements
- Coach can message team; parents receive parent-targeted comms
- Basic moderation / rate limiting (as needed)

## Milestone 4 — AI Practice Planner (Differentiator v1)
**Objective:** Coaches can create structured practices quickly and consistently.

**In scope**
- Practice templates
- Drill recommendations
- Skill category tagging
- Session history tracking
- Periodized structure (v1: lightweight)

**Exit criteria**
- Coach can generate/edit/save a practice plan in minutes
- Plans can be reused; session history is visible
- Output is printable/shareable to players/parents (format TBD)

## Milestone 5 — Player Analysis & Progression (Development Moat)
**Objective:** Make athlete development measurable and visible over time.

**In scope**
- Tryout evaluation tools
- Performance scoring + feedback
- Long-term tracking
- Strength/weakness reports
- Position analysis (v1)

**Exit criteria**
- Coach can evaluate players and record results
- Player/parent can view progress summaries
- Reports are consistent + explainable

## Milestone 6 — Club Insights Dashboard (Org-Level Visibility)
**Objective:** Directors can see trends across teams to improve outcomes.

**In scope**
- Attendance analytics
- Engagement metrics
- Development trends
- Coach performance indicators (v1: careful definition)

**Exit criteria**
- Director dashboard shows actionable metrics (not vanity)
- Data definitions are documented (what each metric means)

## Milestone 7 — Monetization (Subscriptions + Payments)
**Objective:** Enable sustainable SaaS revenue with tiered club subscriptions.

**In scope**
- Subscription tiers (by club size)
- Billing + invoices (provider TBD)
- Premium AI feature gating
- Admin controls for Master Admin

**Exit criteria**
- Club can start trial → subscribe → pay → renew
- Access changes appropriately by tier
- Basic revenue reporting for Master Admin

## Milestone 8 — Optional Modules (Streaming / Store / Tournaments)
**Objective:** Add modular expansion features once the core OS is stable.

**Candidate modules**
- Streaming (live practices/games, multi-angle)
- Team store
- Sponsored challenges
- Tournament management

**Exit criteria**
- Each module can be enabled/disabled cleanly per club
- Clear ROI hypothesis + success metric per module

---

## Recommended sequencing (pragmatic)
1) Milestones 0–3 (structure + scheduling + comms) to drive adoption/retention
2) Milestones 4–6 (development + insights) to differentiate and justify pricing
3) Milestones 7–8 (monetization + modules) once core value is proven and stable

## Open questions (only if blocking)
- Target launch window for MVP/Beta/V1 (dates/quarters)?
- Which sport is the first wedge (basketball, soccer, etc.)? Impacts drill library + evaluation rubrics.
- Do we need payments for the first launch, or can we start with manual invoicing?
