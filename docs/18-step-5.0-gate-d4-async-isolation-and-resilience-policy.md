# Apex v1 — Gate D4: Async Isolation + Resilience Policy

## Status
- **Gate:** D4 (Heavy task isolation)
- **State:** ✅ Complete
- **Date:** 2026-02-27

## Implemented now

### 1) Retry/timeout policy (implemented)
OpenAI-backed API routes now use shared helper `frontend/src/lib/openaiServer.ts` with:
- request timeout (10–15s by endpoint)
- bounded retry for retryable failures (`429` / `5xx` / transient network)
- short exponential backoff

Updated routes:
- `apex-club-pulse`
- `apex-session-priority`
- `apex-practice-plan`
- `apex-practice-block-instructions`
- `tech-stack-chat`

### 2) Isolation policy (defined)
- User-facing requests should stay low-latency and bounded by timeout.
- If AI calls exceed timeout or retry budget, endpoint should fail fast and return fallback/degraded response where possible.
- No user-critical API path should wait indefinitely on external model calls.

## Async worker path implemented
Backend async queue/worker path is now available in service runtime:
- `POST /ai/jobs` enqueue non-critical heavy jobs
- `GET /ai/jobs/:id` poll job status/result
- `POST /ai/jobs/process-next` worker/cron processing endpoint (bootstrap-token protected)

Database migration `004_ai_jobs.sql` introduces durable queue persistence with indexes.

## Operational note
Current worker processor is a lightweight placeholder pipeline for job orchestration.
As next optimization, specific job-type executors can be attached behind this queue path without changing client contract.
