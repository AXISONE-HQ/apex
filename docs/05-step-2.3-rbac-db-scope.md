# Apex v1 — Step 2.3: DB RBAC Resolution + Scoped Authorization

## Status
- **Step:** 2.3 Real RBAC resolution from DB + scope-aware checks
- **State:** ✅ Completed
- **Date:** 2026-02-26

## What was implemented

1. **Permission catalog module**
   - `service/src/config/permissions.js`
   - Central list of permission IDs used by RBAC/seed logic

2. **RBAC seeding for DB**
   - `service/src/db/seedRbac.js`
   - Seeds `permissions`, `roles`, and explicit `role_permissions`
   - Compatible with wildcard role grants (wildcards expanded at resolution time)

3. **DB-backed authz resolution repository**
   - `service/src/repositories/authzRepo.js`
   - Added:
     - `ensureDefaultOrgMembership({ userId })`
     - `resolveAuthzForUser({ userId, orgId })`
   - Resolves effective roles/permissions and org scopes from DB

4. **Session/login flow upgraded**
   - `service/src/routes/auth.js`
   - During login (`/auth/session`):
     - verifies identity
     - upserts user
     - seeds RBAC (when DB enabled)
     - ensures org membership
     - resolves effective roles/permissions from DB
     - creates session from resolved authz data

5. **Scope-aware authorization engine**
   - `service/src/authz/engine.js`
   - `can()` now evaluates:
     - permission grants
     - scope (`platform|organization|team|self`)
     - user scope context (`orgScopes`, `teamScopes`)

6. **Scope-aware middleware contract implemented**
   - `service/src/middleware/requirePermission.js`
   - Supports `requirePermission(permission, scopeResolver)`

7. **Scoped route example added**
   - `GET /secure/org/:orgId/teams`
   - Enforces `teams.page.view` + matching org scope

8. **Tests expanded**
   - `service/test/auth-contracts.test.js`
   - Added scoped authorization tests:
     - deny on org-scope mismatch
     - allow on org-scope match

## Validation
- `npm test` run successfully
- Result: **6/6 tests passing**

## Next step
**Step 2.4: Cloud SQL integration + first staging runtime deployment**

Planned deliverables:
1. Provision Cloud SQL Postgres (staging)
2. Wire `DATABASE_URL` via Secret Manager
3. Run migration + RBAC seed against staging DB
4. Deploy service to Cloud Run staging with DB connectivity
5. Validate `/healthz`, `/auth/session`, and scoped endpoint in staging
