# Apex v1 On-call Workflow (v1)

## Notification routing
- Primary channel: Email
- Destination: `fred@axisone.ca`
- Policies wired:
  - `apex-prod-api 5xx ratio high`
  - `apex-prod-api latency p95 high`
  - `apex-prod-sql CPU high`

## Triage SLA
- Acknowledge within 10 minutes.
- Classify severity within 15 minutes.
- Start mitigation within 20 minutes for SEV-1/SEV-2.

## Escalation
1. Primary on-call acknowledges alert.
2. If unresolved in 20 minutes, escalate to backup engineer.
3. If customer impact sustained >30 minutes, declare incident and run rollback criteria from runbook.

## First-response checklist
1. Confirm active alert policy and metric panel.
2. Check latest deploy/revision in Cloud Run.
3. Check Cloud SQL CPU and connection pressure.
4. Roll back if thresholds from incident runbook are met.
5. Post incident summary in internal channel/docs.

## Weekly ops rhythm
- Review alert history every Monday.
- Tune thresholds if noisy.
- Test one rollback command monthly in staging.
