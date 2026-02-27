# Apex v1 — Gate D4: Async Isolation + Resilience Policy

## Status
- **Gate:** D4 (Heavy task isolation)
- **State:** 🚧 In progress
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

## Next step to fully complete D4
Implement explicit async worker path for heavier tasks:
- Introduce `apex-{env}-worker` service + queue.
- Move non-interactive heavy generation/analysis workloads off request path.
- Keep synchronous path for lightweight, interactive requests only.

## Acceptance note
D4 is fully complete after worker/queue path is live for heavy non-critical operations.
