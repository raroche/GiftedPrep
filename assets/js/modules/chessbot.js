/**
 * chessbot.js — five opponents, none of them very good, on purpose.
 *
 * The whole difficulty of this file is downward. Making a chess program strong
 * is a solved problem; making one lose to a six-year-old in a way that feels
 * like a game rather than a gift is not. The research is blunt about why it
 * matters: children stop playing when they lose too often, and the target is
 * a child win rate of roughly 60 to 70 per cent
 * (docs/research/chess/02-gamification.md).
 *
 * That rules out the obvious answers. Stockfish at its weakest setting is
 * still around 1350, which is far above a beginner; Maia, which plays like a
 * human, starts at 1100. Both are also megabytes of WebAssembly. So this is a
 * small negamax search with a deliberately blunted top: the level decides how
 * deep it looks and, more importantly, how close to the best move it is
 * willing to settle for. A bot that picks randomly among moves within three
 * pawns of best hangs pieces the way a beginner does — sometimes, plausibly,
 * and never in a way that looks broken.
 *
 * Everything is pure and seeded, so a level's behaviour can be tested exactly
 * rather than described. It runs in a Web Worker in the app, and unchanged in
 * node under `node --test`.
 */

import { Chess } from './../vendor/chess.js';

/* ------------------------------------------------------------------ */
/* The ladder                                                          */
/* ------------------------------------------------------------------ */

/**
 * Five opponents, each with a name and a creature a child can recognise.
 *
 * `spread` is the interesting number: how many centipawns worse than the best
 * move this bot will happily play. A hundred centipawns is a pawn. Sleepy
 * Sloth does not search at all; Wise Owl takes the best move it can find.
 *
 * `depth` is a ceiling, not a promise. The search deepens one ply at a time
 * and keeps the last ply that FINISHED inside `timeMs`, so in a quiet position
 * a bot reaches its full depth and in a crowded one it plays a shallower move
 * rather than a slow one. That matters more than it sounds: chess.js charges
 * about a millisecond for every move generation, which puts a hard ceiling on
 * how far anything built on it can see in the second a child will wait.
 *
 * Which is fine. The difference a child feels between these rungs is mostly
 * `spread` -- how willing the bot is to play the second- or fifth-best move --
 * not how deep it looks. A bot that always finds the best move is not the goal;
 * one that loses about two games in three is.
 *
 * The creatures come from the same set the rooms use, and each rung gets its
 * own colour, so the ladder reads as five characters rather than as a
 * difficulty slider. Drawn all in one colour they were very nearly
 * indistinguishable at the size a card shows them.
 */
export const LEVELS = [
  {
    level: 0,
    name: 'Sleepy Sloth',
    hue: 'jade',
    creature: 'frog',
    blurb: 'Moves almost anywhere. Sometimes remembers to take a piece.',
    depth: 0,
    spread: Infinity,
    timeMs: 0,
    /* Even a random mover should grab a free piece now and then, or it stops
       looking like chess and starts looking like a bug. */
    grabs: 0.3
  },
  {
    level: 1,
    name: 'Grabby Goat',
    hue: 'honey',
    creature: 'giraffe',
    blurb: 'Eats whatever it can reach. Does not look ahead.',
    depth: 1,
    spread: 300,
    timeMs: 200,
    grabs: 0.8
  },
  {
    level: 2,
    name: 'Careful Cat',
    hue: 'mango',
    creature: 'cat',
    blurb: 'Looks one move ahead. Leaves pieces hanging less often.',
    depth: 2,
    spread: 120,
    timeMs: 400,
    grabs: 1
  },
  {
    level: 3,
    name: 'Clever Crow',
    hue: 'lagoon',
    creature: 'mouse',
    blurb: 'Sees your threats coming. You will have to work for this one.',
    depth: 3,
    spread: 40,
    timeMs: 800,
    grabs: 1
  },
  {
    level: 4,
    name: 'Wise Owl',
    hue: 'orchid',
    creature: 'owl',
    blurb: 'Plays the best move it can find. Beat this and you are good.',
    depth: 4,
    spread: 0,
    timeMs: 1200,
    grabs: 1
  }
];

export const MAX_LEVEL = LEVELS.length - 1;
export const levelInfo = (n) => LEVELS[Math.min(MAX_LEVEL, Math.max(0, Math.round(n || 0)))];

/* ------------------------------------------------------------------ */
/* Judging a position                                                  */
/* ------------------------------------------------------------------ */

/** What a piece is worth, in hundredths of a pawn. */
export const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

/**
 * Where a piece would rather be, in centipawns, from White's point of view
 * and read from a8 down to h1 — the order a board is printed in.
 *
 * These are the Simplified Evaluation tables from the Chess Programming Wiki,
 * which exist for exactly this purpose: a few points of positional sense with
 * no knowledge behind them. They are what stops a bot shuffling its rooks on
 * the back rank all game, which reads as broken rather than as weak.
 */
const SQUARE_BONUS = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 20, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20
  ]
};

const FILES = 'abcdefgh';

/** Index into a bonus table for one square, seen from `colour`'s side. */
function bonusIndex(square, colour) {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  /* The tables are written for White. Black reads the same board upside down. */
  const row = colour === 'w' ? 8 - rank : rank - 1;
  const col = colour === 'w' ? file : 7 - file;
  return row * 8 + col;
}

/**
 * How good this position is for the side to move, in centipawns.
 *
 * Material plus a little positional sense, and deliberately nothing else. It
 * does NOT look for checkmate or a draw, because asking chess.js those
 * questions costs it a full move generation and this runs at every leaf of
 * the search — it was forty microseconds a node, which is most of the budget.
 * Endings are recognised in the search instead, where the move list has
 * already been generated and the answer is free.
 */
export function evaluate(game) {
  let score = 0;
  const board = game.board();
  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;
      const worth = VALUE[piece.type] + (SQUARE_BONUS[piece.type]
        ? SQUARE_BONUS[piece.type][bonusIndex(piece.square, piece.color)] : 0);
      score += piece.color === game.turn() ? worth : -worth;
    }
  }
  return score;
}

export const MATE = 100000;

/* ------------------------------------------------------------------ */
/* Looking ahead                                                       */
/* ------------------------------------------------------------------ */

/**
 * Captures first, and biggest catch with the smallest piece first.
 *
 * Ordering costs nothing and roughly halves the work alpha-beta has to do,
 * which is the difference between a bot that answers instantly and one a child
 * waits for.
 */
function ordered(moves) {
  return [...moves].sort((a, b) => score(b) - score(a));
  function score(m) {
    if (!m.captured) return m.promotion ? 800 : 0;
    return 1000 + VALUE[m.captured] - VALUE[m.piece] / 10;
  }
}

/**
 * How many plies of pure capturing the quiet search will follow.
 *
 * Uncapped, a crowded middlegame with a dozen captures available sends this
 * down a tree of its own and one depth-two search took fifteen seconds. Four
 * plies is enough to see a whole exchange out and back, which is all it is
 * for.
 */
const QUIET_PLIES = 4;

/**
 * Look only at captures until the dust settles.
 *
 * Without this the search stops mid-exchange and thinks it is a queen up when
 * the recapture is one move past the horizon. It is the single cheapest thing
 * that stops a bot playing obvious nonsense.
 */
function quiesce(game, alpha, beta, clock, plies = QUIET_PLIES) {
  const stand = evaluate(game);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (plies <= 0) return alpha;
  if (clock.deadline && Date.now() > clock.deadline) { clock.out = true; return alpha; }

  for (const move of ordered(game.moves({ verbose: true }).filter((m) => m.captured))) {
    /* Delta pruning: if winning this piece outright still cannot reach alpha,
       nothing down this branch can either. chess.js charges about a
       millisecond for every move generation, so a branch not taken is the
       cheapest thing in the file. */
    if (stand + VALUE[move.captured] + 200 < alpha) continue;
    game.move(move);
    const value = -quiesce(game, -beta, -alpha, clock, plies - 1);
    game.undo();
    if (value >= beta) return beta;
    if (value > alpha) alpha = value;
  }
  return alpha;
}

function negamax(game, depth, alpha, beta, clock) {
  /* The move list settles whether the game is over, and it is needed anyway.
     Asking chess.js isGameOver() separately costs a second generation of the
     very same list. */
  const moves = game.moves({ verbose: true });
  if (!moves.length) {
    /* No moves and in check is mate; no moves and not in check is stalemate.
       Mate sooner beats mate later, so the bot finishes rather than shuffles. */
    return game.isCheck() ? -MATE - depth : 0;
  }
  if (depth <= 0) return quiesce(game, alpha, beta, clock);
  if (clock.deadline && Date.now() > clock.deadline) {
    /* Out of time. The number returned here is not a real score -- it has not
       seen the recapture -- so it is flagged and the whole depth is thrown
       away rather than trusted. */
    clock.out = true;
    return evaluate(game);
  }

  let best = -Infinity;
  for (const move of ordered(moves)) {
    game.move(move);
    const value = -negamax(game, depth - 1, -beta, -alpha, clock);
    game.undo();
    if (value > best) best = value;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Every legal move with a score, best first.
 *
 * Depth by depth, keeping only the last depth that FINISHED. That is not a
 * refinement, it is the difference between a bot and a bug: when the clock ran
 * out mid-search the old version returned whatever the position looked like at
 * that instant, which is the score of a capture that has not been recaptured
 * yet. So the strongest bot cheerfully took a pawn with a knight and lost the
 * knight, and it did it more often the slower the device — which is the worst
 * possible way for a bug to behave.
 *
 * A half-finished depth is now discarded and the depth before it is used, so
 * a slow device gets a weaker opponent rather than a broken one.
 */
export function search(game, { depth = 2, timeMs = 0 } = {}) {
  const deadline = timeMs ? Date.now() + timeMs : 0;
  const moves = game.moves({ verbose: true });
  if (!moves.length) return [];

  const uciOf = (m) => m.from + m.to + (m.promotion || '');
  /* Negating a zero gives negative zero, which sorts and compares fine but is
     not equal to zero under Object.is -- so "this move draws" quietly became a
     different value from "this position is level". Normalised once, here. */
  const clean = (n) => (Object.is(n, -0) ? 0 : n);

  /* Depth zero is "what does it look like straight after the move", which is
     all the grabbiest bots need. */
  let best = ordered(moves).map((move) => {
    game.move(move);
    /* A move that ends the game is worth knowing about even at depth zero:
       the easiest bot still has to play mate when it is there. */
    const over = game.moves().length === 0;
    const score = over ? (game.isCheck() ? MATE : 0) : -evaluate(game);
    game.undo();
    return { move, uci: uciOf(move), score: clean(score) };
  }).sort((a, b) => b.score - a.score);
  if (depth <= 0) return best;

  for (let d = 1; d <= depth; d += 1) {
    const clock = { deadline, out: false };
    const scored = [];
    /* Best-first from the previous depth: the more cut-offs, the deeper the
       same budget reaches. */
    for (const { move } of best) {
      game.move(move);
      const score = -negamax(game, d - 1, -Infinity, Infinity, clock);
      game.undo();
      if (clock.out) break;
      scored.push({ move, uci: uciOf(move), score: clean(score) });
    }
    if (clock.out || scored.length !== best.length) break;
    best = scored.sort((a, b) => b.score - a.score);
    /* No point going deeper once a forced mate is on the board. */
    if (Math.abs(best[0].score) >= MATE) break;
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Choosing badly, on purpose                                          */
/* ------------------------------------------------------------------ */

/**
 * A small, seeded random number generator.
 *
 * Seeded so a level's behaviour is a fact that can be tested rather than a
 * claim. mulberry32, which is four lines and good enough for picking moves.
 */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick a move for a level, given every move and its score.
 *
 * This is where the bot is made weak. It takes every move within `spread`
 * centipawns of the best and chooses one at random, so the mistakes it makes
 * are real moves that happen to be worse rather than nonsense — which is what
 * a beginner's mistakes look like.
 *
 * Two things are never thrown away, at any level: a checkmate on the board
 * now, and not stalemating when winning. A bot that misses mate in one with a
 * queen looks broken rather than weak, and a stalemate at the end of a game a
 * child was winning is the most disheartening way to not-lose there is.
 */
export function pick(scored, level, random = Math.random) {
  if (!scored.length) return null;
  const spec = levelInfo(level);

  /* Mate now, at every level. */
  const mate = scored.find((s) => s.score >= MATE);
  if (mate) return mate;

  if (spec.depth === 0) {
    /* No search at all. Take something, sometimes, and otherwise wander. */
    const grabs = scored.filter((s) => s.move.captured);
    if (grabs.length && random() < spec.grabs) {
      return grabs[Math.floor(random() * grabs.length)];
    }
    return scored[Math.floor(random() * scored.length)];
  }

  const best = scored[0].score;
  let good = scored.filter((s) => best - s.score <= spec.spread);

  /* Never take a draw when ahead. Stalemating a child who was losing is the
     one result nobody enjoys. */
  if (best > 150 && good.length > 1) {
    const notDrawn = good.filter((s) => s.score !== 0);
    if (notDrawn.length) good = notDrawn;
  }

  return good[Math.floor(random() * good.length)] || scored[0];
}

/**
 * The bot's move in this position, as UCI, or null if the game is over.
 *
 * `seed` makes it repeatable. The app passes the move number so a bot does
 * not play the same game twice, and the tests pass a fixed number so a level
 * can be pinned down exactly.
 */
export function chooseMove(fen, level = 1, seed = Date.now()) {
  let game;
  try {
    game = new Chess(fen, { skipValidation: true });
  } catch {
    return null;
  }
  if (game.isGameOver()) return null;
  const spec = levelInfo(level);
  const scored = search(game, { depth: spec.depth, timeMs: spec.timeMs });
  const choice = pick(scored, level, rng(seed));
  return choice ? choice.uci : null;
}

/* ------------------------------------------------------------------ */
/* Moving up and down the ladder                                       */
/* ------------------------------------------------------------------ */

/**
 * Where the bot level should go after a game.
 *
 * Three in a row either way. Not one: a single loss to a bot a child usually
 * beats says nothing, and dropping them a level for it is insulting. The
 * target is a child winning roughly two games in three, which is where the
 * flow research puts the line between "too hard" and "boring".
 */
export function nextBotLevel(current, recent) {
  const last3 = (recent || []).slice(-3);
  if (last3.length < 3) return current;
  if (last3.every((r) => r === 1)) return Math.min(MAX_LEVEL, current + 1);
  if (last3.every((r) => r === 0)) return Math.max(0, current - 1);
  return current;
}

/* ------------------------------------------------------------------ */
/* Running it off the main thread                                      */
/* ------------------------------------------------------------------ */

/**
 * Ask for a move without freezing the page.
 *
 * A worker, because a depth-4 search takes long enough to stop the board
 * animating and that reads as the app hanging. It is a module worker loaded
 * from our own origin, so `worker-src 'self'` covers it and no policy change
 * is needed — the whole reason this is a hand-written engine and not
 * WebAssembly.
 *
 * If workers are unavailable, which is the case in some wrapped WebViews and
 * every unit test, it quietly does the work here instead. Slower, identical
 * answers.
 */
export function botClient(url = 'assets/js/workers/chessbot.worker.js') {
  let worker = null;
  let nextId = 1;
  const waiting = new Map();

  const fallback = (fen, level, seed) =>
    Promise.resolve(chooseMove(fen, level, seed));

  try {
    worker = new Worker(url, { type: 'module' });
    worker.onmessage = (ev) => {
      const { id, uci } = ev.data || {};
      const settle = waiting.get(id);
      if (!settle) return;
      waiting.delete(id);
      settle(uci);
    };
    /* A worker that fails to load reports here rather than throwing at
       construction, so the fallback has to be armed from inside too. */
    worker.onerror = () => {
      for (const [id, settle] of waiting) { waiting.delete(id); settle(undefined); }
      worker = null;
    };
  } catch {
    worker = null;
  }

  return {
    get usingWorker() { return Boolean(worker); },

    move(fen, level, seed = Date.now()) {
      if (!worker) return fallback(fen, level, seed);
      const id = nextId;
      nextId += 1;
      return new Promise((resolve) => {
        waiting.set(id, (uci) => {
          /* undefined means the worker died; work it out here instead. */
          if (uci === undefined) resolve(chooseMove(fen, level, seed));
          else resolve(uci);
        });
        worker.postMessage({ id, fen, level, seed });
      });
    },

    stop() {
      if (worker) worker.terminate();
      worker = null;
      waiting.clear();
    }
  };
}

export default {
  LEVELS, MAX_LEVEL, levelInfo, VALUE, MATE,
  evaluate, search, pick, rng, chooseMove, nextBotLevel, botClient
};
