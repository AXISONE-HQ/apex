# PRODUCT ROADMAP v2 — Epics & Workflows (Living)

**Owner:** Product  
**Last updated:** 2026-03-04  
**Purpose:** A single, updatable view of *what’s shipped*, *what’s in progress*, and *what remains* per epic/workflow.

## Status legend
Use one of:
- **Completed**
- **In progress**
- **Not started**
- **Need to confirm with code**

## How to update this doc
- When an epic/workflow is completed, set its status to **Completed** and add a short note under **Evidence** (PR link, release note, demo date).
- Prefer updating at the **workflow** level (more actionable than epic-only).

---

## EPIC 1 — Club Setup & Organizational Structure

### Workflow 1: Create a Club (Master Admin / Club Director)
**Status:** In progress

**Goal**
- A new club joins Apex and becomes fully operational.

**User stories & acceptance criteria**
1) Create Club Account
- Club name
- Logo upload
- Sport type
- Location
- Subscription plan selection
- Payment setup
- Confirmation email

2) Configure Club Settings
- Age categories
- Competition levels
- Season start/end
- Default training duration
- Evaluation criteria templates
- Communication policies

3) Add Coaches (invite flow)
- Enter email
- Assign role (Head Coach / Assistant)
- Assign team(s)
- Coach receives invite
- Coach sets password & profile

4) Create Teams
- Team name (e.g., U14 AAA)
- Season year
- Assigned coach
- Training frequency
- Home venue

**Evidence**
- (add PRs / demo links)

**Notes / Open questions**
- Payments required at launch or later?
- What’s the first sport wedge (affects defaults)?

---

## EPIC 2 — Team Setup & Player Management

### Workflow 2: Add Players & Parents
**Status:** Not started

**User stories**
1) Add Player Manually
- Name, DOB, Position, Jersey #
- Parent email
- Emergency contact

2) Invite Player & Parent
- Player receives access
- Parent linked to player profile
- Role-based dashboard auto-assigned

3) Manage Player Profile
- Position update
- Skill tags
- Injury notes
- Development goals

**Evidence**
- (add PRs / demo links)

---

## EPIC 3 — Scheduling (Games, Practices, Events)

### Workflow 3: Schedule a Practice
**Status:** Need to confirm with code

**Flow**
- Click “Create Event”
- Select type: Practice
- Choose date/time
- Select venue
- Add notes
- Attach practice plan (optional)
- Notify team automatically

**System actions**
- Push notification
- Calendar sync (Google later)
- Attendance toggle enabled

**Evidence (known from repo history)**
- Events list UI (`/apex/schedule`)
- Create event UI (form + validation)
- Event detail route

**Gaps to reach ✅**
- Confirm event type = Practice implemented end-to-end
- Notification delivery (currently reminders endpoint was log-only earlier)

### Workflow 4: Schedule a Game
**Status:** Not started

**Additional fields**
- Opponent name
- Location (home/away)
- Game type (League / Friendly / Tournament)
- Uniform color
- Arrival time

### Workflow 5: Attendance Tracking
**Status:** Need to confirm with code

**Flow**
- RSVP: Yes / No / Late
- Optional note
- Coach sees attendance summary
- Attendance analytics saved

**Evidence (known from repo history)**
- Attendance yes/no/maybe exists in UI

**Gaps to reach ✅**
- RSVP “Late” + optional note (confirm)
- Analytics persistence + summary views (confirm)

---

## EPIC 4 — Practice Planning (AI Powered)

### Workflow 6: Create Practice Plan
**Status:** Not started

**Flow**
- Select focus (Shooting / Defense / Transition)
- Select duration (90 min)
- Choose skill emphasis
- AI generates: warm-up / skill / competitive / conditioning
- Coach edits
- Save to team history

### Workflow 7: Practice History Tracking
**Status:** Not started

**System tracks**
- Date
- Focus area
- Skill category
- Intensity
- Attendance

---

## EPIC 5 — Player Evaluation & Development

### Workflow 8: Player Evaluation (Game or Practice)
**Status:** Not started

**Criteria**
- Shooting, Defense, IQ, Effort, Teamwork, Athleticism
- Score 1–5 + comments
- Saved to player profile; seasonal tracking graph

### Workflow 9: Long-Term Development Tracking
**Status:** Not started

**Dashboard**
- Strength radar chart
- Historical score trends
- Coach comments
- Focus areas

---

## EPIC 6 — Tryouts

### Workflow 10: Create Tryout Event
**Status:** Not started

### Workflow 11: Tryout Scoring
**Status:** Not started

### Workflow 12: Team Assignment After Tryouts
**Status:** Not started

---

## EPIC 7 — Communication System

### Workflow 13: Team Chat
**Status:** Need to confirm with code

**Includes**
- Text
- Attachments
- Event-linked discussions
- Notification system

**Evidence (known from repo history)**
- Team messages (team-scoped chat) exists + RBAC + rate limit

**Gaps to reach ✅**
- Attachments support (confirm)
- Event-linked discussions (confirm)
- Notification behavior (confirm)

### Workflow 14: Club Announcements
**Status:** Need to confirm with code

**Options**
- Target all
- Target coaches only
- Target parents only
- Schedule announcement

**Evidence (known from repo history)**
- Announcements CRUD exists + RBAC + rate limit

**Gaps to reach ✅**
- Targeting controls (confirm)
- Scheduled announcements (confirm)

### Workflow 15: Parent-Coach Communication (private)
**Status:** Not started

**Rules**
- Role-based messaging
- Moderation logs
- No player-to-player DMs (optional policy)

---

## EPIC 8 — Analytics & Insights

### Workflow 16: Attendance Analytics
**Status:** Not started

- View attendance %
- Late trends
- Per-player reliability score

### Workflow 17: Player Development Insights
**Status:** Not started

- AI identifies stagnation
- Recommends focus drills
- Suggests position change (future)

---

## EPIC 9 — Role-Based Access Control (RBAC)

**Status:** Need to confirm with code

| Role | Can See | Can Edit |
|------|---------|----------|
| Club Director | All teams | All |
| Coach | Assigned teams | Assigned teams |
| Player | Own data | Limited |
| Parent | Linked child | None |
| Master Admin | All clubs | Governance only |

**Evidence (known from repo history)**
- Multiple RBAC-related fixes + negative tests in comms/events areas.

**Gaps to reach ✅**
- Confirm RBAC coverage across *all* workflows in Epics 1–7.

---

## Complete workflow overview (high-level)
Club signs up → Director sets structure → Teams created → Coaches invited → Players added → Parents linked → Schedule events → Track attendance → Run practices → Evaluate players → Track development → Run tryouts → Assign teams → Analyze performance → Communicate continuously
