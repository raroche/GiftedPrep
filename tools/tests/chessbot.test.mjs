/**
 * The five opponents.
 *
 * The hard part of this engine is downward: a bot that is too strong stops a
 * child playing, and one that is broken stops looking like chess. Both fail
 * silently — a bot that hangs its queen every move is a working program and a
 * ruined game. These pin down the behaviour of each rung.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Chess } from '../../assets/js/vendor/chess.js';
import * as B from '../../assets/js/modules/chessbot.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
/* Back-rank mate in one: Re8 is checkmate. */
const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1';
/* Qg7 mates; Qg6 is stalemate. The trap this engine must never fall into. */
const STALEMATE_TRAP = '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1';

const uciToSan = (fen, uci) => {
  const g = new Chess(fen, { skipValidation: true });
  const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return m ? m.san : null;
};

describe('the ladder', () => {
  test('there are five rungs, easiest first, each with a name and a creature', () => {
    assert.equal(B.LEVELS.length, 5);
    assert.equal(B.MAX_LEVEL, 4);
    B.LEVELS.forEach((l, i) => {
      assert.equal(l.level, i);
      assert.ok(l.name && l.blurb && l.creature, `rung ${i} is missing something`);
    });
  });

  test('it gets harder all the way up: deeper, and fussier about the move', () => {
    for (let i = 1; i < B.LEVELS.length; i += 1) {
      assert.ok(B.LEVELS[i].depth >= B.LEVELS[i - 1].depth, `depth fell at rung ${i}`);
      assert.ok(B.LEVELS[i].spread <= B.LEVELS[i - 1].spread, `spread grew at rung ${i}`);
    }
    assert.equal(B.LEVELS[0].spread, Infinity, 'the easiest bot settles for anything');
    assert.equal(B.LEVELS[4].spread, 0, 'the hardest bot takes the best it can find');
  });

  test('a level out of range is clamped rather than crashing', () => {
    assert.equal(B.levelInfo(-3).level, 0);
    assert.equal(B.levelInfo(99).level, 4);
    assert.equal(B.levelInfo(undefined).level, 0);
    assert.equal(B.levelInfo(2.4).level, 2);
  });
});

describe('judging a position', () => {
  test('the start position is level for whoever is to move', () => {
    assert.equal(B.evaluate(new Chess(START)), 0);
  });

  test('a piece up is worth about a piece', () => {
    /* White is a whole rook up, and it is White to move. */
    const up = B.evaluate(new Chess('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'));
    assert.ok(up > 400 && up < 700, `a rook should be worth about 500, got ${up}`);
  });

  test('it is written from the mover\'s point of view, so it flips', () => {
    const white = B.evaluate(new Chess('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'));
    const black = B.evaluate(new Chess('4k3/8/8/8/8/8/8/R3K3 b - - 0 1'));
    assert.ok(white > 0 && black < 0, 'the same board must read opposite to each side');
  });

  test('it counts material only, and says nothing about endings', () => {
    /* Asking chess.js whether a position is mate costs it a whole move
       generation, and this runs at every leaf. Endings are recognised in the
       search, where the move list already exists. The two tests below check
       that they still are. */
    const mated = new Chess('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1');
    mated.move('Re8');
    assert.ok(Math.abs(B.evaluate(mated)) < B.MATE);
  });
});

describe('the search still knows when a game has ended', () => {
  test('mate is worth more than any pile of pieces', () => {
    const scored = B.search(new Chess(MATE_IN_ONE), { depth: 2 });
    assert.ok(scored[0].score >= B.MATE, `mate scored only ${scored[0].score}`);
    assert.equal(uciToSan(MATE_IN_ONE, scored[0].uci), 'Re8#');
  });

  test('a stalemate scores as nothing, so a winning bot avoids it', () => {
    const scored = B.search(new Chess(STALEMATE_TRAP), { depth: 2 });
    const stale = scored.find((s) => uciToSan(STALEMATE_TRAP, s.uci) === 'Qg6');
    assert.equal(stale.score, 0);
    assert.ok(scored[0].score > 0, 'something must beat the stalemate');
  });

  test('even without looking ahead, mate on the board is spotted', () => {
    const scored = B.search(new Chess(MATE_IN_ONE), { depth: 0 });
    assert.equal(uciToSan(MATE_IN_ONE, scored[0].uci), 'Re8#');
  });
});

describe('looking ahead', () => {
  test('every legal move comes back with a score, best first', () => {
    const game = new Chess(START);
    const scored = B.search(game, { depth: 1 });
    assert.equal(scored.length, 20);
    for (let i = 1; i < scored.length; i += 1) {
      assert.ok(scored[i - 1].score >= scored[i].score, 'not sorted');
    }
    assert.match(scored[0].uci, /^[a-h][1-8][a-h][1-8]$/);
  });

  test('searching does not disturb the position', () => {
    const game = new Chess(START);
    B.search(game, { depth: 3 });
    assert.equal(game.fen(), START, 'the board must be exactly as it was');
  });

  test('a free piece is seen at depth one', () => {
    /* A black knight on e5 with nothing defending it. The c6 knight this
       started with DID defend e5, which is why the first version of this test
       failed: the fixture was wrong, not the engine. */
    const fen = 'r1bqkb1r/pppp1ppp/8/4n3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1';
    const best = B.search(new Chess(fen), { depth: 1 })[0];
    assert.equal(uciToSan(fen, best.uci), 'Nxe5');
  });

  test('a capture that loses the piece back is not taken at depth two', () => {
    /* Nxe5 wins a pawn but Nxe5 is met by ...Nxe5 and White is a knight down. */
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1';
    const scored = B.search(new Chess(fen), { depth: 2 });
    const grab = scored.find((s) => s.uci === 'f3e5');
    const best = scored[0];
    assert.ok(best.score >= grab.score,
      'the search must see the recapture and prefer something else');
  });

  test('the clock is respected, so a child is not left waiting', () => {
    const started = Date.now();
    B.search(new Chess(START), { depth: 8, timeMs: 300 });
    const took = Date.now() - started;
    /* Generous: the cap is checked between branches, not inside them. */
    assert.ok(took < 3000, `a 300ms budget took ${took}ms`);
  });

  test('running out of time gives a shallower answer, never a wrong one', () => {
    /* This is the bug that made the strongest bot take a pawn with a knight
       and lose the knight: when the clock ran out mid-search the score
       returned was the position BEFORE the recapture, and it looked great.
       A depth that did not finish is now thrown away. */
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const rushed = B.search(new Chess(fen), { depth: 6, timeMs: 1 });
    const grab = rushed.find((s) => s.uci === 'f3e5');
    assert.ok(rushed.length > 0, 'a rushed search must still return every move');
    assert.ok(rushed[0].score >= grab.score,
      'a hurried search must not rank a losing capture first');
  });
});

describe('every bot sees a mate in one', () => {
  /* A bot that misses mate with a rook on the board does not read as weak.
     It reads as broken, and a child notices immediately. */
  for (const level of [0, 1, 2, 3, 4]) {
    test(`${B.LEVELS[level].name} plays it`, () => {
      for (const seed of [1, 2, 3, 17, 99]) {
        const uci = B.chooseMove(MATE_IN_ONE, level, seed);
        assert.equal(uciToSan(MATE_IN_ONE, uci), 'Re8#', `seed ${seed}`);
      }
    });
  }
});

describe('no bot stalemates when it is winning', () => {
  for (const level of [1, 2, 3, 4]) {
    test(`${B.LEVELS[level].name} keeps the game alive`, () => {
      for (const seed of [1, 5, 12, 40]) {
        const uci = B.chooseMove(STALEMATE_TRAP, level, seed);
        const after = new Chess(STALEMATE_TRAP, { skipValidation: true });
        after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
        assert.equal(after.isStalemate(), false,
          `seed ${seed} chose ${uci}, which is stalemate with a queen on the board`);
      }
    });
  }
});

describe('the easiest bot really is easy', () => {
  /* The promise level 1 makes is that it ends in a win. Everything else here
     checks the bot in a position; this checks the only thing a child cares
     about, which is the result. The opponent is a child who has just finished
     level 1: takes the biggest thing on offer, plays the mate if it is there,
     and otherwise moves at random. No plan, no lookahead.

     Written because the bot got measurably stronger twice while being made to
     work -- iterative deepening and then quiescence -- and neither change
     touched a test. A bot that quietly climbs past a beginner ruins the room
     and breaks nothing. */
  test('a child who has finished level 1 beats it, and never loses to it', () => {
    const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const rng = (seed) => () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const childMove = (game, rnd) => {
      const moves = game.moves({ verbose: true });
      const mate = moves.find((m) => m.san.includes('#'));
      if (mate) return mate;
      const grabs = moves.filter((m) => m.captured);
      if (grabs.length) {
        const best = Math.max(...grabs.map((m) => VALUE[m.captured] || 0));
        const top = grabs.filter((m) => (VALUE[m.captured] || 0) === best);
        return top[Math.floor(rnd() * top.length)];
      }
      return moves[Math.floor(rnd() * moves.length)];
    };

    const GAMES = 12;
    let wins = 0;
    let losses = 0;
    for (let g = 0; g < GAMES; g += 1) {
      const rnd = rng(1000 + g);
      const game = new Chess();
      /* Long enough for a beginner to convert a won position, short enough
         that the suite stays quick. A game still going at this point is
         neither a win nor a loss and is counted as neither. */
      for (let ply = 0; ply < 160 && !game.isGameOver(); ply += 1) {
        if (game.turn() === 'w') { game.move(childMove(game, rnd)); continue; }
        const uci = B.chooseMove(game.fen(), 0, 1000 + g + ply);
        if (!uci) break;
        game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
      }
      if (game.isCheckmate()) { if (game.turn() === 'b') wins += 1; else losses += 1; }
    }

    assert.equal(losses, 0,
      `the easiest bot beat a beginner ${losses} time(s) out of ${GAMES}`);
    assert.ok(wins >= GAMES / 2,
      `a beginner won only ${wins} of ${GAMES}; the bottom rung has got too strong`);
  });

  test('it does not always play the same move', () => {
    const seen = new Set();
    for (let seed = 1; seed <= 30; seed += 1) seen.add(B.chooseMove(START, 0, seed));
    assert.ok(seen.size > 5, `only ${seen.size} different moves in 30 tries`);
  });

  test('it plays legal moves and only legal moves', () => {
    const legal = new Set(new Chess(START).moves({ verbose: true })
      .map((m) => m.from + m.to));
    for (let seed = 1; seed <= 40; seed += 1) {
      assert.ok(legal.has(B.chooseMove(START, 0, seed)), `seed ${seed} played something illegal`);
    }
  });

  test('it takes a free piece sometimes, but not every time', () => {
    /* A hanging knight on e5. A random mover that never took it would not
       look like chess; one that always took it would not be the easy bot. */
    const fen = 'r1bqkb1r/pppp1ppp/2n5/4n3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1';
    let grabbed = 0;
    const tries = 60;
    for (let seed = 1; seed <= tries; seed += 1) {
      if (B.chooseMove(fen, 0, seed) === 'f3e5') grabbed += 1;
    }
    assert.ok(grabbed > 0, 'it never once took the free knight');
    assert.ok(grabbed < tries, 'it took the free knight every single time');
  });
});

describe('a finished search does not throw pieces away', () => {
  /* Deliberately a fixed depth with no clock. Driving this through
     chooseMove() made it depend on how fast the machine was that day: the top
     bot is time-capped, so on a slow run it completes a shallower search and
     the result changes. A test that fails on a busy laptop and passes on a
     quiet one teaches nobody anything. The property being pinned down is
     "given a search that finished, the move it likes is not a blunder".

     The positions are all ones a depth-two search finishes inside a second or
     so. Anything much busier is a fifteen-second test, because chess.js
     charges about a millisecond for every move generation. */
  const hangs = (fen, uci) => {
    const game = new Chess(fen, { skipValidation: true });
    const played = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!played) return `played the illegal move ${uci}`;
    for (const grab of game.moves({ verbose: true }).filter((m) => m.captured)) {
      const worth = B.VALUE[grab.captured];
      if (worth < 300) continue;                   /* a pawn is not a disaster */
      game.move(grab);
      const recapture = game.moves({ verbose: true })
        .some((m) => m.to === grab.to && m.captured);
      game.undo();
      if (!recapture) {
        return `played ${played.san} and left a ${grab.captured} on ${grab.to} `
          + `for ${grab.san} with no way to take back`;
      }
    }
    return null;
  };

  const POSITIONS = [
    ['the opening', START],
    ['a normal Italian', 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'],
    ['a queen out early', 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'],
    ['a rook endgame', '8/5pk1/6p1/8/8/6P1/R4PK1/7r w - - 0 1'],
    ['king and pawn', '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1'],
    ['a quiet middlegame', '8/5pk1/6p1/8/8/6P1/5PK1/3R4 w - - 0 1']
  ];

  for (const [name, fen] of POSITIONS) {
    test(name, () => {
      const best = B.search(new Chess(fen), { depth: 2 })[0];
      assert.ok(best, 'no move at all');
      const problem = hangs(fen, best.uci);
      assert.equal(problem, null, `in ${name}, the bot ${problem}`);
    });
  }

  test('and it takes a free queen when one is offered', () => {
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const best = B.search(new Chess(fen), { depth: 2 })[0];
    assert.equal(uciToSan(fen, best.uci), 'Nxh4');
  });
});

describe('a bot that cannot move', () => {
  test('a finished game gets no move rather than a crash', () => {
    /* The back-rank mate, one move later. */
    assert.equal(B.chooseMove('4R1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1', 2, 1), null);
  });

  test('nonsense in gives nothing out', () => {
    assert.equal(B.chooseMove('this is not a position', 2, 1), null);
  });

  test('a king-less board still plays, because the mini-games need it', () => {
    const uci = B.chooseMove('8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1', 1, 4);
    assert.match(uci || '', /^[a-h]2[a-h][34]$/, `got ${uci}`);
  });
});

describe('moving up and down the ladder', () => {
  test('three wins in a row moves up, three losses moves down', () => {
    assert.equal(B.nextBotLevel(1, [1, 1, 1]), 2);
    assert.equal(B.nextBotLevel(1, [0, 0, 0]), 0);
  });

  test('a mixed run leaves it where it is', () => {
    /* One loss to a bot you usually beat says nothing, and dropping a child
       a level for it is insulting. */
    assert.equal(B.nextBotLevel(2, [1, 1, 0]), 2);
    assert.equal(B.nextBotLevel(2, [0, 1, 1]), 2);
    assert.equal(B.nextBotLevel(2, [1, 0, 1]), 2);
  });

  test('only the last three games count', () => {
    assert.equal(B.nextBotLevel(1, [0, 0, 0, 0, 1, 1, 1]), 2);
  });

  test('fewer than three games changes nothing', () => {
    assert.equal(B.nextBotLevel(1, []), 1);
    assert.equal(B.nextBotLevel(1, [1, 1]), 1);
  });

  test('it stops at both ends', () => {
    assert.equal(B.nextBotLevel(4, [1, 1, 1]), 4);
    assert.equal(B.nextBotLevel(0, [0, 0, 0]), 0);
  });
});

describe('the same seed plays the same move', () => {
  test('so a level is a fact rather than a claim', () => {
    for (const level of [0, 1, 2]) {
      const once = B.chooseMove(START, level, 42);
      const twice = B.chooseMove(START, level, 42);
      assert.equal(once, twice, `level ${level} is not repeatable`);
    }
  });
});
