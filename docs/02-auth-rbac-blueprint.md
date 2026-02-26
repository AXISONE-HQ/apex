# Apex v1 — Step 1.2: Authentication + Authorization Blueprint

## Status
- **Step:** 1.2 AuthN + AuthZ architecture
- **State:** ✅ Completed
- **Date:** 2026-02-26

---

## 1) Authentication model (how users log in)

Apex v1 will support:
1. **Google Login (OIDC)**
2. **Email + Password**

### Recommended provider
Use **Firebase Authentication** (Google-managed identity) to reduce custom auth risk and speed delivery.

Why:
- Native Google provider support
- Built-in email/password flow
- Mature token issuance/refresh patterns
- Easier account lifecycle + security controls

---

## 2) Login flows

### A) Google Login flow
1. User clicks "Continue with Google"
2. Frontend redirects to Firebase Auth Google provider
3. User authenticates with Google
4. Frontend receives ID token
5. Frontend sends token to Apex API `/auth/session`
6. Backend verifies token signature/audience/issuer
7. Backend resolves or creates user record and org membership
8. Backend returns app session (secure cookie) + profile/role claims

### B) Email/Password flow
1. User signs up or logs in with email/password via Firebase Auth
2. Frontend receives ID token
3. Frontend calls `/auth/session`
4. Backend verifies token and returns app session + effective permissions

### C) Password reset / email verification
- Firebase-managed email verification and reset workflows
- Backend denies privileged actions if account is not verified (policy-driven)

---

## 3) Session + token strategy

### Client session
- Use **httpOnly, secure, sameSite=strict** session cookie for app session
- Keep short access session TTL (e.g., 15 min) + refresh path
- Rotate refresh/session identifiers periodically

### API authorization token
- Backend derives effective permission set at session creation
- Cache permission snapshot in Redis with short TTL for speed
- Re-check policy on critical mutation actions

### Security controls
- CSRF protection for browser session endpoints
- Device/IP risk checks for sensitive actions
- Brute-force protections and lockout thresholds on email/password login

---

## 4) Authorization model (what users can access)

Use **RBAC + scoped permissions**.

- **Role** = bundle of permissions
- **Permission** = atomic capability (page/card/function)
- **Scope** = global, organization, team

### Permission naming convention
- `{domain}.{resource}.{action}`

Examples:
- `teams.page.view`
- `teams.card.roster.view`
- `teams.function.member.add`
- `matches.function.result.submit`
- `billing.page.view`
- `admin.function.user.invite`

---

## 5) Initial roles

1. **SuperAdmin** (platform-level)
2. **OrgAdmin** (organization-level admin)
3. **Manager/Coach** (team operations)
4. **Player** (own profile + assigned team features)
5. **Viewer** (read-only)

---

## 6) Initial access matrix (v1 draft)

## Pages
- Dashboard
- Teams
- Players
- Matches
- Analytics
- Billing
- Admin

### Page-level defaults
- **SuperAdmin:** all pages
- **OrgAdmin:** all except platform-only admin operations
- **Manager/Coach:** dashboard, teams, players, matches, limited analytics
- **Player:** dashboard, own profile/team views, personal stats
- **Viewer:** dashboard + read-only team/player/match views

## Cards (UI components)
Examples:
- Team roster card
- Team settings card
- Player health/performance card
- Match submission card
- Financial summary card

Card visibility is permission-driven, not role hardcoded.

## Functions (actions)
Examples:
- Invite user
- Assign role
- Create team
- Edit player
- Submit match result
- Approve result correction
- Export analytics

All functions must be server-authorized even if hidden on UI.

---

## 7) Backend enforcement pattern

1. Request arrives with session
2. Middleware resolves user + org/team scope
3. Required permission(s) evaluated
4. Deny by default (403) if missing
5. Audit log for sensitive mutations (role changes, data corrections, billing)

---

## 8) Data model (authz core tables)

- `users`
- `organizations`
- `teams`
- `memberships` (user <-> organization/team relationships)
- `roles`
- `permissions`
- `role_permissions`
- `membership_roles`
- `audit_logs`

Optional later:
- `policy_overrides` for custom org-level permission exceptions

---

## 9) Environment-specific auth settings

Each environment uses distinct config and secrets:
- OAuth client IDs/secrets per env
- Auth callback URLs per env
- Session signing keys per env

Example callbacks:
- dev: `https://dev.api.apex.../auth/callback`
- staging: `https://staging.api.apex.../auth/callback`
- prod: `https://api.apex.../auth/callback`

---

## 10) Acceptance criteria for Step 1.2

- [x] Dual login methods defined (Google + email/password)
- [x] Session/token strategy defined
- [x] RBAC + scoped permission model defined
- [x] Initial role catalog and matrix drafted
- [x] Server-side enforcement principle documented

---

## Next step
**Step 1.3: RBAC matrix v1 (concrete) + API contract skeleton**

Deliverables:
1. Finalized permission catalog (explicit IDs)
2. Role-permission assignment table (machine-readable)
3. Middleware contract (`requirePermission(...)`)
4. Initial auth endpoints contract (`/auth/session`, `/auth/logout`, `/me`)
