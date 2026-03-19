# EPIC 1 — Org Profile Endpoints (Admin)

**Last updated:** 2026-03-04

Scope: PR1 adds minimal admin endpoints to fetch and patch an organization profile without opening scope creep.

## Endpoints

### GET /admin/clubs/:orgId
Returns a normalized org profile.

Response
```json
{
  "id": "<orgId>",
  "name": "Demo Club",
  "sport_type": "basketball",
  "location": { "state_province": "Ontario", "country": "Canada" },
  "subscription_plan": "starter",
  "onboarding_status": { "steps": { "createClub": true } },
  "logo_object_path": "club-logos/<orgId>/<uuid>.png",
  "logoReadUrl": "https://storage.googleapis.com/...signed...",
  "logoReadUrlExpiresMinutes": 60
}
```

Notes
- `logoReadUrl` is optional convenience; it is minted server-side (TTL 60m) and is **not persisted**.

RBAC
- Currently gated by `admin.page.clubs.view` with `{ type: "platform" }` scope.

---

### PATCH /admin/clubs/:orgId
Updates a small allowlist of fields.

Body (allowlist)
```json
{
  "sport_type": "basketball",
  "location": { "state_province": "Ontario", "country": "Canada" },
  "subscription_plan": "starter",
  "onboarding_status": { "steps": { "createClub": true, "teams": "2026-03-04" } }
}
```

Validation rules
- Unknown top-level fields are rejected.
- `sport_type` must be one of: `basketball | soccer | hockey | volleyball | other`
- `location` allowlist: `state_province`, `country` (strings or null)
- `onboarding_status` is sanitized to only allow:
  - `steps.createClub | steps.settings | steps.coaches | steps.teams`
  - values: boolean or short string (timestamp-ish)
- `logo_object_path` cannot be set via PATCH (must use the logo upload flow).

RBAC
- `admin.clubs.update` scoped to `{ type: "organization", id: orgId }`

---

## Notes / next improvement
- For even stricter control, consider a dedicated endpoint:
  - `POST /admin/clubs/:orgId/onboarding` with specific commands (MARK_STEP_DONE)
  This can come in a later PR.
