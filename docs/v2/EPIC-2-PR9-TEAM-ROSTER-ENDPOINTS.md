# EPIC 2 — PR9 Team Roster Endpoints (Design Spec)

Status: **Design-only** (no code yet)

Goal: Add read-only roster surfaces so admins can fetch players by team or list unassigned players without relying on client-side filtering.

---

## Scope

### In scope (PR9)
- `GET /admin/clubs/:orgId/teams/:teamId/players`
- `GET /admin/clubs/:orgId/players/unassigned`
- Thin repo helpers for roster queries
- Route-layer RBAC + validation consistent with PR7/PR8
- Dedicated roster test suite

### Out of scope
- Filters, search, pagination
- Status query params
- Coach/parent-facing variants
- Bulk roster actions
- Any mutations

---

## API Contracts

### Team roster
```
GET /admin/clubs/:orgId/teams/:teamId/players
```
Behavior:
1. Require session
2. Allow PlatformAdmin or OrgAdmin scoped to `orgId`
3. Validate team by `(teamId, orgId)`
   - Missing team → 404 `{ "error": "team_not_found" }`
   - Cross-org team → 404 `{ "error": "team_not_found" }`
   - Archived team → 404 `{ "error": "team_not_found" }`
4. Fetch players where `org_id = orgId AND team_id = teamId`
5. Order by `last_name ASC, first_name ASC, created_at ASC`
6. Return `{ "players": [ ... ] }`

Notes:
- Valid active team with zero players returns `200 { "players": [] }`
- No filters beyond the team path param

### Unassigned players
```
GET /admin/clubs/:orgId/players/unassigned
```
Behavior:
1. Require session
2. Allow PlatformAdmin or OrgAdmin scoped to `orgId`
3. Wrong-org OrgAdmin → 403 `{ "error": "forbidden" }`
4. Fetch players where `org_id = orgId AND team_id IS NULL`
5. Order by `last_name ASC, first_name ASC, created_at ASC`
6. Return `{ "players": [ ... ] }`

---

## Repository Additions (`service/src/repositories/playersRepo.js`)
- `listPlayersByTeam(orgId, teamId)`
- `listUnassignedPlayersByOrg(orgId)`

Both helpers:
- Work in DB + memory modes
- Contain **only** the ordered SELECT logic
- No RBAC or team validation logic

---

## Routes

Preferred ownership:
- Team roster endpoint lives under `service/src/routes/admin/teams.js`
- Unassigned endpoint lives under `service/src/routes/admin/players.js`

If wiring conflicts, follow existing router structure without duplicating logic. both routes must enforce RBAC before hitting repos.

---

## Tests (`service/test/admin-team-rosters.test.js`)
Create a dedicated suite covering:

### Team roster
- PlatformAdmin success
- Scoped OrgAdmin success
- Wrong-org OrgAdmin → 403
- Missing team → 404 `team_not_found`
- Cross-org team → 404 `team_not_found`
- Archived team → 404 `team_not_found`
- Valid active team with zero players → `200 { players: [] }`
- Response includes only players assigned to that team
- Excludes unassigned players and players from other teams/orgs
- Ordering matches `last_name, first_name, created_at`

### Unassigned players
- PlatformAdmin success
- Scoped OrgAdmin success
- Wrong-org OrgAdmin → 403
- Response contains only players with `team_id IS NULL`
- Excludes assigned players and other orgs
- Valid empty list returns `200 { players: [] }`
- Ordering matches `last_name, first_name, created_at`

Seed data for tests should include:
- Two orgs
- Multiple teams per org (including one archived)
- Assigned players for multiple teams
- Unassigned players

---

## Definition of Done
PR9 is complete when:
1. Spec doc (this file) is committed
2. Repo helpers exist and return ordered data
3. Routes are wired with team validation before roster fetch
4. Dedicated roster tests pass locally (`npm test -- test/admin-team-rosters.test.js`)
5. Full `npm test` passes
6. No scope creep beyond read-only roster visibility
