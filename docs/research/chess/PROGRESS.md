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
- **A `<span>` cannot have a width.** The level progress bar used
  `<span class="gp-bar__fill">`, an inline box ignores width and height, and it
  drew at zero by zero with no error — the same shape of failure the CSP once
  caused here. `.gp-bar__fill` is now `display: block` so the trap is shut for
  every caller, not just this one.
- **`new Chess(fen, { skipValidation: true })` accepts nonsense.** Every
  king-less mini-game needs that flag, and with it `"not a fen at all"` loads
  as a board with one knight and `"xxxx/8/..."` as an empty board — no throw,
  no log, just a wrong board in front of a child. `fenProblem()` in
  `tools/chesscheck.mjs` checks the string properly; never trust the library.
- **chess.js hands the turn over after every move,** which ends a one-player
  star hunt after one move: `moves({ square })` comes back empty and the piece
  silently stops being movable. `keepTurn()` in screens/chesslesson.js forces
  the side to move back each time.
- **A board with no `onMove` must not let anything be selected.** On a "tap the
  right square" step, tapping a square with a piece on it selected the piece
  instead of answering, so any question whose answer had a piece on it was
  unanswerable. `createBoard` now defaults `canMove` to false when there is no
  `onMove`.
- **`mark({ dots })` did nothing** — `drawMarks` only ever read the board's own
  selection state, so a lesson asking to show a rook's moves drew nothing.
- **`min-width: 0` on a board container cancels the board's 44px floor.**
  `createBoard()` puts `.cz-cb` on the element it is given, so the board wears
  the layout class too and equal specificity means the later rule wins. The
  floor is now `.cz-cb.cz-cb` and `chesscheck` insists on it.
- **A search that runs out of time must throw the unfinished depth away.** The
  first version returned whatever the position looked like at the instant the
  clock stopped, which is the score of a capture that has not been recaptured
  yet — so the strongest bot took a pawn with a knight and lost the knight, and
  did it more often the slower the device. Iterative deepening now keeps only
  the last completed ply.
- **`evaluate()` must not ask chess.js whether the game is over.**
  `isCheckmate()` plus `isDraw()` cost about 40 microseconds and it runs at
  every leaf. Endings are settled in the search, where the move list already
  exists. That plus a quiescence depth cap took a depth-2 search in a crowded
  position from 15 seconds to 4.
- **Negating zero gives negative zero,** which is not equal to zero under
  `Object.is`, so "this move draws" quietly became a different value from
  "this position is level". Scores are normalised in `search()`.
- **A test that drives a time-capped bot is a flaky test.** Whether depth 2 or
  depth 3 completes depends on how busy the machine is. The blunder tests call
  `search()` at a fixed depth with no clock instead.
- **`#/chess/games/<id>` has three segments, and so does a lesson.** The back
  link sent it "one level up" to `#/chess/games`, which is not a page. Only a
  middle segment that is a level number is treated as a lesson.
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

- [x] **Phase 2 — progress and the hub.** `modules/chessprogress.js` (stars that
      only go up, badge Pawn to King, unlock gates, days practised, board
      themes, bot ladder and puzzle-rating fields; 36 tests). `data/chess/
      level1..3.json` with all 52 lessons named and `steps: []` — content is
      Phase 6. Hub, level page, and honest "being built" screens for the
      lesson player, play and puzzles. `settings.chess` added to storage
      DEFAULTS. `chesscheck` now validates the level files; `linkcheck` knows
      every lesson id.

- [x] **Phase 3 — the lesson player.** `modules/chesslesson.js` (pure: ten step
      kinds, scoring, second chances, `checkLesson` used by the build; 38
      tests) and `screens/chesslesson.js` (the player). Working step kinds:
      say, show, try, starhunt, tap, quiz, game, done. `play` and `puzzle`
      render a skip card until Phases 4 and 5. Two lessons written as proof,
      `l1-board` and `l1-rook`, played end to end in a browser.
      `chesscheck` now replays every lesson's FENs and moves through chess.js.

- [x] **Phase 4 — the bots, the mini-games and a place to play.**
      `modules/chessbot.js` (negamax + piece-square tables, iterative
      deepening, five personalities, seeded and testable; 44 tests),
      `workers/chessbot.worker.js`, `modules/chessgames.js` (eight variants and
      who wins each; 27 tests) and `screens/chessplay.js`. Take-back and hint
      are free. The bot ladder moves three games at a time. The temporary
      `#/chess/board` workbench is gone. Mini-games are listed on the hub and
      reachable at `#/chess/games/<id>`.

## Next step for the next model
Start PLAN.md **Phase 5: puzzles**. The room is `status: 'soon'`; flip to
'live' at the end of Phase 6.

### What the bot can and cannot do
chess.js charges about **one millisecond per move generation**, which is the
hard ceiling on this engine. A depth-2 search in a quiet position takes 200ms;
in a crowded middlegame it is several seconds. So `depth` in `LEVELS` is a
ceiling, not a promise: the search deepens a ply at a time and keeps the last
ply that finished inside `timeMs`. In practice the top bot plays at depth 2 to
3. That is fine — the difference a child feels between rungs is mostly
`spread`, how willing the bot is to play a worse move — but do not expect
strength from more depth without replacing chess.js.

### Two design notes for whoever writes the lessons
- A lesson with `steps: []` is treated as "not written yet" everywhere
  (`isReady()` in screens/chess.js). It is not offered as the next lesson and
  its card is not a link. Add steps and it becomes live on its own; there is no
  second flag to remember.
- The gate is strict: level 2 needs ALL of level 1. That follows PLAN.md, but
  02-gamification.md warns against unlocking by grinding, and a nine-year-old
  who already plays will meet two locked levels. If that turns out to bite,
  the one place to change it is `levelGate()` / `isUnlocked()`.

## Files in this folder
- 01-pedagogy.md    how kids are taught chess, what engages them
- 02-gamification.md rewards, progress, what backfires
- 03-curriculum.md  lesson lists for the three levels
- 04-tech.md        libraries, CSP, offline, mobile
- PLAN.md           the step-by-step build plan (the deliverable)
- PLAN-lessons.md   every lesson, step by step, with checked FENs
- PLAN-codebase-notes.md how a room is wired in this app
