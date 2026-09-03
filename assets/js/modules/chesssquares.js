/**
 * chesssquares.js — the board as arithmetic, with no browser in sight.
 *
 * Square names, where each one sits on an 8x8 drawing, which way round the
 * board is, what a FEN says, and which piece travelled where. Everything here
 * is a function of its arguments, so all of it is tested in node.
 *
 * It lives apart from chessboard.js because this is the half the lessons, the
 * mini-games and the puzzles all want, and none of them want the DOM that
 * comes with drawing. It is also the half that fails QUIETLY: a board that
 * puts e4 in the wrong place still looks exactly like a chessboard, and a
 * child just finds that the pieces go to the wrong squares.
 */

import { pieceName } from './chesspieces.js';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

/** All 64 names, a8 first, reading the way a board is printed. */
export const SQUARES = RANKS.flatMap((r) => FILES.map((f) => f + r));

export const isSquare = (sq) => typeof sq === 'string' && /^[a-h][1-8]$/.test(sq);

/**
 * Where a square sits on the drawing, in board units (0..7).
 *
 * `orientation` is which colour is at the bottom. Flipping is not a separate
 * code path anywhere else in this file: everything converts through here, so
 * a flipped board cannot disagree with itself about where e4 is.
 */
export function squareToXY(sq, orientation = 'w') {
  if (!isSquare(sq)) return null;
  const file = FILES.indexOf(sq[0]);
  const rank = RANKS.indexOf(sq[1]);
  return orientation === 'b'
    ? { x: 7 - file, y: 7 - rank }
    : { x: file, y: rank };
}

/** The inverse. Anything off the board comes back null, not a wrong square. */
export function xyToSquare(x, y, orientation = 'w') {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (cx < 0 || cx > 7 || cy < 0 || cy > 7) return null;
  return orientation === 'b'
    ? FILES[7 - cx] + RANKS[7 - cy]
    : FILES[cx] + RANKS[cy];
}

/**
 * Light squares are the ones a1 is not: a1 is dark on every real board, and
 * "white on the right" is how a child is taught to set one up.
 *
 * The parity is the sum of the file index and the rank NUMBER, and it caught
 * this out once already — written as `=== 1` it paints the whole board in
 * negative, which still looks like a chessboard and is wrong in every lesson
 * about the bishop keeping its colour.
 */
export const isLightSquare = (sq) =>
  (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 0;

/**
 * The board part of a FEN as { e4: 'wP', ... }.
 *
 * Deliberately not chess.js: the board draws positions that are not legal
 * games — eight pawns and no kings, one knight alone — and asking a rules
 * engine to hold those means fighting it. Anything unparsable gives an empty
 * board rather than a half-drawn one.
 */
export function fenToPosition(fen) {
  const out = {};
  if (typeof fen !== 'string') return out;
  const rows = fen.trim().split(/\s+/)[0].split('/');
  if (rows.length !== 8) return out;
  for (let r = 0; r < 8; r += 1) {
    let file = 0;
    for (const ch of rows[r]) {
      if (/[1-8]/.test(ch)) { file += Number(ch); continue; }
      if (!/[prnbqkPRNBQK]/.test(ch)) return {};
      if (file > 7) return {};
      const sq = FILES[file] + RANKS[r];
      out[sq] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
      file += 1;
    }
    if (file !== 8) return {};
  }
  return out;
}

/** What a screen reader says for one square. Empty squares say so. */
export function squareLabel(sq, code) {
  const where = `${sq[0].toUpperCase()} ${sq[1]}`;
  return code ? `${where}, ${pieceName(code)}` : `${where}, empty`;
}

/**
 * Which squares changed between two positions.
 *
 * Used to decide what to animate. Redrawing every piece on every move made
 * the whole board flicker; only the movers should move.
 */
export function positionDiff(before, after) {
  const changed = new Set();
  for (const sq of SQUARES) {
    if ((before[sq] || null) !== (after[sq] || null)) changed.add(sq);
  }
  return changed;
}

/**
 * Match each arriving piece to the departing piece it must be.
 *
 * A move redraws two squares: one loses a piece and one gains the same kind.
 * Treating that as "delete and create" makes the board blink; recognising it
 * as one piece travelling is what lets it slide. Pairing is by piece kind and
 * then by distance, so castling sends the king to g1 and the rook to f1
 * rather than crossing them over.
 *
 * A promotion pairs nothing: a pawn leaves and a queen arrives, and they are
 * not the same piece, so the pawn is removed and the queen appears. That is
 * the right answer.
 *
 * @param {{sq:string,code:string}[]} left     squares that lost a piece
 * @param {{sq:string,code:string}[]} arrived  squares that gained one
 * @param {'w'|'b'} orientation                only affects which pairing is nearest
 * @returns {Map<string,string>} arriving square -> the square it came from
 */
export function pairMovers(left, arrived, orientation = 'w') {
  const pairs = new Map();
  const used = new Set();
  for (const to of arrived) {
    let best = null;
    let bestDist = Infinity;
    for (const from of left) {
      if (used.has(from.sq) || from.code !== to.code) continue;
      const a = squareToXY(from.sq, orientation);
      const b = squareToXY(to.sq, orientation);
      if (!a || !b) continue;
      const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (d < bestDist) { bestDist = d; best = from; }
    }
    if (best) { used.add(best.sq); pairs.set(to.sq, best.sq); }
  }
  return pairs;
}


export default {
  FILES, RANKS, SQUARES, isSquare, squareToXY, xyToSquare, isLightSquare,
  fenToPosition, squareLabel, positionDiff, pairMovers
};
