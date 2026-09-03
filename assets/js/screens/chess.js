/**
 * screens/chess.js — the Chess Club room.
 *
 * Three levels: Pawn Camp (the pieces and the rules), Knight School (openings,
 * tactics and the basic mates) and Queen's Guild (600+). The research behind
 * the design and the build plan live in docs/research/chess/.
 *
 * Being built in the phases set out in PLAN.md. Right now the room is a sign
 * on the door plus a workbench at #/chess/board: a free-play board, wired to
 * the real rules, that exists so the touch behaviour can be tried on a real
 * iPad under the real security policy rather than only in unit tests. Phase 4
 * replaces it with the play screen and this route goes away.
 */

import { Chess } from './../vendor/chess.js';
import { createBoard, fenToPosition } from './../modules/chessboard.js';
import { paintRoomHead } from './gifted.js';
import { $, showScreen, state } from './../modules/shell.js';

/* ------------------------------------------------------------------ */
/* The workbench                                                       */
/* ------------------------------------------------------------------ */

/* A position two moves from a promotion and one move from a check, so both
   can be reached without playing a whole game to get there. */
const WORKBENCH_FEN = 'r1bqkbnr/pP3ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 5';

function tearDown() {
  if (state.chess.board) { state.chess.board.destroy(); state.chess.board = null; }
  state.chess.game = null;
}

function renderWorkbench() {
  tearDown();
  const game = new Chess(WORKBENCH_FEN);
  state.chess.game = game;

  const board = createBoard($('#gp-chess-board'), {
    fen: game.fen(),
    label: 'Practice board',
    canMove: (from) => {
      const piece = game.get(from);
      return Boolean(piece) && piece.color === game.turn();
    },
    dests: (from) => game.moves({ square: from, verbose: true }).map((m) => m.to),
    onMove: (from, to, promotion) => {
      let move;
      try {
        move = game.move({ from, to, promotion: promotion || undefined });
      } catch { return false; }
      if (!move) return false;
      board.setFen(game.fen());
      paintState(board, game, move);
      return true;
    }
  });
  state.chess.board = board;
  paintState(board, game, null);

  $('#gp-chess-tools').innerHTML = `
    <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-flip">Turn the board round</button>
    <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-undo">Take it back</button>
    <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-reset">Start again</button>`;
}

/** Where the king of the side to move is standing, or null. */
function kingSquare(game) {
  const want = `${game.turn()}K`;
  return Object.entries(fenToPosition(game.fen()))
    .find(([, code]) => code === want)?.[0] || null;
}

/** Everything the board should be showing about the position it is in. */
function paintState(board, game, move) {
  board.mark({
    last: move ? [move.from, move.to] : [],
    check: game.inCheck() ? kingSquare(game) : null
  });
  if (game.isCheckmate()) board.announce(`${move ? move.san + '. ' : ''}Checkmate.`);
  else if (game.isStalemate()) board.announce('Stalemate. It is a draw.');
  else if (move) board.announce(`${move.color === 'w' ? 'White' : 'Black'} plays ${move.san}.`);
}

/** The workbench's three buttons. Wired from app.js like every other action. */
export function chessAction(name) {
  const { board, game } = state.chess;
  if (!board || !game) return;
  if (name === 'chess-flip') { board.flip(); return; }
  if (name === 'chess-undo') {
    const undone = game.undo();
    if (!undone) return;
    board.setFen(game.fen());
    paintState(board, game, null);
    return;
  }
  if (name === 'chess-reset') {
    game.load(WORKBENCH_FEN);
    board.setFen(game.fen());
    paintState(board, game, null);
  }
}

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

/** Route target: #/chess, and for now #/chess/board. */
export function renderChess(step) {
  paintRoomHead('chess', 'cz-chess-pic');
  const workbench = step === 'board';
  $('#gp-chess-board').hidden = !workbench;
  $('#gp-chess-tools').hidden = !workbench;
  if (workbench) renderWorkbench(); else tearDown();
  showScreen('chess');
}
