/**
 * The small games, and who wins them.
 *
 * Every one of these has a different way of ending, and getting one wrong is
 * silent: the game simply carries on after a child has won, or stops before
 * they have. Neither throws anything.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Chess } from '../../assets/js/vendor/chess.js';
import * as G from '../../assets/js/modules/chessgames.js';

/** Set up a variant at a given position rather than at its start. */
const at = (fen) => new Chess(fen, { skipValidation: true });

/**
 * A position reached by actually playing the moves that got there.
 *
 * "Has a pawn got across" is a question about what HAPPENED, not about what
 * the board looks like -- a promoted queen on a8 and a queen that walked to
 * a8 are the same queen. So the fixtures for it have to play the move.
 */
const after = (fen, ...moves) => {
  const game = at(fen);
  for (const m of moves) {
    const played = game.move(m);
    assert.ok(played, `the fixture could not play ${JSON.stringify(m)}`);
  }
  return game;
};

describe('the games themselves', () => {
  test('every one has everything a card needs to show', () => {
    for (const g of G.GAMES) {
      for (const key of ['id', 'name', 'blurb', 'goal', 'fen', 'side']) {
        assert.ok(g[key], `${g.id} is missing ${key}`);
      }
      assert.ok(typeof g.kings === 'boolean', `${g.id} does not say whether it has kings`);
    }
  });

  test('the ids are unique and the order runs easiest first', () => {
    const ids = G.GAMES.map((g) => g.id);
    assert.equal(new Set(ids).size, ids.length);
    const orders = G.GAMES.map((g) => g.order);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
    assert.equal(G.GAMES[0].id, 'pawnwars', 'the first game a child meets is Pawn Wars');
  });

  test('every position loads and has moves in it', () => {
    for (const g of G.GAMES) {
      const game = G.open(g);
      assert.ok(game, `${g.id} would not load`);
      assert.ok(game.moves().length > 0, `${g.id} starts with nothing to do`);
      assert.equal(G.winner(g, game), null, `${g.id} is already won before anyone moves`);
    }
  });

  test('a game nobody has heard of is not a game', () => {
    assert.equal(G.gameById('quidditch'), null);
    assert.equal(G.open('quidditch'), null);
    assert.equal(G.winner('quidditch', new Chess()), null);
  });

  test('the king-less ones really have no kings, and the others do', () => {
    for (const g of G.GAMES) {
      const hasKing = /k/i.test(g.fen.split(' ')[0]);
      assert.equal(hasKing, g.kings, `${g.id} disagrees with its own position`);
    }
  });
});

describe('Pawn Wars', () => {
  test('getting a pawn across wins on the spot', () => {
    const promoted = after('8/Ppppppp1/8/8/8/8/1PPPPPPP/8 w - - 0 1',
      { from: 'a7', to: 'a8', promotion: 'q' });
    assert.equal(G.winner('pawnwars', promoted), 'w');
  });

  test('so does taking every last pawn', () => {
    assert.equal(G.winner('pawnwars', at('8/8/8/8/8/8/PPPPPPPP/8 b - - 0 1')), 'w');
    assert.equal(G.winner('pawnwars', at('8/pppppppp/8/8/8/8/8/8 w - - 0 1')), 'b');
  });

  test('an ordinary position is nobody\'s win yet', () => {
    assert.equal(G.winner('pawnwars', at('8/pppppppp/8/8/4P3/8/PPPP1PPP/8 b - - 0 1')), null);
  });

  test('a side with nothing left to move has lost, not drawn', () => {
    /* No kings, so chess.js calls this stalemate. For a game about racing
       pawns, being unable to move means being out of it. */
    const stuck = at('8/8/8/8/8/p7/P7/8 w - - 0 1');
    assert.equal(stuck.moves().length, 0, 'the fixture must really be stuck');
    assert.equal(G.winner('pawnwars', stuck), 'b');
  });

  test('both sides wiped out is a genuine draw', () => {
    assert.equal(G.winner('pawnwars', at('8/8/8/8/8/8/8/8 w - - 0 1')), 'draw');
  });
});

describe('Capture the Flag', () => {
  test('taking everything wins', () => {
    assert.equal(G.winner('flag', at('8/8/8/8/8/8/PPPPPPPP/RNBQ1BNR b - - 0 1')), 'w');
  });

  test('getting a pawn across wins too', () => {
    const promoted = after('1nbq1bnr/Pppppppp/8/8/8/8/1PPPPPPP/RNBQ1BNR w - - 0 1',
      { from: 'a7', to: 'a8', promotion: 'q' });
    assert.equal(G.winner('flag', promoted), 'w');
  });

  /* The bug this game shipped with. Both sides start with a full army, so
     "a piece of yours on the far rank" is not the same thing as "a pawn got
     across" -- and a child who walked a rook up the a-file was told they had
     won a race they had not entered. */
  test('walking a rook to the far rank is not getting a pawn across', () => {
    const walked = after('8/Rppppppp/8/8/8/8/PPPPPPPP/1NBQ1BNR w - - 0 1',
      { from: 'a7', to: 'a8' });
    assert.equal(walked.get('a8').type, 'r', 'the fixture must really put a rook there');
    assert.equal(G.winner('flag', walked), null);
  });

  test('running out of pawns is not losing here — there are other pieces', () => {
    assert.equal(G.winner('flag', at('rnbq1bnr/8/8/8/8/8/PPPPPPPP/RNBQ1BNR w - - 0 1')), null);
  });
});

describe('Pawns and Kings', () => {
  test('getting a pawn across wins', () => {
    const promoted = after('4k3/Ppppppp1/8/8/8/8/1PPPPPPP/4K3 w - - 0 1',
      { from: 'a7', to: 'a8', promotion: 'q' });
    assert.equal(G.winner('kingpawn', promoted), 'w');
  });

  /* The same bug as Capture the Flag, in the one other game where a piece
     that is not a pawn can stand on the far rank. Walking the king up the
     board ended the game as a win. */
  test('walking the king to the far rank wins nothing', () => {
    const walked = after('8/3K4/8/8/8/8/ppp2P2/k7 w - - 0 1',
      { from: 'd7', to: 'd8' });
    assert.equal(walked.get('d8').type, 'k', 'the fixture must really put a king there');
    assert.equal(G.winner('kingpawn', walked), null);
  });

  test('taking every pawn wins it too', () => {
    assert.equal(G.winner('kingpawn', at('4k3/8/8/8/8/8/PPPPPPPP/4K3 b - - 0 1')), 'w');
  });
});

describe('one piece against a crowd of pawns', () => {
  test('the queen wins by taking the lot', () => {
    assert.equal(G.winner('queenvspawns', at('8/8/8/8/8/8/8/3Q4 b - - 0 1')), 'w');
  });

  test('the pawns win by getting one home', () => {
    const home = after('8/1ppppppp/8/8/8/8/p7/3Q4 b - - 0 1',
      { from: 'a2', to: 'a1', promotion: 'q' });
    assert.equal(G.winner('queenvspawns', home), 'b');
  });

  test('losing the queen loses the game', () => {
    assert.equal(G.winner('queenvspawns', at('8/pppppppp/8/8/8/8/8/8 w - - 0 1')), 'b');
  });

  test('the rook and the knights work the same way', () => {
    assert.equal(G.winner('rookvspawns', at('8/8/8/8/8/8/8/R7 b - - 0 1')), 'w');
    assert.equal(G.winner('knightsvspawns', at('8/8/8/8/8/8/8/1N4N1 b - - 0 1')), 'w');
    assert.equal(G.winner('knightsvspawns', at('8/1pp2pp1/8/8/8/8/8/8 w - - 0 1')), 'b');
  });

  test('a game in progress is still a game', () => {
    assert.equal(G.winner('queenvspawns', at('8/1ppppppp/8/8/8/8/8/3Q4 w - - 0 1')), null);
  });
});

describe('King Hunt', () => {
  test('checkmate wins it', () => {
    const mated = at('4R1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1');
    assert.equal(mated.isCheckmate(), true, 'the fixture must really be mate');
    assert.equal(G.winner('kinghunt', mated), 'w');
  });

  test('running out of moves means the lonely king held out', () => {
    const game = G.open('kinghunt');
    assert.equal(G.winner('kinghunt', game, 24), null);
    assert.equal(G.winner('kinghunt', game, 25), 'b',
      'the hunt has a limit, or it stops being a game');
  });
});

describe('a whole game', () => {
  test('checkmate decides it', () => {
    assert.equal(G.winner('full', at('4R1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1')), 'w');
  });

  test('stalemate is a draw here, because there are kings', () => {
    const stale = at('7k/5Q2/5K2/8/8/8/8/8 b - - 0 1');
    assert.equal(stale.isStalemate(), true);
    assert.equal(G.winner('full', stale), 'draw');
  });

  test('the opening is not over', () => {
    assert.equal(G.winner('full', new Chess()), null);
  });
});

describe('what a child is told', () => {
  /* White has just got a pawn across in Pawn Wars. The same finished game is
     read once from each side. */
  const raced = () => after('8/Ppppppp1/8/8/8/8/1PPPPPPP/8 w - - 0 1',
    { from: 'a7', to: 'a8', promotion: 'q' });

  test('winning says so plainly', () => {
    const won = G.result('pawnwars', raced(), 0, 'w');
    assert.equal(won.outcome, 'win');
    assert.match(won.say, /won/i);
  });

  test('losing is never called losing', () => {
    const lost = G.result('pawnwars', raced(), 0, 'b');
    assert.equal(lost.outcome, 'loss');
    assert.doesNotMatch(lost.say, /\b(lost|lose|beaten|failed|sorry)\b/i,
      `"${lost.say}" tells a beginner they failed`);
    assert.match(lost.say, /again/i, 'it should invite another go');
  });

  test('a draw is a result, not a non-event', () => {
    const drew = G.result('full', at('7k/5Q2/5K2/8/8/8/8/8 b - - 0 1'), 0, 'w');
    assert.equal(drew.outcome, 'draw');
    assert.ok(drew.say.length > 0);
  });

  test('an unfinished game has nothing to say', () => {
    assert.equal(G.result('full', new Chess(), 0, 'w'), null);
  });
});
