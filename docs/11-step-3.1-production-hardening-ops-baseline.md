# Apex v1 — Step 3.1: Production Hardening + Operations Baseline

## Status
- **Step:** 3.1 Production hardening and ops baseline
- **State:** 🚧 In progress (initial hardening pass completed)
- **Date:** 2026-02-28

## What was completed in this pass

### 1) Health and readiness contract hardened
- Updated `service/src/server.js`:
  - `GET /healthz` now returns service metadata (`service`, `timestamp`, `status`).
  - Added `GET /readyz` with dependency-aware readiness checks:
    - Memory mode (no `DATABASE_URL`): returns `200 ready`.
    - Postgres mode (`DATABASE_URL` present): executes `select 1`; returns:
      - `200 ready` if DB responds
      - `503 not_ready` if DB check fails

### 2) Test coverage for health/readiness
- Updated `service/test/auth-contracts.test.js`:
  - Added `GET /healthz returns 200`
  - Added `GET /readyz returns 200`

### 3) Ops runbooks added
- Added `ops/monitoring/secret-rotation-runbook.md`
- Added `ops/monitoring/cloudsql-backup-restore-drill.md`

## Why this matters
- Cloud Run probes and external uptime checks now have explicit endpoints (`/healthz`, `/readyz`) with clear semantics.
- Readiness now validates DB dependency when running against Postgres, reducing false-positive "healthy" signals.
- The project now has explicit operational procedures for two critical reliability controls:
  - Secret rotation cadence and rollback
  - Backup restore drill execution and acceptance criteria

## Remaining items to close Step 3.1
1. **Monitoring policy expansion**
   - Add/validate alert on Cloud SQL connection pressure and error budget burn.
2. **Probe wiring verification**
   - Validate Cloud Run/uptime check usage of `/readyz` and `/healthz` in staging/prod.
3. **Restore drill execution evidence**
   - Run one staging restore drill and capture timestamps + RTO/RPO notes.

## Blockers / dependencies
- Requires GCP-side execution/validation for alert deployment and backup-restore drill evidence.
- No code blocker in repo at this time.
