#!/usr/bin/env node
/**
 * Check everything the Chess Club depends on.
 *
 * It grows one section per phase of docs/research/chess/PLAN.md. Right now it
 * covers the two things Phase 0 shipped, both of which fail silently rather
 * than loudly if they break:
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
 * Both are checked by reading the module rather than by trusting it, because
 * the module is generated from downloaded files and will be regenerated.
 */

import fs from 'node:fs';

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
/* Report                                                              */
/* ------------------------------------------------------------------ */

console.log(`${pieces.PIECE_CODES.length} pieces, `
  + `${(svg.length / 1024).toFixed(1)}KB of symbols, rules library present`);

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
