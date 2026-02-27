# Apex v1 — Step 6.0 Production Handover Checklist

## Daily Ops Checklist
- [ ] Check API uptime/latency/error dashboards
- [ ] Check auth failure trend
- [ ] Check AI failure trend
- [ ] Check Cloud SQL CPU and connections
- [ ] Review overnight alerts and unresolved incidents

## Weekly Ops Checklist
- [ ] Review SLO compliance (login, roster, schedule, writes)
- [ ] Review load/capacity headroom
- [ ] Review incident log and action items
- [ ] Review cost trend vs budget
- [ ] Approve/deny next pilot expansion wave

## Change Control
- [ ] All production changes tied to commit + doc note
- [ ] Rollback command verified before release
- [ ] Post-deploy smoke tests executed

## Incident Essentials
- [ ] Incident owner assigned
- [ ] Mitigation ETA communicated
- [ ] Root cause documented
- [ ] Preventive action scheduled

## Pilot Expansion Gate
Allow new clubs only if all conditions pass:
- [ ] No P0/P1 unresolved incidents
- [ ] Last 7 days SLOs within target
- [ ] Capacity headroom acceptable
- [ ] Support/onboarding bandwidth available
