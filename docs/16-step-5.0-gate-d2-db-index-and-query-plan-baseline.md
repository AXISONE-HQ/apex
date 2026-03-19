# Apex v1 — Gate D2: DB Index + Query Plan Baseline

## Status
- **Gate:** D2 (Database performance baseline)
- **State:** ✅ Complete
- **Date:** 2026-02-27

## Tenant-aware index strategy

Primary access pattern for MVP list endpoints is:
- filter by `org_id`
- order by `created_at DESC`
- paginate via `LIMIT/OFFSET`

To support this pattern at scale, we added composite indexes in migration `003_scale_indexes.sql`:
- `teams(org_id, created_at DESC, id)`
- `players(org_id, created_at DESC, id)`
- `matches(org_id, created_at DESC, id)`
- `players(org_id, team_id, created_at DESC, id)`
- `memberships(org_id, user_id)`
- `sessions(user_id, expires_at DESC)`

## Query hotspots reviewed

Top read routes and query shape:
1. `GET /teams` → `WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
2. `GET /players` → `WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
3. `GET /matches` → `WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`

These are now index-aligned with tenant + recency patterns.

## EXPLAIN plan checklist (staging)

Run after migration apply:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, org_id, name, code, created_at, updated_at
FROM teams
WHERE org_id = '<org_uuid>'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, org_id, team_id, first_name, last_name, email, status, created_at, updated_at
FROM players
WHERE org_id = '<org_uuid>'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, org_id, home_team_id, away_team_id, starts_at, status, created_at, updated_at
FROM matches
WHERE org_id = '<org_uuid>'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

Target: index scan / bitmap index path preferred over full-table scan for non-trivial row counts.

## EXPLAIN results captured (staging)
Using org_id `32a6caf1-a200-408e-9a1f-4a56e7827d77`, all three core list queries used index paths:
- Teams: Bitmap Index Scan on `idx_teams_org_created_at`
- Players: Bitmap Index Scan on `idx_players_org_team_created_at`
- Matches: Bitmap Index Scan on `idx_matches_org_created_at`

Observed execution times were sub-millisecond to low-millisecond range on current data volume.

## Next actions
1. Move to D3 (stateless constraints verification and documentation).
2. Then D4 async isolation plan for non-critical heavy paths.
