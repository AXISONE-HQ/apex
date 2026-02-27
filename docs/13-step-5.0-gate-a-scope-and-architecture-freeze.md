# Apex v1 — Step 5.0 / Gate A: Scope & Architecture Freeze

## Status
- **Gate:** A (Scope & Architecture Freeze)
- **State:** ✅ Signed off
- **Date:** 2026-02-27
- **Owner:** Fred + Axi

## Goal
Freeze what MVP includes/excludes and lock service boundaries so execution can proceed without scope drift.

---

## A1) MVP Scope (Proposed)

## In scope (MVP must-have flows)
1. **Authentication & session**
   - Google login via Firebase Auth
   - Optional email/password via Firebase Auth
   - Backend session exchange via `/auth/session` and session validation via `/auth/me`

2. **Core domain management**
   - Team CRUD (minimum create/list/update)
   - Player CRUD (minimum create/list/update)
   - Match/event baseline (create/list/update)

3. **Scheduling/events baseline**
   - Practices/games/events creation and listing for a club/team scope

4. **Core dashboard**
   - Club/coach view with essential operational indicators (not full analytics suite)

5. **Cloud-only runtime**
   - Frontend and backend fully accessible without localhost dependency (`127.0.0.1:18789`)

## Explicitly out of scope (MVP)
- Advanced streaming module
- Team store and advanced monetization modules
- Sponsored challenges and tournament monetization tools
- Full advanced analytics/BI suite beyond core operational views
- Complex parent engagement feature depth beyond baseline communication/event visibility
- Any broad feature not required for first live clubs

## MVP quality bars
- No critical user flow relies on localhost
- No unbounded list APIs in MVP surface
- Tenant isolation enforced in read/write paths

---

## A2) Service Boundaries (Proposed)

## Frontend service
- **Role:** web app UI for directors/coaches/players/parents
- **Runtime target:** **Firebase Hosting (Option B)**
- **Decision driver:** lowest operations overhead is the top priority (with cost, speed, and control still important)
- **Current note:** local `127.0.0.1:18789` is mainly frontend and must be replaced

## Backend API service
- **Role:** auth session exchange, domain CRUD, RBAC enforcement, data access
- **Current runtime:** Cloud Run service `apex-staging-api` (staging), `apex-prod-api` (prod)
- **Contract:** stateless API; persistence in managed DB/cache only

## Async worker service (required for scale-safe behavior)
- **Role:** heavy/background tasks (notifications, async AI jobs, aggregations)
- **Runtime target:** separate worker service (`apex-{env}-worker`) or equivalent
- **MVP rule:** user-critical endpoints should not block on heavy AI operations

## OpenAI integration path
- **MVP policy:**
  - synchronous only for lightweight user-facing calls with strict timeout budgets
  - heavier operations routed async through worker path
- **Security:** API keys/secrets from Secret Manager only

---

## Sign-off Decisions (Confirmed)
1. Frontend runtime target: **Firebase Hosting (Option B)**
2. Email/password in MVP Day-1: **Yes (required)**
3. Dashboard scope for MVP: **Use current local frontend scope as baseline**

---

## Acceptance Criteria for Gate A
- Signed-off MVP scope (in/out)
- Signed-off service boundaries
- No unresolved “maybe” items left for MVP core flows

---

## Links
- Main checklist: `docs/11-step-5.0-mvp-live-load-readiness-checklist.md`
- Context snapshot: `docs/00-project-context-and-technical-state-2026-02-27.md`
