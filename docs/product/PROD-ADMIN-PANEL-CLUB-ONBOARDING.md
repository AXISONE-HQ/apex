# PROD — Admin Panel: Club Onboarding Console

## Summary
A repeatable onboarding workflow to create and activate new clubs without engineering involvement.

## Users
- Master Admin / AxisOne Admin

## Problem
Onboarding is currently brittle when it requires manual DB changes or ad-hoc steps. We need a single operational workflow that scales.

## Scope
- Create club (required fields + validation)
- Capture contacts, sport, region, notes
- Assign initial accounts/roles (director/admin, initial coach)
- Import initial teams/rosters (CSV minimal)
- Onboarding checklist + status (Onboarding / Active / Blocked)
- Store links to contracts/plan approvals/kickoff notes

## Non-goals
- Full self-serve onboarding for club directors (separate experience)
- Payments automation (can link to billing later)

## Success metrics
- < 15 minutes to onboard a club end-to-end
- > 90% of onboardings completed without engineering help

## Acceptance criteria
- [ ] Admin can create club record (DB-backed)
- [ ] Slug uniqueness enforced
- [ ] Admin can assign initial roles without raw SQL
- [ ] CSV import supports at minimum: team name, player first/last, email (optional)
- [ ] Checklist state persists
- [ ] Audit log records onboarding actions

## Dependencies
- Foundations (RBAC + org/team primitives)
- Club Directory + Club Profile

## Open questions
- Minimum roster import fields for day 1?
- Do we require email for players/parents at onboarding time?
