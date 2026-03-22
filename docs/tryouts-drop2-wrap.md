# Tryouts Drop 2 Wrap Notes (2026-03-22)

## Delivered in this slice
- Finalize state now persists per tryout (localStorage) and rehydrates the "Finalize placements" + roster generation toggles.
- Overview tab banner + roster exports card guide directors into practice plans while surfacing the latest CSV downloads.
- Results tab upgrades: compare drawer, favorites, roster history filters, AI plan CTA, and roster download history (shared across tabs).
- Event bus notes (`tryout-roster-history-updated`) documented for future consumers.

## Follow-ups / Next up
1. Persist finalize/lock state server-side so it survives device changes.
2. API work for roster mutations + evaluator result syncing.
3. UX polish: highlight best block deltas, tighter responsive layouts.
4. Drop 3 scope: AI plan linking on Overview, mutation APIs, E2E runbook.

## Testing
- `npm run test -- src/components/tryouts/__tests__/tryouts-ui.test.tsx`
