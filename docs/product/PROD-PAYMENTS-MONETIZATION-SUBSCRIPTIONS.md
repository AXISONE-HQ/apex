# PROD — Payments & Monetization (Subscriptions)

## Summary
Implement tiered club subscriptions with feature gating and an admin view for entitlements.

## Users
- Master Admin (billing ops)
- Club Director (plan selection, invoices)

## Problem
Apex needs a scalable revenue system. Monetization must be reliable and tightly integrated with entitlements.

## Scope
- Subscription tiers (by club size / feature set)
- Billing provider integration (TBD)
- Entitlements/feature gating (AI premium, modules)
- Invoices + basic billing history
- Admin tooling for plan overrides with audit logs

## Non-goals
- Marketplace/storefront
- Complex revenue recognition

## Success metrics
- Successful trial → paid conversion flow
- Low billing support ticket rate

## Acceptance criteria
- [ ] Club can start trial and subscribe
- [ ] Access changes correctly by tier
- [ ] Admin can view/override entitlements (audited)
- [ ] Webhooks handled reliably (idempotent)

## Dependencies
- Club lifecycle states
- Admin Panel (entitlements)

## Open questions
- Provider choice (Stripe?) and whether invoicing is required in v1
