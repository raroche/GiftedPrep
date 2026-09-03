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

const PROMOTION_RANK = { w: '8', b: '1' };

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

/** Has this side got a pawn all the way over? */
function promoted(game, colour) {
  const rank = PROMOTION_RANK[colour];
  for (const row of game.board()) {
    for (const piece of row) {
      /* A pawn cannot sit on the last rank -- reaching it turns it into
         something else -- so any non-pawn of ours standing there in a game
         that started with only pawns is a pawn that got across. */
      if (piece && piece.color === colour && piece.square[1] === rank) return true;
    }
  }
  return false;
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
 * Whether the game is over, and what to tell the child.
 *
 * Losing is never described as losing. The research is specific about this:
 * beginners who are punished for mistakes stop playing, and every result has
 * to leave a child willing to press "again".
 */
export function result(variant, game, moveCount, childSide = 'w') {
  const won = winner(variant, game, moveCount);
  if (!won) return null;
  if (won === 'draw') {
    return { over: true, outcome: 'draw', say: 'A draw. Nobody could get through.' };
  }
  if (won === childSide) {
    return { over: true, outcome: 'win', say: 'You won that one.' };
  }
  return {
    over: true,
    outcome: 'loss',
    say: 'They got there first this time. Play it again and watch what they did.'
  };
}

export default { GAMES, gameById, open, winner, result };
