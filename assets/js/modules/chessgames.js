/**
 * chessgames.js — the small games that come before the big one.
 *
 * A whole game of chess is a lot to hold at once: thirty-two pieces, six sets
 * of rules, and a goal a beginner cannot see coming. Every serious teaching
 * programme therefore starts somewhere smaller. The Dutch Steps Method notes
 * that a child's real aim at first is capturing, not mating, and delays
 * checkmate "as long as possible"; ChessKid teaches Capture the Flag before
 * check because the pawn is the fiddliest piece to learn. Pawn Wars, eight
 * pawns a side and first one to the end wins, is the game a four-year-old can
 * play on the day they meet the board.
 *
 * So each of these keeps the board small, the goal visible and the pressure
 * low, and each one is winnable in a couple of minutes.
 *
 * Most of them have no kings, which is why every position here is loaded with
 * `{ skipValidation: true }`. That has a consequence worth stating plainly: a
 * side with no legal moves and no king has simply run out of army, and that
 * is a loss, not the stalemate chess.js would call it.
 */

import { Chess } from './../vendor/chess.js';

/* ------------------------------------------------------------------ */
/* The games                                                           */
/* ------------------------------------------------------------------ */

/**
 * @typedef {object} Variant
 * @property {string} id
 * @property {string} name
 * @property {string} blurb   one line a child can read
 * @property {string} goal    what winning looks like, in their words
 * @property {string} fen
 * @property {'w'|'b'} side   which colour the child plays by default
 * @property {boolean} kings  whether the position has kings in it
 * @property {number} [maxMoves]  a cap, so a hopeless hunt ends
 */

export const GAMES = [
  {
    id: 'pawnwars',
    name: 'Pawn Wars',
    blurb: 'Eight pawns each and nothing else. First one to the far side wins.',
    goal: 'Get one pawn all the way across.',
    fen: '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1',
    side: 'w',
    kings: false,
    order: 1
  },
  {
    id: 'kingpawn',
    name: 'Pawns and Kings',
    blurb: 'Pawn Wars, but now each side has a king to help.',
    goal: 'Get a pawn across, or take every pawn.',
    fen: '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1',
    side: 'w',
    kings: true,
    order: 2
  },
  {
    id: 'queenvspawns',
    name: 'Queen against Pawns',
    blurb: 'One queen against eight pawns. Can she catch them all?',
    goal: 'Take every pawn before one reaches the end.',
    fen: '8/pppppppp/8/8/8/8/8/3Q4 w - - 0 1',
    side: 'w',
    kings: false,
    order: 3
  },
  {
    id: 'rookvspawns',
    name: 'Rook against Pawns',
    blurb: 'A rook against five pawns. The rook has to be quick.',
    goal: 'Take all five pawns before one gets across.',
    fen: '8/1ppp1pp1/8/8/8/8/8/R7 w - - 0 1',
    side: 'w',
    kings: false,
    order: 4
  },
  {
    id: 'knightsvspawns',
    name: 'Knights against Pawns',
    blurb: 'Two knights against four pawns. Jump about and stop them.',
    goal: 'Take the pawns before they reach the end.',
    fen: '8/1pp2pp1/8/8/8/8/8/1N4N1 w - - 0 1',
    side: 'w',
    kings: false,
    order: 5
  },
  {
    id: 'flag',
    name: 'Capture the Flag',
    blurb: 'Everything except the kings. No check, no checkmate, no worrying.',
    goal: 'Get a pawn across, or take everything they have.',
    fen: 'rnbq1bnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1BNR w - - 0 1',
    side: 'w',
    kings: false,
    order: 6
  },
  {
    id: 'kinghunt',
    name: 'King Hunt',
    blurb: 'A whole army against one lonely king. Corner him.',
    goal: 'Checkmate the king within 25 moves.',
    fen: '4k3/8/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1',
    side: 'w',
    kings: true,
    maxMoves: 25,
    order: 7
  },
  {
    id: 'full',
    name: 'A Whole Game',
    blurb: 'Real chess, all the pieces, all the rules.',
    goal: 'Checkmate.',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    side: 'w',
    kings: true,
    order: 8
  }
];

export const gameById = (id) => GAMES.find((g) => g.id === id) || null;

/** A rules object for one of these, king-less positions included. */
export function open(variant) {
  const spec = typeof variant === 'string' ? gameById(variant) : variant;
  if (!spec) return null;
  try {
    return new Chess(spec.fen, { skipValidation: true });
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Who won                                                             */
/* ------------------------------------------------------------------ */

/** Every piece of a colour still on the board, by type. */
function census(game, colour) {
  const out = { count: 0, pawns: 0, other: 0 };
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece || piece.color !== colour) continue;
      out.count += 1;
      if (piece.type === 'p') out.pawns += 1;
      else if (piece.type !== 'k') out.other += 1;
    }
  }
  return out;
}

/**
 * Has this side got a pawn all the way over?
 *
 * It asks the move list, not the board, and it has to.
 *
 * The board cannot answer the question. This used to read "any piece of ours
 * standing on the far rank", which is exact in Pawn Wars, where the only
 * pieces are pawns and a pawn on the last rank has by definition just become
 * something else. It is wrong everywhere else. In Capture the Flag both sides
 * start with a full army, so a rook walking a1 to a8 ended the game on the
 * spot -- a child who had simply moved a rook was told they had got a pawn
 * across. In Pawns and Kings, marching the KING to the far rank did the same.
 *
 * There is no fixing this from the position: a rook on a8 and a promoted pawn
 * on a8 are the same rook. A promotion is a thing that HAPPENS, so it is
 * looked for where it happened.
 */
function promoted(game, colour) {
  return game.history({ verbose: true })
    .some((m) => m.color === colour && m.promotion);
}

/**
 * Who has won, or null if the game is still going.
 *
 * `moveCount` is full moves played, for the games that have a limit.
 *
 * The king-less games are the interesting ones. chess.js reports a side with
 * no legal moves as stalemated, which for real chess is a draw — but a side
 * with no army left has lost, and telling a child who captured everything
 * that it was a draw is nonsense. So that case is settled here first.
 */
export function winner(variant, game, moveCount = 0) {
  const spec = typeof variant === 'string' ? gameById(variant) : variant;
  if (!spec || !game) return null;

  const white = census(game, 'w');
  const black = census(game, 'b');

  /* Nothing left to play with. In a king-less game that is a loss, not a draw. */
  if (!spec.kings) {
    if (white.count === 0 && black.count === 0) return 'draw';
    if (white.count === 0) return 'b';
    if (black.count === 0) return 'w';
  }

  switch (spec.id) {
    case 'pawnwars':
    case 'kingpawn':
    case 'flag': {
      /* Reaching the far side wins on the spot: a beginner can see the goal
         from the first move, which is the whole point of the game. */
      if (promoted(game, 'w')) return 'w';
      if (promoted(game, 'b')) return 'b';
      if (spec.id !== 'flag') {
        if (black.pawns === 0) return 'w';
        if (white.pawns === 0) return 'b';
      }
      break;
    }

    case 'queenvspawns':
    case 'rookvspawns':
    case 'knightsvspawns': {
      /* The pawns win by getting one across; the piece wins by taking them
         all. Whichever happens first. */
      if (promoted(game, 'b')) return 'b';
      if (black.pawns === 0) return 'w';
      if (white.other === 0) return 'b';
      break;
    }

    case 'kinghunt': {
      if (game.isCheckmate()) return game.turn() === 'w' ? 'b' : 'w';
      /* A hunt that goes on forever stops being a game. The lone king has
         held out, and that is a real result for them. */
      if (spec.maxMoves && moveCount >= spec.maxMoves) return 'b';
      break;
    }

    default:
      break;
  }

  /* Ordinary chess endings, for the games that have kings. */
  if (game.isCheckmate()) return game.turn() === 'w' ? 'b' : 'w';
  if (spec.kings && (game.isStalemate() || game.isDraw())) return 'draw';

  /* A king-less side with nothing to do has run out of moves, which here
     means run out of game. */
  if (!spec.kings && game.moves().length === 0) {
    return game.turn() === 'w' ? 'b' : 'w';
  }
  return null;
}

/**
 * HOW the game ended, which is not the same question as who won.
 *
 * Every ending used to be described with one sentence -- "They got there
 * first this time" -- whatever had actually happened. A child whose last
 * piece was taken, or who simply had no legal move left, was told about a
 * race they had not lost, and could not tell from the screen what had gone
 * on. It is the first thing they ask.
 *
 * @returns {'promotion'|'nothing-left'|'no-moves'|'checkmate'|'held-out'|'other'}
 */
export function endReason(variant, game, moveCount = 0) {
  const spec = typeof variant === 'string' ? gameById(variant) : variant;
  if (!spec || !game) return 'other';

  if (game.isCheckmate()) return 'checkmate';
  if (game.history({ verbose: true }).some((m) => m.promotion)) return 'promotion';

  const white = census(game, 'w');
  const black = census(game, 'b');
  if (!spec.kings && (white.count === 0 || black.count === 0)) return 'nothing-left';
  /* The piece-against-pawns games end when the pawns are gone, even though
     the piece itself is still standing. */
  if (white.pawns === 0 && black.pawns === 0
    && ['queenvspawns', 'rookvspawns', 'knightsvspawns'].includes(spec.id)) {
    return 'nothing-left';
  }
  if (spec.id === 'kinghunt' && spec.maxMoves && moveCount >= spec.maxMoves) return 'held-out';
  if (game.moves().length === 0) return 'no-moves';
  return 'other';
}

/* What to say, by how it ended and whether the child won. Losing is never
   described as losing: the research is specific that beginners punished for
   mistakes stop playing, and every one of these has to leave a child willing
   to press "again". Saying plainly what happened is not punishment -- being
   told the wrong thing is what leaves a child stuck. */
export const ENDINGS = {
  promotion: {
    win: 'You got a pawn all the way across. You won that one.',
    loss: 'They got a pawn across first. Step back and see how, then try again.'
  },
  'nothing-left': {
    win: 'You took every piece they had. You won that one.',
    loss: 'They took your last piece. Step back and see where it went, then try again.'
  },
  'no-moves': {
    win: 'They ran out of moves. Nothing left for them to play. You won that one.',
    loss: 'You ran out of moves — everything you had was blocked. Have another go.'
  },
  checkmate: {
    win: 'Checkmate. You won that one.',
    loss: 'Checkmate that time. Step back and watch it coming, then try again.'
  },
  'held-out': {
    win: 'You cornered the king. You won that one.',
    loss: 'The king got away this time. Have another go.'
  },
  other: {
    win: 'You won that one.',
    loss: 'They got there first this time. Have another go.'
  }
};

/**
 * Whether the game is over, and what to tell the child.
 *
 * The sentence says what actually happened, because "why did that end?" is
 * the first thing a child asks and the screen is the only thing that can
 * answer it.
 */
export function result(variant, game, moveCount, childSide = 'w') {
  const won = winner(variant, game, moveCount);
  if (!won) return null;
  const why = endReason(variant, game, moveCount);
  if (won === 'draw') {
    return { over: true, outcome: 'draw', why, say: 'A draw. Nobody could get through.' };
  }
  const outcome = won === childSide ? 'win' : 'loss';
  return { over: true, outcome, why, say: (ENDINGS[why] || ENDINGS.other)[outcome] };
}

export default { GAMES, gameById, open, winner, endReason, result, ENDINGS };
