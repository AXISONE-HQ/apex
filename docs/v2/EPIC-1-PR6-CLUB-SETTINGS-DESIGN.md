# EPIC 1 — PR6 Club Settings (Design Spec)

Status: **Design-only** (no code changes)

Goal: Add an org-scoped **Club Settings** surface so OrgAdmins can configure core club parameters needed to operate.

This PR focuses on a **single JSONB settings object** on `organizations` for speed and flexibility, with a strict **allowlist + validation** at the route layer.

---

## Scope

### In scope (PR6)

- DB migration: add `organizations.settings JSONB NOT NULL DEFAULT '{}'::jsonb`
- Admin endpoints (org scoped):
  - `GET /admin/clubs/:orgId/settings`
  - `PATCH /admin/clubs/:orgId/settings`
- Strict allowlist validation of the settings object
- RBAC: platform admin OR org-scoped OrgAdmin
- Tests for RBAC + validation
- Docs for the contract

### Explicitly out of scope (PR6)

- Adding `organizations.updated_at` or general org audit timestamps
- UI work (unless planned separately)
- Complex schema normalization (separate tables for categories/levels/templates)
- Versioning/migration of template ids beyond basic allowlist
- Notifications/real-time propagation of settings changes

---

## Storage Model

### Column: `organizations.settings`

- Type: `JSONB`
- Nullability: `NOT NULL`
- Default: `'{}'::jsonb`

**CTO decision:** Do not modify `organizations` further (no `updated_at` column added in PR6).

---

## RBAC

All endpoints require a session and are restricted to:

- Platform admin (`req.user.isPlatformAdmin === true`) OR
- Org-scoped OrgAdmin (`roles` includes `OrgAdmin` AND `orgScopes` contains the `orgId`)

---

## API Contracts

Response shape convention:
- Single-resource endpoints return `{ "item": { ... } }`

### GET settings

`GET /admin/clubs/:orgId/settings`

Success (200):

```json
{
  "item": {
    "org_id": "<uuid>",
    "settings": { }
  }
}
```

Notes:
- If no settings were ever set, `settings` returns `{}`.

Errors:
- `401 { error: "unauthorized" }` (if requireSession enforced)
- `403 { error: "forbidden" }`
- `404 { error: "org_not_found" }` (if org does not exist)

### PATCH settings

`PATCH /admin/clubs/:orgId/settings`

Body:

```json
{
  "age_categories": ["U10","U12","U14","U16","U18"],
  "competition_levels": ["Recreational","A","AA","AAA"],
  "season": {
    "start_date": "2026-09-01",
    "end_date": "2027-03-31"
  },
  "default_training_duration_min": 90,
  "evaluation_templates": [
    {
      "id": "default",
      "name": "Default",
      "criteria": [
        { "key": "effort", "label": "Effort", "weight": 1 }
      ]
    }
  ],
  "communication_policies": {
    "allow_dm": true,
    "parent_chat": true,
    "player_chat": true
  }
}
```

Semantics:
- PATCH performs a **top-level merge** into existing settings for allowlisted keys only.
- For any provided top-level key, the value **fully replaces** the previous value for that key.
- No deep merge of nested objects/arrays.
  - Example: sending `communication_policies: { "allow_dm": true }` replaces the entire `communication_policies` object.
- Unknown keys are rejected.
- Top-level `null` values are rejected (see null-handling rules).
- Nested objects/arrays are validated (see schema rules).

Success (200):

```json
{
  "item": {
    "org_id": "<uuid>",
    "settings": { "...": "..." }
  }
}
```

Errors:
- `400 { error: "bad_request", message: "..." }` for unknown keys / validation failures
- `403 { error: "forbidden" }`
- `404 { error: "org_not_found" }`

---

## Settings JSON Schema (allowlist)

Top-level keys allowed (all optional):

- `age_categories`: array of strings
- `competition_levels`: array of strings
- `season`: object `{ start_date, end_date }`
- `default_training_duration_min`: integer
- `evaluation_templates`: array of templates
- `communication_policies`: object `{ allow_dm, parent_chat, player_chat }`

No other top-level keys.

Top-level null-handling (PR6):
- Top-level keys may be **omitted** (leave unchanged).
- Top-level values **must not be null**.
  - To clear arrays: send `[]`.
  - To clear objects: send `{}`.

### 1) age_categories

- Type: `string[]`
- Constraints:
  - 0..50 items
  - each item trimmed, length 1..32
  - recommended canonical format like `U14`, but allow free text v1
  - **unique items required** (case-insensitive after trim)

### 2) competition_levels

- Type: `string[]`
- Constraints:
  - 0..50 items
  - each item trimmed, length 1..32
  - **unique items required** (case-insensitive after trim)

### 3) season

- Type: object
- Keys:
  - `start_date` (required if season present): `YYYY-MM-DD`
  - `end_date` (required if season present): `YYYY-MM-DD`

Validation:
- `start_date` must be < `end_date`
- Parse as dates in UTC (treat as date-only)

### 4) default_training_duration_min

- Type: integer
- Constraints:
  - allowed range: 15..600

### 5) evaluation_templates

- Type: array
- Constraints:
  - 0..20 templates
  - each template:
    - `id`: string, required, length 1..64 (stable identifier)
    - `name`: string, required, length 1..120
    - `criteria`: array, required, 1..50

Each criterion:
- `key`: string, required, length 1..64 (stable machine key)
- `label`: string, required, length 1..120
- `weight`: number, required (integer or float), range 0..100

Uniqueness:
- template ids unique (case-sensitive)
- within a template, criterion keys unique

### 6) communication_policies

- Type: object
- Keys (allowlist):
  - `allow_dm`: boolean
  - `parent_chat`: boolean
  - `player_chat`: boolean

---

## Error Codes (suggested)

Use simple string codes where possible.

- `bad_request` (unknown keys, invalid shape)
- `invalid_age_categories`
- `invalid_competition_levels`
- `invalid_season`
- `invalid_default_training_duration_min`
- `invalid_evaluation_templates`
- `invalid_communication_policies`

---

## Validation Guardrails

- Settings payload size limit: serialized settings JSON (e.g. `JSON.stringify(settings)` length) must be **<= 64 KB**.
  - Reject larger payloads with `400 { error: "bad_request", message: "settings_payload_too_large" }`.

---

## Test Plan (PR6)

### RBAC

1. OrgAdmin scoped to org can GET settings (200)
2. OrgAdmin scoped to org can PATCH settings (200)
3. OrgAdmin scoped to other org cannot PATCH (403)
4. Platform admin can GET/PATCH any org (200)

### Validation

5. Unknown top-level key rejected (400 bad_request)
6. Season validation: start_date >= end_date rejected
7. default_training_duration_min out of range rejected
8. evaluation_templates: duplicate template id rejected
9. criteria: duplicate key in same template rejected

### Behavior

10. PATCH updates only allowlisted keys and returns merged settings
11. GET returns `{}` when unset

---

## Implementation Notes (non-normative)

- The safest implementation pattern is:
  1) ensure org exists; if not, return `404 org_not_found`
  2) read current `organizations.settings`
  3) validate incoming PATCH body against allowlist + size + null rules
  4) top-level merge allowed keys into existing settings (full replace per provided key)
  5) write back `settings = $1::jsonb`

- Avoid silently dropping unknown keys.

---

## Out-of-scope follow-ups

- Formal enums for age categories / competition levels
- Multi-season support with historical seasons
- Template versioning and migrations
- Audit log for settings changes
- UI for editing settings
