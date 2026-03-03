# PROD — Tryouts Module (MVP)

## Summary
A tryouts module that lets clubs schedule and run tryouts (often for multiple teams in the same category), invite/register players, check them in on-site, score them with multiple coaches, and use results to form teams and set the season baseline.

## Users
- **Club Director** (creates tryout, manages registration, assigns coaches, forms teams)
- **Coach / Evaluator** (scores players during tryout)
- **Player** (registers/checks in)
- **Parent** (registers/pays, receives comms)
- **Master Admin** (support)

## Problem
Serious clubs start each season with tryouts to:
- recruit/invite new players,
- evaluate and rank them, and
- assign them to teams (often multiple teams under the same category).
Without tryouts, team creation and “baseline evaluation” are manual and inconsistent.

## Scope (MVP)
### 1) Tryout event setup
- Create tryout with:
  - category (age band + gender), season association, location
  - date/time, duration, capacity
  - target teams (e.g., U13 Boys A + U13 Boys B)
- Attach a **plan/run-of-show** (schedule blocks, stations) — can later integrate Practice Planner

### 2) Invitations + registration
- Invite players/parents (email-first MVP)
- Registration form (player info + parent contact)
- Status: invited / registered / checked-in / evaluated

### 3) Optional tryout fee
- Configure tryout fee (amount, currency)
- Track payment status: unpaid / paid / refunded (MVP: record-only if payments not integrated)

### 4) On-site check-in (QR)
- “Check-in screen” view (tablet/TV) showing a **QR code**
- Player scans QR → opens check-in page → confirms identity
- System assigns a **tryout number** (bib number) for evaluators to reference

### 5) Multi-coach evaluations
- Multiple coaches can score the same player
- Scoring rubric per sport/category (basketball v1)
- Capture:
  - numeric scores per skill
  - optional notes/tags
- Aggregate view:
  - per player average + variance across evaluators
  - rankings by category

### 6) Outcomes: team formation + baseline
- From tryout results, club can:
  - select players → add to roster for Team A/B
  - export roster list
- Tryout results become the **season baseline evaluation** for pulse/planning.

## Non-goals (MVP)
- Full stat breakdowns from games
- Advanced payments automation (if not already in billing scope)
- Video capture/analysis
- Complex bracket/tournament logic

## Success metrics
- Time to run a tryout (setup → check-in → scoring → roster decisions) without spreadsheets
- % teams with a baseline evaluation created via tryout
- Coach satisfaction (qualitative) for scoring UX

## Acceptance criteria
- [ ] Director can create a tryout tied to a category and optionally multiple target teams
- [ ] Players/parents can register and appear in the tryout roster
- [ ] Check-in flow via QR assigns a unique tryout number per player
- [ ] Multiple evaluators can score players concurrently
- [ ] Director can view aggregated results and assign players to teams
- [ ] Tryout results persist and are reusable as season baseline

## Dependencies
- Team/category model (age band + gender)
- Player/parent linking
- Scheduling/events framework
- Auth + RBAC (coach/evaluator permissions)

## Open questions
- Do we require payment to complete registration for MVP?
- Do we support walk-up registration on-site (no pre-invite)?
- How many rubric categories for basketball v1 (keep small to be usable on mobile)?
