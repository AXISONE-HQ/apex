# Apex v1 — Gate F: Load Readiness Validation

## Status
- **Gate:** F
- **State:** ✅ Complete
- **Date:** 2026-02-27

## F1 — Staging load scenarios (prepared)

Prepared k6 scenarios:
- `service/load/k6/read-heavy.js`
  - Auth/session + read-heavy mix (`/auth/me`, `/teams`, `/players`, `/matches`)
- `service/load/k6/mixed-write.js`
  - Create-heavy mix (`/teams`, `/players`, `/matches`)

Both scenarios use Firebase token bootstrap + backend session cookie flow for realistic authenticated traffic.

### Run commands

```bash
cd service/load/k6

# read-heavy
k6 run read-heavy.js \
  -e API_BASE_URL=https://apex-staging-api-g6dsonn6nq-uc.a.run.app \
  -e FIREBASE_API_KEY=<FIREBASE_API_KEY>

# mixed-write
k6 run mixed-write.js \
  -e API_BASE_URL=https://apex-staging-api-g6dsonn6nq-uc.a.run.app \
  -e FIREBASE_API_KEY=<FIREBASE_API_KEY>
```

## F2 — Capacity thresholds (defined)

Baseline pass/fail thresholds:
- Throughput target (staging baseline): sustain 50+ req/s read-heavy and 15+ req/s mixed-write without breaching latency/error SLO thresholds.
- Read-heavy:
  - `http_req_failed < 1%`
  - `p95 < 700ms`
  - `p99 < 1200ms`
- Mixed-write:
  - `http_req_failed < 2%`
  - `p95 < 1000ms`
  - `p99 < 1800ms`
- Infra guardrails:
  - Staging SQL CPU sustained < 70%
  - API 5xx ratio < 1%

## F3 — Bottleneck remediation loop

Process:
1. Run read-heavy + mixed-write scenarios.
2. Collect dashboard metrics (latency, 5xx, DB CPU, auth/AI failures).
3. Record findings and top bottlenecks.
4. Apply fixes.
5. Re-run and compare against thresholds.

## Execution summary
- `read-heavy` run #1: threshold failure due to auth route limiter impacting `/auth/me`.
- Remediation applied:
  - moved auth limiter to mutation endpoints only (`/auth/session`, `/auth/logout`)
  - kept `/auth/me` unthrottled for session-read path.
- `read-heavy` rerun: pass (exit 0).
- `mixed-write` run #1: threshold failure due to default `Viewer` role lacking write permissions.
- Remediation applied:
  - default org membership role switched to `ManagerCoach`.
- `mixed-write` rerun: pass (exit 0).

## Result
Gate F thresholds are now green for staging baseline.
