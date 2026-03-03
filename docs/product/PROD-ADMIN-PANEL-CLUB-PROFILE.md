# PROD — Admin Panel: Club Profile (Drill-down)

## Summary
A single club detail view that consolidates configuration, contacts, entitlements, and operational timeline so admins can understand a club’s state fast.

## Users
- Master Admin / AxisOne Admin

## Problem
A list view isn’t enough to diagnose issues or support onboarding—admins need a drill-down with a coherent narrative of the club.

## Scope
- Club profile: name, slug, sport, region, contacts
- Lifecycle status + timestamps (onboarded, suspended, offboarded)
- Admin notes (internal-only)
- Entitlements/subscription summary (basic)
- Health snapshot (pulse + key usage metrics)

## Non-goals
- Editing every domain object from admin (keep controlled)
- Full billing workflows (separate feature)

## Success metrics
- Admin can answer “what’s going on with this club?” in < 60 seconds

## Acceptance criteria
- [ ] Accessible from Club Directory
- [ ] Shows key profile fields + status + timeline
- [ ] Shows pulse + top metric contributors (when enabled)
- [ ] Supports adding internal admin notes
- [ ] All fields are permissioned and audit logged where relevant

## Dependencies
- Club Directory
- Metrics/Pulse feature
- Audit logging

## Open questions
- Do we need a per-club incident log in v1, or can we use notes only?
