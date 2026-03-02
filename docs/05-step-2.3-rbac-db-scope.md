# Apex v1 — Step 2.3: DB RBAC Resolution + Scoped Authorization (updated)

## Status
- **Step:** 2.3 Real RBAC resolution from DB + scope-aware checks
- **State:** 🚧 In progress (partial code + staging migrations done)
- **Date:** 2026-03-02

## Scope & Objectives
1. Persist role/permission assignments in Postgres (Cloud SQL) and resolve scopes from DB.
2. Enrich sessions with org/team/player scopes so platform, club admins, coaches, and parents are constrained correctly.
3. Provide tooling (CLI + seeds) to grant roles or scoped access without raw SQL.
4. Update the API/middleware/tests to enforce scopes end-to-end.

## Work completed
1. **Cloud SQL migration & seeds applied to staging**
   - Added migration `005_rbac_scopes.sql` (team_memberships, player_guardians, session scope columns).
   - Ran `npm run migrate`, `seedRbac`, `seedDomainDemo`, and new `seedScopedDemo` against `apex-staging-sql` using the `apex-db-ops` service account.
   - Demo users created: AxisOne admin, club admin, two scoped coaches, scoped parent.

2. **Session/auth pipeline upgrades**
   - Sessions now store `org_scopes`, `team_scopes`, `player_scopes`, and `platform_admin` flags.
   - `req.user` carries the validated scope context; platform admins bypass org restrictions, others are limited to their scopes.

3. **Scope-aware routes & repositories**
   - Teams/Players/Matches endpoints filter by org/team/player scopes; match creation/result submission checks both teams.
   - Helper `buildAccessContext` centralizes scope logic for routes.

4. **CLI + seeds for scoped assignments**
   - `src/db/seedScopedDemo.js` seeds sample scoped users/roles.
   - New CLI: `node src/admin/assignRole.js --email <user> --role <RoleCode> --org <orgId> [--team <teamId>] [--player <playerId> --guardian]` to grant roles + team/player scopes.

## Work remaining
1. **Scoped test harness (Step 2.4 follow-up)**
   - Adjust `/auth/session` tests to run against seeded DB or stub sessions.
   - Re-run `npm test` until green.

2. **Role-assignment automation polish**
   - Wrap CLI usage into README + (optional) npm script.
   - Add guardrails/reporting for invalid team/player IDs.

3. **Docs & domain rollout plan**
   - Document axisone.ca / app.axisone.ca / axi.axisone.ca hosting & DNS plan.
   - Capture how to run migrations/seeds safely (service-account + proxy steps).

4. **Frontend work (next up)**
   - New “Clubs directory” page (table with club name, state/province, country, pulse score + drill-in).

## Next actions (pending new GPT-5.3 session)
1. Finish scoped test harness updates.
2. Document assignRole CLI + staging migration steps in README/ops runbooks.
3. Draft domain/hosting rollout guide for axisone.ca/app/axi.
4. Kick off Clubs directory feature locally.
