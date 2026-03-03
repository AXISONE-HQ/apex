# PROD — Club & Team Management (MVP Admin)

## Summary
Enable clubs to be created, configured, and managed with teams/rosters and role-based access.

## Users
- Club Director (primary)
- Coach (primary)
- Parent/Player (view/access tied to membership)
- Master Admin (provisioning + support)

## Problem
Clubs can’t adopt Apex without basic structure: org profiles, teams, rosters, and correct role access.

## Scope
- **Club creation is Super Admin only** (platform-level provisioning)
- Club profile: name, slug, region, sport, contacts

### Teams
- Multi-team structure
- A club can run **multiple teams in the same category** (e.g., “U13 Boys A” and “U13 Boys B”)
- Team can be defined by: category (age band + gender), level/tier (A/B/Elite/Rec), and season
- Team has **season start/end dates** (MVP)

### Team roles & permissions
- Team-level roles (MVP): Director, Head Coach, Assistant Coach, Team Manager (optional)
- Define who can: edit team details, manage roster, invite/remove members

### Roster management
- Add/remove players
- Player lifecycle/status: active / inactive / injured / guest
- Basic attributes: DOB (or age band), position(s), jersey # (MVP set)
- Add players from **club-wide player list**
- Add players from **previous tryouts** (if/when tryouts exist)
- Transfer player between teams in same club (no delete/recreate)

### Invites & linking
- Club can **invite** coaches, players, and parents
- Parent ↔ player linking

### Tryout → team assignment / season baseline
- If a tryout exists pre-season, use it as baseline
- If no tryout, recommend an Evaluation session to establish baseline
- Allow “select players from tryout results → add to roster” (when tryouts exist)

### Team dashboard (MVP)
- Team health (**AI-generated pulse**) with top contributing signals + missing-data warnings
- Roster snapshot
- Upcoming events snapshot

### General
- Invitations/onboarding flows (MVP)
- Permissioning for each operation

## Non-goals
- Scheduling, comms, AI practice planning, payments
- Advanced analytics

## Success metrics
- Time to create a club + first team + roster < 20 minutes
- % clubs successfully onboarded without engineering intervention

## Acceptance criteria
- [ ] **Super Admin can create a club** (platform-level) and set initial Director

### Teams
- [ ] Director can create/manage teams in their org, including **season start/end dates**
- [ ] A club can have **multiple teams in the same category** (e.g., U13 Boys A/B)
- [ ] Team category fields exist (age band + gender) and a team can have a display name/label

### Team roles & permissions
- [ ] Team roles exist (Head Coach / Assistant Coach / Team Manager as needed)
- [ ] Permissions are enforced: who can invite, edit roster, edit team

### Roster
- [ ] Coach can manage roster for assigned team(s)
- [ ] Player status supported (active/inactive/injured/guest)
- [ ] Basic player attributes supported (DOB or age band, position(s), jersey #)
- [ ] Coach/Director can add players to a team from a **club player list** (no re-entry)
- [ ] Coach/Director can transfer a player between teams (same club) without deleting
- [ ] Coach/Director can add players from **previous tryouts** (if/when tryouts data exists)

### Invites & linking
- [ ] Director can invite coaches, players, and parents
- [ ] Parent can see linked player(s)

### Season baseline
- [ ] If a team has a tryout before the season, use it as baseline; otherwise **recommend an Evaluation session** to establish baseline

### Team dashboard
- [ ] Team dashboard exists and shows: **AI-generated** team pulse/health (with top contributing signals + missing baseline warnings), roster count, upcoming events

### General
- [ ] All operations are org/team scoped; no cross-tenant reads
- [ ] DB-backed persistence (no demo-only)

## Dependencies
- Foundations (RBAC + org/team primitives)

## Open questions
- Do we support multi-season team structures in MVP or later?
