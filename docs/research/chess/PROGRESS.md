# Chess room: progress log

Keep this file current. It is the hand-off between sessions and models.

## Goal
Add a "Chess" room to the CurioZoo home page with three levels:
1. Beginner: pieces, rules, sample game, mini-games, rewards.
2. Improver (~200-600): openings, tactics, checkmates, endgame basics.
3. Advanced (600+): deeper tactics, repertoire, endgames, whole-game thinking.

## Status
- [x] 2026-09-03 Read the codebase: rooms come from assets/js/modules/sections.js,
- [x] Wrote PLAN-codebase-notes.md (how a room is wired; free hues and creatures).
      screens live in assets/js/screens/, shared state in modules/shell.js,
      progress in modules/storage.js, strict CSP (no inline styles, no CDN).
- [x] Research reports 01 to 04 all written.
- [x] Synthesis: 00-summary.md written (curriculum section to refresh once 03 lands).
- [x] PLAN.md written (phases 0 to 9).
- [x] PLAN-lessons.md written: 15 + 19 + 18 lessons with FENs, all re-checked in chess.js.
- [x] Chess Club stub screen is live at #/chess (screens/chess.js, index.html, shell.js, routes.js, app.js, CSS .cz-room--leaf). Verified in browser, no console errors.
- [x] Registered "Chess Club" as status:soon in sections.js (hue leaf, creature fox). roomcheck passes.

## Facts checked (so nobody re-checks)
- chess.js 1.4.0 ESM: https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js (107 KB, one file).
- King-less FEN works with `{ skipValidation: true }`; plain load throws "missing white king".
- The 12 cburnett SVGs exist at https://commons.wikimedia.org/wiki/Special:FilePath/Chess_<klt45|qlt45|rlt45|blt45|nlt45|plt45|kdt45|qdt45|rdt45|bdt45|ndt45|pdt45>.svg (302 to upload.wikimedia.org).
- `npm run verify` green with the stub screen: 109 tests pass.
- All 52 curriculum FENs and lines in PLAN-lessons.md were replayed in chess.js. Two
  fixes vs 03-curriculum.md: piece-lesson kings go on h1/a8 (else bishop = 12, queen = 26);
  the check-escape position has FIVE legal moves (Nc1 also blocks), not four.

## Next step for the next model
Start PLAN.md Phase 0. The room is `status: 'soon'`; flip to 'live' at the end of Phase 6.

## Files in this folder
- 01-pedagogy.md    how kids are taught chess, what engages them
- 02-gamification.md rewards, progress, what backfires
- 03-curriculum.md  lesson lists for the three levels
- 04-tech.md        libraries, CSP, offline, mobile
- PLAN.md           the step-by-step build plan (the deliverable)
- PLAN-lessons.md   every lesson, step by step, with checked FENs
- PLAN-codebase-notes.md how a room is wired in this app
