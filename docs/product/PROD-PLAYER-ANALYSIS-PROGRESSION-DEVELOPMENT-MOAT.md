# PROD — Player Analysis & Progression (Development Moat)

## Summary
Track athlete progression over time with evaluations, scoring, and explainable feedback so players/parents see improvement and clubs retain.

## Users
- Coach (evaluates, provides feedback)
- Player (receives insights)
- Parent (visibility into progress)
- Club Director (program consistency)

## Problem
Clubs lack standardized development tracking. Without visibility, parents don’t understand progress and coaches can’t prove value.

## Scope
- Tryout evaluation tools (rubrics)
- Performance scoring + notes
- Long-term tracking (timeline)
- Strength/weakness reports
- Position analysis (v1: minimal)

## Non-goals
- Computer vision video scoring
- Fully personalized training plans

## Success metrics
- % players with at least 1 evaluation per month (in-season)
- Parent satisfaction / reduced “what’s the plan?” questions

## Acceptance criteria
- [ ] Coach can run an evaluation and save results
- [ ] Player/parent can view progress summary
- [ ] Reports are consistent and explainable
- [ ] Data is scoped to org/team/player permissions

## Dependencies
- Roster + parent/player linking
- Skill taxonomy + evaluation rubrics per sport

## Open questions
- MVP rubric: generic multi-sport vs sport-specific first wedge?
