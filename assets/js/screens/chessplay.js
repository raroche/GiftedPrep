/**
 * screens/chessplay.js — playing a game against one of the bots.
 *
 * Pick an opponent, pick a game, play it. The eight games run from Pawn Wars,
 * which a four-year-old can win on their first day, up to a whole game of
 * chess; the five bots run from one that mostly wanders to one that plays the
 * best move it can find.
 *
 * Two things here are deliberate and worth defending.
 *
 * Taking a move back is always allowed and costs nothing. Every instinct from
 * competitive chess says otherwise — "touch it, move it" is the first rule a
 * club teaches. But that rule is for a tournament, and a five-year-old who
 * loses a queen to a mis-tap and has to play out twenty more moves has learnt
 * only that the game is unkind. The tournament rule is taught in its own
 * lesson, where it belongs.
 *
 * The bot moves up and down on its own, three games at a time. Not one: a
 * single loss to an opponent a child usually beats says nothing, and dropping
 * them a rung for it is insulting.
 */

import { Chess } from './../vendor/chess.js';
import { createBoard, fenToPosition } from './../modules/chessboard.js';
import * as bot from './../modules/chessbot.js';
import * as games from './../modules/chessgames.js';
import * as progress from './../modules/chessprogress.js';
import { taken, leadLabel } from './../modules/chesstaken.js';
import { pieceHref, pieceName } from './../modules/chesspieces.js';
import { escapeHtml } from './../modules/charts.js';
import { creature } from './../modules/sections.js';
import { $, paint, react, showScreen, state } from './../modules/shell.js';

const esc = escapeHtml;

/* One worker, shared by every game in the session. Made on first use, because
   a child who never plays should not pay for it. */
let client = null;
const engine = () => {
  if (!client) client = bot.botClient();
  return client;
};

/* ------------------------------------------------------------------ */
/* Opening and closing                                                 */
/* ------------------------------------------------------------------ */

export function closePlay() {
  if (state.chess.board) { state.chess.board.destroy(); state.chess.board = null; }
  state.chess.play = null;
  state.chess.game = null;
}

/* ------------------------------------------------------------------ */
/* Choosing an opponent                                                */
/* ------------------------------------------------------------------ */

/* Each opponent in its own colour. The room is green, so a green bot would
   read as part of the furniture rather than as somebody sitting opposite. */
const botFace = (spec) => `<span class="cz-play-face">${creature(spec.creature, {
  tone: `var(--cz-${spec.hue})`,
  inner: `var(--cz-${spec.hue}-soft)`
})}</span>`;

function renderSetup(fixedGameId) {
  const p = progress.load();
  const suggested = p.bot.level;
  const chosen = state.chess.pick || { level: suggested, game: fixedGameId || 'pawnwars', side: 'w' };
  state.chess.pick = chosen;

  const gameSpec = games.gameById(chosen.game) || games.GAMES[0];

  $('#gp-chessplay-body').innerHTML = `
    <p class="gp-page-lede">Pick who you are playing and what you are playing.</p>

    ${fixedGameId ? '' : `
    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">The game</legend>
      <div class="cz-play-games" role="radiogroup" aria-label="Which game" id="cz-play-games">
        ${games.GAMES.map((g) => `
          <button type="button" role="radio" class="cz-play-game${g.id === chosen.game ? ' is-on' : ''}"
                  aria-checked="${g.id === chosen.game}" data-chess-game="${esc(g.id)}">
            <span class="cz-play-game__name">${esc(g.name)}</span>
            <span class="cz-play-game__blurb">${esc(g.blurb)}</span>
          </button>`).join('')}
      </div>
    </fieldset>`}

    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">Who you are playing</legend>
      <div class="cz-play-bots" role="radiogroup" aria-label="Which opponent" id="cz-play-bots">
        ${bot.LEVELS.map((b) => `
          <button type="button" role="radio" class="cz-play-bot${b.level === chosen.level ? ' is-on' : ''}"
                  aria-checked="${b.level === chosen.level}" data-chess-bot="${b.level}">
            ${botFace(b)}
            <span class="cz-play-bot__name">${esc(b.name)}</span>
            <span class="cz-play-bot__blurb">${esc(b.blurb)}</span>
            ${b.level === suggested
              ? '<span class="cz-play-bot__tag">About right for you</span>' : ''}
          </button>`).join('')}
      </div>
    </fieldset>

    <p class="cz-play-goal"><strong>${esc(gameSpec.name)}:</strong> ${esc(gameSpec.goal)}</p>

    <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-action="chess-start">
      Start playing &rarr;
    </button>`;
  paint();
  showScreen('chessplay');
}

/* ------------------------------------------------------------------ */
/* Playing                                                             */
/* ------------------------------------------------------------------ */

/** Where the king of the side to move is, so check can be shown. */
function kingSquare(game) {
  const want = `${game.turn()}K`;
  return Object.entries(fenToPosition(game.fen()))
    .find(([, code]) => code === want)?.[0] || null;
}

function startGame(spec, level, side) {
  closePlay();
  const game = games.open(spec);
  if (!game) return;

  const play = {
    spec, level, side, game,
    over: null,
    hinted: false,
    thinking: false,
    /** which position is on the board: null means the live one */
    viewAt: null,
    /* Every position since the start, so taking back is exact rather than
       clever. A game is at most a couple of hundred of these. */
    history: [game.fen()]
  };
  state.chess.play = play;
  state.chess.game = game;

  const opponent = bot.levelInfo(level);
  $('#gp-chessplay-body').innerHTML = `
    <div class="cz-play">
      <div class="cz-play__who cz-play__who--them">
        <div class="cz-play__line">
          ${botFace(opponent)}
          <span class="cz-play__name">${esc(opponent.name)}</span>
          <span class="cz-play__think" id="cz-play-think" hidden>thinking&hellip;</span>
        </div>
        <div class="cz-play__taken" id="cz-play-taken-them" hidden></div>
      </div>
      <div id="cz-play-board"></div>
      <div class="cz-play__who cz-play__who--you">
        <div class="cz-play__line">
          <span class="cz-play__name">You</span>
          <span class="cz-play__goal">${esc(spec.goal)}</span>
        </div>
        <div class="cz-play__taken" id="cz-play-taken-you" hidden></div>
      </div>
      ${reviewBar()}
      <p class="cz-play__say" id="cz-play-say"></p>
      <div class="gp-row gp-row--wrap cz-play__tools" id="cz-play-tools">
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-takeback">
          Take that back</button>
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-hint">
          Show me a good move</button>
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-newgame">
          Different game</button>
      </div>
      <div id="cz-play-done"></div>
    </div>`;

  const board = createBoard($('#cz-play-board'), {
    fen: game.fen(),
    orientation: side,
    label: `${spec.name} board`,
    theme: progress.load().theme,
    canMove: (sq) => {
      if (play.over || play.thinking || play.viewAt !== null) return false;
      const piece = game.get(sq);
      return Boolean(piece) && piece.color === side && game.turn() === side;
    },
    dests: (sq) => game.moves({ square: sq, verbose: true }).map((m) => m.to),
    onMove: (from, to, promotion) => {
      let move;
      try { move = game.move({ from, to, promotion: promotion || undefined }); } catch { return false; }
      if (!move) return false;
      play.history.push(game.fen());
      board.setFen(game.fen());
      afterMove(move);
      return true;
    }
  });
  state.chess.board = board;

  /* Touching the board while looking at the past brings you back to the game.
     It has to be its own listener: the board is locked while reviewing, and a
     locked board does not report taps to its owner at all -- which is right,
     because a tap there must never be read as a move. */
  board.el.addEventListener('pointerdown', () => {
    const now = state.chess.play;
    if (now === play && now.viewAt !== null) viewAt(null);
  });

  paint();
  showScreen('chessplay');
  paintBoardState(null);
  paintTaken();
  paintReview();

  /* If the child is Black, the bot opens. */
  if (game.turn() !== side) botTurn();
}

/* ------------------------------------------------------------------ */
/* What has been taken, and looking back                               */
/* ------------------------------------------------------------------ */

/**
 * The strip of captured pieces beside a player, and the "+2" beside it.
 *
 * Drawn from the move list rather than the board, so that taking a move back
 * takes the piece off the strip with it, and so that stepping back through a
 * finished game shows what had been taken AT THAT POINT rather than at the
 * end.
 */
function paintTaken() {
  const play = state.chess.play;
  if (!play) return;
  const all = play.game.history({ verbose: true });
  const upTo = play.viewAt === null ? all.length : play.viewAt;
  const score = taken(all.slice(0, upTo));

  const theirs = play.side === 'w' ? 'b' : 'w';
  const draw = (id, side) => {
    const box = $(id);
    if (!box) return;
    /* `side` is who did the taking, so the pieces shown are the OTHER
       colour: a row of the things this player has won. */
    const gone = score[side];
    const colour = side === 'w' ? 'b' : 'w';
    const badge = leadLabel(score.countLead, side);
    box.innerHTML = gone.map((t) => {
      const code = colour + t.toUpperCase();
      return `<svg class="cz-play__tk" viewBox="0 0 45 45" role="img"
        aria-label="${esc(pieceName(code))}"><use href="${pieceHref(code)}"></use></svg>`;
    }).join('')
      + (badge ? `<span class="cz-play__lead">${badge}</span>` : '');
    /* Nothing taken yet is not an empty shelf to look at. The row appears the
       moment there is something to put on it, which is also when a child
       first has a reason to look there. */
    box.hidden = gone.length === 0;
    box.setAttribute('aria-label',
      `taken: ${gone.length} piece${gone.length === 1 ? '' : 's'}${badge ? `, ${badge} ahead` : ''}`);
  };
  draw('#cz-play-taken-you', play.side);
  draw('#cz-play-taken-them', theirs);
}

/** The back/forward bar. Rendered once; its buttons are enabled as they apply. */
function reviewBar() {
  return `<div class="cz-play__review" id="cz-play-review">
      <button type="button" class="gp-btn gp-btn--icon" data-action="chess-back"
        aria-label="Back one move">&larr;</button>
      <span class="cz-play__at" id="cz-play-at" aria-live="polite"></span>
      <button type="button" class="gp-btn gp-btn--icon" data-action="chess-fwd"
        aria-label="Forward one move">&rarr;</button>
      <button type="button" class="gp-btn gp-btn--quiet cz-play__live"
        data-action="chess-live">Back to the game</button>
    </div>`;
}

/**
 * Show the position as it was after `at` moves, or the live one when null.
 *
 * Looking back is looking only. The board is locked the whole time a child is
 * in the past, because a move made there would be a move in a position the
 * game has already left -- and there is no sensible thing for it to do.
 * Touching the board is how you come back, which is what a child tries first.
 */
function viewAt(at) {
  const play = state.chess.play;
  const board = state.chess.board;
  if (!play || !board) return;
  const last = play.history.length - 1;
  play.viewAt = at === null ? null : Math.max(0, Math.min(last, at));

  const showing = play.viewAt === null ? last : play.viewAt;
  board.setFen(play.history[showing]);

  const moves = play.game.history({ verbose: true });
  const move = showing > 0 ? moves[showing - 1] : null;
  board.mark({ last: move ? [move.from, move.to] : [] });

  /* Locked while reviewing, and locked for good once the game is over. */
  if (play.viewAt !== null || play.over) board.lock();
  else board.unlock();

  paintTaken();
  paintReview();
}

/** Enable, disable and label the review bar for where we are. */
function paintReview() {
  const play = state.chess.play;
  if (!play) return;
  const last = play.history.length - 1;
  const at = play.viewAt === null ? last : play.viewAt;

  const bar = $('#cz-play-review');
  if (bar) bar.hidden = last === 0;

  const back = $('[data-action="chess-back"]');
  const fwd = $('[data-action="chess-fwd"]');
  if (back) back.disabled = at === 0;
  if (fwd) fwd.disabled = at === last;

  const live = $('[data-action="chess-live"]');
  if (live) live.hidden = play.viewAt === null;

  const where = $('#cz-play-at');
  if (where) {
    where.textContent = at === 0 ? 'the start'
      : `move ${at}${at === last && play.viewAt === null ? '' : ` of ${last}`}`;
  }

  /* Nothing that changes the game is offered while looking at the past, or
     after it has finished. */
  const busy = play.viewAt !== null || Boolean(play.over);
  for (const name of ['chess-takeback', 'chess-hint']) {
    const el = $(`[data-action="${name}"]`);
    if (el) el.disabled = busy;
  }
}

function paintBoardState(move) {
  const play = state.chess.play;
  const board = state.chess.board;
  if (!play || !board) return;
  const { game } = play;
  board.mark({
    last: move ? [move.from, move.to] : [],
    check: play.spec.kings && game.inCheck() ? kingSquare(game) : null
  });
  if (move) {
    board.announce(`${move.color === play.side ? 'You play' : 'They play'} ${move.san}.`);
  }
}

function tell(text, tone = '') {
  const box = $('#cz-play-say');
  if (box) { box.textContent = text || ''; box.className = `cz-play__say ${tone}`; }
}

/** Called after any move by either side. */
function afterMove(move) {
  const play = state.chess.play;
  if (!play) return;
  paintBoardState(move);
  paintTaken();
  paintReview();

  const moveCount = Math.floor(play.game.history().length / 2);
  const done = games.result(play.spec, play.game, moveCount, play.side);
  if (done) { finish(done); return; }

  if (play.game.turn() !== play.side) botTurn();
}

/** The bot's go. */
async function botTurn() {
  const play = state.chess.play;
  if (!play || play.over) return;
  play.thinking = true;
  const badge = $('#cz-play-think');
  if (badge) badge.hidden = false;

  /* A beat before it answers. An instant reply from a "thinking" opponent
     reads as a trick, and a child cannot follow a board that changes in the
     same frame they touched it. */
  const started = Date.now();
  const uci = await engine().move(play.game.fen(), play.level, Date.now());
  const waited = Date.now() - started;
  if (waited < 350) await new Promise((r) => setTimeout(r, 350 - waited));

  /* The child may have left, or started something else, while it thought. */
  if (state.chess.play !== play || play.over) return;

  play.thinking = false;
  if (badge) badge.hidden = true;
  if (!uci) { checkStuck(); return; }

  let move;
  try {
    move = play.game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
  } catch { move = null; }
  if (!move) { checkStuck(); return; }

  play.history.push(play.game.fen());
  if (state.chess.board) state.chess.board.setFen(play.game.fen());
  afterMove(move);
}

/** The bot had no move. Either the game is over or something is wrong. */
function checkStuck() {
  const play = state.chess.play;
  if (!play) return;
  const moveCount = Math.floor(play.game.history().length / 2);
  const done = games.result(play.spec, play.game, moveCount, play.side);
  if (done) finish(done);
  else tell('Something went wrong finding a move. Start a new game.', 'is-retry');
}

/* ------------------------------------------------------------------ */
/* The end                                                             */
/* ------------------------------------------------------------------ */

function finish(done) {
  const play = state.chess.play;
  play.over = done;
  if (state.chess.board) state.chess.board.lock();

  /* A hint means the game still counts, but for one star rather than the
     full three. Asking for help is not cheating; it is what help is for. */
  const stars = done.outcome === 'win' ? (play.hinted ? 2 : 3)
    : done.outcome === 'draw' ? 2 : 1;

  const after = progress.update((p) => {
    const recent = [...p.bot.recent, done.outcome === 'win' ? 1 : 0].slice(-10);
    return {
      ...progress.touchDay(p),
      games: {
        played: p.games.played + 1,
        won: p.games.won + (done.outcome === 'win' ? 1 : 0)
      },
      bot: { level: bot.nextBotLevel(p.bot.level, recent), recent }
    };
  });

  /* Every move, not chess's "full moves". A child who has just made eleven
     moves is not told they made five. */
  const moved = play.game.history().length;
  const moveOn = after.bot.level !== play.level;
  const opponent = bot.levelInfo(after.bot.level);

  react(done.outcome === 'win' ? 'wow' : 'happy', 2400);

  /* The board stays. Replacing the whole screen with a card was the quickest
     thing to write and the worst thing to meet: a game ends, the position
     vanishes, and a child is told the result of something they can no longer
     look at. "Why did I lose?" has no answer on a blank screen. The result
     goes UNDER the board, and the back and forward arrows still work, so the
     first thing a child can do after losing is walk back through it. */
  const card = $('#cz-play-done');
  if (!card) return;
  card.innerHTML = `
    <div class="gp-done cz-play__done">
      <p class="cz-lesson__stars">${Array.from({ length: 3 }, (_, i) =>
        `<span class="cz-chess-star${i < stars ? ' is-on' : ''}">${i < stars ? '★' : '☆'}</span>`
      ).join('')}</p>
      <h2>${esc(done.say)}</h2>
      <p class="gp-muted">${moved} move${moved === 1 ? '' : 's'} in ${esc(play.spec.name)}.</p>
      ${moveOn ? `<p class="cz-play__ladder">Next time you will play
        <strong>${esc(opponent.name)}</strong>.</p>` : ''}
      <p class="cz-play__replay">The board is still there. Use
        &larr; and &rarr; to see how it went.</p>
      <div class="gp-row gp-row--wrap cz-lesson__after">
        <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-action="chess-again">
          Play again</button>
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-newgame">
          Different game</button>
        <a class="gp-btn gp-btn--quiet" href="#/chess">Back to Chess Club</a>
      </div>
    </div>`;

  const tools = $('#cz-play-tools');
  if (tools) tools.hidden = true;
  tell('');
  paintReview();
  paint();
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

/**
 * Undo back to the child's own turn.
 *
 * Two plies, not one: taking back only your own move leaves the bot's reply on
 * the board, which is not what "take that back" means to anybody.
 */
function takeBack() {
  const play = state.chess.play;
  if (!play || play.over || play.thinking || play.viewAt !== null) return;
  let undone = 0;
  while (play.history.length > 1 && undone < 2) {
    play.history.pop();
    play.game.undo();
    undone += 1;
    if (play.game.turn() === play.side) break;
  }
  if (!undone) return;
  play.viewAt = null;
  if (state.chess.board) {
    state.chess.board.setFen(play.game.fen());
    const last = play.game.history({ verbose: true }).at(-1);
    state.chess.board.mark(last ? { last: [last.from, last.to] } : {});
  }
  paintTaken();
  paintReview();
  tell('Taken back. Have another go.');
}

/** Draw an arrow along a move the strongest bot likes. */
async function showHint() {
  const play = state.chess.play;
  if (!play || play.over || play.thinking || play.viewAt !== null) return;
  play.hinted = true;
  tell('Looking&hellip;');
  const uci = await engine().move(play.game.fen(), bot.MAX_LEVEL, 1);
  if (!uci || state.chess.play !== play) { tell(''); return; }
  if (state.chess.board) {
    state.chess.board.mark({ arrows: [[uci.slice(0, 2), uci.slice(2, 4)]] });
  }
  tell('Try that one.');
}

/** Every data-action="chess-..." belonging to this screen. */
export function playAction(name, el) {
  const play = state.chess.play;

  switch (name) {
    case 'chess-start': {
      const pick = state.chess.pick;
      const spec = games.gameById(pick.game);
      if (spec) startGame(spec, pick.level, pick.side);
      return true;
    }

    case 'chess-again':
      if (play) startGame(play.spec, progress.load().bot.level, play.side);
      return true;

    case 'chess-newgame':
      closePlay();
      state.chess.pick = null;
      renderSetup(null);
      return true;

    case 'chess-takeback':
      takeBack();
      return true;

    case 'chess-back':
      if (play) {
        const at = play.viewAt === null ? play.history.length - 1 : play.viewAt;
        viewAt(at - 1);
      }
      return true;

    case 'chess-fwd':
      if (play) {
        const at = play.viewAt === null ? play.history.length - 1 : play.viewAt;
        /* Stepping forward onto the last position is being back in the game,
           not looking at a picture of it -- so it becomes live again, unless
           the game is over and there is nothing to be live for. */
        const next = at + 1;
        viewAt(!play.over && next >= play.history.length - 1 ? null : next);
      }
      return true;

    case 'chess-live':
      if (play) viewAt(null);
      return true;

    case 'chess-hint':
      /* The lesson screen owns this name too, but only one of them is on
         screen at a time and the lesson claims it first. */
      showHint();
      return true;

    default:
      return false;
  }
}

/** A tapped opponent or game in the setup card. */
export function playPick(kind, value) {
  const pick = state.chess.pick || { level: 0, game: 'pawnwars', side: 'w' };
  if (kind === 'bot') pick.level = Number(value);
  if (kind === 'game') pick.game = value;
  state.chess.pick = pick;
  renderSetup(state.chess.fixedGame || null);
}

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Route target: #/chess/play, #/chess/games/<id>, and
 * #/chess/games/<id>/<bot> when a lesson asks for a particular opponent.
 *
 * A lesson that says "play Pawn Wars against the gentlest bot" means it: the
 * child has just met pawns and should not meet Wise Owl in the same minute.
 * Without the third part of the address the lesson's request was dropped and
 * whatever rung the ladder had them on was used instead.
 */
export function renderPlay(gameId, askedLevel) {
  const spec = gameId ? games.gameById(gameId) : null;
  state.chess.fixedGame = spec ? spec.id : null;
  if (spec) {
    const wanted = askedLevel === undefined || askedLevel === null || askedLevel === ''
      ? progress.load().bot.level
      : bot.levelInfo(Number(askedLevel)).level;
    state.chess.pick = { level: wanted, game: spec.id, side: spec.side };
  }
  closePlay();
  renderSetup(state.chess.fixedGame);
}
