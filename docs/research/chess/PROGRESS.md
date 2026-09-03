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

## Traps found while building (do not step in these again)
- **The cburnett SVGs carry `style="fill:#fff; ..."` on every path.** Under
  `style-src 'self'` the browser deletes that attribute silently, so pasting the
  files in unchanged draws twelve black silhouettes — in production only. Every
  declaration is now a presentation attribute (`fill="#fff"`), and
  `tools/chesscheck.mjs` fails the build if a `style=` ever comes back.
- **`.claude/launch.json` was running `python3 -m http.server`,** which sends no
  CSP, so the browser pane could never have caught the bug above. It now runs
  `tools/serve.py`, which sends the same policy Netlify does. Check the header is
  really there before trusting a browser test:
  `curl -s -D - -o /dev/null http://localhost:8765/ | grep -i content-security`
- **`tools/archcheck.mjs` now skips `assets/js/vendor/`** for the 700-line size
  warning. A vendored file is one thing by definition and must not be split.
- When testing a checker by breaking a file on purpose, target the piece body,
  not the whole file: the module's own header comment contains example markup
  (`fill="#fff"`, `style="fill:#fff"`) and a naive replace hits the comment
  instead of the drawing, so the checker looks broken when it is fine.
- **A checker that only does `includes()` passes when it should not.** Two of
  the board checks were written that way and both failed to fire: the import
  line alone satisfied a search for `ensurePieceDefs`, and `.cz-cb__dot--take`
  still matched after being renamed to `.cz-cb__dot--taken`. Always break the
  file on purpose and watch the checker fail before believing it works.
- **`requestAnimationFrame` never fires in a hidden tab.** The board used it to
  take a "do not animate" class off after the first paint; built in a
  background tab, the pieces stayed frozen for good. Use a forced reflow
  (`void el.getBoundingClientRect()`) inside the same task instead.
- **A new element does not transition.** Redrawing a move as "delete both
  squares, create a new piece" meant the CSS transition on `.cz-cb__piece`
  existed and never once ran. `pairMovers()` matches each arriving piece to a
  departing one of the same kind so the node survives the move and slides.
- The parity of a light square is `(file index + rank number) % 2 === 0`.
  Written as `=== 1` the whole board is painted in negative, which still looks
  like a chessboard and quietly ruins every lesson about bishop colours.

## Phases done
- [x] **Phase 0 — foundations.** chess.js 1.4.0 vendored at `assets/js/vendor/chess.js`
      with a header saying where it came from; the 12 cburnett pieces are SVG
      symbols in `assets/js/modules/chesspieces.js`; `docs/research/chess/CREDITS.md`
      written; `tools/chesscheck.mjs` added to `npm run verify`; empty
      `data/chess/`, `data/chess/puzzles/` and `assets/js/workers/` created.
      Verified in a real browser under the production CSP: all 12 pieces draw.

- [x] **Phase 1 — the board.** `assets/js/modules/chesssquares.js` (pure square
      maths, 33 tests) and `assets/js/modules/chessboard.js` (the SVG board).
      Tap-to-move, drag, promotion picker, flip, last-move/dots/stars/check/
      ring/arrow marks, coordinates, and a 64-button accessible grid with a
      roving tab stop and an aria-live move announcer. Board CSS is under
      `.cz-cb*` in design-system.css. `tools/chesscheck.mjs` now also guards the
      board. A workbench route `#/chess/board` renders a free-play board; **it
      is temporary and Phase 4 must delete it** along with `#gp-chess-board`,
      `#gp-chess-tools` in index.html and `chessAction` in screens/chess.js.
      Verified in a real browser under the production CSP: tap, drag,
      underpromotion, flip, keyboard grid, light and dark, 375px and 768px.

## Next step for the next model
Start PLAN.md **Phase 2: progress and the hub**. The room is `status: 'soon'`;
flip to 'live' at the end of Phase 6.

## Files in this folder
- 01-pedagogy.md    how kids are taught chess, what engages them
- 02-gamification.md rewards, progress, what backfires
- 03-curriculum.md  lesson lists for the three levels
- 04-tech.md        libraries, CSP, offline, mobile
- PLAN.md           the step-by-step build plan (the deliverable)
- PLAN-lessons.md   every lesson, step by step, with checked FENs
- PLAN-codebase-notes.md how a room is wired in this app
