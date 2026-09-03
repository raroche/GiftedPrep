# Chess room: technical options

Research date: 2026-09-03. Constraints assumed throughout: vanilla JS, no build step, no npm dependencies at runtime, Netlify static hosting with a strict CSP (`script-src 'self'; style-src 'self'`, no inline styles, no third-party requests), fully offline, no account, progress in `localStorage`, and a future Capacitor/WebView or PWA wrapper.

Sizes below are raw (uncompressed) bytes measured from jsDelivr on the research date unless noted.

## 1. Rules / move generation

| Option | License | Size | Vendoring | Verdict |
|---|---|---|---|---|
| chess.js 1.4.0 | BSD-2-Clause | `dist/esm/chess.js` 107 KB, one file, zero deps | Copy the single ESM file | **Recommended** |
| chessops 0.15.1 | GPL-3.0-or-later | 30 ESM files, 297 KB total, depends on `@badrap/result` | Multi-file, GPL | No |
| Hand-written engine | yours | ~10-15 KB | n/a | Only if you want to own it |

**chess.js** is the obvious pick. Version 1.x is TypeScript compiled by rollup into exactly one ESM file with no imports (`dist/esm/chess.js`), so it can be dropped into `/js/vendor/chess.js` and loaded with `import { Chess } from './vendor/chess.js'` under `script-src 'self'` with no bundler. It does move generation, legal-move validation, SAN/UCI, FEN, PGN load/export, check/checkmate/stalemate/draw detection, and a `moves({ square, verbose: true })` call that directly feeds "legal-move dots". It has no `eval` and no inline-style or DOM behaviour, so it is CSP-inert. The BSD-2 license needs only the copyright notice kept in the file header.

**chessops** (Lichess) is technically excellent (bitboards, variants, streaming PGN parser, Chess960) but it is GPL-3 and split across ~30 modules with an external dependency, which makes it both a licensing burden for a proprietary app and awkward to vendor without a bundler.

**Hand-rolled**: a 0x88 or mailbox move generator with castling, en passant, promotion, check detection, threefold repetition and 50-move rule is 400-600 lines and a week of bug-hunting. The educational angle (the app already draws its own SVG) does not justify it when chess.js is one permissive file. Keep hand-rolling in reserve only for the *bot* (section 4), not the rules.

PGN parsing: chess.js's `loadPgn()` handles standard PGN with comments and NAGs, which is enough for lesson scripts. Variations (RAVs) are not supported; author lessons as linear move lists in JSON instead of PGN and you never need a full PGN parser.

## 2. Board rendering

| Option | License | Size | Touch drag | Tap-tap | Dots | Last move | Arrows | Inline styles? |
|---|---|---|---|---|---|---|---|---|
| chessground 9.2.1 | GPL-3.0+ | 30 KB min JS + ~18 KB CSS (base + brown + cburnett) | yes | yes | yes (`movable.dests`) | yes | yes, snap to legal moves | Sets `el.style.transform` via CSSOM (allowed under CSP), but needs its own CSS files and a piece-set CSS with data-URI SVGs |
| cm-chessboard 8.14.0 | MIT (code) | ~155 KB of `src/` across many ES modules + 8 KB CSS + SVG sprite | yes | yes | Markers ext. | Markers ext. | Arrows ext. | SVG rendered; CSS files required |
| chessboard.js | MIT | jQuery 3.4+ dependency | yes | no (drag only) | no | no | no | Author has moved on to chessboard2 |
| Hand-rolled SVG board | yours | ~8-15 KB | yes (pointer events) | yes | yes | yes | yes | none |

Two CSP facts drive this decision (MDN, style-src page): with `style-src 'self'` and no `'unsafe-inline'`, inline `<style>` elements, `style=""` attributes, `setAttribute('style', ...)` and `el.style.cssText` are **blocked**, but setting individual CSSOM properties (`el.style.transform = ...`) is **allowed**. So chessground's piece positioning (`el.style.transform = translate(...)` in `src/util.ts`) would actually work; the real blocker is that chessground is **GPL-3**. Its README states that if you use it on a website you must release your source code under a GPL-compatible license. That is a poor fit for a commercial kids' app and closes the door on chessground (and chessops).

**cm-chessboard** is MIT, dependency-free, SVG-rendered, supports click-to-move and drag on touch, has Markers, Arrows, PromotionDialog and an Accessibility extension. Its default pieces are Staunty (CC BY-NC-SA, not usable commercially) and the alternative "standard" sprite is the Wikimedia/cburnett set. It would be usable, but it is ~20 ES modules (model/view/extensions), configured through `assetsUrl` paths, and its DOM/CSS conventions will not match a hand-built SVG app.

**Recommendation: hand-roll the board.** The app already draws its own SVG; a chessboard is 64 `<rect>`s, up to 32 `<use href="#wk">` piece symbols, and a handful of overlay groups (last-move tint, legal-move dots, check ring, arrow layer, drag ghost). Interaction is one `pointerdown/pointermove/pointerup` handler using `setPointerCapture`, which handles mouse, touch and pen identically and gives you tap-tap *and* drag with the same code path. Legal-move dots come straight from `chess.moves({square, verbose:true})`. Arrows are `<line>` + `<marker>` in the SVG. All styling lives in one stylesheet via classes and `data-` attributes, so there are zero inline styles. Estimated 300-500 lines, entirely under your control, no license to track.

## 3. Piece images

Licenses for every Lichess piece set are recorded in `lila/COPYING.md`. The safe-to-vendor sets for a commercial, closed-source app are:

- **cburnett** (Colin M.L. Burnett). Lila lists it as GPLv2+, but the originals on Wikimedia Commons (e.g. `File:Chess_klt45.svg`) are **multi-licensed: GFDL, CC BY-SA 3.0, GPLv2+ and BSD 3-Clause**. Take them from Commons under BSD-3 or CC BY-SA 3.0, keep an attribution line in an about/credits screen. This is the classic, most legible set and the one Wikipedia uses. **Recommended default.**
- **rhosgfx "Vector chess pieces"** (itch.io): **CC0**, SVG + PNG, four colour schemes including a wood look, also shipped by Lichess. Clean, modern, slightly rounded; good "second look" option.
- **kiwen-suwi, Firi, totoy, papercut**: CC BY 4.0 (attribution only). `kiwen-suwi` and `firi` are rounded and friendly, a reasonable kid-flavoured alternative.
- **chessnut** (Apache 2.0), **fantasy / spatial / celtic** (MIT), **shapes** (CC BY-SA 4.0): also fine.

Avoid: **merida** and **mono** (GPLv2+ only), **staunty, maestro, fresca, cardinal, gioco, tatiana, dubrovny, icpieces, horsey, california, anarcandy, disguised, cooke, monarchy, xkcd** (all CC BY-NC-SA, non-commercial), **alpha, chess7, companion, leipzig** ("freeware" / personal use only), **reillycraig, riohacha, shahi** (no or restrictive license). Note that cm-chessboard's default sprite is Staunty, so if you did use that library you would still swap the pieces.

Kid-friendly/cartoon sets: nothing with a true CC0/CC BY license and cartoon styling is well known. The pixel-art sets on itch.io (bz-game, spicygame) are CC0 but stylistically wrong. The practical route is cburnett or rhosgfx for the board plus your own illustrated characters in the *UI chrome* (mascots, badges), which the app already does elsewhere.

Vendoring: inline the six piece shapes for each colour as `<symbol>`s inside one hidden `<svg>` at the top of the room, reference with `<use href="#p-wk">`. That is 12 symbols, ~25 KB total, no external image requests, and pieces recolour/scale with CSS.

## 4. Engine / bot

### Stockfish in WASM

| Build | License | Size | Threads | Needs COOP/COEP | Notes |
|---|---|---|---|---|---|
| stockfish.wasm (lichess, legacy) | GPL-3 | ~400 KB, 150 KB gz (classical eval, no NNUE) | multi | yes | Archived; points to stockfish-web |
| @lichess-org/stockfish-web 0.4.4 `sf_18_smallnet` | GPL-3 | 0.6 MB wasm + NNUE nets fetched separately (small net 2.9 MB, big net 72.8 MB) | multi | yes | Built for lila; expects the net files served from your origin |
| nmrugg `stockfish` 18 `-lite-single` | GPL-3 | ~7 MB (JS+wasm, embedded small net) | single | **no** | README calls this the default "no complicated setup" build |
| nmrugg `stockfish` 18 `-single` | GPL-3 | >100 MB | single | no | Too big |
| nmrugg `stockfish-18-asm.js` | GPL-3 | ~10 MB | n/a | no | Slow fallback |

CSP consequences (MDN): `WebAssembly.compile/instantiate` is **blocked** under `script-src 'self'` unless you add `'wasm-unsafe-eval'`. Workers created from `new Worker('/js/engine.js')` are allowed by `worker-src 'self'` (falls back to `child-src`, then `script-src`, then `default-src`); `blob:` workers need `worker-src blob:`. So any WASM engine requires one CSP change: `script-src 'self' 'wasm-unsafe-eval'`. That is a small, well-understood loosening. The emscripten glue in nmrugg's builds uses a Worker and `fetch`es the `.wasm` from the same origin, which is fine.

Threads: multi-threaded builds need `SharedArrayBuffer`, which needs `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` on the document. Netlify sends any custom header from `_headers` or `netlify.toml [[headers]]` for files it serves from its own store, so this is trivial on the web. But **Capacitor cannot set COOP/COEP on `capacitor://localhost`** (ionic-team/capacitor#6182, open since 2022, no official fix), so `SharedArrayBuffer` is unavailable in the iOS WKWebView wrapper. Use **single-threaded** builds only.

Sizing: `stockfish-18-lite-single` (~7 MB) is 10-20x the rest of the app, must be cached by the service worker for offline, and takes a few seconds to compile on an older iPad. It is also GPL-3, which is fine for a *separately loaded, unmodified engine process talking over UCI*, but you must ship the license text and the source/offer; keep it isolated in its own worker and directory.

Weakening Stockfish: `Skill Level` 0-20 and `UCI_LimitStrength` + `UCI_Elo` (floor ~1320-1350) intentionally pick suboptimal moves via randomised biases across a 4-move MultiPV; the weak move is picked at `depth = 1 + SkillLevel`. Even Skill Level 0 plays around 1350 CCRL, far too strong for a 7-year-old. Lichess gets its levels 1-5 (roughly <400, 500, 800, 1100, 1500) from **Fairy-Stockfish**, which extends Skill Level to -20..20 and uses `Skill Level = -9, -5, -1, 3, 7` at depth 5. Official Stockfish cannot go that low; you would need the Fairy-Stockfish `fsf_14` build (0.73 MB wasm, plus its net) from stockfish-web.

### Tiny JS engines

| Engine | License | Size | Strength | Notes |
|---|---|---|---|---|
| p4wn 2 | Public domain / CC0 | 51 KB `engine.js` | "interesting" club-beginner level, adjustable | Castling, ep, promotion, FEN; alpha-beta, time-limited |
| Garbochess-JS | see repo LICENSE (not stated in README) | 82 KB | Strong (~2000+) | Web Worker, hash, null move, LMR |
| Lozza | MIT | 655 KB single file, NNUE weights embedded | ~2500+ CCRL | No `stop`, no skill option; too strong, needs external weakening |
| Toledo nanochess | proprietary/obfuscated | 1-2 KB | weak, no ep/castling nuances | Not usable |
| Sunfish (Python) | GPL | 111 lines | ~1500-2000 | No JS port found; port would inherit GPL |

**Recommendation: write your own bot on top of chess.js**, following the sunfish/p4wn recipe: material + piece-square tables, negamax with alpha-beta at depth 1-3 plus quiescence on captures, running in a Web Worker (`worker-src 'self'`, no WASM, no CSP change). At ~150-250 lines this is the smallest thing that plays legal, purposeful chess, and it is *easier* to make it play like a child than any Stockfish build. Beginner-bot behaviour, borrowed from how Lichess/Fairy-Stockfish and Chess.com's Komodo "personalities" do it:

- Search shallow (depth 1-2 at level 1, 3-4 at top level) with a move-time cap of ~300-800 ms so it feels quick.
- Score all root moves, then pick with a temperature: at level 1 choose randomly among moves within ~300 cp of the best; at level 3 within ~80 cp; at top level the best. This produces natural "hanging a piece sometimes" rather than nonsense moves.
- Level 1 also ignores captures of its own pieces sometimes (blunder probability), never resigns, and avoids instant mate-in-1 threats only 50% of the time.
- Use `chess.js` for legality so the bot can never make an illegal move.
- Adaptive option (ChessKid-style): nudge the level up after two wins in a row, down after two losses.

Maia (human-like nets) is real but heavy for this app: Maia-1 ONNX models are ~3.5 MB *each* per rating band and need onnxruntime-web (WASM, so `'wasm-unsafe-eval'`, plus several MB of runtime); Maia-2/Maia-3 are MIT but larger and target 1100-1900 rated adults, not beginners. Not worth it for a first version.

## 5. Puzzle and opening data

**Lichess puzzle DB**: `lichess_db_puzzle.csv.zst`, CC0, ~6.06 M puzzles (Aug 2026 dump). Columns: `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate`. Semantics: `FEN` is the position **before** the opponent's move; play `Moves[0]` to get the position to show, then `Moves[1..]` is the solution (UCI). All solution moves are "only moves", except mate-in-1 puzzles where any mating move counts.

Filtering pipeline (one-off script, not shipped): decompress with `zstd`, keep rows with `Rating` 400-1200, `RatingDeviation < 90`, `Popularity >= 80`, `NbPlays >= 500`, and one of the themes you teach (`mateIn1`, `mateIn2`, `fork`, `pin`, `skewer`, `hangingPiece`, `backRankMate`, `discoveredAttack`, `oneMove`, `short`, `endgame`). Sample ~150-300 per theme, strip to `[id, fen, moves, rating, themes]` and emit JSON: roughly 120 bytes per puzzle, so 2,000-3,000 puzzles is ~300 KB raw, ~80 KB gzipped. Split into one file per theme so a lesson loads only what it needs. The theme key list lives in `lila/translation/source/puzzleTheme.xml`.

**Openings**: `lichess-org/chess-openings`, CC0, TSV files `a.tsv`-`e.tsv` (ECO volumes) with `eco, name, pgn`; `dist/` adds `uci` and `epd`. ~3,600 lines. For a kids' room, take 20-40 named openings (Italian, Scotch, London, Four Knights, etc.), convert the `uci` column to a JSON array, and match against the game by comparing the EPD of each position. No PGN parsing needed.

## 6. Accessibility and touch

- **Input model**: support both tap-tap (select then destination) and drag with the same pointer handler; on touch, tap-tap is more reliable for children and the default on Lichess mobile. Show legal-move dots on selection so tap-tap is discoverable. Cancel a selection on tapping empty/illegal square, and treat a tap on another own piece as reselecting.
- **Square size**: WCAG 2.5.8 minimum is 24x24 CSS px; Apple HIG asks for 44 pt, Material 48 dp. A 9.7-11" iPad shows a 360-440 px board in portrait, i.e. 45-55 px squares, which clears the 44 pt guidance. Enforce `min-width: 352px` (44 x 8) for the board and let it grow to `min(90vw, 70vh)`.
- **Screen readers**: mirror Lichess blind mode. Render the board as a real `<table>` (or `role="grid"`) with each square labelled "e4, black pawn"; announce every move into an `aria-live="polite"` region as "Move 12, Black plays knight takes e4"; label every control; add keyboard entry of moves (type `e4`, `Nf3`) as a fallback. Lichess also supports exploring the board by finger with double-tap to select/move under VoiceOver, which comes free from the grid + labelled cells.
- **Colour**: do not rely on hue alone. Use the Wong palette pairings (blue `#0072B2` / orange `#E69F00` / vermillion `#D55E00`), which stay distinct under deuteranopia and protanopia, plus a *shape* cue: last move as a translucent fill, legal moves as dots (ring for captures), check as a red radial ring, selection as a thick outline. Offer a "high contrast" board theme.
- Reduce-motion: respect `prefers-reduced-motion` and skip piece slide animations.

## 7. Storage

One namespaced key, versioned, written whole (it is a few KB):

```json
{
  "v": 1,
  "lessons": { "l01-rook": { "stars": 3, "best": 1, "done": "2026-09-03" } },
  "puzzles": {
    "rating": { "r": 900, "rd": 250, "vol": 0.06, "n": 12 },
    "seen":   { "00sHx": 1, "0009B": -1 }
  },
  "bot":   { "level": 2, "wins": 3, "losses": 5, "streak": 1 },
  "stats": { "totalPuzzles": 40, "totalMoves": 812, "lastPlayed": "2026-09-03" },
  "prefs": { "pieces": "cburnett", "highContrast": false, "sound": true }
}
```

Puzzle rating: implement **Glicko-2** (Glickman's paper, public) in ~60 lines with player start 1500/350/0.06 (for kids start at 800/350), `tau = 0.5`, and treat each puzzle as a game against an opponent with the puzzle's shipped `Rating` and `RatingDeviation`; update only the player, never the puzzle. Lichess does the same but with fractional rating periods so it can update after each puzzle; the plain per-game update is fine offline. Cap the player's RD at 350 and floor at 45 so it converges after ~20 puzzles. Puzzle selection: pick unseen puzzles with `|puzzle.rating - player.rating| < 150` from the current theme. Keep `seen` bounded (last 500 IDs). Wrap `localStorage` in try/catch (private mode, quota) and keep an in-memory copy as the source of truth.

## RECOMMENDATION

1. **Rules**: vendor `chess.js` 1.4.0 `dist/esm/chess.js` (BSD-2, 107 KB, one file, zero deps) as `js/vendor/chess.js`. Do not hand-roll rules; do not use chessops (GPL, multi-file).
2. **Board**: hand-roll an SVG board that matches the app's existing SVG style. Pointer Events for tap-tap and drag; `<use>` piece symbols; overlay groups for last move, dots, check, arrows; all styling via classes. Skip chessground (GPL-3 copyleft on your source) and cm-chessboard (MIT but 20 modules and a non-commercial default piece set).
3. **Pieces**: cburnett from Wikimedia Commons under BSD-3/CC BY-SA 3.0 (attribution in credits) as default; rhosgfx (CC0) as an alternative. Never ship Staunty, Merida, Alpha or any of the CC BY-NC sets.
4. **Bot**: hand-written negamax + piece-square tables in a Web Worker, 4-5 levels tuned by depth, time cap, and "pick among near-best moves" randomness. Zero CSP change (`worker-src 'self'`), zero bytes of WASM, works in Capacitor. Revisit Stockfish (`stockfish-18-lite-single`, GPL-3, ~7 MB, needs `'wasm-unsafe-eval'`, single-thread only because Capacitor cannot send COOP/COEP) only if a "strong analysis" feature is ever wanted.
5. **Data**: pre-filter the CC0 Lichess puzzle DB to 2-3k beginner puzzles (rating 400-1200, popular, by theme) into per-theme JSON (~80 KB gz total); hand-pick 20-40 openings from the CC0 chess-openings TSV as UCI arrays. No PGN parser needed beyond chess.js's `loadPgn` for linear lesson scripts.
6. **A11y**: 44 px minimum squares, tap-tap default, `role="grid"` board with labelled cells and an `aria-live` move announcer, blue/orange highlight palette with shape cues, `prefers-reduced-motion`.
7. **Storage**: one versioned `localStorage` JSON blob; client-side Glicko-2 for the puzzle rating, updating only the player.

## Sources

- https://github.com/jhlywa/chess.js/
- https://www.npmjs.com/package/chess.js/v/1.0.0-beta.8
- https://data.jsdelivr.com/v1/packages/npm/chess.js@1.4.0
- https://github.com/niklasf/chessops
- https://www.npmjs.com/package/chessops
- https://github.com/lichess-org/chessground/blob/master/README.md
- https://raw.githubusercontent.com/lichess-org/chessground/master/src/util.ts
- https://data.jsdelivr.com/v1/packages/npm/chessground@9.2.1
- https://github.com/shaack/cm-chessboard
- https://data.jsdelivr.com/v1/packages/npm/cm-chessboard@8.14.0
- https://chessboardjs.com/
- https://github.com/oakmac/chessboardjs/blob/master/README.md
- https://raw.githubusercontent.com/lichess-org/lila/refs/heads/master/COPYING.md
- https://commons.wikimedia.org/wiki/File:Chess_klt45.svg
- https://rhosgfx.itch.io/vector-chess-pieces
- https://lichess.org/forum/general-chess-discussion/are-the-lichess-piece-sets-free-to-use-in-other-software
- https://github.com/lichess-org/stockfish.wasm/blob/master/Readme.md
- https://github.com/lichess-org/stockfish-web
- https://www.npmjs.com/package/@lichess-org/stockfish-web
- https://github.com/nmrugg/stockfish.js/
- https://tests.stockfishchess.org/api/nn/nn-37f18f62d772.nnue (size check)
- https://riadhmnasri.fr/en/blog/stockfish-in-the-browser-what-wasm-changes
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/worker-src
- https://github.com/WebAssembly/content-security-policy/blob/main/proposals/CSP.md
- https://docs.netlify.com/manage/routing/headers/
- https://answers.netlify.com/t/cross-origin-headers-are-not-working-with-netlify/153447
- https://github.com/ionic-team/capacitor/issues/6182
- https://lichess.org/forum/lichess-feedback/how-strong-are-the-stockfish-levels
- https://lichess.org/forum/general-chess-discussion/how-are-lichess-stockfish-levels-configured
- https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html
- https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html
- https://github.com/douglasbagnall/p4wn
- https://p4wn.sourceforge.net/
- https://github.com/glinscott/Garbochess-JS
- https://github.com/op12no2/lozza
- https://nanochess.org/chess4.html
- https://github.com/thomasahle/sunfish
- https://chessprogramming.org/JavaScript
- https://github.com/CSSLab/maia2
- https://www.npmjs.com/package/maia2-js
- https://huggingface.co/spaces/lczerolens/backends-demo/blob/main/demo/onnx-models/maia-1100.onnx
- https://support.chess.com/en/articles/8614091-how-can-i-play-against-the-chess-com-bots
- https://chessiverse.com/compare/best-chess-bot-for-beginners
- https://database.lichess.org/
- https://raw.githubusercontent.com/lichess-org/lila/master/translation/source/puzzleTheme.xml
- https://github.com/lichess-org/chess-openings
- https://lichess.org/page/blind-mode-changelog
- https://lichess.org/page/blind-mode-guide
- https://www.allaccessible.org/blog/wcag-258-target-size-minimum-implementation-guide
- https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/
- https://davidmathlogic.com/colorblind/
- https://www.colorcontrast.org/color-blind-colors/
- http://www.glicko.net/glicko/glicko2.pdf
- https://github.com/niklasf/liglicko2
- https://github.com/mmai/glicko2js
- https://lichess.org/forum/lichess-feedback/glicko-2-rating-periods
