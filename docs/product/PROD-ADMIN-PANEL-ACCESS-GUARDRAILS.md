# PROD — Admin Panel: Access + Guardrails

## Summary
Secure the Admin Panel so only platform admins can access it, and ensure all admin actions are auditable and operationally safe.

## Users
- Master Admin / AxisOne Admin
- SuperAdmin

## Problem
Admin surfaces are high-risk: a single misconfigured permission or unlogged action can cause cross-tenant data exposure or irreversible damage.

## Scope
- **Platform permission gates**
  - Admin UI routes require platform admin role(s)
  - Admin API endpoints require `admin.*` permissions at **platform scope**
- **Audit logging**
  - Record: actor, action, target (org/team/user), timestamp, request id
- **Safety controls**
  - Confirmations for destructive actions (future)
  - Rate limiting for admin endpoints
  - Clear, non-leaky error messages

## Non-goals
- Complex SIEM/SOC integrations
- Fine-grained per-action approval workflows

## Success metrics
- 0 unauthorized access to admin endpoints (tested)
- 100% of admin writes produce an audit record

## Acceptance criteria
- [ ] Admin pages are inaccessible to non-admin users (server-side enforced)
- [ ] Admin API endpoints use centralized authz middleware
- [ ] Audit event emitted for each create/update/delete admin action
- [ ] Rate limiting enabled on admin endpoints
- [ ] Tests cover: allowed/denied access + audit emission

## Dependencies
- Foundations (RBAC, session model)

## Open questions
- Where do audit logs live in v1 (DB table vs structured logs only)?
