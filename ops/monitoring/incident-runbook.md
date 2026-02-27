# Apex v1 Incident + Rollback Runbook (v1)

## Severity levels
- **SEV-1**: Full outage / critical data path unavailable
- **SEV-2**: Major degradation (latency, high 5xx)
- **SEV-3**: Minor degradation / non-critical failures

## Immediate triage checklist
1. Identify affected environment (`prod` vs `staging`).
2. Confirm latest deploy and revision:
   - `gcloud run services describe apex-prod-api --region us-central1 --project apex-v1-488611 --format='value(status.latestReadyRevisionName,status.traffic)'`
3. Check Cloud Build history for recent failed/successful deploys.
4. Check alerts:
   - `apex-prod-api 5xx ratio high`
   - `apex-prod-api latency p95 high`
   - `apex-prod-sql CPU high`

## Rollback criteria
Rollback if any one persists:
- 5xx > 3% for 10m
- p95 latency > 2x baseline for 15m
- critical auth/DB path broken after deploy

## Rollback command (Cloud Run)
Use previous known-good revision:
```bash
gcloud run services update-traffic apex-prod-api \
  --region us-central1 \
  --project apex-v1-488611 \
  --to-revisions REVISION_NAME=100
```

## Deploy freeze protocol
1. Pause manual prod trigger use until incident is stable.
2. Limit deploy permissions to incident owner.
3. Capture timeline in incident notes.

## Post-incident actions
1. Root cause analysis (technical + process)
2. Add guardrail test to CI/CD
3. Update alert thresholds if needed
4. Document lessons learned
