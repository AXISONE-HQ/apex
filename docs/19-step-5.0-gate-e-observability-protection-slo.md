# Apex v1 — Gate E: Observability, Protection, and SLO Baseline

## Status
- **Gate:** E
- **State:** ✅ Complete
- **Date:** 2026-02-27

## Objective
Establish production-safe visibility and guardrails for critical user flows before broad launch.

## Progress started

### E1 Observability (completed baseline)
1. Added structured request logging in backend API (`type=request_log`) including:
   - method, path, status, latencyMs, hasSession, userId
2. Created logs-based metrics in GCP:
   - `apex_staging_auth_failures`
   - `apex_staging_ai_failures`
3. Created staging observability dashboard:
   - Dashboard: `Apex Staging Observability`
   - Includes panels for request rate, 5xx rate, p95 latency, Cloud SQL CPU, auth failures, AI failures
   - Dashboard id: `289a8154-f160-4127-ac0f-44abf3666e12`

### Existing alert baseline detected
- Uptime check alert for staging API already exists.
- Prod alerts already exist for uptime/latency/5xx/SQL CPU.

## Next tasks to complete Gate E

### E2 Protection controls (implemented baseline)
- Added rate limiter middleware in backend service.
- Applied on auth routes (`/auth/*`): 60 requests/minute per IP.
- Applied on AI routes (`/ai/*`): 30 requests/minute per user/IP.
- Combined with existing AI timeout/retry caps from Gate D4 for budget control.

Abuse protection baseline: reject bursts with 429 + `Retry-After`, monitor via logs/metrics.

### E3 SLO baseline (completed)
- SLO targets defined for login, roster/schedule reads, and write operations.
- Alert threshold mapping documented.
- Reference: `docs/20-step-5.0-gate-e3-slo-and-alert-thresholds.md`
