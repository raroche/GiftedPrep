/**
 * Puzzles, and the number that follows the child.
 *
 * Two things here are impossible to eyeball. The Lichess data stores the
 * position BEFORE the opponent's move, so a puzzle played without that first
 * move is off by one — still a legal board, still solvable-looking, and the
 * answer never works. And Glicko-2 is a page of algebra whose output nobody
 * can sanity-check by eye, which is why it is tested against the worked
 * example in Glickman's own paper.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as P from '../../assets/js/modules/chesspuzzles.js';

/* Two real puzzles, in the database's own shape. */
const PUZZLES = [
  { id: 'aaa', fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', moves: ['g1h1', 'e1e8'], r: 600 },
  { id: 'bbb', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', moves: ['e1e2', 'a1a8'], r: 900 },
  { id: 'ccc', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', moves: ['e1f2', 'a1a8'], r: 1200 },
  { id: 'ddd', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', moves: ['e1d2', 'a1a8'], r: 400 }
];

const player = (r, seen = []) => ({ puzzles: { r, rd: 200, vol: 0.06, seen } });

describe('the themes on offer', () => {
  test('each one has a name, a blurb and the lesson that opens it', () => {
    for (const t of P.THEMES) {
      assert.ok(t.id && t.name && t.blurb && t.opens, `${t.id} is missing something`);
    }
  });

  test('the ids are unique and checkmate in one comes first', () => {
    const ids = P.THEMES.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(P.THEMES[0].id, 'mateIn1', 'the first theme a child meets is mate in one');
  });

  test('a theme nobody has heard of is not a theme', () => {
    assert.equal(P.themeById('nonsense'), null);
    assert.ok(P.themeById('fork'));
  });
});

describe('getting a puzzle ready', () => {
  test('the first move belongs to the opponent, not the child', () => {
    /* The single most important line in this file. The Lichess FEN is the
       position BEFORE that move; skip it and every puzzle is off by one. */
    const ready = P.prepare(PUZZLES[0]);
    assert.equal(ready.setupMove, 'g1h1');
    assert.deepEqual(ready.solution, ['e1e8']);
  });

  test('a longer puzzle alternates child, opponent, child', () => {
    const long = { id: 'x', fen: '8/8/8/8/8/8/8/8 w - - 0 1', moves: ['a1a2', 'b1b2', 'c1c2', 'd1d2'], r: 700 };
    const ready = P.prepare(long);
    assert.equal(ready.setupMove, 'a1a2');
    assert.deepEqual(ready.solution, ['b1b2', 'c1c2', 'd1d2']);
  });

  test('a puzzle with nothing to solve is refused', () => {
    assert.equal(P.prepare({ id: 'x', fen: '8/8/8/8/8/8/8/8 w - - 0 1', moves: ['a1a2'], r: 1 }), null);
    assert.equal(P.prepare(null), null);
    assert.equal(P.prepare({ id: 'x' }), null);
  });
});

describe('marking a move', () => {
  const ready = P.prepare(PUZZLES[0]);

  test('the move the puzzle wanted is right', () => {
    assert.equal(P.isRight(ready, 0, 'e1e8'), true);
  });

  test('anything else is not', () => {
    assert.equal(P.isRight(ready, 0, 'e1e7'), false);
    assert.equal(P.isRight(ready, 0, ''), false);
    assert.equal(P.isRight(ready, 0, null), false);
  });

  test('past the end of the solution nothing is right', () => {
    assert.equal(P.isRight(ready, 9, 'e1e8'), false);
  });

  test('a promotion counts whichever piece the child chose', () => {
    /* The puzzle records a queen. A child who promoted to a knight and mated
       has solved it, and telling them otherwise is the worst thing this could
       do to somebody who just found something clever. */
    const promo = P.prepare({ id: 'p', fen: '8/8/8/8/8/8/8/8 w - - 0 1', moves: ['a1a2', 'b7b8q'], r: 1 });
    assert.equal(P.isRight(promo, 0, 'b7b8q'), true);
    assert.equal(P.isRight(promo, 0, 'b7b8n'), true);
    assert.equal(P.isRight(promo, 0, 'b7b8'), true);
    assert.equal(P.isRight(promo, 0, 'c7c8q'), false);
  });

  test('it knows when the puzzle is over and when the opponent replies', () => {
    const long = P.prepare({ id: 'x', fen: '8/8/8/8/8/8/8/8 w - - 0 1', moves: ['a1a2', 'b1b2', 'c1c2', 'd1d2'], r: 7 });
    assert.equal(P.replyAfter(long, 0), 'c1c2');
    assert.equal(P.isFinished(long, 0), false);
    assert.equal(P.replyAfter(long, 2), null);
    assert.equal(P.isFinished(long, 3), true);
  });
});

describe('choosing which puzzles to show', () => {
  test('it picks as many as asked for', () => {
    assert.equal(P.pick(PUZZLES, player(800), 2).length, 2);
    assert.equal(P.pick(PUZZLES, player(800), 4).length, 4);
  });

  test('it prefers puzzles near the child\'s rating', () => {
    const one = P.pick(PUZZLES, player(600), 1);
    assert.equal(one[0].r, 600);
  });

  test('a rating with nothing near it still gets the closest', () => {
    const one = P.pick(PUZZLES, player(3000), 1);
    assert.equal(one[0].r, 1200, 'the nearest, rather than nothing at all');
  });

  test('puzzles already seen are skipped while fresh ones remain', () => {
    const seen = ['aaa', 'bbb'];
    for (let i = 0; i < 20; i += 1) {
      const two = P.pick(PUZZLES, player(800, seen), 2);
      assert.equal(two.length, 2);
      for (const p of two) assert.ok(!seen.includes(p.id), `${p.id} has been seen`);
    }
  });

  test('running out of fresh ones repeats rather than ending the theme', () => {
    const allSeen = PUZZLES.map((p) => p.id);
    const got = P.pick(PUZZLES, player(800, allSeen), 3);
    assert.equal(got.length, 3, 'a child who has done them all must still be able to play');
  });

  test('an empty theme gives nothing rather than throwing', () => {
    assert.deepEqual(P.pick([], player(800), 5), []);
    assert.deepEqual(P.pick(null, player(800), 5), []);
  });

  test('a child with no record yet is treated as a beginner', () => {
    const got = P.pick(PUZZLES, {}, 1);
    assert.equal(got.length, 1);
  });
});

describe('the rating', () => {
  test('it reproduces the worked example from Glickman\'s paper', () => {
    /* Player 1500 / 200 / 0.06 against three opponents: beat 1400/30, lost to
       1550/100 and 1700/300. The paper's answer is 1464.06, 151.52, 0.05999.
       Nobody can check this by eye, which is exactly why it is here. */
    const out = P.rate({ r: 1500, rd: 200, vol: 0.06 }, [
      { r: 1400, rd: 30, score: 1 },
      { r: 1550, rd: 100, score: 0 },
      { r: 1700, rd: 300, score: 0 }
    ]);
    assert.ok(Math.abs(out.r - 1464.06) < 0.05, `rating came out ${out.r.toFixed(2)}`);
    assert.ok(Math.abs(out.rd - 151.52) < 0.05, `deviation came out ${out.rd.toFixed(2)}`);
    assert.ok(Math.abs(out.vol - 0.059996) < 0.0001, `volatility came out ${out.vol}`);
  });

  test('solving everything raises it; missing everything lowers it', () => {
    const up = P.rate({ r: 800, rd: 200, vol: 0.06 },
      Array.from({ length: 5 }, () => ({ r: 800, rd: 60, score: 1 })));
    const down = P.rate({ r: 800, rd: 200, vol: 0.06 },
      Array.from({ length: 5 }, () => ({ r: 800, rd: 60, score: 0 })));
    assert.ok(up.r > 800, `should have gone up, went to ${up.r}`);
    assert.ok(down.r < 800, `should have gone down, went to ${down.r}`);
  });

  test('beating a hard puzzle is worth more than beating an easy one', () => {
    const hard = P.rate({ r: 800, rd: 200, vol: 0.06 }, [{ r: 1300, rd: 60, score: 1 }]);
    const easy = P.rate({ r: 800, rd: 200, vol: 0.06 }, [{ r: 400, rd: 60, score: 1 }]);
    assert.ok(hard.r > easy.r);
  });

  test('answering settles the number down', () => {
    const after = P.rate({ r: 800, rd: 350, vol: 0.06 },
      Array.from({ length: 5 }, () => ({ r: 800, rd: 60, score: 1 })));
    assert.ok(after.rd < 350, 'the more we know, the less it should wobble');
  });

  test('a spell away widens it again, without moving the rating', () => {
    const rested = P.rate({ r: 900, rd: 80, vol: 0.06 }, []);
    assert.ok(Math.abs(rested.r - 900) < 0.001, 'not playing is not a result');
    assert.ok(rested.rd > 80, 'a child we have not seen is less well known');
  });

  test('the deviation stays inside its bounds', () => {
    let p = { r: 800, rd: 350, vol: 0.06 };
    for (let i = 0; i < 200; i += 1) {
      p = P.rate(p, [{ r: 800, rd: 60, score: i % 2 }]);
      assert.ok(p.rd >= P.MIN_RD && p.rd <= P.MAX_RD, `rd escaped to ${p.rd}`);
    }
    assert.ok(p.rd >= P.MIN_RD, 'the floor keeps the number moving for a veteran');
  });
});

describe('after a sitting', () => {
  const solved = [
    { id: 'aaa', rating: 600, right: true },
    { id: 'bbb', rating: 900, right: false },
    { id: 'ccc', rating: 700, right: true }
  ];

  test('the rating is stored as a whole number', () => {
    const after = P.afterSession(player(800), solved);
    assert.equal(after.puzzles.r, Math.round(after.puzzles.r));
    assert.equal(after.puzzles.rd, Math.round(after.puzzles.rd));
  });

  test('everything attempted is remembered, right or wrong', () => {
    const after = P.afterSession(player(800), solved);
    assert.deepEqual(after.puzzles.seen.sort(), ['aaa', 'bbb', 'ccc']);
  });

  test('what was already remembered is kept', () => {
    const after = P.afterSession(player(800, ['old']), solved);
    assert.ok(after.puzzles.seen.includes('old'));
  });

  test('the list of seen puzzles does not grow forever', () => {
    const many = Array.from({ length: 900 }, (_, i) => `p${i}`);
    const after = P.afterSession(player(800, many), solved);
    assert.ok(after.puzzles.seen.length <= 500);
  });

  test('nothing else about the child is disturbed', () => {
    const before = { ...player(800), stars: { 'l1-rook': 3 }, starTotal: 3 };
    const after = P.afterSession(before, solved);
    assert.deepEqual(after.stars, { 'l1-rook': 3 });
    assert.equal(after.starTotal, 3);
  });
});

describe('stars for a sitting', () => {
  test('right first time is what counts', () => {
    assert.equal(P.starsFor(5, 5), 3);
    assert.equal(P.starsFor(4, 5), 2);
    assert.equal(P.starsFor(3, 5), 2);
    assert.equal(P.starsFor(2, 5), 1);
    assert.equal(P.starsFor(0, 5), 1);
  });

  test('finishing always earns something', () => {
    assert.equal(P.starsFor(0, 0), 1);
  });
});
