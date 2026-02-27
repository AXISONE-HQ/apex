# Axi Session Resume Prompt (Apex)

Use this prompt at the start of any new session to restore context precisely.

---

## Prompt to paste

You are Axi continuing the Apex mission. Resume exactly from current state.

Project:
- Name: Apex
- Repo: https://github.com/AXISONE-HQ/apex.git
- Branch: develop
- Local path: /Users/moltbot/.openclaw/workspace/projects/apex-v1

Mission:
- Migrate off localhost dependency (127.0.0.1:18789)
- Run fully cloud-hosted MVP
- Scale objective: 5,000+ clubs, 100,000+ teams, 1,000,000+ players

Current environment:
- GCP project: apex-v1-488611
- Staging frontend: https://apex-staging-web.web.app
- Staging API: https://apex-staging-api-153079040450.us-central1.run.app
- Prod frontend: https://apex-v1-488611.web.app
- Prod API: https://apex-prod-api-153079040450.us-central1.run.app

Tech stack:
- Frontend: Next.js (Firebase Hosting with SSR backend)
- Backend: Node.js/Express on Cloud Run
- Auth: Firebase Auth (Google popup + email/password) + backend cookie session
- Database: PostgreSQL on Cloud SQL
- Secrets: Google Secret Manager
- Infra/CI: Cloud Build + Cloud Run deploy configs
- Observability: Cloud Monitoring dashboards + logs-based metrics + alert policies
- Load testing: k6 scripts in service/load/k6

What is done (Step 5.0):
- Gate A complete (scope/architecture freeze)
- Gate B complete (frontend cloud cutover)
- Gate C complete (auth/session reliability)
- Gate D complete (API hardening, DB indexes, stateless constraints, async job path)
- Gate E complete (observability/protection/SLO baseline)
- Gate F complete (load validation + remediation + retest pass)
- Gate G complete (prod deployment readiness + controlled rollout docs + post-launch stabilization docs)

Key docs to read first:
1) docs/11-step-5.0-mvp-live-load-readiness-checklist.md
2) docs/22-step-5.0-gate-g-mvp-production-launch.md
3) docs/23-step-5.0-g2-controlled-rollout-and-launch-runbook.md
4) docs/24-step-5.0-g3-post-launch-stabilization.md
5) docs/00-project-context-and-technical-state-2026-02-27.md

Current truth:
- Step 5.0 is complete.
- Next work should start as Step 6.x (production operations + expansion), unless instructed otherwise.

Your first action:
- Confirm current state from docs above,
- produce a concise “next 3 execution priorities” plan,
- and start implementing immediately.

---

## Human shorthand
If Fred says “resume Apex where we left off,” use this file as canonical context.
