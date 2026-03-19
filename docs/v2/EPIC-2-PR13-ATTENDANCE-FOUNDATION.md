# EPIC 2 — PR13 Attendance Foundation (Design Spec)

Status: **Design-only**

Goal: Add the first attendance model for players so organizations can record attendance per event and report on it by event or player.

---

## Scope

### In scope (PR13)
- Persistence model + migration for player attendance
- Admin endpoints to upsert attendance and list by event/player
- Org-scoped RBAC + validation
- Tests covering the full flow

### Out of scope
- Coach/parent-facing endpoints
- Bulk uploads, analytics, notifications, reason codes
- Automatic status logic

---

## Schema

New table: `player_attendance`
- `id UUID PRIMARY KEY`
- `org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- `player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE`
- `event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE`
- `status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused'))`
- `notes TEXT NULL CHECK (notes IS NULL OR char_length(notes) <= 500)`
- `recorded_by_user_id UUID NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Unique constraint: `(player_id, event_id)`
Indexes:
- `(org_id, event_id)`
- `(org_id, player_id)`
- `(org_id, status)`

**Event dependency:** Attendance relies on an existing `events` table. Confirm before implementation.

---

## API Contracts

### Upsert attendance
```
POST /admin/clubs/:orgId/events/:eventId/attendance
Body: { "player_id": "uuid", "status": "present", "notes": "optional" }
```
Behavior:
- Require session (PlatformAdmin or OrgAdmin scoped to `orgId`)
- Event must exist in org
- Player must exist in org
- Upsert by `(player_id, event_id)`
  - If row exists → update `status`, `notes`, `updated_at`
  - If row missing → insert new row (with `recorded_by_user_id` inferred from session if available)
- Trim optional strings; empty string → null
- Response: `{ "attendance": { ...row } }`

Errors:
- `400 { "error": "bad_request", "message": "player_id is required" }`
- `400 { "error": "bad_request", "message": "status must be one of: present, absent, late, excused" }`
- `403 { "error": "forbidden" }`
- `404 { "error": "event_not_found" }`
- `404 { "error": "player_not_found" }`

### List attendance by event
```
GET /admin/clubs/:orgId/events/:eventId/attendance
```
Behavior:
- Require RBAC
- Event must exist in org
- Return rows ordered by `created_at ASC`
- Response: `{ "attendance": [ ... ] }`

Errors: `403 forbidden`, `404 event_not_found`

### List attendance by player
```
GET /admin/clubs/:orgId/players/:playerId/attendance
```
Behavior:
- Require RBAC
- Player must exist in org
- Return rows ordered by `created_at ASC`
- Response: `{ "attendance": [ ... ] }`

Errors: `403 forbidden`, `404 player_not_found`

---

## Implementation Plan

1. **Confirm event dependency:** Ensure an events table/route already exists. If not, raise a blocker before coding.
2. **Migration:** create `player_attendance` per schema.
3. **Repository (`service/src/repositories/playerAttendanceRepo.js`):**
   - `upsertPlayerAttendance({ orgId, eventId, playerId, status, notes, recordedBy })`
   - `listAttendanceByEvent({ orgId, eventId })`
   - `listAttendanceByPlayer({ orgId, playerId })`
   - Thin SQL-only helpers with enforced ordering.
4. **Routes:**
   - Event attendance routes under `service/src/routes/admin/events.js` (upsert + event list).
   - Player attendance list route under `service/src/routes/admin/players.js`.
   - Enforce RBAC + org validation before repo calls.
5. **Tests (`service/test/admin-player-attendance.test.js`):**
   - Upsert success (PlatformAdmin & OrgAdmin)
   - Wrong-org denial
   - Missing event/player
   - Status validation & notes normalization
   - Upsert updates existing row
   - List by event/player (ordering, empty list behavior)

---

## Definition of Done
1. Spec committed.
2. Event dependency confirmed (or blocker reported).
3. Migration + repo + routes implemented.
4. Tests pass locally: `npm test -- test/admin-player-attendance.test.js`.
5. Full `npm test` passes.
6. No scope beyond attendance foundation added.
