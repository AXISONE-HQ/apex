# Apex — Project Context & Technical State (2026-02-27)

## Status
- **Document purpose:** single source of truth for current product + technical migration context.
- **Last updated:** 2026-02-27 06:25 EST
- **Owner:** Fred + Moltbot

---

## 1) Product Context (Source of Truth)

## Vision
Apex is a multi-sport athlete development and club management platform built to elevate performance, structure, and long-term growth across youth and amateur sports.

Mission:
- Build better athletes
- Build better coaches
- Build stronger clubs

Apex aims to professionalize grassroots sports with elite-style structure, data, and development tooling.

## Problem
Youth/amateur sports are fragmented and under-optimized.

### Club pain points
- No centralized system for teams/coaches/players/parents
- Poor communication
- Manual planning of practices/games
- No standardized development tracking
- Weak performance insights
- Difficulty scaling across teams
- Weak branding/engagement capabilities

### Coach pain points
- Time-consuming planning
- No structured development framework
- No historical progression tracking
- Limited analysis tools
- Admin overload

### Player/Parent pain points
- Unclear development path
- Poor communication and visibility
- Disconnected resources and low engagement

## Solution
All-in-one, club-centered athlete development system combining:
- Club management
- AI-assisted practice planning
- Player performance analysis
- Long-term progression tracking
- Role-based dashboards
- Communication + engagement tools

Core outcome: move clubs from “organized” to “structured and performance-driven.”

## Personas
1. Club Director
2. Coach
3. Player
4. Parent
5. Master Admin (platform-level)

## Core Feature Areas
- Club & Team Management
- Event Scheduler
- AI Practice Planner
- Player Analysis & Progression
- Communication System
- Optional Streaming module
- Payments/monetization modules
- Club Insights Dashboard

## Competitive Positioning
Apex differentiates by focusing on development structure + measurable progression (not only scheduling/messaging).

## Market + Business Model (summary)
- Large youth sports opportunity in North America
- Primary revenue: tiered club subscription
- Secondary: AI premium, sponsored challenges, streaming upgrades, stores, tournament tools
- Long-term: operating system for youth sports club development

---

## 2) Repository & Environment Context

## Canonical GitHub repo
- `https://github.com/AXISONE-HQ/apex.git`

## Local workspace path
- `/Users/moltbot/.openclaw/workspace/projects/apex-v1`

## Branch observed during this session
- `develop`

## Project model
- 3 isolated environments: `dev`, `staging`, `prod`
- Naming convention: `apex-{env}-{component}`
- GCP project: `apex-v1-488611`

---

## 3) Runtime Architecture (Current)

## Backend service
- Node/Express service in `service/`
- Dockerized for Cloud Run (`service/Dockerfile`)
- Exposes `8080`
- Health endpoint: `/healthz`

## Auth model in code (current)
- `/auth/session` accepts identity token and creates app session cookie (`apex_session`)
- Firebase Admin verification present in backend (`src/auth/firebase.js`)
- Session persisted via Postgres when `DATABASE_URL` exists
- **Email/password custom backend auth is not currently implemented as a separate internal auth flow**
  (can be supported through Firebase Auth if handled client-side and exchanged as ID token)

## Data layer
- Postgres (`pg`) via `DATABASE_URL`
- Migration + seed scripts present

## Local app note from Fred
- `127.0.0.1:18789` is mainly frontend, plus some backend/API integrations (including OpenAI)
- This indicates migration scope includes more than only Cloud Run backend service.

---

## 4) GCP Live State Verified (2026-02-27)

## Project
- `apex-v1-488611`

## Cloud Run services (us-central1)
- `apex-staging-api`
  - URL: `https://apex-staging-api-g6dsonn6nq-uc.a.run.app`
  - Service account: `apex-staging-runtime@apex-v1-488611.iam.gserviceaccount.com`
- `apex-prod-api`
  - URL: `https://apex-prod-api-g6dsonn6nq-uc.a.run.app`
  - Service account: `apex-prod-runtime@apex-v1-488611.iam.gserviceaccount.com`

## Cloud SQL
- Instance: `apex-staging-sql` (POSTGRES_16, RUNNABLE)
- Instance: `apex-prod-sql` (POSTGRES_16, RUNNABLE)
- Staging DBs include `apex_staging`

## Secrets (observed)
- `apex-staging-database-url`
- `apex-staging-bootstrap-token`
- `apex-prod-database-url`
- `apex-v1-gh-github-oauthtoken-749c29`

## Cloud Run env wiring on staging
- `NODE_ENV=staging`
- `DATABASE_URL` from secret `apex-staging-database-url`
- `BOOTSTRAP_TOKEN` from secret `apex-staging-bootstrap-token`

---

## 5) Migration Objective (Current Session)

## Objective
Migrate off localhost (`127.0.0.1:18789`) to cloud-hosted architecture, reducing/removing local dependency for core Apex usage.

## What is already cloud-ready
- Core backend API service on Cloud Run
- Staging SQL and secrets baseline
- CI/CD baseline docs and configs

## What remains to define/execute
1. Frontend deployment target and URL strategy
2. Exact mapping of local-only API/OpenAI paths to cloud services
3. OAuth origin/redirect finalization against canonical staging domain
4. Any required service split (web app vs API vs workers)
5. End-to-end staging validation (auth + domain flows + OpenAI-dependent features)

---

## 6) Known Ambiguities / Risks

1. **Staging URL mismatch**
   - User-provided URL earlier: `https://apex-staging-api-153079040450.us-central1.run.app`
   - Live Cloud Run URL currently observed: `https://apex-staging-api-g6dsonn6nq-uc.a.run.app`
   - Need canonical URL decision for OAuth and frontend API base URL.

2. **Frontend hosting not yet documented in-repo state snapshot**
   - Local frontend appears to be central to current usage.

3. **Auth scope decision needed**
   - Use Firebase Auth for Google + email/password (recommended fastest path)
   - Or build custom email/password backend auth stack (larger scope)

---

## 7) Next Technical Steps (Recommended)

1. Lock canonical staging API URL
2. Document frontend app repo/path and deployment target
3. Define full local-to-cloud endpoint mapping (including OpenAI calls)
4. Finalize OAuth config (authorized origins + redirect URIs)
5. Deploy frontend to staging
6. Run smoke tests:
   - login/logout/session
   - protected routes
   - API CRUD basics
   - OpenAI-integrated flows
7. Cut localhost dependency by switching all client config to cloud URLs

---

## 8) Scale Objective (Product Capacity Target)

Apex must be architected to support at least:
- **5,000+ clubs**
- **100,000+ teams**
- **1,000,000+ players**

This is now a core non-functional requirement, not an optional optimization.

## 9) Scale Engineering Requirements (Baseline)

To satisfy the capacity target, implementation and architecture decisions must align with:

1. **Multi-tenant data model discipline**
   - Strong tenant boundaries (`club_id`/org scoping) across all core tables and queries.
   - Avoid cross-tenant scans by default.

2. **Database scalability controls**
   - Index strategy for high-cardinality entities (players, teams, events, memberships).
   - Pagination-first APIs (no unbounded list endpoints).
   - Query performance budgets and slow-query monitoring.

3. **Stateless horizontal API scaling**
   - Cloud Run services must remain stateless to scale instances out under load.
   - Session/state persistence must stay in managed stores (DB/cache), not process memory.

4. **Asynchronous workload isolation**
   - Non-request-critical tasks (notifications, analytics aggregation, heavy AI jobs) should move to async workers/queues.
   - Protect user-facing API latency from background spikes.

5. **Caching + read optimization**
   - Introduce caching for hot reads (club dashboard summaries, roster snapshots, permissions lookups where safe).
   - Define cache invalidation strategy per domain object.

6. **Rate limiting and abuse protection**
   - Per-user/per-tenant limits on high-cost operations.
   - Defensive controls for AI/OpenAI endpoints and public auth surfaces.

7. **Observability + SLO readiness**
   - Metrics: request latency, error rates, DB saturation, queue depth, auth failures.
   - Define SLOs for critical flows (login, roster load, schedule load, save/update paths).

8. **Load & capacity testing gates**
   - Introduce staged performance tests (staging first) with realistic tenant distribution.
   - Promotion to prod should require passing agreed throughput/latency/error thresholds.

9. **Cost-aware scale design**
   - Capacity planning must include infra cost ceilings and target unit economics per active club/team.

## 10) Persistence Rule

Whenever significant changes occur, append/update this document first, then mirror distilled items to:
- `MEMORY.md` (long-term)
- `memory/YYYY-MM-DD.md` (daily log)

This prevents context loss across sessions.
