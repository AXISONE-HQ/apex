# Apex v1 — Step 5.0 / Gate D: Backend/API Scale Baseline

## Status
- **Gate:** D (Backend/API Scale Baseline)
- **State:** 🚧 In progress (D1 complete)
- **Date:** 2026-02-27
- **Owner:** Fred + Axi

## Goal
Harden API and data access patterns so MVP can safely scale toward:
- 5,000+ clubs
- 100,000+ teams
- 1,000,000+ players

---

## Scope (this gate)

### D1. API contract hardening
- Enforce pagination on list endpoints (teams, players, matches)
- Add input validation on critical write routes
- Standardize error envelope + status behavior

### D2. Database performance baseline
- Document tenant-aware index strategy (org/team/player/session paths)
- Add/verify indexes for high-growth entities
- Review query plans for top read routes

### D3. Stateless API constraints
- Confirm no in-memory session state dependencies
- Confirm all auth/session state is DB/cookie-backed

### D4. Heavy task isolation
- Identify synchronous high-cost paths
- Define async backlog (queue/worker split) for non-critical heavy work

---

## Immediate execution plan (next)

1. ✅ **Endpoint audit**
   - Enumerated list endpoints and removed unbounded responses.

2. ✅ **Pagination implementation**
   - Added `limit` + `offset` in repository + route layers.
   - Applied safe defaults and max cap (`limit <= 100`).

3. ✅ **Validation pass**
   - Added minimal payload checks for create/update routes (teams/players/matches).

4. ✅ **Error normalization**
   - Standardized domain 400/404 responses with structured JSON error envelope.

5. **Index + query review**
   - Extract top queries and map required indexes.
   - Record SQL/index changes in migration doc.

6. **Document async candidates**
   - OpenAI-heavy and analytics-like workloads to worker backlog.

---

## Acceptance criteria
- No unbounded list endpoint in MVP surface
- Pagination defaults + caps are enforced server-side
- Critical write routes reject malformed input consistently
- Index plan documented and applied for primary growth tables
- Query hotspots documented with remediation actions

---

## References
- Master checklist: `docs/11-step-5.0-mvp-live-load-readiness-checklist.md`
- Gate A: `docs/13-step-5.0-gate-a-scope-and-architecture-freeze.md`
- Gate B: `docs/14-step-5.0-gate-b-frontend-cloud-cutover.md`
