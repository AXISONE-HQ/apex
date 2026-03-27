# PROD — Foundations: Platform + Roles + Data Model

## Summary
Establish secure multi-tenant foundations (org/team/user model + RBAC + scoped permissions) so the product can ship safely and scale.

## Users
- All users indirectly (Director, Coach, Player, Parent)
- Master Admin (platform governance)

## Problem
Without a strict tenant model and enforceable permissions, every feature risks cross-club data leakage, inconsistent behavior, and expensive rework.

## Scope
- Core entities: organizations (clubs), teams, players, memberships
- RBAC roles mapped to permission bundles
- Scope-aware permissions (platform/org/team/player)
- Session model: effective roles + permissions + active org + scopes
- Admin tooling for role assignment + seeds
- Contract tests for auth/authz behavior

## Non-goals
- Feature UI polish
- Scheduling, comms, AI, payments

## Success metrics
- 0 known cross-tenant data access paths in covered endpoints
- Auth/authz contract tests green in CI

## Acceptance criteria
- [ ] Tenant boundaries enforced in queries (org_id scoping)
- [ ] Role → permission resolution is deterministic and tested
- [ ] Middleware/guards block unauthorized routes
- [ ] Seed/demo flows work end-to-end
- [ ] Negative tests exist for denied access

## Dependencies
- None (this is the base layer)

## Open questions
- Canonical initial role set for MVP (Director/Coach/Parent/Player variants)
