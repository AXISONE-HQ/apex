# PROD — Scheduling + Attendance (Retention Baseline)

## Summary
Deliver a single source of truth for club schedules (practices/games/etc.) and attendance so clubs use Apex weekly.

## Users
- Coach (creates events, tracks attendance)
- Parent/Player (views schedule, RSVP)
- Club Director (visibility)

## Problem
Clubs churn when scheduling and attendance are fragmented across tools. Scheduling is a daily/weekly habit driver.

## Scope
- Event model supporting: practices, games, tournaments, tryouts, custom
- Calendar views (team + club), filters
- Attendance: RSVP + coach-marked presence
- Notifications: event created/changed + reminders (MVP: in-app; email/push later)

## Non-goals
- Chat/messaging threads
- Payments, ticketing
- Advanced calendar sync (Google/Apple) unless required

## Success metrics
- Weekly active coaches using schedule
- % of events with attendance recorded

## Acceptance criteria
- [ ] CRUD events with org/team scope
- [ ] Parents/players see the right team schedule
- [ ] Attendance stored and reportable per event
- [ ] Basic reminders exist (at least in-app)
- [ ] Works DB-backed in staging/prod

## Dependencies
- Teams/rosters + role access

## Open questions
- MVP attendance: simple present/absent vs availability + reasons?
