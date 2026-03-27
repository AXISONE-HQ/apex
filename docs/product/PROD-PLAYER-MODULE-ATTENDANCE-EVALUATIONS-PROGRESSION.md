# PROD — Player Module: Attendance + Evaluations + AI Progression Plan

## Summary
A player-centric experience that tracks attendance and evaluations (tryouts + evaluation sessions) and uses AI to propose an **actionable progression plan** that coaches can refine and parents/players can understand.

## Users
- **Player** (views plan + progress)
- **Parent** (views plan + progress for their child)
- **Coach** (provides evaluations, reviews/edits AI plan, adds qualitative guidance)
- **Club Director** (program consistency oversight)

## Problem
Clubs and parents lack a clear, shared view of player development.
- Players don’t know what to work on.
- Parents don’t have visibility into progress.
- Coaches have data (tryouts/attendance) but no system that turns it into a consistent plan.

## Scope (MVP)

### 1) Player profile (single source of truth)
- Player identity + attributes (name, age/DOB, position(s), jersey #)
- Team membership(s) + season context
- Permissions: player/parent sees own profile; coaches see rostered players

### 2) Attendance history
- Per-event attendance records (present/absent/late/excused)
- Summaries:
  - attendance rate (season + trailing 30 days)
  - streaks (optional)

### 3) Evaluations timeline
- Baseline from **tryout** (preferred) or **evaluation session**
- Ongoing evaluations (coach-entered)
- A minimal rubric per sport (basketball v1)

### 4) AI-generated progression plan (core deliverable)
**Inputs (v1):**
- Tryout + evaluation results (scores + coach notes)
- Attendance signals (reliability/consistency)
- Team context (age band, complexity level)
- Optional coach focus (e.g., “ball handling under pressure”)

**Outputs (v1):**
- 3–5 prioritized development goals (skills, play IQ, conditioning/cardio)
- Recommended weekly focus (e.g., 2 skill workouts + 1 conditioning focus)
- Suggested drills/activities (template-linked where possible)
- Explainability: “why this plan” (which signals drove recommendations)

**Coach workflow:** AI proposes → coach reviews/edits → **saved by coach = approved**.

### 5) Player/Parent view
- Clear, friendly plan view (avoid jargon)
- Progress indicators:
  - evaluation deltas (baseline → latest)
  - attendance trend
- Notes/feedback section (coach qualitative guidance)

## Non-goals (MVP)
- Full game stat breakdowns
- Wearables integration
- Automated personalized nutrition/medical advice
- Real-time chat/messaging (separate module)

## Success metrics
- % players with an approved plan within 2 weeks of season start
- Repeat engagement: players/parents viewing plan weekly
- Coach time saved vs manual planning

## Acceptance criteria
- [ ] Player profile exists with team + season context
- [ ] Attendance is displayed per player and summarized
- [ ] Evaluations timeline shows baseline (tryout/eval session) and latest
- [ ] AI can generate a progression plan using available signals
- [ ] Coach can edit the plan and add qualitative notes
- [ ] Saved by coach = approved; player/parent view is read-only (MVP)
- [ ] Plan shows explainability (top drivers)

## Dependencies
- Scheduling + attendance data model
- Tryouts module + evaluation session support
- Drill/template taxonomy (from Practice Planner) to recommend activities
- RBAC + parent/player linking
- OpenAI/key management + cost/rate limits

## Open questions
- Do we expose **raw evaluation scores** to parents/players in MVP, or only interpreted levels + narrative?
- Do we let players “check off” activities in the plan (habit tracker) in MVP?
