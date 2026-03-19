# Apex v1 — Gate E3: SLO Baseline and Alert Threshold Mapping

## Status
- **Gate:** E3
- **State:** ✅ Complete
- **Date:** 2026-02-27

## SLO Baseline (MVP)

### 1) Login flow (Google + email/password)
- **Availability SLO:** 99.5% successful login/session establishment over 30 days
- **Latency SLO:** p95 login/session API latency < 800ms

### 2) Roster load (`GET /players`, `GET /teams`)
- **Availability SLO:** 99.9% non-5xx responses over 30 days
- **Latency SLO:** p95 < 700ms in staging/prod baseline

### 3) Schedule load (`GET /matches`)
- **Availability SLO:** 99.9% non-5xx responses over 30 days
- **Latency SLO:** p95 < 700ms

### 4) Write operations (create/update)
- **Availability SLO:** 99.5% successful write response ratio over 30 days
- **Latency SLO:** p95 < 1000ms

## Alert Threshold Mapping (initial)

### Existing alerts leveraged
- `apex-staging-api uptime check failed`
- `apex-prod-api latency p95 high`
- `apex-prod-api 5xx ratio high`
- `apex-prod-api uptime check failed`
- `apex-prod-sql CPU high`

### New/updated mapping guidance
1. **Login health**
   - Alert when auth-failure metric (`apex_staging_auth_failures`) spikes above normal baseline for 5m.

2. **Latency guardrail**
   - Alert when `run.googleapis.com/request_latencies` p95 exceeds 800ms for auth and 700ms for roster/schedule for 10m.

3. **Error guardrail**
   - Alert when 5xx ratio > 1% for 10m on staging API.

4. **DB saturation**
   - Alert when staging SQL CPU sustained > 70% for 10m.

5. **AI error guardrail**
   - Alert when `apex_staging_ai_failures` exceeds baseline threshold for 10m.

## Operational Notes
- Start with conservative thresholds, then tune using 1–2 weeks of real traffic.
- Keep SLO review cadence weekly during MVP ramp.
