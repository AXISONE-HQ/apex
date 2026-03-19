# Auth — Platform Admin (DB-backed)

**Last updated:** 2026-03-04

Goal: make platform admin a durable, DB-backed claim so platform-only endpoints are not built on stubs.

## Source of truth
- Column: `users.is_platform_admin` (boolean)
- Default: `false`

## Request user shape
- Canonical flag: `req.user.isPlatformAdmin` (boolean)
- All platform-only checks (middleware/policy) must depend on this field only.

## How it’s enforced
- Middleware: `requirePlatformAdmin()`
  - Allows when `req.user.isPlatformAdmin === true`.

### Emergency fallback (default OFF)
There is an emergency email allowlist fallback, but it is **double-gated**:
- `AUTH_ALLOW_PLATFORM_ADMIN_EMAIL_FALLBACK=true`
- `PLATFORM_ADMIN_EMAILS=...` (comma-separated list)

If fallback is enabled without an allowlist, the service fails fast on startup.

## How to grant/revoke platform admin (SQL)

Grant:
```sql
UPDATE users
SET is_platform_admin = true
WHERE email = 'fred@mkze.vc';
```

Revoke:
```sql
UPDATE users
SET is_platform_admin = false
WHERE email = 'fred@mkze.vc';
```

## Notes
- PR3 formalizes the claim storage + request wiring.
- Product features (invites, payments) should assume platform admin is real before depending on it.
