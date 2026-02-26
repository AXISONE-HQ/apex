# Apex v1 — Step 1: Environment Foundation (dev/staging/prod)

## Status
- **Step:** 1.1 Environment layout + naming + isolation baseline
- **State:** ✅ Completed
- **Date:** 2026-02-26

## Goal
Define a production-ready multi-environment baseline before building app features.

## Environment model
We will use **three fully isolated environments**:

- **dev**: fast iteration, lower cost, safe for frequent deploys
- **staging**: production-like validation + release candidate testing
- **prod**: hardened environment for real users

## Isolation rules
Each environment gets dedicated resources and identities:

- Cloud Run services
- Cloud SQL instance/database
- Memorystore Redis
- Pub/Sub topics/subscriptions
- Secrets in Secret Manager
- Service accounts and IAM bindings
- Domains/subdomains
- Monitoring dashboards and alert policies

No shared databases or shared secrets across environments.

## Naming convention
Project ID: `apex-v1-488611`

Resource naming pattern:
- `apex-{env}-{component}`

Examples:
- Cloud Run API: `apex-dev-api`, `apex-staging-api`, `apex-prod-api`
- Worker service: `apex-dev-worker`, `apex-staging-worker`, `apex-prod-worker`
- Redis: `apex-dev-redis`, `apex-staging-redis`, `apex-prod-redis`
- SQL instance: `apex-dev-sql`, `apex-staging-sql`, `apex-prod-sql`
- Service account: `apex-{env}-runtime@apex-v1-488611.iam.gserviceaccount.com`
- Artifact Registry repo: `apex-{env}`

## Deployment branch policy
- `develop` -> deploys to **dev**
- `main` -> deploys to **staging**
- production deploy requires manual promotion from staging artifact

## Security baseline by environment
- **dev:** minimal external exposure, test data only
- **staging:** production-like controls, scrubbed data only
- **prod:** strict IAM, Cloud Armor, hardened secrets/processes, audit-first

## Deliverables produced in this step
1. Multi-env architecture decision recorded
2. Naming convention recorded
3. Isolation and branch deployment policy recorded

## Next step
**Step 1.2: Authentication + authorization blueprint**
- Google OAuth login + email/password login flow
- Token/session strategy
- RBAC model for pages/cards/functions
- Initial role and permission matrix
