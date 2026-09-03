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
        ${botFace(opponent)}
        <span class="cz-play__name">${esc(opponent.name)}</span>
        <span class="cz-play__think" id="cz-play-think" hidden>thinking&hellip;</span>
      </div>
      <div id="cz-play-board"></div>
      <div class="cz-play__who cz-play__who--you">
        <span class="cz-play__name">You</span>
        <span class="cz-play__goal">${esc(spec.goal)}</span>
      </div>
      <p class="cz-play__say" id="cz-play-say"></p>
      <div class="gp-row gp-row--wrap cz-play__tools">
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-takeback">
          Take that back</button>
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-hint">
          Show me a good move</button>
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-newgame">
          Different game</button>
      </div>
    </div>`;

  const board = createBoard($('#cz-play-board'), {
    fen: game.fen(),
    orientation: side,
    label: `${spec.name} board`,
    theme: progress.load().theme,
    canMove: (sq) => {
      if (play.over || play.thinking) return false;
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
  paint();
  showScreen('chessplay');
  paintBoardState(null);

  /* If the child is Black, the bot opens. */
  if (game.turn() !== side) botTurn();
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
  $('#gp-chessplay-body').innerHTML = `
    <div class="gp-done cz-play__done">
      <p class="cz-lesson__stars">${Array.from({ length: 3 }, (_, i) =>
        `<span class="cz-chess-star${i < stars ? ' is-on' : ''}">${i < stars ? '★' : '☆'}</span>`
      ).join('')}</p>
      <h2>${esc(done.say)}</h2>
      <p class="gp-muted">${moved} move${moved === 1 ? '' : 's'} in ${esc(play.spec.name)}.</p>
      ${moveOn ? `<p class="cz-play__ladder">Next time you will play
        <strong>${esc(opponent.name)}</strong>.</p>` : ''}
      <div class="gp-row gp-row--wrap cz-lesson__after">
        <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-action="chess-again">
          Play again</button>
        <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-newgame">
          Different game</button>
        <a class="gp-btn gp-btn--quiet" href="#/chess">Back to Chess Club</a>
      </div>
    </div>`;
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
  if (!play || play.over || play.thinking) return;
  let undone = 0;
  while (play.history.length > 1 && undone < 2) {
    play.history.pop();
    play.game.undo();
    undone += 1;
    if (play.game.turn() === play.side) break;
  }
  if (!undone) return;
  if (state.chess.board) {
    state.chess.board.setFen(play.game.fen());
    const last = play.game.history({ verbose: true }).at(-1);
    state.chess.board.mark(last ? { last: [last.from, last.to] } : {});
  }
  tell('Taken back. Have another go.');
}

/** Draw an arrow along a move the strongest bot likes. */
async function showHint() {
  const play = state.chess.play;
  if (!play || play.over || play.thinking) return;
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

/** Route target: #/chess/play, and #/chess/games/<id> for one fixed game. */
export function renderPlay(gameId) {
  const spec = gameId ? games.gameById(gameId) : null;
  state.chess.fixedGame = spec ? spec.id : null;
  if (spec) {
    state.chess.pick = { level: progress.load().bot.level, game: spec.id, side: spec.side };
  }
  closePlay();
  renderSetup(state.chess.fixedGame);
}
