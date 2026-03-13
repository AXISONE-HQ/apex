# PROD — Admin Panel: Club Suspension + Offboarding

## Summary
Control the club lifecycle with safe, audited actions: suspend access, offboard with data export/retention, and support reactivation.

## Users
- Master Admin / AxisOne Admin

## Problem
Clubs will churn, violate policy, or fail payment. We need operational controls that protect the platform and handle data responsibly.

## Scope
- **Suspend** club (soft disable): users can’t log in / API access blocked for that org
- **Reactivate** suspended club
- **Offboard** club:
  - generate/export data package
  - set retention policy state
  - optional anonymization/deletion after retention window
- Status + timeline visible on Club Profile

## Non-goals
- Legal/compliance automation beyond defined retention policy
- Fully automated billing dunning workflows

## Success metrics
- Admin can suspend/reactivate in < 2 minutes
- Offboarding is consistent and repeatable (checklist-driven)

## Acceptance criteria
- [ ] Club status transitions are permissioned + audit logged
- [ ] Suspension blocks auth + API for org-scoped operations
- [ ] Offboarding requires explicit confirmation and produces an artifact (export link/id)
- [ ] Reactivation restores access without data corruption

## Dependencies
- Audit log
- Clear tenant boundary enforcement

## Open questions
- What’s the retention policy by default (days) and what data is excluded/included?
