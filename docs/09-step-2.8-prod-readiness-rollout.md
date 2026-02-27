# Apex v1 — Step 2.8: Production Readiness Gate + First Controlled Prod Rollout

## Status
- **Step:** 2.8 Production gate and initial rollout
- **State:** ✅ Completed
- **Date:** 2026-02-26

## What was done

1. **Provisioned production database infrastructure**
   - Cloud SQL instance: `apex-prod-sql`
   - Mode: regional HA
   - Database: `apex_prod`
   - User: `apex_app`

2. **Configured production secret**
   - Secret: `apex-prod-database-url`
   - Value: Cloud SQL Unix socket `DATABASE_URL` for prod service

3. **Executed first controlled production rollout**
   - Trigger: `apex-prod-manual`
   - Build ID: `048c5f1d-a56a-4386-91c8-0d10fa8b5d37`
   - Approval gate: manual approval required and used
   - Final build status: `SUCCESS`

4. **Verified production service deployment**
   - Cloud Run service: `apex-prod-api`
   - Latest ready revision: `apex-prod-api-00001-lqw`
   - URL: `https://apex-prod-api-g6dsonn6nq-uc.a.run.app`

5. **Sanity endpoint checks in prod**
   - `POST /auth/session` with empty payload -> `400` (`idToken required`) ✅
   - `GET /auth/me` without session -> `401` (`unauthorized`) ✅

## Notes
- Prod trigger approval gate is working as intended.
- Deploy path (build -> image push -> Cloud Run deploy) is validated in production.

## Next step
**Step 3.1: Production hardening and operations baseline**

Planned:
1. Lock down unauthenticated access strategy (public/private endpoints policy).
2. Add Cloud Armor / edge rate limiting policy.
3. Add uptime checks + alert policies (error rate, latency, availability).
4. Add backup/restore drill for prod DB and document RTO/RPO.
5. Create runbook for deploy rollback and incident response.
