# Apex v2 — Local Project Dashboard

This dashboard tracks epics/workflows + status and can generate CTO tech brief drafts for an EPIC.

## Run (recommended)
Use the bundled Node server (supports `/api/brief` generation):

```bash
cd projects/apex-v1/docs/v2/dashboard
node server.js
# open http://localhost:7331/dashboard/
```

## Data source
- `docs/v2/PRODUCT-ROADMAP.md`

## Brief output
- Generated briefs are saved to: `docs/v2/briefs/`

## Notes
- The brief generator uses a quick grep-based code snapshot. It’s a starting point, not a substitute for deeper review.
