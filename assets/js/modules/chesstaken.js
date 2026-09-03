/**
 * chesstaken.js — what each side has captured, and who is ahead.
 *
 * Two numbers a child can read at a glance, from the move list rather than
 * from the board.
 *
 * It has to come from the moves. The board cannot answer it: eight pawns on
 * the board looks the same whether the missing two were captured or promoted,
 * and in the mini-games the two sides do not even start with the same army.
 * The move list says exactly what was taken and by whom, and it shrinks again
 * when a move is taken back, which is what "take that back" has to mean here
 * as well.
 *
 * The lead is counted in PIECES, not points. A child learning which pieces are
 * worth more is doing that in its own lesson; a counter that says "+2" after
 * you have taken two things is one they can check by looking at the row of
 * pieces beside it. Points are also here, as `valueLead`, for anything that
 * wants them.
 *
 * Pure: a move list goes in, a plain object comes out.
 */

/** What each piece is worth, in the usual beginner's numbers. */
export const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Biggest first, so a captured row reads queen, rook, bishop, knight, pawn. */
const ORDER = ['q', 'r', 'b', 'n', 'p', 'k'];

const worth = (list) => list.reduce((n, t) => n + (VALUE[t] || 0), 0);

/**
 * Who has taken what.
 *
 * @param {Array} history  `game.history({ verbose: true })`, or anything with
 *   the same shape: `{ color, captured }` per move.
 * @returns {{w: string[], b: string[], countLead: number, valueLead: number}}
 *   `w` is what WHITE has taken (so, black pieces), biggest first. `countLead`
 *   and `valueLead` are positive when White is ahead.
 */
export function taken(history) {
  const out = { w: [], b: [] };
  for (const move of Array.isArray(history) ? history : []) {
    if (!move || !move.captured) continue;
    const by = move.color === 'b' ? 'b' : 'w';
    out[by].push(move.captured);
  }
  for (const side of ['w', 'b']) {
    out[side].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  }
  return {
    ...out,
    countLead: out.w.length - out.b.length,
    valueLead: worth(out.w) - worth(out.b)
  };
}

/**
 * The lead as a child would say it: "+2", or nothing at all when it is level.
 *
 * A "+0" or a "-2" beside the player who is behind are two ways of saying the
 * same thing twice, and the second one says it to the child who least wants to
 * read it. Only the side that is ahead gets a badge.
 */
export function leadLabel(lead, side) {
  const n = Number(lead) || 0;
  if (n === 0) return '';
  const ahead = n > 0 ? 'w' : 'b';
  return side === ahead ? `+${Math.abs(n)}` : '';
}

export default { VALUE, taken, leadLabel };
