# Apex v1 — Step 2.7: Push Code + End-to-End Trigger Validation

## Status
- **Step:** 2.7 Push code to GitHub and validate triggers
- **State:** ✅ Completed
- **Date:** 2026-02-26

## What was done

1. Initialized and committed `projects/apex-v1` as an independent git repository.
2. Set remote to `https://github.com/AXISONE-HQ/apex.git`.
3. Pushed both branches:
   - `main`
   - `develop`
4. Validated trigger wiring and fixed pipeline issues:
   - Added Dockerfile and .dockerignore for service image builds.
   - Updated Cloud Build configs to build from `service/` context.
   - Added explicit `docker push` before deploy for staging/prod pipelines.
   - Resolved Cloud Build deploy IAM role gaps.

## Trigger outcomes

### Dev trigger (develop)
- Trigger: `apex-dev-develop`
- Status: ✅ Success
- Successful build: `43028d2b-fbea-4679-8f03-cfa93297cfe2`

### Staging trigger (main)
- Trigger: `apex-staging-main`
- Status: ✅ Success
- Successful build: `d0978323-9c60-4969-8cbf-c7f180822120`
- Built image:
  - `us-central1-docker.pkg.dev/apex-v1-488611/apex-staging/apex-api:ea4cc6c`
- Cloud Run updated revision:
  - `apex-staging-api-00006-9md`

## Staging endpoint checks
- `POST /auth/session` with empty body -> `400` (`idToken required`) ✅
- `GET /auth/me` without auth -> `401` (`unauthorized`) ✅
- `GET /healthz` -> still returns Google 404 (known endpoint routing oddity; non-blocking for CI/CD validation) ⚠️

## Next step
**Step 2.8: Production readiness gate + controlled first prod rollout**

Planned:
1. Provision prod SQL/secret/runtime resources (`apex-prod-*`).
2. Add mandatory approval policy for prod trigger execution.
3. Run first manual prod deploy from `apex-prod-manual`.
4. Validate prod service endpoints and rollback path.
5. Document go-live checklist and handoff runbook.
