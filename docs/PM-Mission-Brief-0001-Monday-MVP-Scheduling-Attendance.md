# PM Mission Brief #0001 — Monday MVP: Scheduling + Attendance

**Deadline:** Next Monday (hard)  
**Owner:** PM  
**Executor:** CTO → Coder  
**KR mapping:** Activation (Objective 1), Director weekly workflow adoption (Objective 2), Reliability (Objective 4)

---

## Objective
Ship an MVP that enables a director to set up a club and run the first week, and enables coaches to track attendance for scheduled events.

## Primary users
- Director (club setup + teams + schedules)
- Coach (attendance)
- Super admin (create clubs / onboarding visibility) — internal

---

## In scope (must work end-to-end)
### Director
1. Create club (or super-admin creates club) and access director dashboard/home
2. Create teams
3. Add players to teams (manual entry OK)
4. Assign coach(es) to team
5. Create events (practice/game) with date/time, team, location (free text OK)
6. View team schedule (list view is fine)

### Coach
7. View team schedule
8. Mark attendance for an event (present/absent)
9. View attendance summary for that event (counts)

### Super admin (internal)
10. Create new club and assign initial director user
11. View basic onboarding status for a club (created teams? created events?)

---

## Acceptance criteria (definition of done)
- A director can complete steps 1–6 in **< 30 minutes** with no P1 blockers.
- A coach can complete steps 7–9 in **< 5 minutes** for a single event.
- Data integrity: attendance persists; schedule persists; role permissions enforced on happy path.
- Basic instrumentation exists for:
  - club_created, team_created, player_added, coach_assigned, event_created, attendance_marked

---

## Out of scope (explicitly NOT for Monday)
- Payments / billing
- Tryouts workflows
- Player-parent performance plans
- AI practice planning
- Rich evaluation rubrics (beyond placeholder)
- Notifications reliability guarantees (nice-to-have only)
- Multi-sport support (basketball wedge only)

---

## Risks
- Scope creep (mitigation: reject additions that don’t map to acceptance criteria)
- Reliability issues due to rushed changes (mitigation: stabilization day Sunday)

---

## Notes / constraints
- Minimal UI acceptable. The priority is a working loop for 1–3 pilot clubs.
- Any additional feature request must be presented as Option A/B with impact on deadline.
