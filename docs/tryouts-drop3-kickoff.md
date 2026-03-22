# Tryouts Drop 3 Kickoff Prep

## Objectives
1. Link AI practice plans directly on the Overview tab (plan banner CTA should attach a plan + show status).
2. Wire roster mutation APIs (create/update/delete) so finalized placements sync server-side.
3. Harden results compare UX on mobile (collapsible table, sticky compare chip).
4. Expand automated tests: add E2E flow covering finalize → roster download → plan link.

## Dependencies / Notes
- Backend team needs the roster mutation endpoints surfaced by Tuesday.
- Reuse `tryout-roster-history-updated` event for any future widgets—avoid inventing new events.
- Coordinate with AI Practice Plan squad before altering `/app/practice-plans` routes.

## Next Steps
- [ ] Draft API contract for roster mutations.
- [ ] Audit Plan Builder components for embedding inside Overview.
- [ ] Schedule Drop 3 kickoff review with Fred + AI squad (target Monday 10am ET).
