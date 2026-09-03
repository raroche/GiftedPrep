# How a room is built in this codebase (facts for the chess plan)

Read before PLAN.md. Everything here was verified in the code on 2026-09-03.

## Hard constraints
- No build step. No npm dependencies. Plain ES modules under `assets/js/`.
- Strict CSP (netlify.toml): `script-src 'self'; style-src 'self'; connect-src 'self'`.
  - No CDN, no inline `<script>`, no `style="..."` attributes in generated markup.
  - Runtime styles go in `data-style="..."` then `paint()` from `modules/shell.js`
    applies them (see `modules/style.js`).
  - Web Workers from `'self'` are allowed (`default-src 'self'` covers worker-src).
  - No `'unsafe-eval'`: any library that uses `eval`/`new Function` is out.
- Import graph is one way: `app.js` -> `screens/*` -> `modules/*`. `tools/archcheck.mjs`
  fails the build on a cycle or on a module importing a screen.
- `npm run verify` runs on every Netlify deploy. New checkers are added to the
  `verify` script in package.json.
- Progress lives in localStorage under the single key `giftedprep.v1`
  (`modules/storage.js`). New per-room progress goes in `settings.<key>` the way
  Math Lab uses `settings.mathDone`, and must be listed in `DEFAULTS.settings`
  so `migrate()` keeps it.

## Where things live
| Thing | File |
|---|---|
| Room list (home tiles, colours, creature) | `assets/js/modules/sections.js` (`ROOMS`) |
| Router (`case 'chess':`) | `assets/js/app.js` `route()` |
| Back button targets | `assets/js/modules/routes.js` `backTarget()` |
| Screen registry (`SCREENS` array) | `assets/js/modules/shell.js` |
| Screen markup (`<section class="gp-screen" id="screen-...">`) | `index.html` |
| Shared state object | `assets/js/modules/shell.js` `state` |
| Delegated click handler (`data-*` attrs and `data-action`) | `assets/js/app.js` `onClick()` |
| Persistent settings | `assets/js/modules/storage.js` |
| Styles (one file, ~3,400 lines) | `assets/css/design-system.css` |
| Icons | `assets/js/modules/icons.js` |
| Mascot reactions (`react('happy')`) | `modules/shell.js` `react()` |
| Speech (read aloud) | `assets/js/modules/speech.js` |
| Unit tests (`node --test`) | `tools/tests/*.test.mjs` |
| Browser smoke test (paste in console) | `tools/smoke.js` |
| Data files | `data/<room>/*.json` |

## The pattern every room follows
1. Add an entry to `ROOMS` in `sections.js`. Fields: id, name, hue, creature, href,
   status ('live' or 'soon'), blurb (<= 90 chars), meta.
   - Live rooms cannot share a hue or a creature (`tools/roomcheck.mjs`).
   - Hues in use by rooms: sky (math), flamingo (fun), orchid (gifted). Brand is mango.
   - Free hues: honey, leaf, jade, lagoon. Free creatures: fox, cat, mouse, giraffe, frog.
   - `.cz-tile--<hue>` classes and `--cz-<hue>*` tokens already exist for all eight hues.
2. Add `<section class="gp-screen" id="screen-<name>">` blocks to `index.html`, each
   with `<div class="gp-container">`, a `<div class="gp-backslot"></div>`, an `<h1
   class="gp-page-title" id="<name>-title">`, and a body div the screen fills.
3. Add the screen names to `SCREENS` in `shell.js` (or `showScreen` throws).
4. Create `assets/js/screens/chess.js` exporting `renderChess(a, b, c)` and handlers.
   Pure rules go in `assets/js/modules/chess*.js` with tests.
5. Add `case 'chess': renderChess(parts[1], parts[2], parts[3]); break;` in `route()`.
6. Add a `case 'chess':` to `backTarget()` in `routes.js` (one step up the path).
7. Add click handling: either `data-action="chess-..."` in the `switch` in
   `onClick()` or a `[data-chess...]` closest() lookup before the switch.
8. Put room-scoped CSS in `design-system.css` with a `cz-chess-` prefix. Add
   `class="cz-room--<hue>"` on the sections so `--room` tokens re-theme the page
   (see `cz-room--sky` on the angle screens).
9. Add state under `state.chess = {...}` in `shell.js`.
10. Extend `tools/linkcheck.mjs` so `#/chess/...` links validate (it parses
    `case '...'` labels from route(), so step 5 is enough for the head; second
    segments need a small allow-list like the math grades).
11. Add a game entry to `tools/smoke.js` `GAMES` so a blank screen is caught.

## Conventions the code enforces
- Escaping: use `escapeHtml` from `modules/charts.js` (screens) or a local `esc`.
- Buttons that act use `data-action="..."`; pickers use `role="radiogroup"` +
  `role="radio"` buttons and get arrow-key support for free (`radioGroupKeys`).
- A correct answer calls `react('happy')`; a wrong one `react('oops')` (check
  `modules/mascot.js` for the mood list before using a name).
- Every game page has a Learn section first, then Practice (`cz-mode--learn`,
  `cz-mode--practice`). Being tested on things you never met is not a game.
- Read-aloud: pass prompt text through `speech.speak([...])` when
  `state.settings.readAloud` is on. Grades 1-2 need it.
- The "done" celebration uses `.gp-done` with a `.gp-done__mark` emoji, and
  `.gp-confetti` exists in the stylesheet.
- Data is fetched with `fetch('data/...', { cache: 'no-cache' })` and cached in
  a module-level Map (see `mathlab.loadGrade`).

## Mascot moods (modules/mascot.js MOODS)
idle, curious, happy, oops, think, sleep, wink, wow. Call `react('happy', 2300)`,
`react('oops', 1800)`, `react('wink', 1400)` on a streak of 3, `react('wow')` for
a big win (checkmate, level up).
