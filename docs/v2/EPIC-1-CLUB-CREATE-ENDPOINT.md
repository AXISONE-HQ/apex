# EPIC 1 — Create Club Endpoint (Admin)

**Last updated:** 2026-03-04

Scope: PR2 adds a platform-admin-only endpoint to create an organization (club) and assign an initial Club Director (OrgAdmin).

## Endpoint

### POST /admin/clubs

RBAC
- Requires **platform admin** (centralized gate via `requirePlatformAdmin()`).
- OrgAdmin/Director cannot create clubs.

Request body
```json
{
  "name": "Montreal Elite",
  "sport_type": "basketball",
  "location": { "country": "CA", "state_province": "QC" },
  "subscription_plan": "trial",
  "director_email": "coach@club.com"
}
```

Rules
- `name`: required string
- `sport_type`: required enum: `basketball | soccer | hockey | volleyball | other`
- `location`: optional object allowlist: `country`, `state_province`
- `subscription_plan`: optional string (defaults to `trial`)
- `director_email`: required; **must match an existing user**

Responses
- `201 Created`
  - returns created org + assigned director
- `403 Forbidden`
  - when caller is not platform admin
- `404 Not Found`
  - `{ "error": "director_user_not_found" }` when director_email does not match an existing user
- `400 Bad Request`
  - validation errors (missing/invalid fields)

Side effects
- Initializes onboarding status:
```json
{ "steps": { "createClub": true, "settings": false, "coaches": false, "teams": false } }
```
- Inserts onboarding event:
  - `event_code`: `CLUB_CREATED`
  - `actor_user_id`: platform admin user id
  - `meta`: `{ director_email, orgName }`

## Notes
- Platform admin session/scopes are currently stubby in the codebase; PR3 will formalize DB-backed platform claims.
- Invite creation/email delivery is intentionally out of scope for PR2.
