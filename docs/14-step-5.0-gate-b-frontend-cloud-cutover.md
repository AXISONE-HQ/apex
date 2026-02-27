# Apex v1 — Step 5.0 / Gate B: Frontend Cloud Cutover (Firebase Hosting)

## Status
- **Gate:** B (Frontend Fully Off Localhost)
- **State:** ✅ Complete
- **Date:** 2026-02-27
- **Owner:** Fred + Axi

## Goal
Deploy the frontend to cloud staging (Firebase Hosting) and remove runtime dependency on localhost (`127.0.0.1:18789`).

---

## Current Findings (discovery completed)

## Frontend candidate repo detected
- Path: `/Users/moltbot/.openclaw/workspace/repos/axisone-dashboard`
- Framework: Next.js (v16)
- This appears to be the current local frontend runtime.

## Localhost references detected in frontend code
Examples found:
- `ws://127.0.0.1:18789` in `src/app/page.tsx`
- `http://127.0.0.1:18789/` in `src/app/page.tsx`
- `http://localhost:3333/...` in tryout signup flow (`src/app/apex/...`)

## OpenAI currently called from frontend app API routes
- Multiple `src/app/api/*/route.ts` files read `OPENAI_API_KEY`
- This is functional but needs explicit production policy for scale/cost controls.

---

## Gate B Execution Plan

### B1) Frontend hosting baseline (Firebase Hosting)
1. Confirm canonical frontend repo and branch for deployment
2. Initialize Firebase Hosting for frontend app
3. Define staging hosting target + URL
4. Add CI/deploy command for staging frontend

### B2) Environment standardization
1. Replace hardcoded localhost URLs with env-driven values
2. Introduce explicit env names (example):
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_GATEWAY_URL` (if still needed)
3. Add `.env.example` and deployment env docs

### B3) Localhost dependency removal
1. Remove/replace all `127.0.0.1:18789` and `localhost:*` runtime refs
2. Ensure all links/QRs/callbacks use cloud URLs in staging
3. Run smoke check with local services down

### B4) Validation
1. Staging URL loads and auth flow works
2. API base URL points to cloud service only
3. No localhost refs from runtime path

---

## Blockers / Decisions Needed From Fred

1. **Confirm canonical frontend repo/path**
   - Is `repos/axisone-dashboard` the official frontend for Apex MVP? (yes/no)

2. **Firebase project/hosting target details**
   - Firebase project ID to use for hosting
   - Hosting site ID (if already created)

3. **Canonical staging frontend URL**
   - Confirm desired staging URL/domain for frontend

4. **Gateway path decision**
   - The current frontend has a `ws://127.0.0.1:18789` gateway reference.
   - Should this capability be:
     - removed from MVP, or
     - migrated to a cloud websocket endpoint?

---

## Acceptance Criteria (Gate B)
- Frontend staging URL is live on Firebase Hosting
- Frontend uses cloud API URL only
- No runtime localhost dependencies remain in MVP user flows
- Smoke tests pass with local services turned off

---

## Links
- Main checklist: `docs/11-step-5.0-mvp-live-load-readiness-checklist.md`
- Gate A sign-off: `docs/13-step-5.0-gate-a-scope-and-architecture-freeze.md`
