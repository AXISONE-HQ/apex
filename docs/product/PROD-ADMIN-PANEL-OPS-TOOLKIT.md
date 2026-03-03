# PROD — Admin Panel: Ops Toolkit (Support + Diagnostics)

## Summary
A set of safe, permissioned tools that reduce engineering interrupts by enabling admins to diagnose and resolve common issues.

## Users
- Master Admin / AxisOne Admin

## Problem
Support incidents are expensive when every investigation requires engineering. Admins need visibility and a small set of safe tools.

## Scope (v1)
- "View as" role simulation (read-only) for a given user/org
- Recent activity feed (key events, errors, failed jobs)
- Feature flag / entitlements viewer (and optional overrides with audit)
- Data integrity checks (orphan records, missing memberships)

## Non-goals
- Full impersonation with write access (high risk; later)
- Direct DB editing

## Success metrics
- Top 5 support tickets resolvable without engineering involvement

## Acceptance criteria
- [ ] Each tool is permissioned + audit logged
- [ ] Read-only tools are default; write tools require explicit confirmation
- [ ] No sensitive data leakage across tenants

## Dependencies
- Audit log
- Health metrics + activity tracking

## Open questions
- Which support tickets are most common today (so we prioritize the right tools)?
