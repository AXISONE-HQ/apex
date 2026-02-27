# Apex v1 — Gate E: Observability, Protection, and SLO Baseline

## Status
- **Gate:** E
- **State:** 🚧 In progress
- **Date:** 2026-02-27

## Objective
Establish production-safe visibility and guardrails for critical user flows before broad launch.

## Progress started

### E1 Observability (started)
1. Added structured request logging in backend API (`type=request_log`) including:
   - method, path, status, latencyMs, hasSession, userId
2. Created logs-based metrics in GCP:
   - `apex_staging_auth_failures`
   - `apex_staging_ai_failures`

### Existing alert baseline detected
- Uptime check alert for staging API already exists.
- Prod alerts already exist for uptime/latency/5xx/SQL CPU.

## Next tasks to complete Gate E

### E1 Observability
- Create staging dashboard for:
  - API latency
  - API error rate
  - auth failures
  - AI failures
- Add DB health panel for staging SQL.

### E2 Protection controls
- Add basic rate limits on auth endpoints (`/auth/session`, `/auth/logout`, `/auth/me`).
- Add AI endpoint budget controls (request limits + timeout caps already in place).

### E3 SLO baseline
- Define initial SLO targets for:
  - login success + latency
  - roster load latency
  - schedule load latency
  - create/update success rates
- Map alert thresholds to SLOs.
