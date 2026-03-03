# PROD — Club & Team Management (MVP Admin)

## Summary
Enable clubs to be created, configured, and managed with teams/rosters and role-based access.

## Users
- Club Director (primary)
- Coach (primary)
- Parent/Player (view/access tied to membership)
- Master Admin (provisioning + support)

## Problem
Clubs can’t adopt Apex without basic structure: org profiles, teams, rosters, and correct role access.

## Scope
- **Club creation is Super Admin only** (platform-level provisioning)
- Club profile: name, slug, region, sport, contacts
- Multi-team structure
- Club can **create teams**
  - Team has **season start/end dates** (MVP)
- Club can **invite** coaches, players, and parents
- Roster management:
  - Add/remove players
  - Add players from **club-wide player list**
  - Add players from **previous tryouts** (if/when tryouts exist)
- Parent ↔ player linking
- Team dashboard (MVP):
  - Team health (pulse/AI score placeholder if needed)
  - Roster snapshot
  - Upcoming events snapshot
- Invitations/onboarding flows (MVP)
- Permissioning for each operation

## Non-goals
- Scheduling, comms, AI practice planning, payments
- Advanced analytics

## Success metrics
- Time to create a club + first team + roster < 20 minutes
- % clubs successfully onboarded without engineering intervention

## Acceptance criteria
- [ ] **Super Admin can create a club** (platform-level) and set initial Director
- [ ] Director can create/manage teams in their org, including **season start/end dates**
- [ ] Director can invite coaches, players, and parents
- [ ] Coach can manage roster for assigned team(s)
- [ ] Coach/Director can add players to a team from a **club player list** (no re-entry)
- [ ] Coach/Director can add players from **previous tryouts** (if/when tryouts data exists)
- [ ] Team dashboard exists and shows: team pulse/health, roster count, upcoming events
- [ ] Parent can see linked player(s)
- [ ] All operations are org/team scoped; no cross-tenant reads
- [ ] DB-backed persistence (no demo-only)

## Dependencies
- Foundations (RBAC + org/team primitives)

## Open questions
- Do we support multi-season team structures in MVP or later?
