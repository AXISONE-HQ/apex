# EPIC 1 PR5 — Teams (API + DB)

This document describes the **implemented** Teams backend slice shipped in EPIC 1 PR5.

Design source-of-truth: `docs/v2/EPIC-1-PR5-TEAMS-DESIGN.md`

---

## Summary

Adds an org-scoped `teams` table and admin-only APIs to create, list, and update teams under:

- `POST  /admin/clubs/:orgId/teams`
- `GET   /admin/clubs/:orgId/teams?includeArchived=false`
- `PATCH /admin/clubs/:orgId/teams/:teamId`

Key features:
- Soft archive (`is_archived`) + list filtering
- Optional `head_coach_user_id` assignment with strict org membership + role validation
- Deterministic errors for duplicate teams (`team_already_exists`)

---

## RBAC

All endpoints require a session and are restricted to:

- Platform admin (`req.user.isPlatformAdmin === true`) OR
- Org-scoped OrgAdmin (`roles` includes `OrgAdmin` AND `orgScopes` contains the orgId)

ManagerCoach read access is **deferred**.

---

## Data Model

### Table: `teams`

Migration: `service/sql/migrations/014_epic1_teams.sql`

Notable constraints:
- `season_year` between `2000..2100`
- `training_frequency_per_week` in `0..14` (or null)
- `default_training_duration_min` in `15..600` (or null)
- `name` length `1..120`
- `home_venue` must be a JSON object when present
- Uniqueness: `(org_id, season_year, name)`

---

## API

Response shape convention:
- List endpoints return `{ "items": [...] }`
- Single-resource endpoints return `{ "item": { ... } }`

### Create team

`POST /admin/clubs/:orgId/teams`

Body:

```json
{
  "name": "U14 AAA",
  "season_year": 2026,
  "competition_level": "AAA",
  "age_category": "U14",
  "head_coach_user_id": "<uuid>|null",
  "training_frequency_per_week": 3,
  "default_training_duration_min": 90,
  "home_venue": {
    "name": "Main Arena",
    "address_line1": "123 King St",
    "address_line2": "Unit 4",
    "city": "Toronto",
    "state_province": "ON",
    "country": "CA",
    "postal_code": "M5V 1A1"
  }
}
```

Success: `201 { "item": <team row> }`

Errors:
- `400 { error: "bad_request" }` for unknown fields / validation
- `400 { error: "invalid_season_year" }`
- `400 { error: "invalid_home_venue" }`
- `400 { error: "invalid_head_coach_user_id" }`
- `400 { error: "head_coach_not_found" | "head_coach_not_member" | "head_coach_role_not_allowed" }`
- `403 { error: "forbidden" }`
- `409 { error: "team_already_exists" }`

### List teams

`GET /admin/clubs/:orgId/teams?includeArchived=false`

Query params:
- `includeArchived` (boolean) — accepts `true|false|1|0|yes|no|y|n`; default `false`

Success: `200 { "items": [ ... ] }`

Errors:
- `400 { error: "invalid_include_archived" }`
- `403 { error: "forbidden" }`

### Update team

`PATCH /admin/clubs/:orgId/teams/:teamId`

Allowlisted fields:
- `name`
- `season_year`
- `competition_level`
- `age_category`
- `head_coach_user_id` (nullable; set to `null` to unassign)
- `training_frequency_per_week`
- `default_training_duration_min`
- `home_venue`
- `is_archived`

Notes:
- Updates always set `updated_at = NOW()` in the UPDATE query.

Success: `200 { "item": <team row> }`

Errors:
- `400 { error: "bad_request" }` for unknown fields or `no_updatable_fields`
- `400 { error: "invalid_home_venue" }`
- `400 { error: "invalid_head_coach_user_id" }`
- `400 { error: "head_coach_not_found" | "head_coach_not_member" | "head_coach_role_not_allowed" }`
- `403 { error: "forbidden" }`
- `404 { error: "team_not_found" }`
- `409 { error: "team_already_exists" }`

---

## Legacy Compatibility

A temporary shim exists to keep older domain routes functioning:

- `service/src/repositories/teamsRepoLegacy.js`

The legacy domain route now imports from the shim explicitly.

TODO: deprecate/remove the legacy domain `/teams` route once the admin teams model is fully adopted.
