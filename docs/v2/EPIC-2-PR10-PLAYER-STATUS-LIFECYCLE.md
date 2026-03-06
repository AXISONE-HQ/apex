# EPIC 2 — PR10 Player Status Lifecycle (Design Spec)

Status: **Design-only** (pre-implementation)

Goal: Introduce dedicated lifecycle endpoints to activate or deactivate players with explicit intent, RBAC, and idempotent behavior. PATCH already permits status changes, but these endpoints clarify operational workflows (e.g., removing a lapsed player from active rosters) and prepare for status-aware features later.

---

## Scope

### In scope (PR10)
- `POST /admin/clubs/:orgId/players/:playerId/deactivate`
- `POST /admin/clubs/:orgId/players/:playerId/activate`
- Explicit RBAC + org checks
- Idempotent transitions
- Tests covering success paths, RBAC denial, not-found, and no-side-effect guarantees

### Out of scope (PR10)
- Schema changes
- Delete/archive endpoints
- Reason codes or audit logging
- Bulk status updates
- Automatic team unassignment

---

## Domain Rules

- Status values remain `active` | `inactive`.
- **Activate** → sets `status = 'active'`.
- **Deactivate** → sets `status = 'inactive'`.
- Idempotent: calling activate on an already-active player (or deactivate on inactive) returns 200 with no change.
- Team membership is untouched; status toggles do **not** affect `team_id`.

---

## API Contracts

### Deactivate Player
```
POST /admin/clubs/:orgId/players/:playerId/deactivate
```
Behavior:
- Require session
- Allow PlatformAdmin or OrgAdmin scoped to `orgId`
- Load player by `(playerId, orgId)` → 404 if missing
- If already `inactive`, return 200 with existing payload
- Otherwise set `status = 'inactive'`, bump `updated_at`
- Response: `{ "player": <player row> }`

Errors:
- `403 { "error": "forbidden" }`
- `404 { "error": "player_not_found" }`

### Activate Player
```
POST /admin/clubs/:orgId/players/:playerId/activate
```
Behavior mirrors deactivate:
- RBAC + player lookup by `(playerId, orgId)`
- Idempotent when already `active`
- Otherwise set `status = 'active'`, bump `updated_at`
- Response: `{ "player": <player row> }`

Errors:
- `403 { "error": "forbidden" }`
- `404 { "error": "player_not_found" }`

**Request body:** none required. Endpoints may ignore/forbid bodies but do not rely on payload fields.

---

## Implementation Plan

### Repository (service/src/repositories/playersRepo.js)
Add `setPlayerStatus({ playerId, orgId, status })`:
- SQL: `UPDATE players SET status = $3, updated_at = NOW() WHERE id = $1 AND org_id = $2 RETURNING ...`
- Returns `null` when no matching player (for 404 handling)
- No RBAC or validation inside repo

### Routes (service/src/routes/admin/players.js)
- Add POST handlers for `/activate` and `/deactivate`
- Enforce RBAC (PlatformAdmin or scoped OrgAdmin)
- Use existing `(player_id, org_id)` lookup or rely on repo results for 404s
- Ensure response shape `{ "player": ... }`
- Keep logic thin: route decides desired status, calls repo helper, returns normalized row

### Tests (service/test/admin-player-status.test.js)
Required coverage:
- PlatformAdmin can activate/deactivate
- Org-scoped OrgAdmin can activate/deactivate within org
- Wrong-org OrgAdmin → 403 forbidden
- Missing player → 404 player_not_found
- Idempotent behavior (double activate/deactivate)
- Status transitions update `updated_at`
- Status transitions do **not** change `team_id` or other fields
- Deactivate-followed-by-activate returns player to active with same team assignment

---

## Definition of Done
PR10 is complete when:
1. Both endpoints exist with RBAC + idempotent behavior.
2. Repository helper `setPlayerStatus` is org-safe and used by routes.
3. `team_id` and other player fields remain untouched during status changes.
4. Tests cover success, RBAC denial, 404, idempotency, and no-side-effect guarantees.
5. `npm test -- test/admin-player-status.test.js` and full `npm test` pass locally; CI green.

---

## Implementation Handoff Prompt
```
Task: Implement PR10 – Player Status Lifecycle for Apex backend.
Spec: docs/v2/EPIC-2-PR10-PLAYER-STATUS-LIFECYCLE.md
Endpoints: POST /admin/clubs/:orgId/players/:playerId/activate, POST /admin/clubs/:orgId/players/:playerId/deactivate
Constraints: No schema changes, validation/RBAC in route layer, repositories remain thin, lookups scoped by (player_id, org_id), error shapes 403/404 as per EPIC 1, idempotent behavior required, status toggles must not modify team_id.
Tests: Cover PlatformAdmin + OrgAdmin success, wrong-org denial, player_not_found, idempotent double calls, updated_at changes, team_id unchanged.
Done when: endpoints + tests + full suite green.
```

---

## Next Steps
After PR9 (Team Roster Endpoints) and PR10 merge, proceed to PR11 – Parent / Guardian Foundation to keep the player/roster domain cohesive before branching into attendance or evaluations.
