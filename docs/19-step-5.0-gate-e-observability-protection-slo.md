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

### E2 Protection controls (implemented baseline)
- Added rate limiter middleware in backend service.
- Applied on auth routes (`/auth/*`): 60 requests/minute per IP.
- Applied on AI routes (`/ai/*`): 30 requests/minute per user/IP.
- Combined with existing AI timeout/retry caps from Gate D4 for budget control.

Abuse protection baseline: reject bursts with 429 + `Retry-After`, monitor via logs/metrics.

### E3 SLO baseline
- Define initial SLO targets for:
  - login success + latency
  - roster load latency
  - schedule load latency
  - create/update success rates
- Map alert thresholds to SLOs.
