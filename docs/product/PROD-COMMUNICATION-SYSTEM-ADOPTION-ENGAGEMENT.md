# PROD — Communication System (Adoption + Engagement)

## Summary
Role-aware communication (team threads + club announcements + parent-targeting) so clubs coordinate inside Apex.

## Users
- Coach (primary sender)
- Club Director (announcements)
- Parents/Players (recipients)

## Problem
Even with schedule/rosters, clubs won’t live in Apex daily unless communication is built-in and targeted.

## Scope
- Club-wide announcements feed (director/admin)
- Team threads (coach ↔ team; parent-targeted threads)
- In-app notification center (MVP)
- Basic moderation + rate limits
- Auditability for admin broadcasts

## Non-goals
- Real-time chat polish (typing indicators, read receipts)
- Media/file sharing

## Success metrics
- % teams sending at least 1 message/week in Apex
- Reduction in off-platform comms (qualitative)

## Acceptance criteria
- [ ] Persistent storage for announcements/messages
- [ ] Audience targeting works (parents vs players vs coaches)
- [ ] Permissions enforced for sending/reading
- [ ] UI supports viewing feed + composing

## Dependencies
- Teams/rosters for audience definition

## Open questions
- Do we require email/push delivery in MVP or phase 2?
