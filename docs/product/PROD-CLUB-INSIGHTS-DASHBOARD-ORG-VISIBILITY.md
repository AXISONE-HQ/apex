# PROD — Club Insights Dashboard (Org-Level Visibility)

## Summary
Give club directors an insights dashboard showing adoption, attendance, engagement, and development trends across teams.

## Users
- Club Director (primary)
- (Secondary) Master Admin (platform aggregated view)

## Problem
Directors need visibility across teams to enforce program consistency, identify problems early, and prove value to parents.

## Scope
- Attendance analytics
- Engagement metrics (active users, comms usage)
- Development trends (evaluations completion, progress deltas)
- Coach activity indicators (careful definition)

## Non-goals
- Full BI/cube tooling
- Complex forecasting

## Success metrics
- Directors use dashboard at least weekly
- Faster identification of at-risk teams (proxy: fewer surprise churn events)

## Acceptance criteria
- [ ] Metrics definitions are documented and consistent
- [ ] Dashboard loads quickly (cached/snapshotted if needed)
- [ ] Drill-down from club → team → player where permitted

## Dependencies
- Events + attendance
- Comms and/or AI/progression features for richer signals

## Open questions
- Which 5 metrics are must-have for v1 (avoid dashboard bloat)?
