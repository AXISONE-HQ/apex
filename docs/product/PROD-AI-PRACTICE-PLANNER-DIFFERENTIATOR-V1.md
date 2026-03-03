# PROD — AI Practice Planner (Differentiator v1)

## Summary
Help coaches generate structured practices quickly using templates + drill recommendations, then reuse and track session history.

## Users
- Coach (primary)
- Players/Parents (secondary consumers of the plan)

## Problem
Practice planning is time-consuming and inconsistent. Apex differentiates by making development structure easy and repeatable.

## Scope
- Practice templates library
- AI drill recommendations with skill tags
- Periodization (v1: lightweight blocks/structure)
- Session history (save, clone, iterate)
- Export/share format (printable/share link)

## Non-goals
- Full video analysis
- Personalized athlete plans across seasons (later)

## Success metrics
- Median time to produce a practice plan < 10 minutes
- Repeat usage: % coaches generating 2+ plans/week

## Acceptance criteria
- [ ] Coach can generate, edit, and save a plan
- [ ] Plan references drills with tags (skill, intensity, duration)
- [ ] Session history searchable by team/date/tag
- [ ] Safety: prompts/outputs avoid unsafe guidance (sport/age appropriate)

## Dependencies
- Scheduling (to attach plans to practices) (recommended)
- Team context + skill taxonomy
- OpenAI/key management and usage limits

## Open questions
- Initial sport wedge + drill library source of truth?
- Do we require offline/print-first outputs for MVP?
