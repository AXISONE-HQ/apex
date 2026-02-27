# Apex v1 — Gate F: Load Readiness Validation

## Status
- **Gate:** F
- **State:** 🚧 In progress
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

## Open items to close Gate F
- Execute both scenarios in staging and archive outputs.
- Attach summarized load report with pass/fail against thresholds.
- Log remediation actions (if any) and re-test results.
