# EPIC 1 — Coach Invites (PR4)

**Last updated:** 2026-03-04

Goal: invite coaches securely (no raw token storage), accept via Firebase auth, and assign `ManagerCoach` membership.

## Security model
- Raw invite token is **never stored**.
- Stored: `token_hash = sha256(token + INVITE_TOKEN_PEPPER)` (hex)
- Invite expiry: **48 hours**

## Env vars
Required:
- `INVITE_TOKEN_PEPPER`

Optional (non-prod only):
- `INVITE_RETURN_LINK_NON_PROD=true` (and `NODE_ENV != production`) to return `inviteLink`/`inviteToken`

## Admin endpoints

### Create coach invite
`POST /admin/clubs/:orgId/coaches/invite`

RBAC
- Allowed if **platform admin** OR `OrgAdmin` scoped to `orgId`.

Body
```json
{
  "email": "coach@club.com",
  "coach_type": "head",
  "team_ids": ["<uuid>"]
}
```

Response (safe)
```json
{ "inviteId": "<uuid>", "expiresAt": "<iso>", "status": "pending" }
```

Non-prod convenience (optional)
- If `INVITE_RETURN_LINK_NON_PROD=true` and `NODE_ENV!=production`, response may include:
  - `inviteLink`: `/invite?token=...`
  - `inviteToken`: raw token

Event log
- `COACH_INVITED`

---

### Revoke invite
`POST /admin/invites/:inviteId/revoke`

RBAC
- Allowed if **platform admin** OR `OrgAdmin` scoped to the invite org.

Response
```json
{ "status": "revoked" }
```

Event log
- `INVITE_REVOKED`

## Public accept endpoint

### Accept invite
`POST /auth/invites/accept`

Body
```json
{ "token": "<raw-token>", "idToken": "<firebase-id-token>" }
```

Rules
- Token must map to a `pending` invite and not be expired/revoked.
- Firebase identity email must match invite email (case-insensitive normalized).

Important: user provisioning
- This system provisions local users via `/auth/session`.
- If the user has not created a session yet, accept returns:
```json
{
  "error": "user_not_provisioned",
  "message": "Call /auth/session first to create a user session, then retry invite accept.",
  "next": "/auth/session",
  "requiresSession": true
}
```

Response (success)
```json
{
  "status": "accepted",
  "orgId": "<orgId>",
  "role": "ManagerCoach",
  "coach_type": "head"
}
```

Event log
- `INVITE_ACCEPTED`

## Recommended frontend flow
1) Coach signs in (Firebase)
2) Call `POST /auth/session` (sets cookie, upserts user)
3) Call `POST /auth/invites/accept` with `{ token, idToken }`
