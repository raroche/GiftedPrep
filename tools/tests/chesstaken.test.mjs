/**
 * What each side has taken (modules/chesstaken.js).
 *
 * The counter sits beside a child for the whole game, so it has to be right
 * about the two things that are easy to get wrong: whose capture it was, and
 * what happens when a move is taken back.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Chess } from '../../assets/js/vendor/chess.js';
import { taken, leadLabel, VALUE } from '../../assets/js/modules/chesstaken.js';

/** Play a line and hand back the verbose history, the way the screen does. */
function play(fen, ...moves) {
  const game = new Chess(fen, { skipValidation: true });
  for (const m of moves) {
    const done = game.move(m);
    assert.ok(done, `the fixture could not play ${JSON.stringify(m)}`);
  }
  return game;
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('what has been taken', () => {
  test('nothing taken is nothing shown', () => {
    const out = taken([]);
    assert.deepEqual(out.w, []);
    assert.deepEqual(out.b, []);
    assert.equal(out.countLead, 0);
    assert.equal(out.valueLead, 0);
  });

  test('a capture is credited to the side that made it', () => {
    /* 1. e4 d5 2. exd5 -- White has taken a pawn, Black has taken nothing. */
    const game = play(START, 'e4', 'd5', 'exd5');
    const out = taken(game.history({ verbose: true }));
    assert.deepEqual(out.w, ['p']);
    assert.deepEqual(out.b, []);
    assert.equal(out.countLead, 1);
  });

  test('both sides taking evens the count back out', () => {
    const game = play(START, 'e4', 'd5', 'exd5', 'Qxd5');
    const out = taken(game.history({ verbose: true }));
    assert.deepEqual(out.w, ['p']);
    assert.deepEqual(out.b, ['p']);
    assert.equal(out.countLead, 0);
  });

  test('the row reads biggest first, whatever order they fell in', () => {
    const out = taken([
      { color: 'w', captured: 'p' },
      { color: 'w', captured: 'q' },
      { color: 'w', captured: 'n' },
      { color: 'w', captured: 'r' }
    ]);
    assert.deepEqual(out.w, ['q', 'r', 'n', 'p']);
  });

  test('moves that took nothing are not counted', () => {
    const game = play(START, 'e4', 'e5', 'Nf3', 'Nc6');
    const out = taken(game.history({ verbose: true }));
    assert.equal(out.countLead, 0);
    assert.deepEqual(out.w, []);
  });

  /* Taking a move back has to take the capture back with it, or a child ends
     a game with a counter that says they took a queen they still face. */
  test('taking a move back removes what it took', () => {
    const game = play(START, 'e4', 'd5', 'exd5');
    assert.equal(taken(game.history({ verbose: true })).countLead, 1);
    game.undo();
    assert.equal(taken(game.history({ verbose: true })).countLead, 0);
    assert.deepEqual(taken(game.history({ verbose: true })).w, []);
  });

  test('a part of the game reads as that part of the game', () => {
    /* Reviewing move three must not show what was taken on move nine. */
    const game = play(START, 'e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qxa2');
    const all = game.history({ verbose: true });
    assert.equal(taken(all.slice(0, 3)).countLead, 1, 'after White takes on d5');
    assert.equal(taken(all.slice(0, 4)).countLead, 0, 'after Black takes back');
    assert.equal(taken(all).b.length, 2, 'Black has taken two by the end');
  });

  test('points are kept as well as pieces, and they can disagree', () => {
    /* One queen against two pawns: behind on pieces, far ahead on points. */
    const out = taken([
      { color: 'w', captured: 'q' },
      { color: 'b', captured: 'p' },
      { color: 'b', captured: 'p' }
    ]);
    assert.equal(out.countLead, -1, 'Black has taken one more piece');
    assert.equal(out.valueLead, 7, 'but a queen is worth more than two pawns');
  });

  test('rubbish in does not throw', () => {
    assert.equal(taken(null).countLead, 0);
    assert.equal(taken([null, {}, { color: 'w' }]).countLead, 0);
  });

  test('every piece has a value and a king is worth nothing', () => {
    for (const t of ['p', 'n', 'b', 'r', 'q']) assert.ok(VALUE[t] > 0, t);
    assert.equal(VALUE.k, 0, 'a king is never captured, so it counts for nothing');
  });
});

describe('the badge a child reads', () => {
  test('only the side that is ahead gets one', () => {
    assert.equal(leadLabel(2, 'w'), '+2');
    assert.equal(leadLabel(2, 'b'), '', 'the side behind is not told so');
  });

  test('it works the other way round too', () => {
    assert.equal(leadLabel(-3, 'b'), '+3');
    assert.equal(leadLabel(-3, 'w'), '');
  });

  test('level is no badge at all, for either of them', () => {
    assert.equal(leadLabel(0, 'w'), '');
    assert.equal(leadLabel(0, 'b'), '');
  });
});
