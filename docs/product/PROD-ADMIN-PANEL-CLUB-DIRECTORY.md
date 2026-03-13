# PROD — Admin Panel: Club Directory

## Summary
A searchable, filterable directory of all clubs on the platform with key identifiers and lifecycle status.

## Users
- Master Admin / AxisOne Admin

## Problem
Ops needs a single place to find clubs, understand where they are in lifecycle, and quickly navigate to details—without relying on engineering or raw SQL.

## Scope
- List clubs with:
  - name, slug, country/region, sport
  - status: onboarding / active / suspended / offboarded
  - created date
  - (optional) pulse score + “needs attention” indicator
- Filters: status, country, sport, needs-attention
- Sort + pagination

## Non-goals
- Full analytics dashboard (separate feature)
- Club editing (handled in onboarding/profile)

## Success metrics
- Median time to locate a club < 30 seconds
- < 1% directory API errors in admin usage

## Acceptance criteria
- [ ] DB-backed data source (no demo-only)
- [ ] API supports pagination, filtering, sorting
- [ ] UI displays consistent columns and loading/error states
- [ ] Clicking a club navigates to Club Profile
- [ ] Permissions enforced (platform admin only)

## Dependencies
- Organizations table + profile fields
- Admin Panel Access + Guardrails

## Open questions
- What are the canonical lifecycle statuses and who can change them?
