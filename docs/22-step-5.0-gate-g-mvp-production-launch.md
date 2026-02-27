# Apex v1 — Gate G: MVP Production Launch

## Status
- **Gate:** G
- **State:** 🚧 In progress (G1 complete)
- **Date:** 2026-02-27

## G1 Production deployment readiness (completed)
- Backend prod deployed: `https://apex-prod-api-153079040450.us-central1.run.app`
- Frontend prod deployed: `https://apex-v1-488611.web.app`
- Prod API env parity baseline applied:
  - `NODE_ENV=production`
  - `CORS_ALLOWED_ORIGINS=https://apex-v1-488611.web.app`
  - `AUTH_COOKIE_SAMESITE=none`
  - `AUTH_COOKIE_SECURE=true`
  - `DATABASE_URL` from `apex-prod-database-url`
- DNS/SSL baseline validated via managed default domains (`*.web.app`, `*.run.app`)

## Remaining to close Gate G

### G2 Controlled rollout
- Select initial pilot clubs
- Document rollback plan
- Prepare launch-day monitoring runbook

### G3 Post-launch stabilization
- Schedule 24h and 7d post-launch reviews
- Confirm incident ownership
- Prioritize immediate performance backlog
