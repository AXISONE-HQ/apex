# PROD — AI Practice Planner (Differentiator v1)

## Summary
Help coaches generate **data-informed** structured practices quickly using a **template library** + AI drill recommendations, then reuse and track session history.

## Users
- Coach (primary)
- Players/Parents (secondary consumers of the plan)

## Problem
Practice planning is time-consuming and inconsistent. Coaches also lack a fast way to translate **evaluations + recent game outcomes** into a targeted plan.
Apex differentiates by making development structure easy, repeatable, and grounded in club/team data.

## Scope
### 1) Template Library (first-class deliverable)
- Seeded **basketball** template library with metadata + filters:
  - **Age band:** U13 / U15 / U18 (configurable)
  - **Complexity:** Easy / Medium / Hard
  - **Category:** Skills / Conditioning / Evaluation / Plays (extensible)
  - **Sport:** Basketball (v1) with framework to add more sports
- Template structure (minimum): sport, age_band, complexity, category, duration, equipment, #players, space needs
- Practice blocks: warmup → core → competitive → cooldown, including coaching cues

### 2) AI Plan Generation (template-first)
- AI starts from 1–3 recommended templates, then adapts drills/blocks.
- Inputs (v1): team, age band, complexity target, time available, category focus.

### 3) Data-informed planning (MVP)
- Use **player evaluations** and **recent game results** (MVP = win/loss + score margin) to recommend:
  - 1–3 practice objectives with a short rationale (“why these focus areas now”)
  - template/drill choices mapped to objectives
- Graceful fallback when data is missing: ask 1–2 questions + default to templates.

### 4) Periodization (v1)
- Lightweight structure across sessions (e.g., emphasize skill building vs competitive blocks) without complex season-long automation.

### 5) Session history + reuse
- Save, clone, and iterate plans; searchable by team/date/tag.

### 6) Export/share
- Printable/shareable practice plan format.

## Non-goals
- Full stat breakdowns (turnovers, rebounds, shot charts) in MVP
- Full video analysis
- Personalized athlete plans across seasons (later)

## Success metrics
- Median time to produce a practice plan < 10 minutes
- Repeat usage: % coaches generating 2+ plans/week
- % of generated plans that reference evaluations/results as rationale (when data exists)

## Acceptance criteria
- [ ] Coach can browse, filter, and preview the template library
- [ ] Library contains a **minimum seed set of 25 basketball templates** across age/complexity/categories (AI-generated, then coach reviewed/approved)
- [ ] Coach can generate, edit, and save a plan (AI recommends; coach can approve/edit/replace activities; **saved by coach = approved** for MVP)
- [ ] Generated plan includes 1–3 objectives + rationale (evaluations + game outcomes window)
- [ ] Plan references drills with tags (skill, intensity, duration)
- [ ] Session history searchable by team/date/tag
- [ ] Safety: prompts/outputs avoid unsafe guidance (sport/age appropriate)

## Dependencies
- Scheduling (to attach plans to practices) (recommended)
- Player evaluations data model + capture UX
- Match/game results (MVP: final score + margin)
- Team context + skill taxonomy
- OpenAI/key management and usage limits

## Open questions
- Initial sport wedge for templates: basketball only, or basketball + one more (e.g., soccer) for schema validation?
- Source of seed templates/drills: coaching staff authored vs AI-generated then approved?
- Do we require offline/print-first outputs for MVP?
