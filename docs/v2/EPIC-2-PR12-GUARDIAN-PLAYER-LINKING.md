# EPIC 2 — PR12 Guardian ↔ Player Linking (Design Spec)

Status: **Design-only**

Goal: Add the first guardian-to-player linking model so organizations can associate guardians with players under the same club.

---

## Scope

### In scope (PR12)
- Link table between guardians and players
- Admin endpoints to link/unlink guardians ↔ players
- Admin list endpoints (guardians for a player, players for a guardian)
- Org-scoped validation + RBAC
- Tests covering all behaviors

### Out of scope
- Parent login, invites, messaging
- Custody/priority rules
- Bulk linking
- Guardian-facing APIs

---

## Schema

New table: `guardian_players`
- `guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE`
- `player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE`
- `org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Primary key: `(guardian_id, player_id)`

Indexes:
- `(org_id, player_id)`
- `(org_id, guardian_id)`

Rule: links only valid when guardian/org and player/org match. Enforce in route layer via org-safe lookups.

---

## API Contracts

### Link guardian to player
```
POST /admin/clubs/:orgId/players/:playerId/guardians
Body: { "guardian_id": "uuid" }
```
Behavior:
- Require session (PlatformAdmin or OrgAdmin scoped to `orgId`)
- Validate player exists in org
- Validate guardian exists in org
- Link is idempotent; if already linked, return success
- Response: `{ "ok": true }`

Errors:
- `400 { "error": "bad_request", "message": "guardian_id is required" }`
- `403 { "error": "forbidden" }`
- `404 { "error": "player_not_found" }`
- `404 { "error": "guardian_not_found" }`

### Unlink guardian from player
```
DELETE /admin/clubs/:orgId/players/:playerId/guardians/:guardianId
```
Behavior:
- Same RBAC/validation as link
- Removing non-existent link is still 200 `{ "ok": true }`
- Missing player/guardian still return respective 404s

### List guardians for player
```
GET /admin/clubs/:orgId/players/:playerId/guardians
```
Behavior:
- Require RBAC
- Player must exist in org
- Return guardians linked to player ordered by `last_name ASC, first_name ASC, created_at ASC`
- Response: `{ "guardians": [ ... ] }`

Errors:
- `403 forbidden`
- `404 player_not_found`

### List players for guardian
```
GET /admin/clubs/:orgId/guardians/:guardianId/players
```
Behavior:
- Require RBAC
- Guardian must exist in org
- Return linked players ordered by `last_name ASC, first_name ASC, created_at ASC`
- Response: `{ "players": [ ... ] }`

Errors:
- `403 forbidden`
- `404 guardian_not_found`

---

## Implementation Plan

### Migration
- Add `guardian_players` table and indexes as described.

### Repository (`service/src/repositories/guardianPlayersRepo.js`)
Add helpers:
- `linkGuardianToPlayer({ orgId, guardianId, playerId })`
- `unlinkGuardianFromPlayer({ orgId, guardianId, playerId })`
- `listGuardiansByPlayer({ orgId, playerId })`
- `listPlayersByGuardian({ orgId, guardianId })`
- Optional helper `isGuardianLinkedToPlayer` if needed

Rules:
- Thin SQL only, no RBAC/validation
- Ordering enforced in SQL for list helpers

### Routes
Preferred split:
- Player-owned routes (`POST/DELETE/GET` under `/players/:playerId/...`) live in `service/src/routes/admin/players.js`
- Guardian-owned listing (`/guardians/:guardianId/players`) in `service/src/routes/admin/guardians.js`

Shared responsibilities:
- Validate RBAC (PlatformAdmin or scoped OrgAdmin)
- Verify player/guardian exist in org via repo helpers
- Reject cross-org linking
- Consistent error shapes (`player_not_found`, `guardian_not_found`, `forbidden`, `bad_request`)

### Tests (`service/test/admin-guardian-player-links.test.js`)
Must cover:
- Link success (PlatformAdmin + OrgAdmin)
- Wrong-org RBAC denial
- Missing player/guardian cases
- Cross-org isolation
- Idempotent linking/unlinking
- List guardians for player
- List players for guardian
- Ordering correctness

---

## Definition of Done
1. Spec doc committed.
2. Migration + repo + routes implemented.
3. Tests pass locally: `npm test -- test/admin-guardian-player-links.test.js`.
4. Full `npm test` passes.
5. No scope beyond guardian-player linking introduced.
