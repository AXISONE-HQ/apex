# Create Team Flow — QA Checklist

_Last updated: 2026-03-11_

## Preconditions
- Feature branch deployed to staging (`apex-staging-api` + Next.js frontend) with migrations 025 + 026 applied.
- Test account with OrgAdmin (or ManagerCoach) role scoped to club `32a6caf1-a200-408e-9a1f-4a56e7827d77`.
- Known head-coach members in the org (roles: Coach, ManagerCoach, ClubDirector, OrgAdmin).
- Browser session cleared of stale cookies (to verify session bootstrap flow).

## Happy-path validation
1. **Open `/app/teams`**
   - Expect Teams list to render latest season first, each card showing Season, Team Level, Age Group, Head Coach, and player count.
   - Toggle archived filter → archived teams appear/disappear without reload.
2. **Click “Create team”**
   - Ensure the form preloads with org context (club switcher hidden).
3. **Fill required fields**
   - Name, Season Label, Sport, Team Level, Age Group, Head Coach.
   - Confirm Season Year auto-derives when Season Label contains a 4-digit year and the helper enforces 2000–2100.
4. **Submit**
   - Expect spinner + disabled button.
   - API call should return 201 and redirect to `/app/teams/{teamId}`.
5. **Detail page**
   - Header shows name, season, level, age, sport.
   - Metadata grid lists Club, Head Coach (display name), Created date, Training defaults.
6. **List refresh**
   - Navigate back to Teams; the new card should be present without manual reload (query invalidation confirmed).

## Negative coverage
- Missing Season Label → inline error before API call.
- Duplicate team name within same season → API returns `team_already_exists`; UI surfaces friendly toast/message.
- Assigning head coach who is not a member → `head_coach_not_member` surfaced as inline error.
- Invalid season year (<2000 or >2100) → client catches (if user edits year manually) and server rejects.
- Unauthorized role (e.g., Coach without OrgAdmin scope) → attempt to load `/app/teams/create` should redirect/403.

## RBAC verification
- OrgAdmin and ManagerCoach should see Create button.
- Coach-only accounts can list but not create (button hidden/disabled).
- SuperAdmin / PlatformAdmin can access any club via org switcher (future multi-org flows).

## Observability & logging
- Cloud Run logs should include `request_log` entries for POST + GET detail with latency <250ms.
- Duplicate or validation errors should return 4xx and never 5xx.

## Regression sweep
- Existing `/admin/clubs/:orgId/teams` API consumers (scripts, automations) still receive fields they expect; new head coach fields are additive.
- Tests to rerun locally: `npm test -- test/admin-teams.test.js`, `npm run lint` (frontend).

## Open questions / assumptions
- Head coach selection currently limited to primary coach role; assistant coaches remain out-of-scope until PR6.
- Invite acceptance on staging still depends on `INVITE_RETURN_LINK_NON_PROD`; manual steps may be required to obtain tokens if env differs.
