# PROD — Admin Panel: Health Metrics + Pulse Score (v1)

## Summary
Define and display explainable club health metrics (usage + operational risk) and a composite Pulse score to help Ops prioritize attention.

## Users
- Master Admin / AxisOne Admin
- (Secondary) Leadership stakeholders (read-only)

## Problem
Without measurable health signals, Ops is reactive. We need an objective way to spot at-risk clubs and validate adoption.

## Scope
- Metrics (v1):
  - Pulse score (0–100)
  - Club WAU/MAU (distinct active users)
  - Coach activity (# active coaches last 7d)
  - Scheduling usage (# events created last 7d/30d)
  - Attendance usage (% events with attendance recorded)
  - Comms usage (# announcements/messages last 7d) when available
  - AI usage (# practice plans last 7d) when available
- Explainability:
  - Show top contributing factors and deltas (“why did Pulse drop?”)
- Data freshness:
  - Define refresh cadence (daily snapshot first; near-real-time later)

## Non-goals
- Predictive churn ML models
- Complex cohort tooling

## Success metrics
- Admins use Pulse/health view weekly to prioritize outreach
- Reduction in time-to-detect unhealthy clubs

## Acceptance criteria
- [ ] Each metric has a written definition + source of truth
- [ ] Pulse score formula documented + versioned
- [ ] Metrics render without N+1 queries / expensive scans
- [ ] Club Profile shows health snapshot + contributors
- [ ] Tests validate metric queries on realistic data volumes

## Dependencies
- Events + attendance data model (for scheduling metrics)
- Auth/session activity tracking (for WAU/MAU)
- Communication + AI features (for those metrics)

## Open questions
- Do we store daily snapshots in a table, or compute on demand with caching?
- Who owns metric definitions and changes (Product vs Ops)?
