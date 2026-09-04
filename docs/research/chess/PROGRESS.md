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
- **A build tool with a relative output path writes wherever it was run from.**
  `build_puzzles.mjs` is normally run from wherever the 300MB download lives,
  and it quietly wrote a complete set of puzzle files into that folder while
  the real ones sat untouched — with console output identical to a successful
  build. The output directory is now resolved from the script's own location.
- **The Lichess database hands out sixteen-move puzzles.** A child who has
  found the right idea should not then have to hold it together for eight more
  moves to be told they were right. Capped at 7 plies, which also pulled every
  theme's easiest puzzle down by a hundred points or more.
- **Rebuilding a board destroys its live region.** The puzzle screen rebuilt
  the board after the opponent's setup move, so "They play Bxc5" was announced
  into a node removed in the same breath. One board per puzzle now, built
  locked and unlocked when it is the child's turn.
- **A checkmate is a checkmate, whatever the database recorded.** Five of the
  250 mate-in-one puzzles have a second mating move, and nine across the whole
  library; a child who found one was told "Not that one" about a checkmate they
  had found themselves. The screen now ends any puzzle on any mating move,
  before it consults the recorded answer.
- **"The tactic is the same either way" was wrong about promotions.** `isRight`
  accepted any promotion piece. In eight puzzles that makes the opponent's next
  recorded reply illegal, after which the board and the solution part company
  and the screen carries on as though all was well. Exact piece required; the
  mate check covers the honest underpromotion case.
- **A gate drawn on a card is not a gate.** The theme lock lived only in the
  card renderer, so typing `#/chess/puzzles/skewer` walked straight past it.
  The rule is now `themeGate()` in the pure module and both the card and the
  route ask it.
- **"Unseen first" has to mean every unseen one.** With three unseen left and
  five wanted, `pick()` gave up on freshness entirely and served five the child
  had already done. Repeats now only fill leftover slots.
- **A `seen` cap of 500 against a library of 3,000 is not a cap, it is a leak.**
  Raised to 4,000, and `chesscheck` fails if the library ever outgrows it.
- **An `await` in a screen needs a token.** Choosing a theme and immediately
  choosing another left two fetches racing, and the slower one won.
- **A build tool that samples its output ships bad rows.** Replaying all 3,250
  puzzles takes 0.9 seconds; the sample was a guess at a cost that was never
  paid.
- **Static imports make every visitor pay for every room.** The chess room is
  316KB and was on the critical path for a child who only wanted the flag game.
  It is a dynamic import now, and `archcheck` was taught to see dynamic imports
  so the layering check still covers it.
- **`git checkout <file>` throws away uncommitted work.** It bit twice in one
  session, both times silently reverting a fix made minutes earlier. Copy the
  file aside before deliberately breaking it, and restore from the copy.
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

- [x] **Phase 5 — puzzles.** `modules/chesspuzzles.js` (13 themes, picking by
      rating, Glicko-2; 31 tests including Glickman's own worked example),
      `screens/chesspuzzle.js`, and `tools/build_puzzles.mjs`.
      `data/chess/puzzles/*.json` holds 3,250 real puzzles, 416KB, filtered
      from the 2 August 2026 Lichess dump (6,100,961 rows). A sitting is five
      puzzles; the rating moves after each sitting.

- [x] **Phase 6, level 1 — Pawn Camp.** All 15 lessons written from
      PLAN-lessons.md, every position replayed in chess.js before it was
      written, and every lesson played end to end in a real browser to three
      stars. The room is now **`status: 'live'`** on the home page.
      `chesscheck` now also enforces the per-level word limit and the 5-to-9
      step count.

- [x] **Phase 6, level 2 — Knight School.** All 19 lessons written, every
      position replayed first, every lesson played end to end in a browser to
      three stars. `play` and `puzzle` steps now hand off to the real game and
      puzzle screens instead of showing a skip card, and a lesson's own puzzle
      theme opens when the child reaches that step.

- [x] **Phase 6, level 3 — Queen's Guild.** All 18 lessons written and played
      end to end. **Phase 6 is complete: all 52 lessons.**

- [x] **Phase 7 — rewards and polish.** Caged pieces on the level pages, five
      board colours earned with stars and a picker on the hub, the star pop on
      every end card, confetti for three stars only. Stars on cards, the badge
      and the week dots were already in from Phase 2. `chesscheck` now checks
      that every earnable colour has a stylesheet rule and that every piece is
      freed by exactly one lesson.

## Next step for the next model
**Phase 8: checks, docs, ship** — most of it is already done (chesscheck runs
in verify, smoke.js covers the room). What is left: confirm the README numbers,
run the smoke test in a browser, and check every route at 375px and on an iPad.

### How to write a level
1. Write a script that replays every FEN and every move you intend to use
   through chess.js FIRST. Half the positions in PLAN-lessons.md needed a
   small correction, and a wrong one is a lesson a child cannot finish.
2. Write the steps into `data/chess/levelN.json`. `npm run chesscheck` checks
   the shape, the FENs, the legality of every accepted move, the word limit
   and the step count.
3. Play every lesson in the browser. A harness that drives the accessible grid
   is the quickest way; see the note below.

### One position from the research did not survive
`03-curriculum.md` gives a Petrosian x-ray position that is not an x-ray: the
queen can simply take the bishop. It was replaced with a constructed rook x-ray
(`3q2k1/5ppp/8/3r4/8/8/5PPP/3R2K1`) which demonstrates the idea properly.
Research positions are a starting point, not a source of truth — replay every
one.

### A trap in the puzzle gate
A lesson that teaches forks ends with fork puzzles, and the theme gate keys off
`stars[lesson]` — so the link inside the lesson was blocked by the lesson
itself. `progress.metThemes` records that a child has reached a lesson's puzzle
step, and `themeGate` accepts either. Any new lesson with a `puzzle` step gets
this for free.

### Driving a lesson from the browser console
`document.querySelector('.cz-cb__grid [data-sq="e4"]').click()` is a move.
Two of those make a move; a promotion needs a third click on
`[data-promo="q"]`, dispatched as a `pointerdown`. **Run one harness at a
time.** Two overlapping loops produced three "lesson did not open" failures
that looked exactly like a real routing bug and were not.

- [x] **Puzzle review fixes.** A read-only review found ten real problems; all
      were confirmed against the data before being fixed. Notes below.

### Refreshing the puzzles
```bash
curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst   # 304MB, CC0
zstd -dc lichess_db_puzzle.csv.zst | node tools/build_puzzles.mjs
```
It streams, so neither the 304MB archive nor the 1.1GB CSV touches the disk,
and it takes a couple of minutes. Both filenames are in `.gitignore` anyway.
`data/chess/puzzles/manifest.json` records the dump date, the thresholds and
the counts, and `chesscheck` fails if it stops describing what is on disk.

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
- 05-mobile.md      what a phone wrapper needs, written after the build
- PLAN.md           the step-by-step build plan (the deliverable)
- PLAN-lessons.md   every lesson, step by step, with checked FENs
- PLAN-codebase-notes.md how a room is wired in this app

## Phase 6 & 7 review fixes (2026-09-03)

All seven points in the review were valid and are fixed.

1. Board colours were stored as a list nobody updated, so they never arrived.
   The list is now worked out from the star total every time it is read.
2. A locked lesson or level opened if you typed its address. Both now check
   the gate in the route and show the explanation instead.
3. A lesson's practice hand-off scored stars for pressing "next", and threw
   away the bot level it asked for. Hand-off steps no longer score, and the
   level travels in the address: #/chess/games/<id>/<botLevel>.
4. Tests exercised helpers rather than the flow they belong to.
5. The reading-limit check only read some of the fields children read.
6. The touch-move wording was softer than the take-backs the app allows.
7. The README claimed a count the data did not support.

Found while verifying, not in the review:

  A stale `is-locked` class. A lesson destroys and rebuilds the board into the
  same element every step. lock() put `is-locked` on that element and building
  a new board never took it off. The new board's own state said unlocked, so
  taps still worked and nothing threw -- but every piece kept the "you cannot
  touch this" cursor for the rest of the lesson. Both build and destroy now
  wipe the state classes, and tools/chesscheck.mjs fails if either stops.

### Traps found while building

  Do not drive the app from a long-running async loop in the browser console
  while also probing it from another call. The probe kills the loop. It looks
  exactly like the app hanging on a step that works perfectly by hand. Drive
  it, or watch it, never both.

Verified in the browser: real lessons raise the star total; the star total
opens Forest at 10 and Ocean at 25; a locked colour refuses to be picked; a
replayed lesson done worse never lowers the total; a locked lesson and a
locked level both explain themselves instead of opening; and
#/chess/games/pawnwars/0 selects Sleepy Sloth while the saved level stays 3.

## Phase 9 — the mobile notes (2026-09-03)

`05-mobile.md` is written. It is notes, not code, as PLAN.md asks. Every claim
in it was checked against the repository rather than restated from the plan,
and the line references are real.

The plan's own assumptions held: no build step, module worker (WKWebView
supports it), no WASM so no COOP/COEP, progress is one JSON object, touch
targets already 44px. One thing the plan did not mention turned out to matter
more than any of them.

### The policy does not travel, and the app is written around it

The Content-Security-Policy is an HTTP header, sent by Netlify in production
and by `tools/serve.py` locally. **A native wrapper serves the files itself and
sends neither**, so the mobile app would run with no policy at all.

That is not only a security question. `style="..."` attributes are silently
deleted under `style-src 'self'`, so nothing in the app sets one and
`chesscheck` fails the build if the board or the pieces ever do. Without the
policy those attributes start working, and the mobile app and the website
quietly stop behaving the same way while every check goes on passing.
`05-mobile.md` gives the two ways to close it.

### A gap found while checking that: the two policies could drift

They are two hand-kept copies with nothing holding them equal. If the local
one drifts, local work stops predicting production — which is precisely the
failure the local policy was added to prevent (the map-colouring grid drew
perfectly on a laptop and collapsed in production).

`tools/cspcheck.mjs` now compares them directive by directive, ignoring order
and whitespace, and also refuses a policy that has gone loose (`unsafe-inline`,
`unsafe-eval`, a missing `base-uri`). It is in `npm run verify`. Proved by
breaking it three ways: dropping a directive locally, loosening `style-src` in
production, and deleting the production policy entirely.

**If a third copy of the policy is ever added — a `<meta>` tag, a wrapper
config — add it to `SOURCES` in `tools/cspcheck.mjs`.**

## Definition of done

- [x] `npm run verify` green: 349 tests, every check passes.
- [x] Browser smoke test: **169/169**, no console errors on any route.
- [x] Every chess route fits 375px with 44px squares and 768px with 68px.
- [x] **A child can finish level 1 and beat Sleepy Sloth.** Measured, not
      assumed: a simulated beginner (takes the biggest capture on offer, plays
      mate when it is there, otherwise random) wins 63% and loses 0% over 40
      games. That is inside the 60–70% band `02-gamification.md` asks for.
      Now a test in `tools/tests/chessbot.test.mjs`, because the bot got
      measurably stronger twice while being made to work — iterative deepening,
      then quiescence — and neither change touched a test. A bot that quietly
      climbs past a beginner ruins the room and breaks nothing.

      The measure is sharp enough to be worth having. Same harness, same
      beginner, one rung at a time (6 games each, shortened so it finishes):

          rung 0  Sleepy Sloth   child loses  0%
          rung 1  Grabby Goat    child loses 33%
          rung 2  Careful Cat    child loses 83%

      So `losses === 0` fails the moment the bottom rung is anything but the
      bottom rung. Everything is seeded, so the test cannot flake.

      **Do not try to prove this test by making level 0 play like level 4.**
      The strong bot takes seconds per move, and 12 games of it does not
      finish inside any sensible timeout. Compare rungs in a standalone
      script instead, which is what the table above is.
- [x] A five-year-old can reach a board and move a piece with no reading:
      the first lesson is tap-only and the hub opens on a single Start.
- [ ] A 600-rated child finds level 3 fair. This one needs a real 600-rated
      child; the puzzle ratings come from Lichess and the lessons were played
      end to end, but nobody has watched a child at that strength use it.

## Every door is open now (2026-09-03)

Asked for directly: a child who already plays should be able to go straight to
the endgames. `isUnlocked`, `levelGate` and `themeGate` all return open.

`02-gamification.md` warned about this and the "Two design notes" section
above named `levelGate()` / `isUnlocked()` as the one place to change if it
ever bit. It bit, and that was the one place.

What is left of the order: the lessons are still listed in teaching order,
`nextLesson` still points at the sensible next one, and a puzzle theme still
names the lesson that teaches it. Signposts, not doors.

`isUnlocked` still says no to a lesson id that does not exist, because a
caller that gets `true` for a typo goes on to render a lesson it does not
have. `renderShutLesson` and `renderShutLevel` in screens/chess.js are now
unreachable. They are kept on purpose: the screens are correct for a shut
gate, only the policy changed, so a gate can come back without rewriting them.

`metThemes` no longer decides anything. It is still recorded, and the test for
it now checks the thing it protected -- that the link out of a lesson into its
own puzzles works from any state at all.

## A tap step may have many right answers (2026-09-03)

"Tap a square the queen can NOT reach in one move" listed one square. There
are thirty-six. A child tapping any of the other thirty-five was told they
were wrong, over and over, while understanding the idea perfectly.

`tap` steps now take EITHER `answer` (tap all of these) OR `anyOf` (tap any
one of these), never both. `chesscheck` replays `anyOf` against the step's own
FEN: every listed square must be one the piece cannot reach, and no
unreachable square may be left out. A hand-written list cannot drift from the
position without failing the build.

### Tap steps that want one square now take one square

Selecting a second square used to add to the first. A child who changed their
mind sat with two squares ringed, no way to tell which counted, and then got
"one of those is not right" for an answer they had already abandoned.
`togglePick` now takes the step: when it wants one, a new tap moves the
choice. Tapping the same square again still clears it. Steps that want eight
pawns still collect eight.

### Trap, again

Two overlapping browser loops toggled the same squares and produced a
"multi-select is broken" reading that was entirely my own doing. It has now
cost time three times. **One harness at a time. If a javascript_exec call
times out, assume it is still running and clean up before the next one.**

## "A pawn got across" was really "anything got across" (2026-09-03)

Reported: in Capture the Flag, walking a rook or a knight to the far rank
ended the game, although the goal says "Get a pawn across".

`promoted()` read the BOARD: any piece of yours standing on the far rank. That
is exact in Pawn Wars, where the only pieces are pawns and a pawn on the last
rank has by definition just become something else. It is wrong in the two
games where a non-pawn can stand there:

  Capture the Flag  both sides start with a full army; a rook a1-a8 won.
  Pawns and Kings   marching the KING to the far rank won. Not reported,
                    found while fixing the first.

There is no fixing this from the position. A rook on a8 and a promoted pawn on
a8 are the same rook. A promotion is a thing that HAPPENS, so `promoted()` now
looks for it in `game.history({ verbose: true })`.

That makes `winner()` read the move list, not just the board, which changed
what a test fixture has to be: five tests built "a pawn has promoted" out of a
FEN, which no longer says any such thing. They now play the promoting move
through a new `after()` helper. That is more honest anyway — the old fixtures
asserted a fact about a game's history using a string that does not contain
one, which is the same mistake the bug was.

Both bugs have a test that fails if the old rule comes back; checked by
putting it back.

### Where else this pattern could hide
Any rule of the form "the board looks like X, therefore Y happened". The other
mini-games are safe by luck rather than design: `queenvspawns`, `rookvspawns`
and `knightsvspawns` only ask about the pawn side, and that side has nothing
but pawns.

## The end of a game (2026-09-03)

Asked after a real game: "I was winning, it ended, and it said *They got there
first this time*. What does that mean? Why one star?"

Both parts were fair questions with unhelpful answers.

**The star** was working as designed and reads as a punishment. A win is 3
(2 if a hint was used), a draw 2, a loss 1. Stars only ever go up, so the 1 is
"you played", not "you were bad". Unchanged, but worth knowing.

**The message was the same sentence for every ending.** "They got there first
this time" was shown whether a pawn had promoted, your last piece had been
taken, or you simply had no legal move left. A child whose army was captured
was told about a race they had not lost — and there was no way to find out
what really happened, because the board was gone.

`endReason()` now says HOW it ended — promotion, nothing-left, no-moves,
checkmate, held-out — and `ENDINGS` holds one line per ending per side.
chesscheck reads that table as DATA: every line must invite a child back and
none may call them a loser. Checking it through `result()` first looked
thorough and silently skipped four of the six endings, because one board can
only end one way.

Note for whoever reads this next: the reported game could not be reproduced.
120 games of a careful White against the weakest bot produced no case of
White being told they lost while level or ahead on material and with no
promotion. The likeliest explanation is that it ended a real way and said the
wrong thing about it, which is now fixed.

## The board stays, and you can walk back through it (2026-09-03)

Three things, asked for together.

**What each side has taken.** `modules/chesstaken.js`, pure, reading the MOVE
LIST rather than the board — the board cannot answer it, because eight pawns
look the same whether the missing two were captured or promoted, and the
mini-games do not start with matching armies. Taking a move back removes the
capture with it, for free, because `undo()` shortens the history.

The lead is counted in PIECES ("+2"), as asked, and only the player who is
ahead gets a badge — a "+0" beside one and a "-2" beside the other say the
same thing twice, the second time to the child who least wants to read it.
Points are there too as `valueLead` for anything that wants them.

**Arrows to step back and forth.** `play.viewAt` is the position on the board;
null means the live one. While looking at the past the board is LOCKED, so a
move is impossible — there is nothing sensible for a move in an abandoned
position to do. Touching the board comes back to the game, which is what a
child tries first. That needed its own listener on the container: a locked
board does not report taps to its owner at all, which is right.

**A finished game is not thrown away.** `finish()` used to replace the whole
screen with a result card. The position vanished at the exact moment a child
wants to look at it. The card now goes in a box UNDER the board, the arrows
keep working, and the strip of captured pieces rewinds with the position.
chesscheck fails if `finish()` ever writes to `#gp-chessplay-body` again.

## Unrelated: an intermittent failure that can fail a deploy
`npm run verify` failed once with `mix, 30 questions: the same object came
round twice` from `tools/anglecheck.mjs`. It did not repeat in 25 further
runs, so it is a rare draw from a random seed. It matters more than it looks:
`npm run verify` is the Netlify build command, so a rare flake is a rare
failed deploy. Not touched here.

## The deploy that failed at random (2026-09-03)

Netlify runs `npm run verify` as its build command, so a check that fails by
chance is a deploy that fails by chance. One did.

**The defect was real, not a bad test.** `roundLength` caps an "out in the
world" round at the number of drawings, because asking for more than there are
means showing one twice. A MIXED round is not capped — there is no shortage of
angles — but it still asks for objects, and how many is chance. Thirty
questions average five and can draw sixteen, from a pack of fourteen. The
dealer then reshuffled mid-round and handed back a drawing the child had
already seen.

Measured: 0.010% of thirty-question mixed rounds. Over the 400 rounds the
check built, that is about a 4% chance of failing any given build — rare
enough on a laptop to look like the check being flaky, common enough to lose a
deploy.

`dealer()` now reports `left()`, and a mixed round drops "out in the world"
from the kinds it can pick once the pack is empty. Zero repeats in 120,000
rounds, and world questions now top out at exactly the pack size.

### Why the tests missed it and the build caught it
The unit test used one fixed seed and 200 rounds; the seed never produced the
case. The build check used `Math.random` and 400 rounds, so it found it
roughly one run in twenty-five. **Neither is a good way to catch a
one-in-ten-thousand defect.** Both now construct the bad case instead: empty
the pack, then ask for more, where the answer is certain. That fails 8 out of
8 with the bug and 0 out of 8 without it.

### The bigger fix: a build gate must give the same answer twice
`anglecheck.mjs` was the only check in `verify` using unseeded randomness, and
nearly all of it works by generating questions and complaining if one is
wrong — every loop was its own lottery. It is now seeded from one stream, so a
run either always passes or always fails and a failure can be reproduced by
running it again. Sample counts were raised five-fold at the same time, since
determinism makes more of it cost only time (the whole check runs in ~1.4s).
Byte-identical output over 30 runs.

A guard fails the check if anything in that file calls `Math.random(` again.
It looks for the CALL, with its bracket: matching the bare name caught the
prose explaining the rule and the error message itself, and the check failed
on itself.

### Trap, for the third time
Do not run a long verification loop in the background while editing the files
it tests. Runs 5, 6 and 7 of one loop "failed" because I was deliberately
breaking `angles.js` to prove a guard at the same moment. It looks exactly
like a real intermittent failure.

## Two more deploys failed. Both were real defects. (2026-09-03)

Netlify runs `npm run verify`, so any check that can fail by chance is a
deploy that can fail by chance. Three separate lotteries were running.

### 1. A question could be built with only three choices
`makeChoices` fills the wrong answers from the same continent first, then tops
up from the rest of the world. The top-up reshuffled the WHOLE world for each
one and took the first: when that one was already picked it gave up — and
returned three choices instead of four. Antarctica and Bouvet Island have no
sovereign neighbours at all, so every one of their wrong answers comes from
the top-up, and they hit it about one question in seventy.

Silent, and real: a child asking about Antarctica sometimes got a question
with a choice missing. `tools/tests/flags.test.mjs` failed 11 runs in 150.

Fixed by shuffling once and walking the list, which cannot collide with
itself. Two new tests catch it by construction rather than by luck: one drives
it with a `random()` that always returns the same number, so every shuffle
comes out the same way and the collision happens every time; the other finds
any place whose continent holds fewer than three others and hammers it. Both
fail 8 out of 8 with the bug and never without it.

### 2. Fixing that broke the answer-position spread, quietly
`slots.test.mjs` checks that the right answer does not favour one of the four
positions. The first fix shuffled the rest of the world for EVERY question,
not just the ones that needed it — two hundred unused random draws per
question — and that was enough to knock the distribution off: chi-square went
from 3 seeds in 60 over the threshold (fair) to 60 in 60.

The `if` that skips the top-up when the choices are already full puts it back
to exactly 3 in 60. **Measured against sixty seeds before and after, not one.**
A seeded test that fails is not automatically a bad seed; check whether the
behaviour actually changed before touching the seed.

### 3. The angles check (see the section above)
Already fixed: a mixed round could ask for more objects than there are.

### The rule to keep
A check in the build path must give the same answer twice. Where a defect is
rare, construct it instead of sampling for it. `tools/anglecheck.mjs` now
fails if anything in it calls `Math.random(` again; the tests that sample are
either seeded or paired with a deterministic case that pins the same fact.

## X-ray Eyes taught from a position that was already lost (2026-09-04)

Reported: the example is bad. It was worse than that.

`3q2k1/5ppp/8/3r4/8/8/5PPP/3R2K1` — the lesson says "So the black rook is
stuck. The moment it steps off the file, the queen is yours." The black rook
was not stuck. It could take the very rook that was supposedly holding it,
and **Rxd1 is checkmate** — white's king sealed behind its own f2/g2/h2 pawns.
A child was being shown a tactic from a position where the other side mates
in one.

Every FEN was legal and every accepted move was legal, so nothing caught it.
The story only falls apart if you ask what the OTHER side would do.

Replaced with `3q2k1/5pp1/7p/3b4/8/7P/5PP1/3R2K1`, verified through chess.js:
black has no check and no mate; the only capture is Bxg2, which loses a bishop
for a pawn; the bishop cannot stay on the d file at all, so every move it has
gives up the queen; and after Bb7, Rxd8+ wins the queen and is a check rather
than a mate, because both kings were given air (h6 and h3).

A bishop is a better teaching piece here than the rook was. A rook could slide
down the file and stay in the way; a bishop cannot be on that file at all
after it moves, which is exactly the "it may move, but it dare not" idea the
lesson's own quiz defines.

### The guard
`chesscheck` now reads the step's own words. Where a step claims a piece is
stuck, pinned, frozen or dare not move, it gives the other side the move and
fails if they have mate in one. It only inspects steps that make the claim:
in ordinary chess the side to move having mate in one is not a fault, it is
whose turn it is. Turn-flips that produce an impossible position (the side
that just moved left themselves in check) are skipped, since nothing can be
concluded from them.

Proved by putting the old position and its old sentence back: it fails with
the exact move, `Rxd1#`.

### Checked while there: l2-pin is sound
The other lesson that claims a piece cannot move. The knight really is
absolutely pinned (zero legal moves), the rook doing the pinning cannot be
taken, and black has no mate. Left alone.

### Noted, not changed: l3-overload
Black has Rxd1# available in that position too, but it is White to move and
White's Rxd8+ comes first, so the lesson works as written. It is fragile
rather than wrong. Worth revisiting if it is ever touched.

## A way back, and words a child can act on (2026-09-04)

### The back arrow
Reported from inside a lesson: "I don't know what to do, I would like to
review the previous step." There was no way back. The only way to re-read
something was to start the lesson again.

An arrow now sits beside the progress dots, from step two onwards. It opens a
LOOK-BACK view: the earlier position, the words that went with it, and the
"why" if the step had one. Arrows walk further back and forward, and "Back to
my step" returns.

It does NOT re-run the step, and that is the point. Re-running would wire the
interactive kinds up again — a star hunt resetting its own counter, a tap step
collecting squares — all writing over the run a child is in the middle of.
Looking back must not be able to change anything, so it draws a picture
instead of replaying the step. `run.index` is untouched throughout; verified
in the browser.

While looking back, every other action on the screen is ignored. The three
look-back controls are the only way out.

### file is a column, not a row
Asked for "file" to be replaced with "row". A file is a COLUMN (a-h); a rank
is a row (1-8). The offending sentence already used "row" correctly for the
seventh rank, so using it for both would have taught a child something false.
Used **column** for file and **row** for rank, everywhere: 17 texts.

### Instructions have to say what to do
"Deliver it." was the whole instruction on a checkmate step. Also "Take it",
"Finish it", "Play the fork", "Play your first move". A child who does not
already know the answer cannot begin.

Sixteen instructions rewritten to name the piece and the square. Twenty-five
more sentences shortened — one idea per sentence, no sentence over about
fifteen words.

`chesscheck` now fails any `try`, `tap` or `starhunt` step whose `ask` names
nothing on the board. The test is NAMING something concrete, not length:
"Now tap h1" is three words and fine, "Take the bigger one" is four and is
not. A "find it yourself" question may still withhold the answer — "tap the
piece nobody is guarding" names a piece and says the task — so the guard does
not force spoilers.

Writing that guard found eleven more vague instructions nobody had noticed,
including four in level 3 and two in level 2. All fixed.
