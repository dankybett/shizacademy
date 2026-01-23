# Shiz Academy – Session Summary (Current State)

Last updated: this session

## Tech Setup
- React (Vite, JavaScript), adjusted for Node 18 (Vite 5.x + plugin-react 4.x).
- Autosave (localStorage, key v3) persists game state, actions, and history.
- Mobile-friendly viewport and minimal, centered UI.

## Core Loop (Current)
1) Tap performer → Stats modal → "Create a song" → Concept modal
   - Choose Genre (Pop/Rock/EDM), Theme (Love/Rebellion/Party), and Name (or Random).
   - Begin week locks concept.
2) Weekly planning (7 days)
   - Buttons: Practice (🎤), Write (✍️), Perform (🎶), Book Gig (🎫 for old songs).
   - Each tap spends 1 day and trains stats with diminishing returns per week.
   - 7-day strip (Mon–Sun) shows the plan. HUD shows Week/Remaining/Song.
3) Finish & Perform
   - After 7/7 days, click "Finish song" → then "Choose venue & perform".
   - Pick a venue (Busking/Pub/Club/Stadium) with word forecasts (Turnout/Risk/Fans).
4) Results
   - Release modal: shows Song, Critics score, Grade, Top 100 chart position, Venue, review, Money/Fans gained, and tailored Suggestions.
5) Next Week
   - Advances week, unlocks concept, and you can create the next song.

## Systems Implemented

### Stats & Training
- Stats: Vocals, Writing, Stage (0–10).
- Per-action training (only way to improve stats):
  - Practice → Vocals +base with diminishing returns.
  - Write → Writing +base with diminishing returns.
  - Perform → Stage +base with diminishing returns.
- Diminishing returns per action type within the week: factor = max(0.3, 0.85^(n−1)).

### Concept & Compatibility
- Genres: Pop/Rock/EDM; Themes: Love/Rebellion/Party.
- Compatibility matrix (−1/0/+1) contributes to scoring.
- Song name required; Random generator provided.

### Scoring & Release
- Current quality formula:
  - 3×Vocals + 3×Writing + 3×Stage + 2×WriteDays + 2×PerformDays + 10×Compatibility + RNG.
- Grade mapping S/A/B/C/D.
- Review line sampled by grade.
- Top 100 chart position computed from score + fans (with small noise).
- Suggestions/feedback on release:
  - Weakest contributor (singing/writing/performance) and time allocation nudges.
  - Compatibility advice and repetition warning (same genre/theme as last).

### Venue System (New Songs)
- Venues: Busking 🧢, Pub 🍺, Club 🎵, Stadium 🏟.
- Word forecasts (Turnout/Risk/Fans). Economics when performing:
  - Money: net = max(0, score − breakEven) × payoutPerPoint − cost.
  - Busking never loses money (tip floor). Early loss cap (weeks 1–3) −20.
  - Fans: grade-based + existing fans bonus, scaled by venue fan multiplier.
  - Extra small RNG per venue (club/stadium > pub > busking).
- Fan requirements to access venues: Pub 50, Club 200, Stadium 1000 (Busking always).

### Gigs (Re-Perform Old Songs)
- Book Gig (🎫): pick a past song, then pick venue.
- Uses the song’s fixed original score/grade (quality doesn’t change).
- Consumes 1 day of the 7-day week.
- Economics (with balancing):
  - Freshness decay by weeks since release (floors at ~50%).
  - Repetition penalty per song per week (1st=1.0 → 0.8 → 0.6 → 0.5…).
  - Weekly soft cap: after 3 gigs/week, further gigs yield 50%.
  - Hard weekly gig cap: max 3 per week.
- Training from gigs:
  - Stage +0.06, Vocals +0.03 per gig.
  - Weekly diminishing returns ×0.85^(nth–1), min ×0.3.
  - Busking gives +30% training.
- History UI: Computer → My Song History shows songs with grade/chart and recent gig entries (last 3).

### Week & Year
- Week length: 7 days. Planning uses 7/7.
- Season length: 52 weeks.
- Year Summary modal at end: songs released, best chart, best grade, total earnings, final fans. Restart starts a new year.

## UI Overview
- Main: room centered, three action buttons below.
- Performer: click to open Stats modal; includes "Create a song" (opens concept modal) if no active song.
- HUD (in room): Week X/52, Remaining Y/7, and current song.
- Computer in room (🖥️): shows Money/Fans and button to "My Song History".
- Modals:
  - Song Concept (Genre/Theme/Name → Begin week)
  - Venue selection (forecasts, gating) for releases and gigs
  - Release Results + Suggestions
  - My Song History (with recent gigs)
  - Year Summary at week 53

## Known Ideas/Next Steps (not yet implemented)
- Reweight early weeks (compatibility > stats) and add pre-release forecast bands.
- One-shot focus bonus per song (Rewrite Chorus / Overpractice / Hype Performance).
- Weekly events/micro-quests and mood tags (Soft/Aggressive/Chill).
- PWA (manifest + service worker) for Add-to-Home-Screen.
- Surface more feedback in HUD (e.g., “Gigs soft cap reached”).
- Tune numbers after playtest (venue thresholds, payouts, training rates).

## Notes
- Node 18 compatible; upgrading to Node ≥20 recommended long term.
- Two moderate `npm audit` advisories noted earlier (non-blocking in dev).

---
This document reflects the current gameplay, UI, and balancing as implemented. Refer to it in future sessions to continue feature work or tuning.
