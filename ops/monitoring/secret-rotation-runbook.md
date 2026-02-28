# Apex v1 Secret Rotation Runbook (v1)

## Scope
- Services: `apex-staging-api`, `apex-prod-api`
- Secrets: `DATABASE_URL`, `BOOTSTRAP_TOKEN`, and any API credentials in Secret Manager

## Rotation cadence
- High-risk credentials: every 30-60 days
- Standard service credentials: every 90 days
- Immediate rotation on suspected compromise

## Rotation checklist
1. Create a new secret version in Secret Manager.
2. Validate secret format and connectivity in staging.
3. Deploy staging revision pinned to new secret version.
4. Run smoke tests (`/healthz`, `/readyz`, `/auth/me` unauth path expectations).
5. Promote to prod with approval gate.
6. Verify telemetry: 5xx ratio, latency, auth failures.
7. Disable prior secret version after stability window.

## Rollback
If failures occur after rotation:
1. Roll traffic back to last known-good Cloud Run revision.
2. Re-enable prior secret version if it was disabled.
3. Open incident ticket and record failing secret version ID.

## Evidence to capture
- Secret version IDs (old/new)
- Deploy revision names (staging/prod)
- Smoke test timestamps and outcomes
- Confirmation of old-version disable time
