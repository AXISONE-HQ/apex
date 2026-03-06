# EPIC 1 — PR5 TEAMS (Design Spec)

Status: **Design-only** (no code changes)

Goal: Introduce a minimal, extensible **Teams** domain model scoped to an Organization (club) and expose strict **OrgAdmin** APIs to create/list/update teams.

This PR is intentionally **not** modeling schedules, events, rosters, or coach workflows beyond a single optional `head_coach_user_id` assignment.

---

## Scope

### In scope (PR5)

- Database table: `teams`
- Admin API endpoints (Org scoped):
  - Create team: `POST /admin/clubs/:orgId/teams`
  - List teams: `GET /admin/clubs/:orgId/teams`
  - Update team: `PATCH /admin/clubs/:orgId/teams/:teamId`
- Strict request validation (allowlist fields only)
- RBAC enforcement (platform + org scope)
- Coach assignment validation (`head_coach_user_id`)
- Minimal tests for correctness + security

### Explicitly out of scope (PR5)

- Team rosters (players per team)
- Season schedules / practices / games
- Attendance & events integration
- Multiple coaches (assistant coaches)
- Invitations/workflow for joining teams
- Public/non-admin team browsing
- UI changes (unless already planned separately)

---

## Data Model

### Table: `teams`

**Team core**
- `id` **UUID** primary key (generated server-side)
- `org_id` **UUID** (required) — references `organizations.id`
- `name` **TEXT** (required) — e.g. `"U14 AAA"`
- `season_year` **INT** (required) — 4-digit year (e.g. `2026`)
- `competition_level` **TEXT** (optional) — e.g. `"AAA" | "AA" | "A" | "Recreational"` (free text v1)
- `age_category` **TEXT** (optional) — e.g. `"U14"`
- `is_archived` **BOOLEAN** (required) — default `false`

**Operations**
- `head_coach_user_id` **UUID** (optional at creation; assignable later; nullable)
- `training_frequency_per_week` **INT** (optional) — range `0..14`
- `default_training_duration_min` **INT** (optional) — recommended range `15..600` (see validation)
- `home_venue` **JSONB** (optional) — allowlist keys only (see below)

**Metadata**
- `created_at` **TIMESTAMPTZ** default now()
- `updated_at` **TIMESTAMPTZ** default now()

**Uniqueness**
- Unique within an org + season: `UNIQUE (org_id, season_year, name)`

#### `home_venue` JSON schema (allowlist)

`home_venue` is optional; when present it must be an object with only these keys:

- `name`
- `address_line1`
- `address_line2`
- `city`
- `state_province`
- `country`
- `postal_code`

All values should be strings (nullable/omitted allowed). No additional keys.

---

## Coach Assignment Rule (v1)

When `head_coach_user_id` is provided (create or patch):

- The user **must be a member of the org** (`memberships.org_id = :orgId`).
- The member must have role code **ManagerCoach** OR **OrgAdmin**.
- If the user does not exist, is not a member, or has wrong role → **400** with a clear error.

Suggested error codes:
- `invalid_head_coach_user_id`
- `head_coach_not_found`
- `head_coach_not_member`
- `head_coach_role_not_allowed`

Explicitly allowed: `head_coach_user_id: null` on PATCH to **unassign** the current head coach.

Note: This validates org membership/role, not whether the user has an active session.

---

## RBAC / Authorization

### Actors

- **Platform admin**: full access (cross-org)
- **OrgAdmin (Club Director)**: can create/list/update teams **within their org scope**
- **ManagerCoach**: optional read-only access (can defer to later PR; see below)
- Everyone else: no access

### RBAC matrix (PR5)

| Role | Create | List | Update |
|------|--------|------|--------|
| Platform admin | ✅ any org | ✅ any org | ✅ any org |
| OrgAdmin | ✅ scoped org | ✅ scoped org | ✅ scoped org |
| ManagerCoach | (defer) | (defer / optional ✅ scoped org) | ❌ |
| Other / unauth | ❌ | ❌ | ❌ |

**Recommendation:** Keep PR5 strict: only Platform admin + OrgAdmin for all three endpoints. Add ManagerCoach list access in a follow-up PR if needed.

---

## API Contracts

All endpoints are under the existing service API.

Response shape convention (v1):
- Collection endpoints return `{ "items": [...] }`.
- Single-resource endpoints return `{ "item": { ... } }`.

Base path variables:
- `orgId` — organization UUID
- `teamId` — team UUID

### 1) Create Team

`POST /admin/clubs/:orgId/teams`

#### Request body (v1)

```json
{
  "name": "U14 AAA",
  "season_year": 2026,
  "competition_level": "AAA",
  "age_category": "U14",
  "head_coach_user_id": "uuid-or-null",
  "training_frequency_per_week": 3,
  "default_training_duration_min": 90,
  "home_venue": {
    "name": "Main Arena",
    "address_line1": "123 King St",
    "city": "Toronto",
    "state_province": "ON",
    "country": "CA",
    "postal_code": "M5V 1A1"
  }
}
```

Notes:
- Unknown fields must be rejected (400).
- `head_coach_user_id` may be `null` or omitted.

#### Success response (201)

```json
{
  "item": {
    "id": "<uuid>",
    "org_id": "<org uuid>",
    "name": "U14 AAA",
    "season_year": 2026,
    "competition_level": "AAA",
    "age_category": "U14",
    "head_coach_user_id": "<uuid>|null",
    "training_frequency_per_week": 3,
    "default_training_duration_min": 90,
    "home_venue": { "name": "Main Arena", "city": "Toronto" },
    "created_at": "<iso>",
    "updated_at": "<iso>"
  }
}
```

#### Error responses

- `400 bad_request` with `error.code` + message for validation failures
- `409 team_already_exists` when violating `UNIQUE (org_id, season_year, name)`
- `403 forbidden` if org scope missing
- `401 unauthorized` if no session (when requireSession is enforced)


### 2) List Teams

`GET /admin/clubs/:orgId/teams`

Query params:
- `includeArchived` (boolean, optional) — default `false` (archived teams excluded unless explicitly requested)

#### Success response (200)

```json
{
  "items": [
    {
      "id": "<uuid>",
      "org_id": "<org uuid>",
      "name": "U14 AAA",
      "season_year": 2026,
      "competition_level": "AAA",
      "age_category": "U14",
      "head_coach_user_id": null,
      "training_frequency_per_week": 3,
      "default_training_duration_min": 90,
      "home_venue": null,
      "created_at": "<iso>",
      "updated_at": "<iso>"
    }
  ]
}
```

Ordering suggestion: `season_year DESC, name ASC, created_at DESC`.


### 3) Update Team

`PATCH /admin/clubs/:orgId/teams/:teamId`

#### Allowlist patch fields

Only these keys are permitted (unknown keys → 400):

- `name`
- `season_year`
- `competition_level`
- `age_category`
- `head_coach_user_id`
- `training_frequency_per_week`
- `default_training_duration_min`
- `home_venue`
- `is_archived` (boolean; supports archive/unarchive)

#### Request example

```json
{
  "head_coach_user_id": "<uuid>",
  "training_frequency_per_week": 4
}
```

#### Success response (200)

All updates must set `updated_at = NOW()` in the UPDATE query.

```json
{ "item": { "id": "<uuid>", "org_id": "<uuid>", "name": "...", "updated_at": "<iso>" } }
```

#### Not found behavior

- If `teamId` does not exist in the given org: `404 team_not_found`.

---

## Validation Rules

### `name`
- required on create
- trimmed string
- min length: 1
- max length: 120 (recommended)

### `season_year`
- required on create
- integer
- must be **YYYY**
- allowed range: **2000..2100** (per CTO guidance)

Suggested errors:
- `invalid_season_year`

### `training_frequency_per_week`
- integer
- allowed range: **0..14**

Suggested errors:
- `invalid_training_frequency_per_week`

### `default_training_duration_min`
- integer
- recommended range: **15..600** (explicitly validate to avoid nonsense)

Suggested errors:
- `invalid_default_training_duration_min`

### `home_venue`
- if present: must be object
- allowlist keys only
- values must be strings (or null)

Suggested errors:
- `invalid_home_venue`

---

## Database Migration (PR5)

Add a new migration creating `teams`.

Minimal constraints / indexes:

- Primary key: `id`
- Foreign key: `org_id` references `organizations(id)`
- Unique: `UNIQUE (org_id, season_year, name)`
- Index: `(org_id, season_year)` for common list queries
- Index: `(org_id, head_coach_user_id)` (optional; useful for coach dashboards later)

`updated_at` strategy (explicit):
- **No trigger in v1.** Set `updated_at = NOW()` directly in UPDATE queries.
- Triggers can be added later if needed.

---

## Implementation Notes (non-normative)

- Prefer adding a dedicated `teamsRepo` + `adminTeamsRoutes` under `src/routes/admin/...`.
- Ensure `requirePermission` uses organization scope for `orgId`.
- Keep the validation pattern consistent with existing routes: reject unknown fields early.

---

## Test Plan (PR5)

### RBAC / security tests

1. **OrgAdmin can create team in their org**
   - expect 201

2. **OrgAdmin cannot create team in another org**
   - expect 403

3. **Unknown patch fields rejected**
   - PATCH with `{ "evil": true }` → 400

### Validation tests

4. **Invalid `season_year` rejected**
   - examples: `99`, `1999`, `2101`, `"2026"` (string) → 400

5. **Coach assignment validation**
   - `head_coach_user_id` not in org → 400
   - `head_coach_user_id` member but role not allowed → 400

### Happy-path update + list

6. Create → List returns created team
7. Patch updates allowlisted fields

---

## Open Questions / Follow-ups

- Do we want ManagerCoach to have list access in PR5, or defer?
- Do we want `competition_level` as an enum later?
- Do we want `age_category` normalization (U14, U16) later?

---

## Changelog / Versioning

- v1: initial teams schema + OrgAdmin APIs + optional head coach assignment.
