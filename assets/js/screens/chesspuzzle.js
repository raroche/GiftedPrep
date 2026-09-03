/**
 * screens/chesspuzzle.js — one position, one right move, five in a row.
 *
 * Pick a kind of trick, get five positions of that kind, find the move in
 * each. The positions are real ones from real games that real people got
 * wrong, which is why they are worth solving: the trick is there because
 * somebody missed it.
 *
 * The order matters and is easy to get wrong. Every puzzle begins with the
 * OPPONENT'S move, which is played on screen before the child is asked
 * anything — it is what sets the trick up, and watching it happen is half the
 * teaching. modules/chesspuzzles.js pulls that move out; this plays it.
 *
 * Getting one wrong is worth nothing and costs nothing. After two tries the
 * piece that should move lights up, and after three the answer plays itself
 * and the puzzle simply counts as missed. Nobody is ever stuck.
 */

import { Chess } from './../vendor/chess.js';
import { createBoard } from './../modules/chessboard.js';
import * as puzzles from './../modules/chesspuzzles.js';
import * as progress from './../modules/chessprogress.js';
import { escapeHtml } from './../modules/charts.js';
import { $, paint, react, showScreen, state } from './../modules/shell.js';

const esc = escapeHtml;

/** How long the opponent's setup move takes, so a child can watch it land. */
const SETUP_PAUSE = 700;
/** Wrong tries before the answer starts showing itself. */
const HELP_AFTER = 2;
const GIVE_AFTER = 3;

export function closePuzzles() {
  if (state.chess.board) { state.chess.board.destroy(); state.chess.board = null; }
  state.chess.puzzle = null;
}

/* ------------------------------------------------------------------ */
/* Choosing a theme                                                    */
/* ------------------------------------------------------------------ */

function renderThemes(levels) {
  const p = progress.load();
  const lessonName = (id) => {
    for (const lv of levels || []) {
      const found = (lv.lessons || []).find((l) => l.id === id);
      if (found) return found.name;
    }
    return null;
  };

  const cards = puzzles.THEMES.map((t) => {
    /* A theme is open once its lesson has been done. Until then it is shown
       with the lesson named on it: a shut door with a sign teaches something,
       one without just annoys. */
    const open = !t.opens || (p.stars[t.opens] || 0) > 0;
    const gate = lessonName(t.opens);
    const inner = `
      <span class="cz-puz-theme__name">${esc(t.name)}</span>
      <span class="cz-puz-theme__blurb">${esc(t.blurb)}</span>
      ${open ? '' : `<span class="cz-puz-theme__lock">&#128274; ${
        gate ? `Do "${esc(gate)}" first` : 'Not yet'}</span>`}`;
    return open
      ? `<a class="cz-puz-theme" href="#/chess/puzzles/${esc(t.id)}">${inner}</a>`
      : `<div class="cz-puz-theme is-locked" aria-disabled="true">${inner}</div>`;
  }).join('');

  $('#gp-chesspuzzle-body').innerHTML = `
    <p class="gp-page-lede">One position. One best move. Five in a row.</p>
    <div class="cz-puz-power">
      <span class="cz-puz-power__num">${p.puzzles.r}</span>
      <span class="cz-puz-power__cap">Puzzle power</span>
    </div>
    <div class="cz-puz-themes">${cards}</div>`;
  paint();
  showScreen('chesspuzzle');
}

/* ------------------------------------------------------------------ */
/* One sitting                                                         */
/* ------------------------------------------------------------------ */

async function startSession(theme) {
  closePuzzles();
  const spec = puzzles.themeById(theme);
  $('#gp-chesspuzzle-body').innerHTML = '<p class="gp-muted">Finding some puzzles&hellip;</p>';
  showScreen('chesspuzzle');

  let list;
  try {
    list = await puzzles.load(theme);
  } catch {
    $('#gp-chesspuzzle-body').innerHTML = `
      <div class="gp-callout gp-callout--info">
        <p class="gp-callout__title">Not ready yet</p>
        <p>These puzzles have not been added. Try another kind.</p>
      </div>
      <a class="gp-btn gp-btn--primary" href="#/chess/puzzles">&larr; Back to the puzzles</a>`;
    paint();
    return;
  }

  const p = progress.load();
  const chosen = puzzles.pick(list, p, puzzles.SESSION);
  if (!chosen.length) { renderThemes(state.chess.levels); return; }

  state.chess.puzzle = {
    theme, spec,
    queue: chosen,
    at: 0,
    tries: 0,
    /* One entry per puzzle attempted: what it was and whether it was right
       first time. The rating and the stars both come from this. */
    done: [],
    ready: null,
    step: 0
  };

  $('#gp-chesspuzzle-body').innerHTML = `
    <div class="cz-puz">
      <div class="cz-puz__head">
        <span class="cz-puz__theme">${esc(spec ? spec.name : theme)}</span>
        <span class="cz-puz__count" id="cz-puz-count"></span>
      </div>
      <p class="cz-puz__ask" id="cz-puz-ask"></p>
      <div id="cz-puz-board"></div>
      <p class="cz-puz__say" id="cz-puz-say"></p>
      <div class="gp-row gp-row--wrap cz-puz__tools">
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-puzhint">
          I am stuck</button>
        <a class="gp-btn gp-btn--quiet" href="#/chess/puzzles">Stop here</a>
      </div>
    </div>`;
  paint();
  showPuzzle();
}

function tell(text, tone = '') {
  const box = $('#cz-puz-say');
  if (box) { box.textContent = text || ''; box.className = `cz-puz__say ${tone}`; }
}

/** Set up the next puzzle and play the opponent's move into it. */
function showPuzzle() {
  const run = state.chess.puzzle;
  if (!run) return;
  if (run.at >= run.queue.length) { finish(); return; }

  const ready = puzzles.prepare(run.queue[run.at]);
  if (!ready) { run.at += 1; showPuzzle(); return; }
  run.ready = ready;
  run.step = 0;
  run.tries = 0;

  const game = new Chess(ready.fen, { skipValidation: true });
  run.game = game;

  /* The child plays whoever is NOT to move in the stored position, because
     the stored position is the moment before the opponent moves. */
  const side = game.turn() === 'w' ? 'b' : 'w';
  run.side = side;

  $('#cz-puz-count').textContent = `${run.at + 1} of ${run.queue.length}`;
  $('#cz-puz-ask').textContent = 'Watch what they do…';
  tell('');

  /* One board for the whole puzzle, built with its handlers and locked.
     Rebuilding it after the setup move -- which is what this did first --
     threw away the live region along with everything else, so the one line a
     blind child needs ("They play Bxc5") was spoken into a node that was
     removed in the same breath. */
  if (state.chess.board) state.chess.board.destroy();
  const board = createBoard($('#cz-puz-board'), {
    fen: game.fen(),
    orientation: side,
    label: 'Puzzle board',
    canMove: (sq) => {
      if (run.locked) return false;
      const piece = game.get(sq);
      return Boolean(piece) && piece.color === side;
    },
    dests: (sq) => game.moves({ square: sq, verbose: true }).map((m) => m.to),
    onMove: (from, to, promotion) => {
      answer(`${from}${to}${promotion || ''}`);
      return false;
    }
  });
  state.chess.board = board;
  run.locked = true;

  /* The opponent's move, played where the child can see it. It is what sets
     the trick up, and a puzzle that skips it is a puzzle with its first
     sentence missing. */
  window.setTimeout(() => {
    if (state.chess.puzzle !== run) return;
    let setup;
    try {
      setup = game.move({
        from: ready.setupMove.slice(0, 2),
        to: ready.setupMove.slice(2, 4),
        promotion: ready.setupMove[4] || undefined
      });
    } catch { setup = null; }
    if (!setup) { run.at += 1; showPuzzle(); return; }
    board.setFen(game.fen());
    board.mark({ last: [setup.from, setup.to] });
    board.announce(`They play ${setup.san}. ${
      side === 'w' ? 'White' : 'Black'} to move.`);
    armForChild();
  }, SETUP_PAUSE);
}

/** Hand the board over once the setup move has landed. */
function armForChild() {
  const run = state.chess.puzzle;
  if (!run) return;
  run.locked = false;
  if (state.chess.board) state.chess.board.unlock();
  $('#cz-puz-ask').textContent = run.side === 'w'
    ? 'White to move. Find it.'
    : 'Black to move. Find it.';
}

/** One attempt at the current puzzle. */
function answer(uci) {
  const run = state.chess.puzzle;
  if (!run || !run.ready) return;

  if (!puzzles.isRight(run.ready, run.step, uci)) {
    run.tries += 1;
    react('oops', 1200);
    if (run.tries >= GIVE_AFTER) { giveAway(); return; }
    tell(run.tries >= HELP_AFTER
      ? 'Not that one. Look at the piece that is lit up.'
      : 'Not that one. Have another look.', 'is-retry');
    if (run.tries >= HELP_AFTER) showHelp();
    return;
  }

  /* Right. Play it, then their reply, then either the next move of the
     solution or the next puzzle. */
  playMove(uci);
  run.step += 1;

  const reply = puzzles.replyAfter(run.ready, run.step - 1);
  if (reply) {
    window.setTimeout(() => {
      if (state.chess.puzzle !== run) return;
      playMove(reply);
      run.step += 1;
      armForChild();
      tell('Good. Keep going.', 'is-good');
    }, 420);
    return;
  }

  react('wow', 1600);
  tell(run.tries === 0 ? 'Right, first try.' : 'You found it.', 'is-good');
  finishPuzzle(run.tries === 0);
}

function playMove(uci) {
  const run = state.chess.puzzle;
  let move;
  try {
    move = run.game.move({
      from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined
    });
  } catch { move = null; }
  if (!move) return null;
  const board = state.chess.board;
  if (board) {
    board.setFen(run.game.fen());
    board.mark({ last: [move.from, move.to] });
    board.announce(`${move.san}.`);
  }
  return move;
}

/** Light up the piece that should move. */
function showHelp() {
  const run = state.chess.puzzle;
  const want = run.ready.solution[run.step];
  if (!want || !state.chess.board) return;
  state.chess.board.mark({ ring: [want.slice(0, 2)] });
}

/** Three wrong tries. Show the answer and move on; nobody stays stuck. */
function giveAway() {
  const run = state.chess.puzzle;
  const want = run.ready.solution[run.step];
  tell('Here it is. Watch, and the next one will make more sense.', 'is-retry');
  run.locked = true;
  if (state.chess.board) state.chess.board.lock();
  window.setTimeout(() => {
    if (state.chess.puzzle !== run) return;
    playMove(want);
    finishPuzzle(false);
  }, 500);
}

function finishPuzzle(firstTry) {
  const run = state.chess.puzzle;
  run.done.push({ id: run.ready.id, rating: run.ready.rating, right: firstTry });
  run.locked = true;
  if (state.chess.board) state.chess.board.lock();
  window.setTimeout(() => {
    if (state.chess.puzzle !== run) return;
    run.at += 1;
    showPuzzle();
  }, 1100);
}

/* ------------------------------------------------------------------ */
/* The end of a sitting                                                */
/* ------------------------------------------------------------------ */

function finish() {
  const run = state.chess.puzzle;
  const firstTry = run.done.filter((d) => d.right).length;
  const stars = puzzles.starsFor(firstTry, run.done.length);

  const was = progress.load().puzzles.r;
  const after = progress.update((p) =>
    progress.touchDay(puzzles.afterSession(p, run.done)));
  const now = after.puzzles.r;
  const moved = now - was;

  if (state.chess.board) { state.chess.board.destroy(); state.chess.board = null; }
  react(stars >= 3 ? 'wow' : 'happy', 2400);

  $('#gp-chesspuzzle-body').innerHTML = `
    <div class="gp-done cz-puz__done">
      <p class="cz-lesson__stars">${Array.from({ length: 3 }, (_, i) =>
        `<span class="cz-chess-star${i < stars ? ' is-on' : ''}">${i < stars ? '★' : '☆'}</span>`
      ).join('')}</p>
      <h2>${firstTry} of ${run.done.length} first try.</h2>
      <p class="cz-puz-power cz-puz-power--after">
        <span class="cz-puz-power__num">${now}</span>
        <span class="cz-puz-power__cap">Puzzle power
          ${moved === 0 ? '' : `<span class="cz-puz-power__move${moved > 0 ? ' is-up' : ' is-down'}">${
            moved > 0 ? '▲' : '▼'} ${Math.abs(moved)}</span>`}</span>
      </p>
      <div class="gp-row gp-row--wrap cz-lesson__after">
        <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-action="chess-puzagain">
          Five more</button>
        <a class="gp-btn gp-btn--quiet" href="#/chess/puzzles">A different kind</a>
        <a class="gp-btn gp-btn--quiet" href="#/chess">Back to Chess Club</a>
      </div>
    </div>`;
  paint();
}

/* ------------------------------------------------------------------ */
/* Buttons and routing                                                 */
/* ------------------------------------------------------------------ */

/** Every data-action="chess-puz..." on this screen. */
export function puzzleAction(name) {
  const run = state.chess.puzzle;
  if (name === 'chess-puzhint') {
    if (!run || !run.ready) return true;
    run.tries = Math.max(run.tries, HELP_AFTER);
    tell('That is the one to move.', 'is-retry');
    showHelp();
    return true;
  }
  if (name === 'chess-puzagain') {
    if (run) startSession(run.theme);
    return true;
  }
  return false;
}

/** Route target: #/chess/puzzles and #/chess/puzzles/<theme>. */
export function renderPuzzles(theme, levels) {
  state.chess.levels = levels || state.chess.levels;
  if (theme && puzzles.themeById(theme)) { startSession(theme); return; }
  closePuzzles();
  renderThemes(state.chess.levels);
}
