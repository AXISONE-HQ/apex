# Apex v1 — Gate G2: Controlled Rollout + Launch-Day Runbook

## Status
- **Gate:** G2
- **State:** ✅ Complete
- **Date:** 2026-02-27

## Pilot rollout plan

### Pilot cohort (initial)
- **Pilot Club 1:** Internal demo club (Fred-managed)
- **Pilot Club 2:** Friendly external club (low-risk)
- **Pilot Club 3:** Medium-activity club (broader usage coverage)

### Rollout phases
1. **Phase 0 (Day 0):** Internal pilot only (Club 1)
2. **Phase 1 (Day 1-2):** Add Club 2
3. **Phase 2 (Day 3-5):** Add Club 3
4. **Phase 3:** Expand only if no critical incidents in prior phase

## Rollback plan

### Trigger conditions
- Auth/login outage > 10 minutes
- Sustained 5xx ratio > 2% for > 10 minutes
- Data integrity risk identified

### Actions
1. Freeze new pilot onboarding.
2. Switch frontend API base to known-good endpoint if needed.
3. Roll back Cloud Run service to previous stable revision.
4. Post incident note + timeline.
5. Resume rollout only after fix + validation.

## Launch-day runbook

### Pre-launch checklist
- Confirm prod frontend: `https://apex-v1-488611.web.app`
- Confirm prod API: `https://apex-prod-api-153079040450.us-central1.run.app`
- Confirm auth providers enabled (Google + email/password)
- Confirm observability dashboard + alerting active

### Live launch checks (hour 0-2)
- Login success rate normal
- `/auth/session` and `/auth/me` stable
- p95 latency within SLO band
- 5xx ratio under threshold
- SQL CPU under threshold

### Comms
- One owner for technical triage
- One owner for club-facing communication

### Exit criteria (G2)
- Pilot clubs onboarded in phases
- Launch-day runbook executed without critical incident
