# Apex v1 — Gate D3: Stateless Runtime Constraints

## Status
- **Gate:** D3 (Stateful logic removed from instances)
- **State:** ✅ Complete
- **Date:** 2026-02-27

## What was verified/implemented

1. **Session state is managed-store backed**
   - API reads session from cookie `apex_session` and resolves session data from `sessions` table.
   - No in-memory session cache is used for authenticated runtime flow.

2. **Runtime header auth override restricted**
   - `x-user` debug override is now allowed only in `development` and `test`.
   - Staging/production cannot bypass session-based auth via header injection.

3. **Staging/production DB requirement enforced**
   - Service now throws at startup if `NODE_ENV` is `staging` or `production` and `DATABASE_URL` is missing.
   - Prevents accidental fallback runtime behavior in cloud environments.

## Notes
- In-memory repository arrays remain as local/dev fallback only when no DB is configured.
- With staging/prod guardrails, cloud runtime path is DB-backed and stateless at instance level.
