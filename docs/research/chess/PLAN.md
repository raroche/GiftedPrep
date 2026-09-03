# Chess Club: build plan

This is the hand-off to the model that builds it. Read, in this order:
1. `PLAN-codebase-notes.md` (how a room is wired in this app)
2. `00-summary.md` (what the research decided)
3. this file
4. `PLAN-lessons.md` (the lesson content per level, written from 03-curriculum.md)

Long reports 01 to 04 are for when you need a source or a detail.

## Working rules (do not skip)
- Work one phase at a time. Each phase ends with `npm run verify` green and
  one git commit. Commit message: what changed and why, in plain words.
- After every phase update `PROGRESS.md` in this folder: tick the phase, note
  anything you left undone, note anything you learned that the next model
  needs. The session can end at any moment; the log is the memory.
- No inline `style=""` attributes anywhere (CSP drops them). Use classes or
  `data-style` plus `paint()`.
- No new npm dependencies. No CDN. No fetch to other origins.
- Screens import modules; modules never import screens; nothing imports
  `app.js`. `tools/archcheck.mjs` enforces this.
- Text for a child: short sentences, no jargon, read-aloud friendly. One idea
  per screen. The child should tap something within 10 seconds of arriving.
- Every wrong move gets an answer at once. Nothing punishes a mistake. Stars
  only go up.
- Keep functions small. Put rules in `modules/chess*.js` with node tests; put
  DOM in `screens/chess.js`.

## Routes and screens
| Route | Screen id | What it shows |
|---|---|---|
| `#/chess` | `chess` | Hub: total stars, badge, days practised, three level cards, Play and Puzzles cards |
| `#/chess/1` `#/chess/2` `#/chess/3` | `chesslevel` | Lesson list for one level, stars per lesson, locked/unlocked |
| `#/chess/1/<lessonId>` | `chesslesson` | The lesson player (steps) |
| `#/chess/play` | `chessplay` | Play the bot: pick a level on the ladder, play, result |
| `#/chess/puzzles` | `chesspuzzle` | Puzzle trainer: pick a theme, solve, rating |
| `#/chess/games/<gameId>` | `chessplay` | A mini-game (Pawn Wars etc.) outside a lesson |

Back targets (`routes.js`): lesson -> its level; level, play, puzzles, games -> `#/chess`; hub -> home.

## Files to create
```
assets/js/vendor/chess.js              chess.js 1.4.0 dist/esm/chess.js, BSD-2 header kept
assets/js/modules/chesspieces.js       12 SVG <symbol>s (cburnett), one injector function
assets/js/modules/chessboard.js        SVG board: draw, position, highlights, tap-tap, drag
assets/js/modules/chessprogress.js     stars, badges, unlocks, days practised, puzzle rating
assets/js/modules/chesslesson.js       lesson step runner (pure state machine)
assets/js/modules/chessgames.js        mini-game variants and win conditions
assets/js/modules/chessbot.js          the engine (pure; runs in worker and in node tests)
assets/js/modules/chesspuzzles.js      puzzle loading and picking
assets/js/workers/chessbot.worker.js   module worker wrapping chessbot.js
assets/js/screens/chess.js             all chess screens and handlers
data/chess/level1.json                 lessons for Pawn Camp
data/chess/level2.json                 lessons for Knight School
data/chess/level3.json                 lessons for Queen's Guild
data/chess/puzzles/<theme>.json        filtered Lichess puzzles, one file per theme
data/chess/openings.json               20 to 40 named openings as UCI arrays
tools/build_puzzles.mjs                one-off filter of the Lichess CSV (not run in verify)
tools/chesscheck.mjs                   validates every lesson, FEN and move; added to verify
tools/tests/chessboard.test.mjs
tools/tests/chessbot.test.mjs
tools/tests/chesslesson.test.mjs
tools/tests/chessprogress.test.mjs
tools/tests/chessgames.test.mjs
docs/research/chess/CREDITS.md         piece set and puzzle data attribution
```
Files to edit: `index.html` (screens), `modules/shell.js` (SCREENS, state.chess),
`modules/storage.js` (DEFAULTS.settings.chess), `modules/routes.js`, `app.js`
(imports, route, onClick), `assets/css/design-system.css` (`cz-chess-*`),
`tools/linkcheck.mjs` (second segments for chess), `tools/smoke.js`,
`package.json` (verify), `README.md`, `modules/sections.js` (status, meta).

---

## Phase 0: foundations (half a day)
Goal: the rules library and the pieces are in the repo and proven in node.

1. Vendor chess.js.
   - Download `https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js`
     to `assets/js/vendor/chess.js`. Keep the BSD-2 licence header at the top.
     Add a one-line comment above it: where it came from and the version.
   - Test in node: `new Chess().moves().length === 20`.
   - Already checked on 2026-09-03 with chess.js 1.4.0:
     `new Chess('8/8/8/8/8/8/PPPPPPPP/8 w - - 0 1', { skipValidation: true })`
     WORKS: 16 pawn moves, `move('e4')` succeeds. Without `skipValidation`
     it throws "Invalid FEN: missing white king". So every king-less
     mini-game loads its FEN with `{ skipValidation: true }`. Note: with no
     enemy pieces at all, the other side has 0 moves; `chessgames.winner()`
     must handle "no legal moves and no king" as a loss for that side, not
     as stalemate.
   - The jsDelivr file is 107,052 bytes and starts with a generated PGN
     parser; the BSD-2 licence text is further down the file. Keep the whole
     file as is and add the source URL comment on line 1.
2. Pieces. Download the 12 cburnett SVGs from Wikimedia Commons
   (`Chess_klt45.svg`, `Chess_qlt45.svg`, `Chess_rlt45.svg`, `Chess_blt45.svg`,
   `Chess_nlt45.svg`, `Chess_plt45.svg` and the `d` dark versions). Strip the
   XML header and put each as `<symbol id="cz-p-wK" viewBox="0 0 45 45">...`
   in `modules/chesspieces.js` exporting `PIECE_SYMBOLS` (the string) and
   `ensurePieceDefs()` which appends one hidden `<svg>` with the symbols to
   `document.body` once. Write `CREDITS.md`: "Chess pieces by Colin M.L.
   Burnett, BSD-3 / CC BY-SA 3.0, from Wikimedia Commons" plus the puzzle
   line from Phase 5. Link CREDITS from the room hub footer text.
3. Add `data/chess/` and `assets/js/workers/` folders with a `.gitkeep`.
4. `npm run verify` green. Commit "Add chess.js and the piece set for the Chess Club".

## Phase 1: the board (one day)
Goal: a board any screen can drop in, that a child can use by tapping or dragging.

`modules/chessboard.js` exports:
```js
createBoard(container, opts) -> board
  opts: { fen, orientation: 'w'|'b', interactive: true, coords: true,
          onMove(from, to, promotion) -> boolean|Promise,   // return false to reject
          canMove(from) -> boolean,                          // which pieces the child may lift
          dests(from) -> ['e4', ...],                        // legal targets for dots
          size: 'auto' }
board.setFen(fen, { animate: true })
board.mark({ last: ['e2','e4'], check: 'e8', dots: ['d4','d5'], stars: ['c6'],
             ring: ['f7'], arrows: [['g1','f3']], select: 'e2' })
board.clear()                                     // marks only
board.flip()
board.lock() / board.unlock()
board.destroy()
```
Rules for the drawing:
- One `<svg viewBox="0 0 8 8">` (or 0 0 800 800). 64 `<rect>` with classes
  `cz-cb__sq cz-cb__sq--light|dark` and `data-sq="e4"`. Pieces are
  `<use href="#cz-p-wK" x y width=1 height=1>` in a group. Marks are groups
  drawn between squares and pieces (last move, stars) or above (dots, rings,
  arrows). Arrows use `<line>` with a `<marker>` head.
- No inline styles. Position with `x`/`y` attributes, not `transform` strings.
  Animate by CSS transition on `x`/`y`? SVG attributes do not transition.
  Use `transform="translate(..)"` attribute (an attribute, not `style`) and
  the CSS `transition: transform .18s` on `.cz-cb__piece`; browsers transition
  the `transform` presentation attribute when `transform-box: fill-box` is
  set. Test it on Safari (iPad). If it does not animate there, skip animation
  under `prefers-reduced-motion` and accept no animation; do not spend more
  than an hour on it.
- Input: one `pointerdown` on the svg. Tap a movable piece: select it, show
  dots from `dests()`. Tap a dot: move. Tap the same piece: deselect. Tap
  another own piece: reselect. Drag: on `pointermove` past 6 px, lift the
  piece (add class `is-dragging`, follow pointer via `transform`), drop on
  `pointerup` over a square. `setPointerCapture` on the svg. Touch and mouse
  share this code.
- Promotion: when a pawn reaches the last rank, `onMove` is called with
  `promotion: undefined`; the board shows a four-piece picker overlay
  (queen first, big); pick calls `onMove` again with the letter.
- Accessibility: wrap in `<div role="grid" aria-label="Chess board">`; every
  square also exists as a visually hidden button `aria-label="e4, white pawn"`
  (update labels on `setFen`). Keep an `aria-live="polite"` div for the move
  announcer; `announce(text)` export. Minimum board width 352 px; scale to
  `min(92vw, 62vh)`.
- Colour: squares from `--cz-chess-light`/`--cz-chess-dark` tokens with a
  default wood-ish pair; marks use blue `#0072B2` (select, last) and orange
  `#E69F00` (dots, stars) and red ring for check; each mark has a distinct
  shape too. Theme tokens are what "board themes" cosmetics swap later.

Test (`tools/tests/chessboard.test.mjs`): the pure helpers only: square<->xy
maths, orientation flip, label text for a square. DOM parts are checked in
the browser: add a temporary route `#/chess/board` that renders a free-play
board (both sides, chess.js legal moves) and use it to verify tap-tap, drag,
promotion, flip, dark mode, iPad size (resize_window 768x1024) and reduced
motion. Remove the temporary route in Phase 4 (play screen replaces it).

CSS: `cz-cb`, `cz-cb__sq`, `cz-cb__piece`, `cz-cb__dot`, `cz-cb__ring`,
`cz-cb__star`, `cz-cb__last`, `cz-cb__check`, `cz-cb__arrow`, `cz-cb__promo`.
Commit "Add the chess board".

## Phase 2: progress and the hub (one day)
Goal: the room has a front page, three level pages, and remembers stars.

`modules/chessprogress.js` owns the saved object. Shape (all fields
optional, missing means zero):
```json
{
  "v": 1,
  "stars": { "l1-rook": 3, "l1-bishop": 2 },
  "starTotal": 5,
  "unlocked": ["rook", "bishop"],
  "themes": ["wood"],
  "days": ["2026-09-03", "2026-09-05"],
  "bot": { "level": 1, "recent": [1, 0, 1] },
  "puzzles": { "r": 800, "rd": 350, "vol": 0.06, "seen": ["00sHx"] },
  "games": { "played": 3, "won": 2 },
  "seenIntro": true
}
```
- Stored under `settings.chess` via `storage.setSetting('chess', obj)`. Add
  `chess: {}` to `DEFAULTS.settings` in `storage.js` so `migrate()` keeps it.
- API: `load()`, `save(obj)`, `setStars(lessonId, n)` (never lowers; adds the
  difference to `starTotal`), `unlock(piece)`, `touchDay()` (adds today ISO
  date once), `badge(progress, levels)` -> one of pawn, knight, bishop, rook,
  queen, king, `isUnlocked(lessonId, level, progress)` (a lesson is open when
  the one before it has at least 1 star; the first lesson of each level is
  always open; level 2 opens when level 1 has 1 star on every lesson; level 3
  likewise), `nextTheme(starTotal)` (board themes unlock at 10, 25, 50, 100
  stars), `weekCount(days)` (days practised in the last 7).
- Badge rule: pawn at start; knight when every level 1 lesson has a star;
  bishop at half of level 2; rook at all of level 2; queen at half of level 3;
  king at all of level 3.
- Tests: stars never go down; total is the sum of bests; unlock order; badge
  thresholds; days de-duplicated; migrate from `{}`.

Screens:
- Hub (`#/chess`, screen `chess`): room head (already there), then a stat row
  (star total with a star icon, badge with its piece symbol, "N days this
  week"), then three level tiles using `cz-tile` (hue leaf, then jade, then
  honey to tell the levels apart; the room hue stays leaf), each showing
  "x of y lessons started" and a lock state, then two smaller cards: Play a
  game, Puzzles. First visit: a one-screen intro ("Tap a piece. Tap where it
  goes. That is all you need to start.") with a big Start button that opens
  lesson 1. Set `seenIntro`.
- Level page (`#/chess/<n>`, screen `chesslevel`): title, lede, a list of
  lesson cards in order using `gp-card gp-card--topic`, each with number,
  emoji, name, one-line "big" idea, 0 to 3 star glyphs, lock icon if locked.
  A locked card is a div, not a link.
- Data: `data/chess/levelN.json` shape is in `PLAN-lessons.md`. For this
  phase, ship level files with names and empty step lists so the pages render.

`state.chess = { level: null, lesson: null, run: null, play: null, puzzle: null }`
in `shell.js`. Add `chesslevel`, `chesslesson`, `chessplay`, `chesspuzzle` to
SCREENS and their sections to `index.html` (copy the pattern of
`screen-chess`). Extend `linkcheck.mjs`: for head `chess`, allow second
segment in `['1','2','3','play','puzzles','games','board']` when it is fixed.
Commit "Give the Chess Club a hub, three levels and a memory".

## Phase 3: the lesson player (two days)
Goal: a lesson is a list of small steps a child taps through. Content is JSON.

Step types (`modules/chesslesson.js` validates and runs them; the screen draws):
| type | fields | what happens |
|---|---|---|
| `say` | `text`, `fen?`, `mark?` | One or two short lines beside a board. Next button. Read aloud. |
| `show` | `fen`, `mark`, `cap`, `moves?` | Board with highlights or arrows. If `moves`, a Play button animates them one by one with `cap` per move. |
| `try` | `fen`, `ask`, `accept` (list of `from-to` UCI), `hint`, `wrongSay?` | Child must make one of the accepted moves. Only the piece(s) in `accept` can be lifted. Wrong target: shake, say `wrongSay` or "Not there. Try again.", show dots after 2 tries. |
| `starhunt` | `fen`, `piece` (square), `stars` (squares), `par` (moves) | Child moves one piece to collect every star. Blocked squares may be given in `fen` as enemy pieces that may not be captured (`nocapture: true`). Stars: 3 at par, 2 at par+2, 1 otherwise. |
| `tap` | `fen`, `ask`, `answer` (squares), `why` | Tap a square. E.g. "Tap every square the knight can reach". Multi-select when `answer` has more than one; check button. |
| `quiz` | `ask`, `fen?`, `choices` [{id, text}], `answer`, `why` | Tap a text choice. Same look as Math Lab choices. |
| `play` | `game` (id from chessgames.js), `fen?`, `bot` (0-4), `side`, `goal` | Mini-game or full game against the bot. Win gives the step's stars. Loss still passes the step with 1 star and a kind line. |
| `puzzle` | `theme`, `count`, `maxRating` | Solve `count` puzzles from the theme file. Stars by first-try count. |
| `game` | `moves` (SAN list), `notes` {ply: text}, `fen?` | A sample game replayed one move at a time with a note under the board. Prev/Next. |
| `done` | `text` | The end card: stars earned, praise line, Next lesson button. |

Lesson JSON (see PLAN-lessons.md):
```json
{ "id": "l1-rook", "name": "The Rook", "emoji": "🏰", "big": "Straight lines, as far as it likes.",
  "piece": "rook", "minutes": 4, "steps": [ ... ] }
```
Runner (`chesslesson.js`, pure): `start(lesson)` -> run `{ index, tries, stars: [], startedAt }`,
`next(run)`, `judge(step, run, input)` -> `{ ok, say, stars, done }`,
`lessonStars(run)` -> average of step stars rounded, minimum 1 if finished.
Tests: every step type judged with a right and a wrong input; star maths; a
lesson with zero steps does not crash.

Screen: `#/chess/<n>/<lessonId>` (screen `chesslesson`). Layout: board on the
left (stack on narrow), a card on the right with the step text, a progress
dots row (`gp-dots` exists), Next button, a "Read it to me" button, and the
mascot reactions: `react('happy')` on a right move, `react('oops')` wrong,
`react('wow')` at three stars. Celebration at `done`: `gp-done` with a short
confetti (`gp-confetti` exists; respect reduced motion). Praise text credits
the process: "You found the rook's path first try." Never "You are smart."
Stars saved through `chessprogress.setStars`; `touchDay()` on finish; unlock
the lesson's `piece` if any.

Handlers in `app.js onClick`: `[data-chess-next]`, `[data-chess-hint]`,
`[data-chess-choice]`, `[data-chess-check]`, `[data-chess-replay]`,
`data-action="chess-say"` (read aloud). Board moves come through
`createBoard`'s `onMove`, not the click delegate.
Commit "Add the lesson player".

## Phase 4: the bot, playing, and the mini-games (two days)
`modules/chessbot.js` (pure, no DOM):
- `evaluate(chess)`: material (100/320/330/500/900) plus piece-square tables
  (copy the PeSTO or Sunfish tables; cite in a comment). Sign from side to move.
- `search(chess, { depth, timeMs })`: negamax with alpha-beta, quiescence on
  captures, move ordering captures first. Returns `[{ move, score }]` for all
  root moves, sorted.
- `pick(scored, level, rng)`: the personality ladder.
  | level | name | behaviour |
  |---|---|---|
  | 0 | Sleepy Sloth | random legal move; captures 30% of the time when it can |
  | 1 | Grabby Goat | depth 1; picks among moves within 300 cp of best; never sees mate threats |
  | 2 | Careful Cat | depth 2; within 120 cp; avoids hanging a piece 70% of the time |
  | 3 | Clever Crow | depth 3, 600 ms cap; within 40 cp |
  | 4 | Wise Owl | depth 4, 900 ms cap; best move |
  Names and a creature icon per level from `sections.js` ears (fox is the room;
  use frog, giraffe, mouse, cat, owl for the ladder).
- `chooseMove(fen, level, seed)` -> uci. Deterministic with a seed for tests.
- Ladder rule (`chessprogress`): after a game push 1/0 to `bot.recent` (keep
  10); if the last 3 are wins, `level += 1`; if the last 3 are losses,
  `level -= 1`; clamp 0 to 4. The child can also pick any level by hand.
- Tests: mate in one is found at depth 2 and above; level 4 never hangs a
  queen for nothing in five fixture positions; level 0 is random; the search
  respects the time cap; a stalemate is not chosen when winning.

Worker: `assets/js/workers/chessbot.worker.js` does
`import { chooseMove } from '../modules/chessbot.js'` and answers
`{ id, fen, level }` with `{ id, uci }`. Create it with
`new Worker('assets/js/workers/chessbot.worker.js', { type: 'module' })`
relative to the page. Wrap in `modules/chessbot.js` export `botClient()`
which falls back to running on the main thread if `Worker` throws.

`modules/chessgames.js`: variants as `{ id, name, blurb, fen, side, rules }`:
- `pawnwars`: 8 pawns each, win by reaching the last rank or capturing all.
- `flag`: full armies without kings; win by promotion or capturing everything.
- `queenvspawns`: queen vs 8 pawns; pawns win by promoting, queen by taking all.
- `rookvspawns`, `bishopvspawns`, `knightsvspawns` likewise.
- `solo`: capture puzzles; every move must capture; one player; fixed set of
  10 positions in `data/chess/solo.json`.
- `kinghunt`: full army vs lone king; win by mate; 25-move limit.
- `full`: normal chess from the start position.
`winner(variant, chess, history)` -> `'w' | 'b' | 'draw' | null`. Tests for
each variant's win condition with fixture positions.

Screen `chessplay` (`#/chess/play` and `#/chess/games/<id>`): setup card
(pick side, pick bot level with the ladder's suggested level marked, or the
variant is fixed by the route) -> board with the bot's name and creature
above, the child's below, move list on the side, "Take back" (always allowed,
free), "Hint" (asks the bot at level 4 for one move, draws an arrow; costs
nothing but the game earns 1 star instead of 2) -> result card: win 2 stars,
draw 1, loss 1 ("You played 30 moves. Next time watch the queen." pick a
single tip from a fixed list keyed by how the game ended). Save through
`chessprogress`. Announce moves to the live region.
Remove the temporary `#/chess/board` route. Commit "Add the bots, the mini-games and a place to play".

## Phase 5: puzzles (one day)
- `tools/build_puzzles.mjs`: reads a local `lichess_db_puzzle.csv` (downloaded
  by hand from database.lichess.org, decompressed with `zstd -d`; it is not
  committed). Keeps rows with Rating 400 to 1400, RatingDeviation < 90,
  Popularity >= 80, NbPlays >= 500. Themes to keep, with per-theme cap 250:
  `mateIn1, mateIn2, hangingPiece, fork, pin, skewer, discoveredAttack,
  backRankMate, capturingDefender, deflection, attraction, zwischenzug,
  endgame, promotion, oneMove, short, sacrifice, doubleCheck, smotheredMate`.
  Writes `data/chess/puzzles/<theme>.json` as
  `[{ "id", "fen", "moves": ["e2e4", ...], "r": 850 }]`. Records the dump
  date in `CREDITS.md`: "Puzzles from the Lichess puzzle database, CC0".
- Remember: `fen` is before the opponent's move; play `moves[0]` first, then
  the child must find `moves[1]`, the bot replies `moves[2]`, and so on. For
  `mateIn1`, any mating move counts.
- `modules/chesspuzzles.js`: `load(theme)`, `pick(list, progress, n)` (unseen,
  within 150 of the child's rating, else nearest), Glicko-2 `update(player,
  puzzleRating, won)` updating only the player (start 800/350/0.06, tau 0.5,
  RD floor 45). Tests: the Glicko example from Glickman's paper reproduces
  (1500/200 -> 1464.06/151.52 with the three opponents), and picking never
  repeats a seen id while unseen ones remain.
- Screen `chesspuzzle`: theme grid (themes the child has met are open; the
  others show the lesson that opens them), then a puzzle: board oriented to
  the side to move, "White to move" line, the opponent's move animates in,
  child moves, right: green flash and next; wrong: shake, the piece goes
  back, "Try again", after two wrong a hint dot on the from-square, after
  three the answer plays and the puzzle counts as missed. A session is 5
  puzzles; end card shows stars (5 right first try = 3 stars, 3 to 4 = 2,
  otherwise 1) and the new rating as "Puzzle power: 812" with an up or down arrow.
Commit "Add puzzles from the Lichess database".

## Phase 6: content (three to four days, most of the work)
Write the lessons from `PLAN-lessons.md` into `data/chess/level1.json`,
`level2.json`, `level3.json`. Rules:
- Every `fen` must be valid (`chesscheck.mjs` runs chess.js on it).
- Every `accept` move, `moves` list and `answer` must be legal in its `fen`.
- Every lesson has 5 to 9 steps, at least one `try`, `starhunt`, `tap` or
  `play`, and ends with `done`.
- Level 1 lessons: at most 12 words per `say`. Level 2: 20. Level 3: 30.
- Each piece lesson in level 1 follows the same shape: say (who it is, one
  line of character), show (its moves as dots), try (move it somewhere),
  starhunt (collect 3 stars), tap (which squares can it reach), play
  (its mini-game), done.
- Use the sample games and positions listed in PLAN-lessons.md; do not invent
  a famous game from memory. Where a FEN is marked "construct", build it and
  check it with chess.js before saving.
Do level 1 first, verify, commit, then level 2, then level 3. Flip the room
to `status: 'live'` in `sections.js` once level 1 is complete and playable
end to end, with meta text like `3 levels · 45 lessons · play a bot`.

## Phase 7: rewards and polish (one day)
- Star glyphs on lesson cards; a star pop animation when earned.
- Caged pieces on the level 1 page: each piece lesson shows its piece behind
  bars until the lesson has a star; then the bars drop (one CSS transition).
- Badge on the hub with the piece symbol; a line saying what earns the next.
- Board themes: `wood` (default), `forest` at 10 stars, `ocean` at 25,
  `sunset` at 50, `night` at 100. A picker on the hub; saved in `themes` and
  `settings.chess.theme`. Implemented by a class on the board wrapper that
  swaps the two square tokens.
- "Days practised this week" dots on the hub, seven circles, filled for days
  played. No streak, no loss.
- Sounds: none by default (the app has none); skip.
- Reduced motion: no confetti, no piece slide.
- Read aloud: every `say`, `ask`, `cap` and `why` goes through `speech.speak`
  when `state.settings.readAloud` is on.
Commit "Stars, badges, caged pieces and board themes".

## Phase 8: checks, docs, ship (half a day)
- `tools/chesscheck.mjs` in `verify`: every lesson file parses; ids unique;
  FENs valid; moves legal; every `puzzle` step names a theme file that
  exists; every `play` step names a variant that exists; every level has
  at least 10 lessons; step counts within limits; no `say` over the word cap.
- `tools/smoke.js`: add an entry that opens lesson `l1-rook`, taps Next
  through a `say`, makes the `try` move by dispatching pointer events on the
  board, and reaches the `done` card; and one that opens `#/chess/play`,
  starts a level 0 game, makes one move and sees the bot reply.
- README: add the room to the table and the features list. Numbers must
  match the data (lessons count, puzzles count).
- `sections.js` meta text with the real counts.
- Run `npm run verify`, then test in the browser pane at 375 px, 768x1024,
  and desktop, light and dark. Commit "Open the Chess Club".

## Phase 9: for the mobile app (notes only, no code now)
- Everything is same-origin static files, so a Capacitor or PWA wrapper
  serves the folder as is. The bot worker is a module worker; WKWebView
  supports it. No WASM, no COOP/COEP needed.
- Add a service worker later to precache `data/chess/**` for offline use.
- Progress is one JSON object; a later sync is `max` of stars, union of
  arrays, no personal data.
- Keep touch targets 44 px; the board already scales.

## Definition of done
- A five-year-old can open Chess Club, tap Start, and move a rook to a star
  inside one minute with no reading.
- A child can finish level 1 and beat Sleepy Sloth in a real game.
- A 600-rated child finds level 3 puzzles hard but fair.
- `npm run verify` is green, the smoke test passes, and no console errors on
  any route.
