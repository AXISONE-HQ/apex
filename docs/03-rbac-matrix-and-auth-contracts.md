# Apex v1 — Step 1.3: RBAC Matrix v1 + API Contract Skeleton

## Status
- **Step:** 1.3 RBAC concrete specification
- **State:** ✅ Completed
- **Date:** 2026-02-26

---

## 1) Permission catalog (v1 explicit IDs)

Permission format: `{domain}.{resource}.{action}`

### Dashboard
- `dashboard.page.view`
- `dashboard.card.kpi.view`
- `dashboard.card.alerts.view`

### Teams
- `teams.page.view`
- `teams.card.roster.view`
- `teams.card.settings.view`
- `teams.function.create`
- `teams.function.update`
- `teams.function.delete`
- `teams.function.member.add`
- `teams.function.member.remove`

### Players
- `players.page.view`
- `players.card.profile.view`
- `players.card.performance.view`
- `players.function.create`
- `players.function.update`
- `players.function.deactivate`

### Matches
- `matches.page.view`
- `matches.card.schedule.view`
- `matches.card.result.view`
- `matches.function.create`
- `matches.function.result.submit`
- `matches.function.result.correct`
- `matches.function.result.approve`

### Analytics
- `analytics.page.view`
- `analytics.card.team.view`
- `analytics.card.player.view`
- `analytics.function.export`

### Billing
- `billing.page.view`
- `billing.card.summary.view`
- `billing.function.invoice.download`
- `billing.function.plan.update`

### Admin
- `admin.page.view`
- `admin.function.user.invite`
- `admin.function.user.disable`
- `admin.function.role.assign`
- `admin.function.permissions.override`
- `admin.function.audit.view`

### Profile / Self-service
- `profile.page.view`
- `profile.function.update`

---

## 2) Role-permission matrix (v1)

## Role: SuperAdmin
- **Grants:** all permissions (`*`)

## Role: OrgAdmin
- Grants all permissions except platform-only operations (reserved for SuperAdmin):
  - no `admin.function.permissions.override` at global/platform scope
- Includes full org/team management, billing visibility, exports, role assignment within org scope.

## Role: ManagerCoach
- Grants:
  - `dashboard.page.view`
  - `dashboard.card.kpi.view`
  - `dashboard.card.alerts.view`
  - all `teams.*` except delete team
  - all `players.*` except deactivate
  - `matches.page.view`
  - `matches.card.schedule.view`
  - `matches.card.result.view`
  - `matches.function.create`
  - `matches.function.result.submit`
  - `analytics.page.view`
  - `analytics.card.team.view`
  - `analytics.card.player.view`
  - `profile.page.view`
  - `profile.function.update`

## Role: Player
- Grants:
  - `dashboard.page.view`
  - `teams.page.view` (limited to assigned team scope)
  - `teams.card.roster.view` (assigned team)
  - `players.page.view` (self)
  - `players.card.profile.view` (self)
  - `players.card.performance.view` (self or allowed scope)
  - `matches.page.view` (assigned team)
  - `matches.card.schedule.view`
  - `matches.card.result.view`
  - `profile.page.view`
  - `profile.function.update`

## Role: Viewer
- Grants read-only:
  - `dashboard.page.view`
  - `dashboard.card.kpi.view`
  - `teams.page.view`
  - `teams.card.roster.view`
  - `players.page.view`
  - `players.card.profile.view`
  - `matches.page.view`
  - `matches.card.schedule.view`
  - `matches.card.result.view`
  - `analytics.page.view`
  - `analytics.card.team.view`

---

## 3) Machine-readable RBAC mapping (YAML)

```yaml
roles:
  SuperAdmin:
    grants: ["*"]

  OrgAdmin:
    grants:
      - "dashboard.*"
      - "teams.*"
      - "players.*"
      - "matches.*"
      - "analytics.*"
      - "billing.*"
      - "admin.page.view"
      - "admin.function.user.invite"
      - "admin.function.user.disable"
      - "admin.function.role.assign"
      - "admin.function.audit.view"
      - "profile.*"
    denies:
      - "admin.function.permissions.override" # global scope only

  ManagerCoach:
    grants:
      - "dashboard.*"
      - "teams.page.view"
      - "teams.card.roster.view"
      - "teams.card.settings.view"
      - "teams.function.create"
      - "teams.function.update"
      - "teams.function.member.add"
      - "teams.function.member.remove"
      - "players.page.view"
      - "players.card.profile.view"
      - "players.card.performance.view"
      - "players.function.create"
      - "players.function.update"
      - "matches.page.view"
      - "matches.card.schedule.view"
      - "matches.card.result.view"
      - "matches.function.create"
      - "matches.function.result.submit"
      - "analytics.page.view"
      - "analytics.card.team.view"
      - "analytics.card.player.view"
      - "profile.*"

  Player:
    grants:
      - "dashboard.page.view"
      - "teams.page.view"
      - "teams.card.roster.view"
      - "players.page.view"
      - "players.card.profile.view"
      - "players.card.performance.view"
      - "matches.page.view"
      - "matches.card.schedule.view"
      - "matches.card.result.view"
      - "profile.*"

  Viewer:
    grants:
      - "dashboard.page.view"
      - "dashboard.card.kpi.view"
      - "teams.page.view"
      - "teams.card.roster.view"
      - "players.page.view"
      - "players.card.profile.view"
      - "matches.page.view"
      - "matches.card.schedule.view"
      - "matches.card.result.view"
      - "analytics.page.view"
      - "analytics.card.team.view"
```

---

## 4) Scope model

Authorization checks evaluate both permission and scope:
- `platform`
- `organization:{orgId}`
- `team:{teamId}`
- `self:{userId}`

Example:
- `players.card.profile.view` + `self:123` -> can view own profile
- `teams.function.member.add` + `organization:abc` -> org-scoped management

---

## 5) Middleware contract skeleton

### `requirePermission(permission, scopeResolver)`

Behavior:
1. Resolve session user
2. Load effective permissions (role + overrides)
3. Resolve scope from route/resource
4. Evaluate allow/deny
5. Return 403 on deny
6. Emit audit event on sensitive mutation

Pseudocode:

```ts
requirePermission(permission, scopeResolver) {
  return async (req, res, next) => {
    const user = req.session.user;
    const scope = await scopeResolver(req);
    const decision = await authzEngine.can({ user, permission, scope });

    if (!decision.allow) {
      return res.status(403).json({ error: "forbidden", permission, scope });
    }

    if (decision.audit) {
      audit.log({ actor: user.id, action: permission, scope, traceId: req.traceId });
    }

    next();
  };
}
```

---

## 6) Auth API contracts (initial)

## `POST /auth/session`
Purpose: exchange verified identity token for Apex app session.

Request:
```json
{
  "idToken": "<firebase-id-token>",
  "device": { "userAgent": "...", "ip": "..." }
}
```

Response 200:
```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "User Name"
  },
  "memberships": [
    { "orgId": "org_1", "roles": ["OrgAdmin"] }
  ],
  "permissions": ["teams.page.view", "teams.function.update"],
  "session": { "expiresAt": "2026-02-26T15:00:00Z" }
}
```

## `POST /auth/logout`
Purpose: revoke app session.

Response 204 (no body)

## `GET /me`
Purpose: fetch current user profile + effective permissions/scopes.

Response 200:
```json
{
  "user": { "id": "usr_123", "email": "user@example.com" },
  "activeOrgId": "org_1",
  "roles": ["OrgAdmin"],
  "permissions": ["dashboard.page.view", "teams.page.view"]
}
```

---

## 7) Acceptance criteria for Step 1.3

- [x] Explicit permission catalog documented
- [x] Role-permission mapping documented (human + YAML)
- [x] Scope-aware authorization model defined
- [x] Middleware contract skeleton defined
- [x] Auth endpoint skeleton contracts documented

---

## Next step
**Step 1.4: Implementation scaffold (authz package + route guards + contract tests)**

Deliverables:
1. `authz` module skeleton (`can()`, `requirePermission()`)
2. Seed RBAC config in code from YAML matrix
3. Auth route stubs: `/auth/session`, `/auth/logout`, `/me`
4. Contract tests for 200/401/403 behavior
