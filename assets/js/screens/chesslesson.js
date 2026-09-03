/**
 * screens/chesslesson.js — playing one lesson.
 *
 * A board on one side, one short card on the other, and a row of dots showing
 * how far through we are. Each step of the lesson replaces the card and
 * repaints the board; nothing else on screen moves, so a child never has to
 * re-find anything.
 *
 * The rules for scoring and second chances are all in modules/chesslesson.js,
 * which is pure and tested. This file draws them and owns the two things that
 * need a browser: the board, and the chess rules that tell it which moves are
 * legal.
 *
 * The shape of a step-card follows the Nielsen Norman finding that under-eights
 * cannot infer a goal from a screen that only offers choices: every card says
 * what to do in one short line, and there is always exactly one obvious thing
 * to press.
 */

import { Chess } from './../vendor/chess.js';
import { createBoard } from './../modules/chessboard.js';
import * as lessonKit from './../modules/chesslesson.js';
import * as progress from './../modules/chessprogress.js';
import { gameById } from './../modules/chessgames.js';
import { themeById as puzzleThemeById } from './../modules/chesspuzzles.js';
import * as speech from './../modules/speech.js';
import { escapeHtml } from './../modules/charts.js';
import { $, paint, react, showScreen, state } from './../modules/shell.js';

const esc = escapeHtml;

/* Somewhere for the board when a step has no position of its own. */
const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

/* ------------------------------------------------------------------ */
/* Opening and closing                                                 */
/* ------------------------------------------------------------------ */

export function closeLesson() {
  if (state.chess.board) { state.chess.board.destroy(); state.chess.board = null; }
  state.chess.game = null;
  state.chess.lesson = null;
  state.chess.run = null;
  state.chess.hunt = null;
  state.chess.replay = null;
  speech.cancel();
}

/**
 * Start a lesson from the top.
 *
 * `levels` is every level, so the done card can offer whatever comes next
 * without the caller having to work it out.
 */
export function openLesson(level, lesson, levels) {
  closeLesson();
  state.chess.level = level;
  state.chess.lesson = lesson;
  state.chess.levels = levels;
  state.chess.run = lessonKit.start(lesson);

  $('#chesslesson-title').textContent = `${lesson.emoji} ${lesson.name}`;
  $('#screen-chesslesson').className = `gp-screen cz-room--${level.hue}`;
  $('#gp-chesslesson-body').innerHTML = `
    <div class="cz-lesson">
      <div class="cz-lesson__board" id="gp-lesson-board"></div>
      <div class="cz-lesson__side">
        <div class="cz-lesson__dots" id="gp-lesson-dots"></div>
        <div class="cz-lesson__card" id="gp-lesson-card"></div>
      </div>
    </div>`;
  showScreen('chesslesson');
  drawStep();
}

/* ------------------------------------------------------------------ */
/* The board, set up for whatever the step needs                       */
/* ------------------------------------------------------------------ */

/** Rebuild the board for a step. Cheaper to remake than to un-wire. */
function makeBoard(step, opts = {}) {
  const host = $('#gp-lesson-board');
  if (state.chess.board) state.chess.board.destroy();
  const board = createBoard(host, {
    fen: (step && step.fen) || EMPTY_FEN,
    orientation: (step && step.side === 'b') ? 'b' : 'w',
    label: 'Lesson board',
    theme: progress.load().theme,
    interactive: Boolean(opts.canMove || opts.onSquare),
    ...opts
  });
  state.chess.board = board;
  if (step && step.mark) board.mark(step.mark);
  return board;
}

/** A rules object for the step's position, king-less boards included. */
function ruleset(fen) {
  try {
    return new Chess(fen, { skipValidation: true });
  } catch {
    return null;
  }
}

/**
 * Put the turn back where it was.
 *
 * A star hunt is one child and one piece; there is no opponent and nobody to
 * hand the move to. chess.js does not know that, so after one move it was
 * Black's turn, `moves({ square })` came back empty, and the piece simply
 * stopped being movable -- no error, no message, a hunt that ends after one
 * move. Keeping the side to move fixed is what makes it a puzzle rather than
 * half a game.
 */
function keepTurn(game, side) {
  const parts = game.fen().split(' ');
  parts[1] = side;
  parts[3] = '-';        /* an en passant square from last move is nonsense here */
  game.load(parts.join(' '), { skipValidation: true });
}

/* ------------------------------------------------------------------ */
/* Drawing one step                                                    */
/* ------------------------------------------------------------------ */

function dots() {
  const { lesson, run } = state.chess;
  const { at, total } = lessonKit.progressOf(lesson, run);
  $('#gp-lesson-dots').innerHTML = Array.from({ length: total }, (_, i) =>
    `<span class="gp-dot ${i === at ? 'is-now' : i < at ? 'is-done' : ''}" aria-hidden="true"></span>`
  ).join('') + `<span class="gp-sr-only">Step ${at + 1} of ${total}</span>`;
}

/** The one button that moves the lesson on. */
const nextButton = (label = 'Next') =>
  `<button type="button" class="gp-btn gp-btn--primary gp-btn--big cz-lesson__go"
     data-action="chess-next">${esc(label)} &rarr;</button>`;

function say(text) {
  if (!text) return;
  if (state.settings.readAloud) speech.speak([text]);
}

/** Put a line of feedback under the card without redrawing the whole step. */
function feedback(text, ok) {
  const box = $('#gp-lesson-say');
  if (!box) return;
  box.className = `cz-lesson__say ${ok ? 'is-good' : 'is-retry'}`;
  box.textContent = text || '';
  say(text);
}

function card(inner) {
  $('#gp-lesson-card').innerHTML = inner;
  paint();
}

/**
 * Draw whatever step we are on.
 *
 * One function with a branch per kind rather than a class per kind: there are
 * ten of them, each is a few lines, and having them side by side is the only
 * way to keep the cards looking like each other.
 */
export function drawStep() {
  const { lesson, run } = state.chess;
  if (!lesson || !run) return;
  const step = lessonKit.currentStep(lesson, run);
  dots();
  if (!step) { finish(); return; }

  const ask = (text) => `<p class="cz-lesson__ask">${esc(text)}</p>`;
  const sayBox = '<p class="cz-lesson__say" id="gp-lesson-say"></p>';
  const readAloud = (text) => `<button type="button" class="gp-btn gp-btn--quiet cz-lesson__read"
      data-action="chess-say" data-text="${esc(text)}">
      <span data-icon="speaker" aria-hidden="true"></span>
      <span class="gp-btn__label">Read it to me</span></button>`;

  switch (step.t) {
    case 'say': {
      makeBoard(step);
      card(`${ask(step.text)}${readAloud(step.text)}${nextButton()}`);
      say(step.text);
      break;
    }

    case 'show': {
      const board = makeBoard(step);
      state.chess.replay = step.moves && step.moves.length
        ? { at: 0, startFen: step.fen, moves: step.moves, notes: step.notes || {} }
        : null;
      card(`
        ${ask(step.cap)}
        ${state.chess.replay
          ? `<button type="button" class="gp-btn gp-btn--quiet" data-action="chess-playmoves">
               Show me &#9654;</button>` : ''}
        ${sayBox}${nextButton()}`);
      if (step.mark) board.mark(step.mark);
      say(step.cap);
      break;
    }

    case 'try': {
      const game = ruleset(step.fen);
      const froms = new Set((step.accept || []).map((m) => m.slice(0, 2)));
      const board = makeBoard(step, {
        /* Only the piece the step is about can be picked up. A child hunting
           for the right move should not be able to wander off with a pawn. */
        canMove: (sq) => froms.has(sq),
        dests: (sq) => (game ? game.moves({ square: sq, verbose: true }).map((m) => m.to) : []),
        onMove: (from, to, promotion) => {
          answerStep({ from, to, promotion });
          return false;   /* the step decides what the board shows next */
        }
      });
      if (step.mark) board.mark(step.mark);
      card(`${ask(step.ask)}${readAloud(step.ask)}
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-hint">
          I am stuck</button>${sayBox}`);
      say(step.ask);
      break;
    }

    case 'starhunt': {
      const game = ruleset(step.fen);
      /* Whoever owns the hunting piece keeps the move for the whole hunt. */
      const side = game && game.get(step.piece) ? game.get(step.piece).color : 'w';
      state.chess.hunt = { at: step.piece, left: [...step.stars], moves: 0 };
      if (game) keepTurn(game, side);
      const board = makeBoard(step, {
        canMove: (sq) => sq === state.chess.hunt.at,
        dests: (sq) => {
          if (!game) return [];
          const legal = game.moves({ square: sq, verbose: true });
          /* Some hunts put enemy pieces on the board as walls. They are
             scenery, not food. */
          return legal.filter((m) => !(step.nocapture && m.captured)).map((m) => m.to);
        },
        onMove: (from, to) => {
          if (game) {
            try { game.move({ from, to }); } catch { return false; }
            keepTurn(game, side);
          }
          const hunt = state.chess.hunt;
          hunt.at = to;
          hunt.moves += 1;
          hunt.left = hunt.left.filter((sq) => sq !== to);
          board.setFen(game ? game.fen() : step.fen);
          board.mark({ stars: hunt.left, last: [from, to] });
          $('#gp-lesson-moves').textContent = `${hunt.moves} move${hunt.moves === 1 ? '' : 's'}`;
          if (!hunt.left.length) { react('wow', 2000); answerStep({ moves: hunt.moves }); }
          return false;
        }
      });
      board.mark({ stars: step.stars });
      card(`${ask(step.ask || `Collect every star. Best is ${step.par} moves.`)}
        <p class="cz-lesson__count"><span id="gp-lesson-moves">0 moves</span>
          &middot; best is ${step.par}</p>
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-again">
          Start the hunt again</button>${sayBox}`);
      break;
    }

    case 'tap': {
      const board = makeBoard(step, {
        /* Every tap is an answer, including one on an occupied square. */
        canMove: () => false,
        onSquare: (sq) => {
          state.chess.run = lessonKit.togglePick(state.chess.run, sq, step);
          board.mark({ ...(step.mark || {}), ring: state.chess.run.picked });
          const n = state.chess.run.picked.length;
          const btn = $('[data-action="chess-check"]');
          if (btn) btn.disabled = n === 0;
        }
      });
      if (step.mark) board.mark(step.mark);
      card(`${ask(step.ask)}${readAloud(step.ask)}
        <button type="button" class="gp-btn gp-btn--primary" data-action="chess-check" disabled>
          That is my answer</button>${sayBox}`);
      say(step.ask);
      break;
    }

    case 'quiz': {
      makeBoard(step);
      card(`${ask(step.ask)}${readAloud(step.ask)}
        <div class="gp-choices gp-choices--text">
          ${step.choices.map((c) => `
            <button type="button" class="gp-choice" data-chess-choice="${esc(c.id)}">
              <span class="gp-choice__body">${esc(c.text)}</span>
            </button>`).join('')}
        </div>${sayBox}`);
      say(step.ask);
      break;
    }

    case 'game': {
      const startFen = step.fen || null;
      state.chess.replay = { at: 0, startFen, moves: step.moves, notes: step.notes || {} };
      const board = makeBoard(step, {});
      board.setFen(startFen || new Chess().fen(), { animate: false });
      card(`
        <p class="cz-lesson__ask" id="gp-lesson-note">${esc(step.cap || 'Watch what happens.')}</p>
        <p class="cz-lesson__count"><span id="gp-lesson-ply">Move 0</span>
          of ${Math.ceil(step.moves.length / 2)}</p>
        <div class="gp-row gp-row--wrap">
          <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-back">&larr; Back</button>
          <button type="button" class="gp-btn gp-btn--primary" data-action="chess-fwd">Next move &rarr;</button>
        </div>
        ${nextButton('I have seen enough')}`);
      break;
    }

    case 'play': {
      /* The mini-game and the puzzle set both live on their own screens, and
         both are worth doing properly rather than in a corner of this one. So
         the step hands the child over with a link and scores nothing: a step
         that sends you elsewhere cannot honestly grade what you did when you
         got there. The lesson's own opponent goes in the link, so a lesson
         asking for the gentlest bot gets it rather than whichever rung the
         ladder has the child on. */
      const spec = gameById(step.game);
      makeBoard({ fen: spec ? spec.fen : undefined });
      card(`
        ${ask(step.goal || (spec ? spec.goal : 'Time to play.'))}
        ${spec ? `<p class="cz-lesson__count">${esc(spec.name)} &middot; ${esc(spec.blurb)}</p>` : ''}
        <a class="gp-btn gp-btn--primary gp-btn--big cz-lesson__go"
           href="#/chess/games/${esc(step.game)}/${Number(step.bot) || 0}">Play it &rarr;</a>
        ${nextButton('I have played it')}`);
      break;
    }

    case 'puzzle': {
      const theme = puzzleThemeById(step.theme);
      /* Reaching this step is the introduction, so the puzzle room opens. */
      progress.update((p) => progress.meetTheme(p, step.theme));
      makeBoard(step);
      card(`
        ${ask(step.goal || (theme ? theme.blurb : 'Some puzzles to try.'))}
        ${theme ? `<p class="cz-lesson__count">${esc(theme.name)} &middot; ${step.count || 5} puzzles</p>` : ''}
        <a class="gp-btn gp-btn--primary gp-btn--big cz-lesson__go"
           href="#/chess/puzzles/${esc(step.theme)}">Try them &rarr;</a>
        ${nextButton('I have tried them')}`);
      break;
    }

    case 'done':
    default:
      finish();
  }
}

/* ------------------------------------------------------------------ */
/* Answering                                                           */
/* ------------------------------------------------------------------ */

/** One attempt at whatever the current step asks. */
function answerStep(input) {
  const { lesson, run } = state.chess;
  const step = lessonKit.currentStep(lesson, run);
  const out = lessonKit.judge(step, run, input);
  state.chess.run = lessonKit.record(run, out, step);

  if (!out.ok) {
    react('oops', 1400);
    feedback(out.say, false);
    if (out.help) showHelp(step);
    return;
  }

  react(out.stars >= 3 ? 'wow' : 'happy', 1800);
  feedback(out.say, true);
  /* A beat to read the answer before the next card replaces it. */
  const board = state.chess.board;
  if (board) board.lock();
  window.setTimeout(() => {
    state.chess.run = lessonKit.advance(state.chess.run);
    drawStep();
  }, out.say ? 1400 : 500);
}

/**
 * Show the answer, a bit at a time.
 *
 * Called automatically after two wrong tries and by the "I am stuck" button.
 * A child who is stuck does not go hunting for a hint, so the help has to
 * come to them.
 */
function showHelp(step) {
  const board = state.chess.board;
  if (!board) return;
  if (step.t === 'try') {
    const froms = [...new Set((step.accept || []).map((m) => m.slice(0, 2)))];
    const tos = (step.accept || []).map((m) => m.slice(2, 4));
    board.mark({ ...(step.mark || {}), ring: froms, dots: [] });
    board.select(froms[0]);
    if (step.hint) feedback(step.hint, false);
    else feedback(`Try moving the piece on ${froms[0]}.`, false);
    /* An arrow only after the ring has not been enough. */
    if (state.chess.run.tries >= 3) {
      board.mark({ ...(step.mark || {}), arrows: [[froms[0], tos[0]]] });
    }
  } else if (step.t === 'tap' && step.hint) {
    feedback(step.hint, false);
  }
}

/* ------------------------------------------------------------------ */
/* The end card                                                        */
/* ------------------------------------------------------------------ */

function finish() {
  const { lesson, level, run, levels } = state.chess;
  const step = (lesson.steps || []).find((s) => s.t === 'done');
  const stars = lessonKit.lessonStars(run);

  progress.update((p) => {
    let next = progress.setStars(p, lesson.id, stars);
    next = progress.touchDay(next);
    if (lesson.piece) next = progress.unlock(next, lesson.piece);
    return next;
  });

  const after = progress.load();
  const onward = levels ? progress.nextLesson(levels, after) : null;
  const ready = onward && Array.isArray(onward.lesson.steps) && onward.lesson.steps.length;

  if (state.chess.board) { state.chess.board.destroy(); state.chess.board = null; }
  $('#gp-lesson-board').innerHTML = '';

  const line = (step && step.text) || 'Lesson finished.';
  /* Only for three stars. Confetti every time is wallpaper; confetti for the
     best result is a reward. Anyone who asked for less movement gets the
     stars and the words and no falling paper -- the stylesheet handles that. */
  const cheer = stars >= lessonKit.MAX_STARS
    ? `<span class="gp-confetti" aria-hidden="true">${
      Array.from({ length: 14 }, (_, i) => `<span data-style="--i:${i}"></span>`).join('')}</span>`
    : '';
  card(`
    <div class="gp-done cz-lesson__done">
      ${cheer}
      <p class="cz-lesson__stars">${Array.from({ length: lessonKit.MAX_STARS }, (_, i) =>
        `<span class="cz-chess-star${i < stars ? ' is-on' : ''}">${i < stars ? '★' : '☆'}</span>`
      ).join('')}</p>
      <h2>${esc(line)}</h2>
      ${lesson.piece ? `<p class="cz-lesson__freed">The ${esc(lesson.piece)} is yours now.</p>` : ''}
      <div class="gp-row gp-row--wrap cz-lesson__after">
        ${ready
          ? `<a class="gp-btn gp-btn--primary gp-btn--big"
               href="#/chess/${onward.level.level}/${esc(onward.lesson.id)}">
               Next: ${esc(onward.lesson.name)} &rarr;</a>`
          : ''}
        <a class="gp-btn gp-btn--quiet" href="#/chess/${level.level}">Back to the lessons</a>
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-replay">
          Do it again</button>
      </div>
    </div>`);
  react(stars >= 3 ? 'wow' : 'happy', 2600);
  say(line);
  $('#gp-lesson-dots').innerHTML = '';
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

/** Step through the moves of a `show` or `game` step. */
function replayStep(dir) {
  const r = state.chess.replay;
  const board = state.chess.board;
  if (!r || !board) return;
  const to = Math.min(r.moves.length, Math.max(0, r.at + dir));
  if (to === r.at) return;

  /* Replayed from the start every time rather than undone. It costs nothing
     at this length, and it means the position after seven plies is the same
     position however the child got there -- stepping forward, jumping to the
     end, or going back and forward again. */
  const game = r.startFen ? new Chess(r.startFen, { skipValidation: true }) : new Chess();
  let played = 0;
  for (let i = 0; i < to; i += 1) {
    try { game.move(r.moves[i]); played += 1; } catch { break; }
  }
  r.at = played;
  const last = game.history({ verbose: true }).at(-1);
  board.setFen(game.fen());
  board.mark(last ? { last: [last.from, last.to] } : {});
  if (last) board.announce(`${last.color === 'w' ? 'White' : 'Black'} plays ${last.san}.`);

  const ply = $('#gp-lesson-ply');
  if (ply) ply.textContent = `Move ${Math.ceil(played / 2)}`;
  const note = $('#gp-lesson-note');
  if (note && r.notes && r.notes[played]) { note.textContent = r.notes[played]; say(r.notes[played]); }
}

/** Every data-action="chess-..." on the lesson screen. */
export function lessonAction(name, el) {
  const { lesson, run } = state.chess;

  if (name === 'chess-say') { speech.speak([el.dataset.text], { force: true }); return true; }
  if (!lesson || !run) return false;
  const step = lessonKit.currentStep(lesson, run);

  switch (name) {
    case 'chess-next':
      state.chess.run = lessonKit.advance(run);
      drawStep();
      return true;

    case 'chess-hint':
      state.chess.run = { ...run, tries: Math.max(run.tries, lessonKit.HELP_AFTER) };
      showHelp(step);
      return true;

    case 'chess-check':
      answerStep({ squares: run.picked });
      return true;

    case 'chess-again':
      drawStep();      /* a star hunt starts over from the same position */
      return true;

    case 'chess-playmoves':
      replayStep(state.chess.replay ? state.chess.replay.moves.length : 0);
      return true;

    case 'chess-fwd': replayStep(1); return true;
    case 'chess-back': replayStep(-1); return true;

    case 'chess-replay':
      state.chess.run = lessonKit.start(lesson);
      drawStep();
      return true;

    default:
      return false;
  }
}

/** A tapped answer in a quiz step. */
export function lessonChoice(id) {
  answerStep({ choice: id });
}
