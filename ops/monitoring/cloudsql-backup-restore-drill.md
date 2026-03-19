# Apex v1 Cloud SQL Backup + Restore Drill (v1)

## Objective
Prove we can restore production-like data within acceptable RTO/RPO bounds.

## Target
- Primary: `apex-prod-sql`
- Drill restore target (staging project resources): temporary instance or database clone

## Frequency
- Monthly for staging drill
- Quarterly for production-style rehearsal

## Drill procedure
1. Confirm latest successful backup snapshot exists.
2. Record baseline time (`T0`).
3. Restore backup to temporary target.
4. Run schema integrity checks (tables, key indexes, migration version).
5. Run application connectivity checks (`/readyz` against restored target, read-only smoke queries).
6. Record completion time (`T1`) and compute restore duration.
7. Tear down temporary restore resources.

## Acceptance criteria
- Restore completes within target RTO (proposed: <= 60 minutes)
- Data recency is within target RPO (proposed: <= 24 hours)
- Application can establish DB connectivity and basic reads succeed

## Evidence template
- Date/time:
- Operator:
- Backup ID / timestamp:
- Restore target:
- `T0` / `T1`:
- Duration:
- RTO met (Y/N):
- RPO met (Y/N):
- Notes / follow-ups:
