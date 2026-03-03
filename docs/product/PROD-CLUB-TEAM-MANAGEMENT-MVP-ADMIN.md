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
- Club profile: name, slug, region, sport, contacts
- Multi-team structure
- Roster management (add/remove, basic status)
- Parent ↔ player linking
- Invitations/onboarding flows (MVP)
- Permissioning for each operation

## Non-goals
- Scheduling, comms, AI practice planning, payments
- Advanced analytics

## Success metrics
- Time to create a club + first team + roster < 20 minutes
- % clubs successfully onboarded without engineering intervention

## Acceptance criteria
- [ ] Director can create/manage teams in their org
- [ ] Coach can manage roster for assigned team(s)
- [ ] Parent can see linked player(s)
- [ ] All operations are org/team scoped; no cross-tenant reads
- [ ] DB-backed persistence (no demo-only)

## Dependencies
- Foundations (RBAC + org/team primitives)

## Open questions
- Do we support multi-season team structures in MVP or later?
