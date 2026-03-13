# PROD — Admin Panel: Reporting + Exports

## Summary
Provide lightweight reporting and exports so Ops and stakeholders can analyze club status and health outside the product when needed.

## Users
- Master Admin / AxisOne Admin
- (Secondary) Leadership (via shared exports)

## Problem
Stakeholders often need snapshots for ops reviews, outreach, or planning. Without exports, teams resort to manual copy/paste or engineering requests.

## Scope
- CSV export: club directory
- CSV export: club metrics snapshot (pulse + key usage)
- Monthly report generation (basic; template-based)
- Export logging (who exported what, when)

## Non-goals
- Full BI solution
- Scheduled automated emailing (later)

## Success metrics
- Exports used in ops review cadence without engineering involvement

## Acceptance criteria
- [ ] Exports are permissioned
- [ ] Exports are logged/audited
- [ ] Exports have consistent schema + documented definitions

## Dependencies
- Metrics/Pulse
- Club Directory
- Audit log

## Open questions
- Do exports need to be stored, or generated on-demand only?
