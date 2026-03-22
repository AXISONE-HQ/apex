# Tryouts Event Bus Notes

We expose lightweight custom browser events so different client surfaces can stay in sync without wiring extra API calls. Current events:

| Event name | Payload | Emitted | Consumers | Notes |
|------------|---------|---------|-----------|-------|
| `tryout-roster-history-updated` | `{ detail: { tryoutId: string } }` | Results tab after a roster CSV export | Overview tab (and any future sidebar widgets) | Used to refresh per-tryout roster download history. Listeners should also watch the `storage` event for cross-tab updates.

When adding new consumers, ensure you clean up listeners on unmount and scope them to the active tryout id to avoid unnecessary renders.
