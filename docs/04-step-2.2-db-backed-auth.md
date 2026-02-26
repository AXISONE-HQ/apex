# Apex v1 — Step 2.2: DB-backed Auth Persistence

## Status
- **Step:** 2.2 Replace in-memory auth storage with DB-backed repositories
- **State:** ✅ Completed (with safe local fallback)
- **Date:** 2026-02-26

## What was implemented

1. **Postgres schema migration added**
   - File: `service/sql/migrations/001_auth_core.sql`
   - Includes tables:
     - `users`
     - `organizations`
     - `memberships`
     - `roles`
     - `permissions`
     - `role_permissions`
     - `membership_roles`
     - `sessions`

2. **Database client layer added**
   - `service/src/db/client.js`
   - Uses `pg` and `DATABASE_URL`

3. **Migration runner added**
   - `service/src/db/migrate.js`
   - npm script: `npm run migrate`

4. **Repository layer added**
   - `service/src/repositories/usersRepo.js`
   - `service/src/repositories/sessionsRepo.js`
   - Behavior:
     - Uses Postgres when `DATABASE_URL` exists
     - Falls back to in-memory mode for local/dev tests

5. **Auth routes/server updated to use repositories**
   - `/auth/session` now persists/retrieves via repository layer
   - `/auth/logout` destroys persisted session
   - session middleware resolves user from stored session

## Validation
- `npm test` executed successfully
- Result: **4/4 tests passing**

## Notes
- This step introduces DB persistence scaffolding and migration structure.
- Role/permission resolution is still simple default assignment and should be expanded in next step.

## Next step
**Step 2.3: Real RBAC resolution from DB + scoped membership loading**

Planned deliverables:
1. Seed roles/permissions in DB
2. Resolve effective roles from `membership_roles`
3. Resolve effective permissions from `role_permissions`
4. Support org/team scope-aware checks in authz engine
5. Add integration tests for multi-role and scoped authorization
