# Apex — Axi Context Handoff Template

## Purpose
Use this document to quickly restore full project context for Axi in any new chat/session.

How to use:
1. Fill/update this file (or copy/paste it into chat).
2. Share it at the start of a new session.
3. Axi will treat it as the current source of truth and continue from it.

---

## 1) Identity
- Assistant name: **Axi**
- Human owner: **Fred**
- Project: **Apex**

## 2) Core Mission
- Migrate Apex from localhost dependency (`127.0.0.1:18789`) to fully cloud-hosted runtime.
- Launch MVP live with production-ready frontend/backend/APIs.

## 3) Capacity Objective (Non-Negotiable)
- 5,000+ clubs
- 100,000+ teams
- 1,000,000+ players

## 4) Canonical Repositories & Paths
- GitHub repo: `https://github.com/AXISONE-HQ/apex.git`
- Working path: `/Users/moltbot/.openclaw/workspace/projects/apex-v1`
- Current branch: `<fill>`

## 5) Canonical Environment Values
- GCP project: `apex-v1-488611`
- Staging API URL (canonical): `<fill exact URL>`
- Prod API URL (canonical): `<fill exact URL>`
- Frontend staging URL: `<fill>`
- Frontend prod URL: `<fill>`

## 6) Current Architecture Snapshot
- Frontend host/runtime: `<fill>`
- Backend API service(s): `<fill>`
- Async workers/queues: `<fill>`
- Auth model (Firebase/custom): `<fill>`
- OpenAI integration path: `<fill>`

## 7) Database & Secrets Snapshot
- Staging SQL instance: `apex-staging-sql`
- Staging DB: `apex_staging`
- Prod SQL instance: `<fill>`
- Core secrets in use: `<fill list>`

## 8) What’s Done
- [ ] Context docs committed
- [ ] Frontend deployed in cloud
- [ ] Backend deployed in cloud
- [ ] OAuth configured end-to-end
- [ ] Localhost dependency removed
- [ ] Load test baseline completed
- [ ] MVP production launch completed

## 9) Current Blockers
1. `<fill>`
2. `<fill>`
3. `<fill>`

## 10) Immediate Next 3 Actions
1. `<fill>`
2. `<fill>`
3. `<fill>`

## 11) Operating Rules for Axi
- Prioritize architecture/load/frontend/backend/API over data migration (fake data is non-blocking).
- Keep docs updated in `docs/` with numbered step pattern.
- Commit key technical decisions before major implementation steps.
- If context is missing, ask for this file first.

## 12) Reference Docs
- `docs/00-project-context-and-technical-state-2026-02-27.md`
- `docs/11-step-5.0-mvp-live-load-readiness-checklist.md`
- Add others: `<fill>`
