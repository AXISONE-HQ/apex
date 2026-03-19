# EPIC 2 — PR11 Parent / Guardian Foundation (Design Spec)

Status: **Design-only** (pre-implementation)

Goal: Introduce the first parent/guardian domain model for Apex clubs so admins can manage guardian contact records within an organization.

---

## Scope

### In scope (PR11)
- Persistence model + migration for guardians
- Admin CRUD surface (create/list/patch) for guardians
- Org-scoped RBAC consistent with prior EPIC 2 slices
- Validation + tests

### Out of scope
- Linking guardians to players (next PR)
- Parent login/auth, invitations, messaging, household grouping, bulk import
- Parent-facing endpoints

---

## Schema

New table: `guardians`
- `id UUID PRIMARY KEY`
- `org_id UUID NOT NULL`
- `first_name TEXT NOT NULL` (1..120)
- `last_name TEXT NOT NULL` (1..120)
- `display_name TEXT NULL` (<=120)
- `email TEXT NULL` (<=255, store trimmed/lowercased)
- `phone TEXT NULL` (<=50)
- `relationship TEXT NULL` (<=80)
- `status TEXT NOT NULL DEFAULT 'active'` (`active` | `inactive`)
- `notes TEXT NULL` (<=500)
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`

---

## API Contracts

### POST /admin/clubs/:orgId/guardians
Body fields:
- `first_name` (required)
- `last_name` (required)
- `display_name`, `email`, `phone`, `relationship`, `notes` (optional)
- `status` optional (`active`/`inactive`; defaults to `active`)

Behavior:
- Require session
- Allow PlatformAdmin or OrgAdmin scoped to `orgId`
- Trim optional strings; empty string → null
- Email lowercased
- Reject unknown fields
- Response: `{ "item": { ...guardian } }`

### GET /admin/clubs/:orgId/guardians
Behavior:
- Require session + RBAC
- Return org-scoped guardians only
- Order by `last_name ASC, first_name ASC, created_at ASC`
- Response: `{ "items": [ ... ] }`

### PATCH /admin/clubs/:orgId/guardians/:guardianId
Behavior:
- Require session + RBAC
- Strict allowlist; reject empty body
- Trim optional strings; email lowercased
- Unknown fields rejected
- Missing guardian → `404 { "error": "guardian_not_found" }`
- Response: `{ "item": { ... } }`

Error shapes (consistent with prior PRs):
- `400 { "error": "bad_request", "message": "..." }`
- `403 { "error": "forbidden" }`
- `404 { "error": "guardian_not_found" }`

---

## Implementation Plan

### Migration
- Create `guardians` table with constraints above.
- Add indexes as needed (e.g., `(org_id, last_name)` for ordering).

### Repository (`service/src/repositories/guardiansRepo.js`)
Functions:
- `createGuardian({...})`
- `listGuardiansByOrg(orgId)`
- `getGuardianByIdAndOrg(guardianId, orgId)`
- `updateGuardian(guardianId, orgId, patch)`

Rules:
- Thin data access only (no RBAC/validation).
- Enforce ordering in SQL for the list helper.

### Routes (`service/src/routes/admin/guardians.js`)
- Define POST/GET/PATCH handlers per contracts.
- Reuse existing helper patterns (allow/unallow, badRequest, etc.).
- Wire into `/admin/clubs` via `service/src/routes/admin/clubs.js`.

### Tests (`service/test/admin-guardians.test.js`)
Cover:
- Create guardian as PlatformAdmin
- Create guardian as scoped OrgAdmin
- Wrong-org OrgAdmin denied
- GET returns org-only data with ordering
- PATCH success (fields trimmed/lowercased)
- PATCH empty body → 400
- PATCH unknown field → 400
- PATCH missing guardian → 404
- Optional string normalization
- Status enum validation

---

## Definition of Done
1. Spec doc (this file) committed.
2. Migration adds guardians table with constraints.
3. Repositories & routes implemented with org-scoped RBAC + validation.
4. Guardian tests pass locally: `npm test -- test/admin-guardians.test.js`.
5. Full `npm test` passes.
6. No scope outside guardian foundation is introduced.
