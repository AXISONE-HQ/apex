# EPIC 2 — PR14 Evaluations Foundation (Design Spec)

Status: **Design-only**

Goal: Introduce the first player evaluation model so admins/coaches can record structured notes for each player and event.

---

## Scope

### In scope (PR14)
- Evaluation table + migration
- Admin endpoints: create evaluation, list by player, patch evaluation
- Org-scoped RBAC consistent with prior slices
- Tests covering validation and CRUD flows

### Out of scope
- AI-generated evaluations
- Parent/athlete-facing views
- Rubric templates or scoring analytics
- Bulk upload or media attachments

---

## Schema

New table: `player_evaluations`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- `player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE`
- `event_id UUID NULL REFERENCES events(id) ON DELETE SET NULL`
- `author_user_id UUID NULL`
- `title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160)`
- `summary TEXT NULL CHECK (summary IS NULL OR char_length(summary) <= 1000)`
- `strengths TEXT NULL CHECK (strengths IS NULL OR char_length(strengths) <= 1000)`
- `improvements TEXT NULL CHECK (improvements IS NULL OR char_length(improvements) <= 1000)`
- `rating INT NULL CHECK (rating BETWEEN 1 AND 5)`
- `status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published'))`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Indexes:
- `(org_id, player_id, created_at DESC)`
- `(org_id, status)`
- `(org_id, event_id)`

---

## API Contracts

### Create evaluation
```
POST /admin/clubs/:orgId/players/:playerId/evaluations
Body: {
  "event_id": "uuid|null",
  "title": "Ball handling review",
  "summary": "optional",
  "strengths": "optional",
  "improvements": "optional",
  "rating": 4,
  "status": "published"
}
```
Behavior:
- Require session; allow PlatformAdmin or OrgAdmin scoped to `orgId`
- Player must exist in org
- If `event_id` provided → event must exist in org
- Title required (trimmed, 1..160)
- Optional strings trimmed; empty → null
- Rating optional, but if present must be integer 1..5
- Status defaults to `published`; must be `draft` or `published`
- Response: `{ "evaluation": { ... } }`

Errors:
- `400 bad_request` (missing title, invalid rating/status, etc.)
- `403 forbidden`
- `404 player_not_found`
- `404 event_not_found`

### List evaluations by player
```
GET /admin/clubs/:orgId/players/:playerId/evaluations
```
Behavior:
- RBAC as above
- Player must exist in org
- Return evaluations ordered by `created_at DESC`
- Response: `{ "evaluations": [ ... ] }`

Errors: `403 forbidden`, `404 player_not_found`

### Patch evaluation
```
PATCH /admin/clubs/:orgId/players/:playerId/evaluations/:evaluationId
```
Behavior:
- RBAC as above
- Player + evaluation must exist for the org
- Strict allowlist; reject unknown fields / empty body
- Optional strings trimmed; empty → null
- If status provided, must be `draft` or `published`
- If rating provided, must remain integer 1..5
- If event_id provided, validate event belongs to the org
- Response: `{ "evaluation": { ... } }`

Errors:
- `400 bad_request` (empty body, invalid field)
- `403 forbidden`
- `404 player_not_found`
- `404 evaluation_not_found`
- `404 event_not_found`

---

## Implementation Plan

### Migration
- Add `player_evaluations` table per schema.

### Repository (`service/src/repositories/playerEvaluationsRepo.js`)
Functions:
- `createPlayerEvaluation({...})`
- `listEvaluationsByPlayer({ orgId, playerId })`
- `getEvaluationByIdAndPlayer({ evaluationId, playerId, orgId })`
- `updatePlayerEvaluation({ evaluationId, playerId, orgId, patch })`

### Routes (extend `service/src/routes/admin/players.js`)
Endpoints:
- POST `/admin/clubs/:orgId/players/:playerId/evaluations`
- GET `/admin/clubs/:orgId/players/:playerId/evaluations`
- PATCH `/admin/clubs/:orgId/players/:playerId/evaluations/:evaluationId`

Responsibilities:
- Enforce RBAC + org-scoped player/event checks
- Normalize optional fields
- Return consistent error shapes

### Tests (`service/test/admin-player-evaluations.test.js`)
Cover:
- Create success (PlatformAdmin + OrgAdmin)
- Wrong-org denial
- Missing player/event errors
- Title/rating/status validation
- List ordering by `created_at DESC`
- Patch success
- Patch empty body/unknown field errors
- Evaluation not found path
- Event validation during patch
- Optional string normalization

---

## Definition of Done
1. Spec committed.
2. Migration + repo + routes implemented.
3. `npm test -- test/admin-player-evaluations.test.js` passes.
4. Full `npm test` passes.
5. No scope beyond evaluation CRUD introduced.
