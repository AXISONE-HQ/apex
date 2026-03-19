# Apex v1 — Step 6.0: Production Ops + Expansion Plan

## Status
- **Step:** 6.0
- **State:** 🚧 In progress
- **Date:** 2026-02-27
- **Owner:** Fred + Axi

## Mission (post-MVP)
Operate production safely while preparing scale and onboarding growth.

## Priorities (ordered)
1. Production reliability hardening
2. Pilot-to-broader onboarding process
3. Capacity scaling controls and cost discipline
4. Product iteration loop from live usage

---

## Workstream A — Production Reliability (P0)

### A1. Alert quality + escalation
- Tune alert thresholds from real traffic baseline.
- Add severity labels (P0/P1/P2) and clear owner mapping.
- Add noise reduction (dedupe/suppression windows).

### A2. Incident response operations
- Formalize incident lifecycle: detect → triage → mitigate → recover → review.
- Ensure rollback commands are one-command documented for frontend + API.
- Add post-incident template and SLA for write-up completion.

### A3. Backup/recovery confidence
- Verify DB backup policy and restore test cadence.
- Document target RPO/RTO and run one restore simulation.

---

## Workstream B — Controlled Growth (P0/P1)

### B1. Pilot expansion model
- Define readiness gate for each new club cohort.
- Weekly capacity review before adding next cohort.

### B2. Onboarding playbook
- Standard setup checklist per club (roles, teams, schedules, auth validation).
- Quick-start admin guide for club directors/coaches.

### B3. Success metrics
- Weekly active clubs
- Team activation rate
- Login success ratio
- Core workflow completion ratio

---

## Workstream C — Scale Engineering (P1)

### C1. Async worker maturity
- Replace placeholder AI worker execution with concrete job-type processors.
- Add retry policies per job type + dead-letter strategy.

### C2. API and DB optimization loop
- Monthly query-plan review for top endpoints.
- Add index changes only with measured query impact.
- Move from offset pagination to cursor pagination for high-growth surfaces.

### C3. Cost controls
- Budget alerts for Cloud Run, Cloud SQL, and model usage.
- Unit-cost view per active club.

---

## Workstream D — Product Iteration from Live Usage (P1)

### D1. Feedback channel
- Collect pilot feedback weekly and map to issue backlog.

### D2. Priority backlog lanes
- Reliability fixes
- Onboarding friction
- Coach workflow speed improvements
- Player/parent transparency upgrades

---

## Definition of Done (Step 6.0)
- Production operations are repeatable and auditable.
- Incident and rollback handling is practiced.
- Pilot growth is controlled by measurable gates.
- Scale/cost controls are actively monitored.
