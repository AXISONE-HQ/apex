# Apex v1 — Step 5.0: MVP Live + Load Readiness Checklist

## Status
- **Step:** 5.0 MVP launch readiness with scale-first constraints
- **State:** 🚧 In progress
- **Date:** 2026-02-27
- **Owner:** Fred + Moltbot

## Objective
Launch an MVP that is fully cloud-hosted (no localhost runtime dependency) and engineered to scale toward:
- **5,000+ clubs**
- **100,000+ teams**
- **1,000,000+ players**

> Note: existing fake data is non-blocking. Architecture, frontend/backend/API readiness are the priority.

---

## Gate A — Scope & Architecture Freeze

### A1. MVP scope frozen
- [ ] Must-have flows documented (auth, core club/team/player, schedule/events, core dashboard)
- [ ] Non-MVP features explicitly out-of-scope
- [ ] Single source doc linked from this checklist

**Acceptance criteria**
- MVP scope doc signed off by Fred
- No unresolved “maybe for MVP” items

### A2. Service boundaries frozen
- [ ] Frontend service selected and documented
- [ ] Backend API service boundary documented
- [ ] Async worker/service boundary documented for heavy tasks
- [ ] OpenAI integration path documented (sync vs async)

**Acceptance criteria**
- Architecture diagram + service responsibility list committed

---

## Gate B — Frontend Fully Off Localhost

### B1. Frontend deployed to cloud staging
- [ ] Staging frontend URL is live
- [ ] Frontend env vars defined in cloud
- [ ] API base URL points to cloud API only

### B2. Localhost dependency removed
- [ ] No runtime use of `127.0.0.1:18789`
- [ ] No hardcoded localhost in frontend config
- [ ] No hardcoded localhost in backend CORS/callback config

**Acceptance criteria**
- Full staging UX works with local services off
- Grep/check confirms no active localhost runtime refs in app config

---

## Gate C — Auth & Session Reliability

### C1. Auth model finalized
- [ ] Firebase Auth strategy confirmed (Google + optional email/password)
- [ ] Backend token verification flow documented

### C2. OAuth and callback correctness
- [ ] Authorized domains configured
- [ ] Authorized JS origins configured
- [ ] Redirect URIs configured with exact match
- [ ] Canonical staging domain chosen and documented

### C3. Session/cookie behavior validated
- [ ] `/auth/session` success path validated
- [ ] `/auth/me` validated from frontend
- [ ] Logout/session invalidation validated

**Acceptance criteria**
- 20/20 consecutive login attempts succeed in staging
- No intermittent callback/redirect mismatch

---

## Gate D — Backend/API Scale Baseline

### D1. API contract hardening
- [ ] Pagination on all list endpoints
- [ ] Input validation on critical endpoints
- [ ] Consistent error envelope + status codes

### D2. Database performance baseline
- [ ] Tenant-aware indexing strategy documented
- [ ] Indexes created for high-growth entities (players, teams, events, memberships, sessions)
- [ ] Query plans reviewed for top endpoints

### D3. Stateful logic removed from instances
- [ ] API instances remain stateless
- [ ] Sessions/state persisted in managed stores only

### D4. Heavy tasks isolated
- [ ] OpenAI-heavy and non-critical tasks moved to async path where needed
- [ ] Retry/timeout policies defined

**Acceptance criteria**
- No unbounded list endpoint in MVP surface
- No P0 slow-query hotspots in smoke/load test scope

---

## Gate E — Observability, Protection, and SLOs

### E1. Observability
- [ ] Request latency dashboards
- [ ] Error-rate dashboards
- [ ] DB health/saturation metrics
- [ ] Auth failure metrics
- [ ] OpenAI/API failure metrics

### E2. Protection controls
- [ ] Rate limiting for auth endpoints
- [ ] Rate limiting/budget controls for AI endpoints
- [ ] Basic abuse protection strategy documented

### E3. SLO baseline
- [ ] SLOs defined for login, roster load, schedule load, save/update flows
- [ ] Alert thresholds documented

**Acceptance criteria**
- Alerts fire in test and route correctly
- SLO dashboard is available before go-live

---

## Gate F — Load Readiness Validation

### F1. Staging load tests
- [ ] Tenant-distributed test scenarios prepared
- [ ] Core endpoints tested under concurrent load
- [ ] Login + read-heavy + write-heavy mixes tested

### F2. Capacity thresholds
- [ ] Throughput target defined
- [ ] p95/p99 latency thresholds defined
- [ ] Error-rate threshold defined
- [ ] DB CPU/connection saturation thresholds defined

### F3. Bottleneck remediation loop
- [ ] Findings logged
- [ ] Fixes implemented
- [ ] Retest passes target thresholds

**Acceptance criteria**
- Load test report attached
- All threshold gates green for MVP launch scope

---

## Gate G — MVP Production Launch

### G1. Production deployment readiness
- [ ] Frontend prod deployment ready
- [ ] Backend prod deployment ready
- [ ] Secrets/env parity validated
- [ ] DNS/domain/SSL validated

### G2. Controlled rollout
- [ ] Pilot clubs selected
- [ ] Rollback plan documented
- [ ] Launch-day monitoring runbook available

### G3. Post-launch stabilization
- [ ] 24h and 7d review checkpoints scheduled
- [ ] Incident ownership defined
- [ ] Immediate performance backlog prioritized

**Acceptance criteria**
- MVP is live with no localhost runtime dependency
- Pilot usage stable with no critical incidents

---

## Global Non-Functional Rules (must hold throughout)
1. Tenant isolation is non-negotiable.
2. No unbounded API reads in production MVP.
3. No critical user flow depends on synchronous heavy AI processing.
4. Every critical flow has observability before launch.
5. Any change that harms scale objective is blocked until mitigated.

---

## Definition of Done (Step 5.0)
Step 5.0 is complete only when:
- All Gates **A through G** meet acceptance criteria,
- MVP is live in production,
- and the system runs fully cloud-hosted with a tested path toward the capacity objective.
