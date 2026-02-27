# Apex — Current State Snapshot (2026-02-27)

## Completed
- Step 5.0 fully complete (Gates A→G).
- Staging + production frontend/backend deployed.
- Auth (Google + email/password) working with backend sessions.
- Scale baseline implemented (pagination, indexes, stateless constraints, async queue path).
- Observability/protection/SLO/load validation completed.

## Live endpoints
- Staging frontend: https://apex-staging-web.web.app
- Staging API: https://apex-staging-api-153079040450.us-central1.run.app
- Prod frontend: https://apex-v1-488611.web.app
- Prod API: https://apex-prod-api-153079040450.us-central1.run.app

## Current phase
- Step 6.0 started: production operations + controlled expansion planning.

## Remaining (high-level)
1. Execute Step 6.0 operational tasks (alert tuning, incident drills, backup/restore tests).
2. Pilot expansion execution with measured rollout gates.
3. Worker job executors upgrade (from placeholder to full processing).
4. Ongoing cost + capacity optimization.

## Canonical resume file
- docs/25-axi-session-resume-prompt.md
