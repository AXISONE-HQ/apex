# Apex v1 — Step 4.1: Product Feature Delivery Kickoff (Domain MVP)

## Status
- **Step:** 4.1 Domain MVP kickoff
- **State:** ✅ Completed
- **Date:** 2026-02-26

## What was completed

### 1) Domain data model kickoff
Added migration:
- `service/sql/migrations/002_domain_mvp.sql`

New domain tables:
- `teams`
- `players`
- `matches`
- `match_results`

### 2) Migration engine upgraded
Updated migration runner to apply **all SQL files in order** from `sql/migrations/` (not only `001_auth_core.sql`).

### 3) MVP domain API scaffolding
Added route modules:
- `service/src/routes/domain/teams.js`
- `service/src/routes/domain/players.js`

Wired in server:
- `GET /teams`
- `POST /teams`
- `GET /players`
- `POST /players`

All routes are protected by session + permission middleware.

### 4) Test coverage expanded
Updated `service/test/auth-contracts.test.js` with domain checks:
- team create success with role permission
- player create forbidden without required permission

## Validation
- `npm test` run completed
- Result: **8/8 tests passing**

## Notes
- Current domain route storage is in-memory scaffold to move quickly.
- Next step will connect domain routes to Postgres repositories and org/team-scoped queries.

## Next step
**Step 4.2: Domain persistence + CRUD completion**

Planned:
1. Implement DB repositories for teams/players/matches.
2. Replace in-memory route handlers with DB-backed handlers.
3. Add update/delete endpoints with RBAC checks.
4. Add integration tests for org scope and data integrity.
5. Seed sample org/team/player data for staging demo.
