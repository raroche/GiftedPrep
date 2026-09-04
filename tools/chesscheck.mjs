#!/usr/bin/env node
/**
 * Check everything the Chess Club depends on.
 *
 * It grows one section per phase of docs/research/chess/PLAN.md. Almost
 * everything it looks for is a failure that is SILENT — no exception, no
 * console line, just a page that is quietly wrong:
 *
 *   A style attribute on a piece. The site sends style-src 'self' with no
 *   unsafe-inline, so the browser DELETES style="fill:#fff" without a word.
 *   The cburnett originals carry one on every path, and pasted in unchanged
 *   they draw twelve identical black silhouettes — in production only, since
 *   a local server sends no policy. This is the same trap that once collapsed
 *   the map-colouring grid and drew the results bars at zero width.
 *
 *   A <use> pointing at a symbol that is not there. SVG renders nothing, logs
 *   nothing and throws nothing. An empty board looks exactly like a board
 *   that has not loaded yet.
 *
 *   A board mark with no CSS rule. An unstyled <circle> is black on a brown
 *   square and reads as a smudge rather than "you may move here".
 *
 *   The accessible grid quietly disappearing in a refactor. Nothing on screen
 *   changes; the board simply stops being playable without a mouse.
 *
 * All of it is checked by READING the source rather than trusting it, because
 * chesspieces.js is generated from downloaded files and will be regenerated.
 */

import fs from 'node:fs';

import { Chess as ChessLib } from '../assets/js/vendor/chess.js';
import { checkLesson } from '../assets/js/modules/chesslesson.js';
import { fenToPosition } from '../assets/js/modules/chesssquares.js';

/**
 * Is this really a FEN?
 *
 * It has to be asked here, because chess.js with { skipValidation: true } --
 * which every king-less mini-game needs -- does not ask. "not a fen at all"
 * loads as a board with one knight on a8, and "xxxx/8/8/8/8/8/8/8 w - - 0 1"
 * loads as an empty board. Neither throws, neither logs, and the lesson shows
 * a child a board that is simply wrong.
 *
 * So: eight ranks, each adding up to exactly eight squares, made only of
 * pieces and digits, and a side to move. Then the position chess.js ended up
 * with is compared against a strict reading of the same string, which catches
 * anything that slipped through as a difference rather than as a crash.
 */
function fenProblem(fen) {
  if (typeof fen !== 'string' || !fen.trim()) return 'is empty';
  const [board, side] = fen.trim().split(/\s+/);
  if (!board) return 'has no board in it';
  const ranks = board.split('/');
  if (ranks.length !== 8) return `has ${ranks.length} ranks, not 8`;
  for (const [i, rank] of ranks.entries()) {
    if (!/^[pnbrqkPNBRQK1-8]+$/.test(rank)) return `rank ${8 - i} ("${rank}") has a character that is not a piece or a number`;
    const squares = [...rank].reduce((n, ch) => n + (/\d/.test(ch) ? Number(ch) : 1), 0);
    if (squares !== 8) return `rank ${8 - i} ("${rank}") covers ${squares} squares, not 8`;
  }
  if (side && !/^[wb]$/.test(side)) return `"${side}" is not a side to move`;

  let got;
  try { got = new ChessLib(fen, { skipValidation: true }).fen(); } catch (e) { return e.message; }
  const want = JSON.stringify(fenToPosition(fen));
  if (JSON.stringify(fenToPosition(got)) !== want) {
    return `chess.js reads it as "${got}", which is a different position`;
  }
  return null;
}

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* ------------------------------------------------------------------ */
/* The pieces                                                          */
/* ------------------------------------------------------------------ */

const PIECES_SRC = 'assets/js/modules/chesspieces.js';
const pieces = await import(`../${PIECES_SRC}`);
const src = fs.readFileSync(PIECES_SRC, 'utf8');

const EXPECTED = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];

if (pieces.PIECE_CODES.join(',') !== EXPECTED.join(',')) {
  err(`${PIECES_SRC}: PIECE_CODES is ${pieces.PIECE_CODES.join(',')}, expected ${EXPECTED.join(',')}`);
}

const svg = pieces.PIECE_SYMBOLS;

/* The one that fails silently in production. */
if (/\sstyle\s*=/.test(svg)) {
  err(`${PIECES_SRC}: a style attribute is present. CSP (style-src 'self') deletes it, `
    + 'so the piece draws with default fill — a black silhouette. Rewrite the '
    + 'declaration as SVG presentation attributes: style="fill:#fff" -> fill="#fff".');
}

/* Nothing may be fetched from anywhere: the app makes no third-party requests. */
if (/https?:\/\//.test(svg)) {
  err(`${PIECES_SRC}: the symbols reference an external URL. Everything must be inline.`);
}
if (/<image\b/.test(svg)) err(`${PIECES_SRC}: <image> in a symbol; the drawings must be vector paths`);

/* Every symbol exists, is on the 45 grid, and actually draws something. */
for (const code of EXPECTED) {
  const m = svg.match(new RegExp(`<symbol id="cz-p-${code}"([^>]*)>([\\s\\S]*?)</symbol>`));
  if (!m) { err(`${PIECES_SRC}: no <symbol id="cz-p-${code}">`); continue; }
  if (!/viewBox="0 0 45 45"/.test(m[1])) {
    err(`${PIECES_SRC}: ${code} is not on the 0 0 45 45 grid, so it will not line up with the others`);
  }
  const body = m[2];
  if (!/<(path|g|circle|rect|ellipse)\b/.test(body)) {
    err(`${PIECES_SRC}: ${code} draws nothing`);
  }
  /* A white piece with no white fill is a silhouette — the failure mode the
     style-attribute bug produces, caught here even if it arrives another way. */
  if (code[0] === 'w' && !/fill="#(fff|ffffff)"/i.test(body)) {
    err(`${PIECES_SRC}: ${code} has no white fill, so it will draw as a black shape`);
  }
  if (pieces.pieceHref(code) !== `#cz-p-${code}`) {
    err(`${PIECES_SRC}: pieceHref('${code}') does not match the symbol id`);
  }
  if (!pieces.pieceName(code)) err(`${PIECES_SRC}: pieceName('${code}') is empty`);
}

const ids = [...svg.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
if (new Set(ids).size !== ids.length) err(`${PIECES_SRC}: two symbols share an id`);

/* Two pieces that draw the same shape means a copy-paste slip; a child cannot
   tell them apart and nothing else would notice. Colour is allowed to be the
   only difference between wP and bP — that is how the set is drawn. */
const bodies = new Map();
for (const code of EXPECTED) {
  const m = svg.match(new RegExp(`<symbol id="cz-p-${code}"[^>]*>([\\s\\S]*?)</symbol>`));
  if (!m) continue;
  const shape = m[1].replace(/fill="[^"]*"/g, '').replace(/stroke="[^"]*"/g, '');
  if (bodies.has(shape)) {
    const other = bodies.get(shape);
    /* The same shape in two colours is fine; the same shape in one colour is not. */
    if (other[0] === code[0]) err(`${PIECES_SRC}: ${code} and ${other} are the same drawing`);
  } else bodies.set(shape, code);
}

/* ------------------------------------------------------------------ */
/* The rules library                                                   */
/* ------------------------------------------------------------------ */

const VENDOR = 'assets/js/vendor/chess.js';
if (!fs.existsSync(VENDOR)) err(`${VENDOR} is missing`);
else {
  const lib = fs.readFileSync(VENDOR, 'utf8');
  /* BSD 2-Clause requires the notice to travel with the source. */
  if (!/Copyright \(c\).*Jeff Hlywa/.test(lib)) {
    err(`${VENDOR}: the BSD copyright notice is gone. It is part of the licence.`);
  }
  if (!/https:\/\/cdn\.jsdelivr\.net\/npm\/chess\.js@/.test(lib)) {
    warn(`${VENDOR}: the header no longer says which version this came from`);
  }
  /* script-src 'self' with no unsafe-eval refuses both of these. */
  if (/\beval\s*\(/.test(lib) || /new Function\s*\(/.test(lib)) {
    err(`${VENDOR}: uses eval or new Function, which script-src 'self' refuses`);
  }
  const { Chess } = await import(`../${VENDOR}`);
  if (new Chess().moves().length !== 20) err(`${VENDOR}: the start position is not giving 20 moves`);
  /* Every king-less mini-game depends on this flag. */
  try {
    const kingless = new Chess('8/8/8/8/8/8/PPPPPPPP/8 w - - 0 1', { skipValidation: true });
    if (kingless.moves().length !== 16) {
      err(`${VENDOR}: a king-less board gives ${kingless.moves().length} pawn moves, expected 16`);
    }
  } catch (e) {
    err(`${VENDOR}: king-less boards no longer load with skipValidation (${e.message}); `
      + 'Pawn Wars and Capture the Flag depend on it');
  }
}

/* ------------------------------------------------------------------ */
/* The board                                                           */
/* ------------------------------------------------------------------ */

const BOARD_SRC = 'assets/js/modules/chessboard.js';
const SQUARES_SRC = 'assets/js/modules/chesssquares.js';
if (!fs.existsSync(SQUARES_SRC)) err(`${SQUARES_SRC} is missing`);
else {
  /* The pure half must stay pure, or it stops being testable in node and
     starts throwing in the worker and in the lesson checker. */
  const squares = fs.readFileSync(SQUARES_SRC, 'utf8');
  if (/\bdocument\b|\bwindow\b|createElementNS/.test(squares)) {
    err(`${SQUARES_SRC} touches the DOM. It is the half that runs in node; `
      + 'drawing belongs in chessboard.js.');
  }
}
if (!fs.existsSync(BOARD_SRC)) err(`${BOARD_SRC} is missing`);
else {
  const board = fs.readFileSync(BOARD_SRC, 'utf8');
  /* The same policy trap as the pieces, one level up: a piece positioned
     through a style attribute lands on a1 and stays there. */
  if (/\.style\.(cssText|transform)\s*=/.test(board) || /setAttribute\(\s*'style'/.test(board)) {
    err(`${BOARD_SRC}: sets a style attribute or cssText, which CSP drops. `
      + 'Position pieces with the transform ATTRIBUTE instead.');
  }
  /* Without this the pieces are <use> elements pointing at nothing: SVG draws
     an empty board and reports no error at all. Checked as a CALL, not a
     mention -- the import line alone satisfied `includes()` and the check
     passed with the call deleted. */
  if (!/ensurePieceDefs\s*\(/.test(board.replace(/^import[^;]+;$/gm, ''))) {
    err(`${BOARD_SRC}: never calls ensurePieceDefs, so every <use> points at `
      + 'a missing symbol and the board draws empty with no error');
  }
  /* The accessible half is the only way the board can be played without a
     mouse, and it is the sort of thing a refactor quietly drops. */
  for (const [needle, why] of [
    ["role', 'grid'", 'the board must expose a real grid to a screen reader'],
    ["aria-live", 'moves must be announced'],
    ['tabIndex', 'the grid needs a roving tab stop, not 64 of them']
  ]) {
    if (!board.includes(needle)) err(`${BOARD_SRC}: no ${needle} — ${why}`);
  }
}

const CSS = 'assets/css/design-system.css';
const css = fs.readFileSync(CSS, 'utf8');
/* Every class the board draws has to exist, or the mark is invisible: an
   unstyled <circle> is black on a brown square and reads as a smudge.

   The name has to END where the class ends. A plain substring search passes
   when .cz-cb__dot--take has been renamed to .cz-cb__dot--taken, which is
   exactly the sort of rename that loses a rule. */
const hasClass = (cls) =>
  new RegExp(`\\.${cls.replace(/[-]/g, '\\-')}(?![\\w-])`).test(css);
for (const cls of ['cz-cb', 'cz-cb__sq--light', 'cz-cb__sq--dark', 'cz-cb__piece',
  'cz-cb__dot', 'cz-cb__dot--take', 'cz-cb__star', 'cz-cb__check', 'cz-cb__ring',
  'cz-cb__arrow', 'cz-cb__last', 'cz-cb__select', 'cz-cb__coord',
  'cz-cb__promocell', 'cz-cb__promoveil', 'cz-cb__live', 'cz-cb__grid']) {
  if (!hasClass(cls)) err(`${CSS}: no .${cls} rule; that mark draws unstyled`);
}

/* And the other way: a class in the stylesheet that nothing draws is dead
   weight, or worse, evidence of a rename that only got half done.

   Modifiers are often built rather than written -- `cz-cb__sq--${light ? ...}`
   never appears whole in the source -- so a modifier counts as drawn when its
   stem is drawn. */
const boardSrc = fs.existsSync(BOARD_SRC) ? fs.readFileSync(BOARD_SRC, 'utf8') : '';
const drawn = (cls) => boardSrc.includes(cls)
  || (cls.includes('--') && boardSrc.includes(cls.split('--')[0]));
for (const m of new Set([...css.matchAll(/\.(cz-cb__[\w-]+)/g)].map((x) => x[1]))) {
  if (!drawn(m)) warn(`${CSS}: .${m} is styled but nothing draws it`);
}
/* 44px is Apple's touch target and the size a six-year-old can actually hit,
   so the board's default floor is eight of them. */
if (!/--cb-floor:\s*352px/.test(css)) {
  warn(`${CSS}: the board no longer has a 352px floor, so squares can fall under 44px`);
}
/* The floor has to be written at doubled specificity. createBoard() puts
   .cz-cb on whatever element it is handed, so the board usually wears a layout
   class as well, and a plain `.cz-cb { min-width }` loses to any `min-width: 0`
   on that class written later in the file -- which is exactly what happened,
   costing a phone a pixel per square in silence. */
if (!/\.cz-cb\.cz-cb\s*\{[^}]*min-width:\s*var\(--cb-floor\)/.test(css)) {
  err(`${CSS}: the board's floor must be written as `
    + '`.cz-cb.cz-cb { min-width: var(--cb-floor) }` so a layout class on the '
    + 'same element cannot override it');
}
/* The floor is one variable because two rules need it: the width, and the
   negative margin that centres the board on a phone. Written as two numbers
   they had to be kept equal by hand, and a board centred against the wrong
   number sits off to one side with no error anywhere. */
const literal352 = [...css.matchAll(/352px/g)].length;
if (literal352 > 1) {
  err(`${CSS}: 352px appears ${literal352} times — the board floor must live `
    + 'only in --cb-floor, and everything else must read that variable');
}
/* A screen too narrow to hold the floor has to lower it, or the whole page
   goes wider than the phone and every screen in the app slides sideways. */
if (!/--cb-floor:\s*calc\(100vw/.test(css)) {
  err(`${CSS}: no narrow-screen override for --cb-floor — on a 320px phone the `
    + 'board is wider than the screen and the whole page scrolls sideways');
}

/* ------------------------------------------------------------------ */
/* The lessons                                                         */
/* ------------------------------------------------------------------ */

const seenLessonIds = new Map();
const levels = [];
for (const n of [1, 2, 3]) {
  const file = `data/chess/level${n}.json`;
  if (!fs.existsSync(file)) { err(`${file} is missing`); continue; }
  let level;
  try {
    level = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) { err(`${file}: ${e.message}`); continue; }
  levels.push(level);

  for (const key of ['level', 'id', 'name', 'hue', 'band', 'blurb', 'who', 'lessons']) {
    if (level[key] === undefined) err(`${file}: missing "${key}"`);
  }
  if (level.level !== n) err(`${file}: says it is level ${level.level}`);
  if (!css.includes(`.cz-tile--${level.hue}`)) {
    err(`${file}: hue "${level.hue}" has no .cz-tile--${level.hue} rule, so the tile is uncoloured`);
  }
  if (!Array.isArray(level.lessons) || level.lessons.length < 10) {
    err(`${file}: a level needs at least 10 lessons, has ${level.lessons?.length ?? 0}`);
    continue;
  }

  const emoji = new Map();
  for (const [i, lesson] of level.lessons.entries()) {
    const at = `${file} lesson ${i + 1} (${lesson.id || '?'})`;
    for (const key of ['id', 'name', 'emoji', 'big', 'minutes']) {
      if (!lesson[key]) err(`${at}: missing "${key}"`);
    }
    if (!Array.isArray(lesson.steps)) err(`${at}: "steps" must be an array, even an empty one`);
    /* An id is a URL. A space or a slash in one is a route that never resolves. */
    if (lesson.id && !/^l[123]-[a-z0-9]+$/.test(lesson.id)) {
      err(`${at}: id must look like "l1-rook" — it is part of the address bar`);
    }
    if (seenLessonIds.has(lesson.id)) {
      err(`${at}: id already used in ${seenLessonIds.get(lesson.id)}`);
    } else seenLessonIds.set(lesson.id, file);

    /* Two lessons with the same picture look like the same lesson on a grid
       a child is scanning, which is the only way they are told apart at speed. */
    if (emoji.has(lesson.emoji)) {
      err(`${at}: the same emoji as ${emoji.get(lesson.emoji)}`);
    } else emoji.set(lesson.emoji, lesson.id);

    if (lesson.big && lesson.big.length > 60) {
      warn(`${at}: "big" is ${lesson.big.length} chars; it wraps past two lines on a card`);
    }
    if (lesson.minutes > 12) {
      warn(`${at}: ${lesson.minutes} minutes. Research says 3-5 for ages 5-8, 10 at the very top.`);
    }
    if (lesson.piece && !['rook', 'bishop', 'queen', 'knight', 'pawn', 'king'].includes(lesson.piece)) {
      err(`${at}: "${lesson.piece}" is not a chess piece`);
    }

    /* The shape of every step, from the runner's own rules. */
    for (const problem of checkLesson(lesson, at)) err(problem);

    /* How much a child is asked to read at once. The teaching research is
       specific: a wall of text is the commonest reason a child puts a
       learning app down, and level 1 is written for someone who may not be
       reading fluently at all. The ceiling rises with the level. */
    const SAY_WORDS = { 1: 12, 2: 20, 3: 30 }[level.level] || 30;
    /* An explanation may run longer than an instruction. It is read after the
       child has already answered, so nobody is stuck in front of it, and
       cutting a "why" to twelve words usually costs the reason. */
    const WHY_WORDS = SAY_WORDS + 8;
    const countWords = (t) => t.trim().split(/\s+/).length;
    const complain = (where, field, words, cap, text) =>
      err(`${where}: "${field}" is ${words} words and the ceiling here is ${cap}. "${text}"`);

    for (const [j, step] of (lesson.steps || []).entries()) {
      const where = `${at} step ${j + 1}`;
      /* Everything a child has to read BEFORE they can act. */
      for (const field of ['text', 'ask', 'cap', 'goal']) {
        if (typeof step[field] !== 'string') continue;
        const words = countWords(step[field]);
        if (words > SAY_WORDS) complain(where, field, words, SAY_WORDS, step[field]);
      }
      /* Everything they read afterwards. */
      for (const field of ['why', 'hint', 'wrongSay']) {
        if (typeof step[field] !== 'string') continue;
        const words = countWords(step[field]);
        if (words > WHY_WORDS) complain(where, field, words, WHY_WORDS, step[field]);
      }
      /* An answer they have to choose between has to be readable at a glance. */
      for (const choice of step.choices || []) {
        if (!choice || typeof choice.text !== 'string') continue;
        const words = countWords(choice.text);
        if (words > 12) complain(where, `choice "${choice.id}"`, words, 12, choice.text);
      }
    }

    /* A lesson that is all reading is a video with extra taps, and one that
       runs long loses a five-year-old halfway through. */
    if (lesson.steps.length && (lesson.steps.length < 5 || lesson.steps.length > 9)) {
      err(`${at}: ${lesson.steps.length} steps; a lesson is 5 to 9`);
    }

    /* And then the chess itself. A lesson that asks for an illegal move is
       not a broken program -- the board simply refuses, forever, and the
       child is stuck on a step with no way past it. */
    for (const [j, step] of (lesson.steps || []).entries()) {
      const where = `${at} step ${j + 1} (${step.t})`;
      let game = null;
      if (step.fen) {
        const problem = fenProblem(step.fen);
        if (problem) { err(`${where}: the position "${step.fen}" ${problem}`); continue; }
        game = new ChessLib(step.fen, { skipValidation: true });
      }
      if (step.t === 'try' && game) {
        for (const uci of step.accept || []) {
          const move = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
          if (uci[4]) move.promotion = uci[4];
          let ok = false;
          try { ok = Boolean(new ChessLib(step.fen, { skipValidation: true }).move(move)); } catch { ok = false; }
          if (!ok) err(`${where}: "${uci}" is not a legal move in that position`);
        }
      }
      if (step.t === 'starhunt' && game) {
        if (!game.get(step.piece)) err(`${where}: there is no piece on ${step.piece}`);
        for (const sq of step.stars || []) {
          if (game.get(sq)) err(`${where}: a star sits on top of a piece at ${sq}`);
        }
      }
      if (step.t === 'tap' && game && step.anyOf) {
        /* An `anyOf` list is a claim about the position: these are the squares
           that answer the question. Written by hand it drifts from the FEN the
           moment either changes, and the symptom is a child being told a right
           answer is wrong -- which is the bug this field was added to fix.

           The only question the app asks this way is "which squares can this
           piece NOT reach", so that is what is checked: every listed square
           must be one the mover cannot legally move to, and no reachable
           square may be in the list. */
        const mover = Object.entries(fenToPosition(step.fen))
          .find(([, code]) => code[0] === game.turn() && code[1] !== 'K');
        if (!mover) {
          err(`${where}: "anyOf" needs one piece of the side to move to ask about`);
        } else {
          const [from] = mover;
          const reach = new Set(game.moves({ square: from, verbose: true }).map((m) => m.to));
          const wrong = step.anyOf.filter((sq) => reach.has(sq));
          if (wrong.length) {
            err(`${where}: "anyOf" lists ${wrong.join(', ')}, which the piece on `
              + `${from} CAN reach — a child tapping one is told they are wrong`);
          }
          const missed = [...reach].length
            ? [...Array(64).keys()]
              .map((n) => 'abcdefgh'[n % 8] + '12345678'[Math.floor(n / 8)])
              .filter((sq) => sq !== from && !reach.has(sq) && !step.anyOf.includes(sq))
            : [];
          if (missed.length) {
            err(`${where}: "anyOf" leaves out ${missed.join(', ')}, which the piece `
              + `on ${from} cannot reach either — a child tapping one is told they are wrong`);
          }
        }
      }
      if (step.t === 'game') {
        const g = step.fen ? new ChessLib(step.fen, { skipValidation: true }) : new ChessLib();
        for (const [k, san] of (step.moves || []).entries()) {
          try { g.move(san); } catch {
            err(`${where}: move ${k + 1} "${san}" cannot be played`);
            break;
          }
        }
        for (const ply of Object.keys(step.notes || {})) {
          if (Number(ply) > (step.moves || []).length) {
            err(`${where}: a note is attached to move ${ply}, past the end of the game`);
          }
        }
      }
      if (step.t === 'puzzle' && step.theme) {
        const file = `data/chess/puzzles/${step.theme}.json`;
        if (!fs.existsSync(file)) warn(`${where}: no ${file} yet (Phase 5)`);
      }
    }
  }
}

if (levels.length === 3 && new Set(levels.map((l) => l.hue)).size !== 3) {
  err('two levels share a hue, so their tiles are the same colour');
}

/* ------------------------------------------------------------------ */
/* The opponents                                                       */
/* ------------------------------------------------------------------ */

const { LEVELS } = await import('../assets/js/modules/chessbot.js');
const { CREATURES } = await import('../assets/js/modules/sections.js');

const seenCreature = new Map();
const seenHue = new Map();
for (const b of LEVELS) {
  const at = `bot level ${b.level} (${b.name})`;
  if (!CREATURES.includes(b.creature)) {
    err(`${at}: no creature called "${b.creature}"`);
  }
  /* Two opponents that look alike are one opponent as far as a child is
     concerned, and the whole point of the ladder is that they are different
     people. */
  if (seenCreature.has(b.creature)) {
    err(`${at}: the same creature as ${seenCreature.get(b.creature)}`);
  } else seenCreature.set(b.creature, b.name);
  if (seenHue.has(b.hue)) {
    err(`${at}: the same colour as ${seenHue.get(b.hue)}`);
  } else seenHue.set(b.hue, b.name);
  for (const suffix of ['', '-soft']) {
    if (!css.includes(`--cz-${b.hue}${suffix}:`)) {
      err(`${at}: no --cz-${b.hue}${suffix} token, so it draws colourless`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* The mini-games                                                      */
/* ------------------------------------------------------------------ */

const { GAMES, open: openGame } = await import('../assets/js/modules/chessgames.js');
for (const g of GAMES) {
  const at = `game "${g.id}"`;
  const problem = fenProblem(g.fen);
  if (problem) { err(`${at}: the position ${problem}`); continue; }
  const board = openGame(g);
  if (!board) { err(`${at}: will not load`); continue; }
  if (board.moves().length === 0) err(`${at}: starts with nothing to move`);
  /* A game already won before anyone touches it is not a game. */
  const { winner } = await import('../assets/js/modules/chessgames.js');
  if (winner(g, board) !== null) err(`${at}: is already won at move one`);
  const hasKing = /k/i.test(g.fen.split(' ')[0]);
  if (hasKing !== g.kings) err(`${at}: says kings:${g.kings} but its position disagrees`);
}

/* ------------------------------------------------------------------ */
/* The puzzles                                                         */
/* ------------------------------------------------------------------ */

const { THEMES, prepare } = await import('../assets/js/modules/chesspuzzles.js');

const lessonIds = new Set(seenLessonIds.keys());
let puzzleTotal = 0;
let puzzleFiles = 0;
for (const theme of THEMES) {
  const at = `puzzle theme "${theme.id}"`;
  /* The lesson that opens a theme has to exist, or the theme is shut for
     ever and the card says to go and do a lesson that is not there. */
  if (theme.opens && !lessonIds.has(theme.opens)) {
    err(`${at}: opened by "${theme.opens}", which is not a lesson`);
  }

  const file = `data/chess/puzzles/${theme.id}.json`;
  if (!fs.existsSync(file)) {
    warn(`${at}: no ${file} yet — run tools/build_puzzles.mjs`);
    continue;
  }
  puzzleFiles += 1;

  let list;
  try {
    list = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) { err(`${file}: ${e.message}`); continue; }
  if (!Array.isArray(list) || !list.length) { err(`${file}: no puzzles in it`); continue; }
  puzzleTotal += list.length;

  const ids = new Set();

  let longest = 0;
  let lowest = Infinity;
  for (const puz of list) {
    if (ids.has(puz.id)) { err(`${file}: puzzle ${puz.id} appears twice`); break; }
    ids.add(puz.id);
    longest = Math.max(longest, (puz.moves || []).length);
    lowest = Math.min(lowest, puz.r || Infinity);
  }
  /* A child who has found the right idea should not then have to hold it
     together for eight more moves to be told they were right. The database
     hands out sixteen-move puzzles happily. */
  if (longest > 7) {
    err(`${file}: a puzzle runs ${longest} moves; the limit is 7 including `
      + "the opponent's first move");
  }
  /* A theme where nothing is easy cannot be a child's first attempt at it. */
  if (lowest > 800) {
    warn(`${file}: the easiest puzzle in it is rated ${lowest}, which is above `
      + 'where a child starts');
  }

  /* Every puzzle, not a sample. This started as a sample on the assumption
     that replaying thousands of positions would be slow; it takes under a
     second for all 3,250, and a sample would have shipped a bad row without
     anyone knowing. */
  for (const puz of list) {
    const where = `${file} puzzle ${puz.id}`;
    for (const key of ['id', 'fen', 'moves', 'r']) {
      if (puz[key] === undefined) err(`${where}: missing "${key}"`);
    }
    if (!Array.isArray(puz.moves) || puz.moves.length < 2) {
      err(`${where}: needs the opponent's move and at least one answer`);
      continue;
    }
    const problem = fenProblem(puz.fen);
    if (problem) { err(`${where}: the position ${problem}`); continue; }

    /* Every move must actually be playable, in order, from that position.
       This is where an off-by-one in the exporter shows up: the stored FEN is
       the position BEFORE the opponent's move, and a file built without that
       in mind produces positions that look fine and solutions that do not
       work. */
    const game = new ChessLib(puz.fen, { skipValidation: true });
    for (const [i, uci] of puz.moves.entries()) {
      let ok = false;
      try {
        ok = Boolean(game.move({
          from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined
        }));
      } catch { ok = false; }
      if (!ok) { err(`${where}: move ${i + 1} "${uci}" cannot be played`); break; }
    }

    const ready = prepare(puz);
    if (!ready) err(`${where}: will not prepare`);
  }
}

/* Every board colour a child can earn must actually exist in the stylesheet,
   and the two lists must agree. A colour with no rule draws a board with no
   squares -- and it is only reachable after fifty stars, so nobody would find
   out for a long time. */
const { THEMES: BOARD_THEMES } = await import('../assets/js/modules/chessboard.js');
const { THEMES: EARNED_THEMES } = await import('../assets/js/modules/chessprogress.js');
for (const t of EARNED_THEMES) {
  if (!BOARD_THEMES.includes(t.id)) {
    err(`board colour "${t.id}" can be earned but the board does not know it`);
  }
  if (!new RegExp(`\\.cz-cb--${t.id}\\s*\\{[^}]*--cb-light`).test(css)) {
    err(`board colour "${t.id}" has no .cz-cb--${t.id} rule, so it draws with no squares`);
  }
}
for (const id of BOARD_THEMES) {
  if (!EARNED_THEMES.some((t) => t.id === id)) {
    warn(`board colour "${id}" exists but no number of stars unlocks it`);
  }
}

/* The pieces a lesson can free have to be pieces. */
const PIECES = ['rook', 'bishop', 'queen', 'knight', 'pawn', 'king'];
const freed = new Set();
for (const level of levels) {
  for (const lesson of level.lessons || []) {
    if (!lesson.piece) continue;
    if (!PIECES.includes(lesson.piece)) continue;   /* already reported above */
    if (freed.has(lesson.piece)) err(`two lessons both free the ${lesson.piece}`);
    freed.add(lesson.piece);
  }
}
if (levels.length && freed.size !== PIECES.length) {
  const missing = PIECES.filter((x) => !freed.has(x));
  err(`no lesson frees the ${missing.join(', ')}; that piece stays in its cage for ever`);
}

/* What the puzzle files were built from. Without it the data is reproducible
   in principle and nobody can tell you from what. */
const MANIFEST = 'data/chess/puzzles/manifest.json';
if (!fs.existsSync(MANIFEST)) {
  warn(`${MANIFEST} is missing; re-run tools/build_puzzles.mjs`);
} else {
  let man;
  try { man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) { err(`${MANIFEST}: ${e.message}`); }
  if (man) {
    for (const key of ['source', 'licence', 'builtAt', 'filters', 'themes', 'rows', 'unique']) {
      if (man[key] === undefined) err(`${MANIFEST}: missing "${key}"`);
    }
    /* A manifest that has drifted from the files is worse than none: it says
       with confidence where data came from that it did not come from. */
    if (man.rows !== undefined && man.rows !== puzzleTotal) {
      err(`${MANIFEST} says ${man.rows} puzzles but the files hold ${puzzleTotal}. `
        + 'Re-run tools/build_puzzles.mjs.');
    }
    for (const [theme, n] of Object.entries(man.themes || {})) {
      const file = `data/chess/puzzles/${theme}.json`;
      if (!fs.existsSync(file)) { err(`${MANIFEST} lists ${theme}, which has no file`); continue; }
      const have = JSON.parse(fs.readFileSync(file, 'utf8')).length;
      if (have !== n) err(`${MANIFEST} says ${theme} has ${n} puzzles; it has ${have}`);
    }
  }
}

/* A child must never meet an old puzzle while new ones remain, which means
   the record has to be able to remember the entire library. */
const { MAX_SEEN } = await import('../assets/js/modules/chessprogress.js');
const uniquePuzzles = new Set();
for (const theme of THEMES) {
  const file = `data/chess/puzzles/${theme.id}.json`;
  if (!fs.existsSync(file)) continue;
  try {
    for (const p of JSON.parse(fs.readFileSync(file, 'utf8'))) uniquePuzzles.add(p.id);
  } catch { /* already reported above */ }
}
/* Every puzzle should also carry its own rating deviation, or the Glicko
   maths falls back to a made-up number for it. */
for (const theme of THEMES) {
  const file = `data/chess/puzzles/${theme.id}.json`;
  if (!fs.existsSync(file)) continue;
  try {
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    const missing = list.filter((p) => typeof p.rd !== 'number').length;
    if (missing) {
      err(`${file}: ${missing} puzzles have no rating deviation, so the rating `
        + 'has to guess one. Re-run tools/build_puzzles.mjs.');
    }
  } catch { /* already reported */ }
}
if (uniquePuzzles.size > MAX_SEEN) {
  err(`the puzzle library holds ${uniquePuzzles.size} puzzles but a child's record `
    + `only remembers ${MAX_SEEN} of them, so old ones will come back round `
    + 'while new ones are still unseen. Raise MAX_SEEN in chessprogress.js.');
}

/* ------------------------------------------------------------------ */
/* Credit where it is due                                              */
/* ------------------------------------------------------------------ */

const CREDITS = 'docs/research/chess/CREDITS.md';
if (!fs.existsSync(CREDITS)) err(`${CREDITS} is missing; the licences require attribution`);
else {
  const credits = fs.readFileSync(CREDITS, 'utf8');
  for (const must of ['Burnett', 'chess.js', 'BSD']) {
    if (!credits.includes(must)) err(`${CREDITS} does not mention ${must}`);
  }
}

/* ------------------------------------------------------------------ */
/* What the room tells people it has                                   */
/* ------------------------------------------------------------------ */

/* The home page tile and the README both quote counts. A number that has
   drifted from the data is a small lie a child can check, and the sort of
   thing nobody notices until somebody counts. */
const { ROOMS } = await import('../assets/js/modules/sections.js');
const room = ROOMS.find((r) => r.id === 'chess');
if (!room) err('there is no chess room in sections.js');
else if (room.status === 'live') {
  const claims = [
    [`${seenLessonIds.size} lessons`, 'lessons'],
    [`${GAMES.length} games`, 'mini-games'],
    [`${puzzleTotal.toLocaleString()} puzzles`, 'puzzles']
  ];
  for (const [text, what] of claims) {
    if (!room.meta.includes(text)) {
      err(`the home page tile says "${room.meta}" but there are ${text} — `
        + `update the ${what} count in modules/sections.js`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* The board hands back a clean container                              */
/* ------------------------------------------------------------------ */

/* A lesson destroys and rebuilds the board into the SAME element on every
   step. lock() puts `is-locked` on that element, and building a new board did
   not take it off: the new board's own state said unlocked, so taps still
   worked, but every piece kept the "you cannot touch this" cursor for the rest
   of the lesson. It threw nothing and the markup looked right, which is why it
   survived a browser pass. Both places have to wipe the state classes. */
{
  const src = fs.readFileSync(new URL('../assets/js/modules/chessboard.js', import.meta.url), 'utf8');
  const STATE_CLASSES = ['is-locked', 'is-still'];
  /* Counting each class on its own is not enough: lock/unlock and still/moving
     already remove them one at a time in the normal run of things. What has to
     exist is a call that wipes the WHOLE set at once, in both the build and
     the teardown. */
  const wipes = [...src.matchAll(/container\.classList\.remove\(([^)]*)\)/g)]
    .map((m) => m[1])
    .filter((args) => STATE_CLASSES.every((cls) => args.includes(`'${cls}'`)));
  if (wipes.length < 2) {
    err('chessboard.js must clear every state class '
      + `(${STATE_CLASSES.join(', ')}) from the container in one go, both when a `
      + `board is built and when it is destroyed — found ${wipes.length} of the 2 places`);
  }
}

/* ------------------------------------------------------------------ */
/* An instruction has to say what to do                                */
/* ------------------------------------------------------------------ */

/*
 * "Deliver it." was the whole instruction on a checkmate step. A child who
 * does not already know the answer cannot even begin: it names no piece, no
 * square, and no goal. "Take it", "Finish it" and "Play the fork" were the
 * same.
 *
 * So every step a child has to ACT on must name something on the board -- a
 * square, or a piece. "Now tap h1" is three words and perfectly clear; "Take
 * the bigger one" is four and is not. Length is not the test; naming a target
 * is.
 */
{
  const SQUARE = /\b[a-h][1-8]\b/;
  /* Something on the board, not a pronoun. A "find it yourself" question is
     allowed to withhold the answer -- "tap the piece nobody is guarding" says
     perfectly well what to do -- so the test is that SOMETHING concrete is
     named, not that the answer is given away. */
  const PIECE = new RegExp('\\b(king|queen|rook|bishop|knight|pawn|piece|square'
    + '|row|column|star|checkmate|check|mate|fork|pin|castle)s?\\b', 'i');
  const DOING = ['try', 'tap', 'starhunt'];
  for (const level of levels) {
    const file = `data/chess/level${level.level}.json`;
    for (const lesson of level.lessons || []) {
      for (const [j, step] of (lesson.steps || []).entries()) {
        if (!DOING.includes(step.t)) continue;
        const ask = typeof step.ask === 'string' ? step.ask : '';
        if (!ask) continue;      /* a missing ask is already an error elsewhere */
        if (SQUARE.test(ask) || PIECE.test(ask)) continue;
        err(`${file} lesson ${lesson.id} step ${j + 1}: "${ask}" does not say what `
          + 'to do it to — name a square or a piece, or a child who does not '
          + 'already know the answer cannot start');
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* A lesson that says a piece is stuck had better be right              */
/* ------------------------------------------------------------------ */

/*
 * "So the black rook is stuck. The moment it steps off the file, the queen is
 * yours." The rook was not stuck. It could take the rook that was supposedly
 * holding it -- and that capture was CHECKMATE. A child following the lesson
 * was being taught a tactic out of a position where the other side simply
 * wins on the spot.
 *
 * Nothing caught it because every FEN was legal, every accepted move was
 * legal, and the story only falls apart if you ask what the other side would
 * do. So that is what this asks. Where a step's own words claim the opponent
 * cannot move, give the opponent the move and check they have no mate.
 *
 * It only inspects steps that make the claim, because in ordinary chess the
 * side to move having mate in one is not a fault -- it is whose turn it is.
 */
{
  const CLAIMS = /stuck|cannot move|can not move|dare not|may not move|frozen|cannot leave|is pinned|pinned piece/i;
  for (const level of levels) {
    const file = `data/chess/level${level.level}.json`;
    for (const lesson of level.lessons || []) {
      for (const [j, step] of (lesson.steps || []).entries()) {
        if (!step.fen) continue;
        const words = [step.text, step.ask, step.why, step.hint, step.cap, step.goal]
          .filter((t) => typeof t === 'string').join(' ');
        if (!CLAIMS.test(words)) continue;

        const parts = step.fen.split(' ');
        const them = parts[1] === 'w' ? 'b' : 'w';
        parts[1] = them;
        parts[3] = '-';           /* an en-passant square from the other side is nonsense */
        let theirs;
        try { theirs = new ChessLib(parts.join(' '), { skipValidation: true }); } catch { continue; }
        /* Flipping the turn can invent an impossible position -- one where the
           side that just "moved" is in check. Nothing can be concluded from
           those, so they are left alone. */
        if (theirs.inCheck()) continue;

        const mates = theirs.moves({ verbose: true }).filter((m) => m.san.includes('#'));
        if (mates.length) {
          err(`${file} lesson ${lesson.id} step ${j + 1}: it says a piece is stuck, `
            + `but with the move that side plays ${mates.map((m) => m.san).join(' or ')} `
            + 'and the game is over — the lesson is teaching from a position that is lost');
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Looking back at a finished game                                     */
/* ------------------------------------------------------------------ */

/* The board has to survive the end of the game. It used to be thrown away and
   replaced by a result card, so a child was told they had lost something they
   could no longer look at -- and "why did I lose?" had no answer on screen.
   The result now goes into a box UNDER the board. If the end card ever goes
   back to replacing the whole body, this fails. */
{
  const src = fs.readFileSync(new URL('../assets/js/screens/chessplay.js', import.meta.url), 'utf8');
  const finishAt = src.indexOf('function finish(');
  const finishBody = finishAt === -1 ? '' : src.slice(finishAt, finishAt + 2600);
  if (!finishAt) {
    err('screens/chessplay.js: no finish() — the end of a game is not handled');
  } else if (/\$\('#gp-chessplay-body'\)\.innerHTML/.test(finishBody)) {
    err('screens/chessplay.js: finish() replaces the whole screen, which throws '
      + 'the board away — a child cannot look back at the game they just lost');
  }
  for (const [needle, why] of [
    ['cz-play-taken-you', 'the pieces a child has taken are not shown'],
    ['cz-play-taken-them', 'the pieces the opponent has taken are not shown'],
    ['chess-back', 'there is no way to step back through a game'],
    ['chess-fwd', 'there is no way to step forward through a game'],
    ['chess-live', 'there is no way back to the live game from a review']
  ]) {
    if (!src.includes(needle)) err(`screens/chessplay.js: ${why} (${needle} is gone)`);
  }
  /* Looking back must never be able to move a piece. */
  if (!/viewAt !== null/.test(src)) {
    err('screens/chessplay.js: nothing stops a move being made while reviewing '
      + 'a past position');
  }
}

/* Every ending says what actually happened. One sentence for all of them told
   a child whose last piece was taken that somebody "got there first". */
{
  const { endReason, result, GAMES, ENDINGS } = await import('../assets/js/modules/chessgames.js');
  const REASONS = ['promotion', 'nothing-left', 'no-moves', 'checkmate', 'held-out', 'other'];
  const bare = new ChessLib('8/8/8/8/8/8/PPPPPPPP/RNBQ1BNR b - - 0 1', { skipValidation: true });
  if (typeof endReason !== 'function') err('chessgames.js no longer says HOW a game ended');
  else if (!REASONS.includes(endReason('flag', bare))) {
    err(`chessgames.js: endReason returned "${endReason('flag', bare)}", which is not one of `
      + REASONS.join(', '));
  }
  /* Every line in the table, not only the ones this one position can reach.
     Checking through result() looked thorough and quietly skipped four of the
     six endings, because a single board can only end one way. */
  for (const why of REASONS) {
    const pair = ENDINGS[why];
    if (!pair) { err(`no ending message for "${why}"`); continue; }
    for (const outcome of ['win', 'loss']) {
      const say = pair[outcome];
      if (!say || say.length < 8) {
        err(`the "${why}" ${outcome} message is missing or too short`);
        continue;
      }
      if (/\b(lost|lose|loser|beaten|failed)\b/i.test(say)) {
        err(`"${say}" tells a beginner they failed`);
      }
      if (outcome === 'loss' && !/again|another go/i.test(say)) {
        err(`"${say}" does not invite a child to try again`);
      }
      if (outcome === 'win' && !/won|cornered/i.test(say)) {
        err(`"${say}" does not tell a child they won`);
      }
    }
  }
  for (const spec of GAMES) {
    const out = result(spec, bare, 0, 'b');
    if (out && !REASONS.includes(out.why)) {
      err(`${spec.id}: ended with reason "${out.why}", which is not one of ${REASONS.join(', ')}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const written = levels.reduce((n, lv) =>
  n + lv.lessons.filter((l) => l.steps && l.steps.length).length, 0);
console.log(`${pieces.PIECE_CODES.length} pieces, `
  + `${(svg.length / 1024).toFixed(1)}KB of symbols, rules library present, `
  + `${levels.length} levels, ${seenLessonIds.size} lessons (${written} written), `
  + `${puzzleFiles} puzzle themes (${puzzleTotal.toLocaleString()} puzzles)`);

if (warnings.length) {
  console.log(`\nwarnings (${warnings.length}):`);
  warnings.forEach((m) => console.log(`  ! ${m}`));
}
if (errors.length) {
  console.log(`\nERRORS (${errors.length}):`);
  errors.forEach((m) => console.log(`  x ${m}`));
  process.exit(1);
}
console.log('\nNo errors.');
