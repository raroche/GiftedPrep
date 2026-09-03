/**
 * The board's square maths (modules/chesssquares.js).
 *
 * Everything a flipped board can get wrong lives here. The drawing itself is
 * checked in a browser, but the arithmetic underneath it is the part that
 * fails quietly: a board that puts e4 in the wrong place still looks like a
 * chessboard, and a child simply finds that the pieces go to the wrong
 * squares.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  SQUARES, FILES, RANKS, squareToXY, xyToSquare, isLightSquare, isSquare,
  fenToPosition, squareLabel, positionDiff, pairMovers
} from '../../assets/js/modules/chesssquares.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('squares', () => {
  test('there are 64, a8 first and h1 last', () => {
    assert.equal(SQUARES.length, 64);
    assert.equal(new Set(SQUARES).size, 64);
    assert.equal(SQUARES[0], 'a8');
    assert.equal(SQUARES.at(-1), 'h1');
  });

  test('isSquare turns away everything that is not one', () => {
    assert.equal(isSquare('e4'), true);
    assert.equal(isSquare('i4'), false);
    assert.equal(isSquare('e9'), false);
    assert.equal(isSquare('e'), false);
    assert.equal(isSquare('E4'), false);
    assert.equal(isSquare(null), false);
    assert.equal(isSquare(44), false);
  });

  test('a1 is dark and h1 is light, as on every real board', () => {
    assert.equal(isLightSquare('a1'), false);
    assert.equal(isLightSquare('h1'), true);
    assert.equal(isLightSquare('a8'), true);
    assert.equal(isLightSquare('h8'), false);
    /* Exactly half the board is light. */
    assert.equal(SQUARES.filter(isLightSquare).length, 32);
  });
});

describe('placing a square on the drawing', () => {
  test('white at the bottom puts a8 top-left and h1 bottom-right', () => {
    assert.deepEqual(squareToXY('a8', 'w'), { x: 0, y: 0 });
    assert.deepEqual(squareToXY('h1', 'w'), { x: 7, y: 7 });
    assert.deepEqual(squareToXY('e4', 'w'), { x: 4, y: 4 });
  });

  test('black at the bottom is the same board turned round', () => {
    assert.deepEqual(squareToXY('a8', 'b'), { x: 7, y: 7 });
    assert.deepEqual(squareToXY('h1', 'b'), { x: 0, y: 0 });
    assert.deepEqual(squareToXY('e4', 'b'), { x: 3, y: 3 });
  });

  test('a square that does not exist has no place', () => {
    assert.equal(squareToXY('z9'), null);
    assert.equal(squareToXY(''), null);
  });

  test('every square survives a round trip, both ways round', () => {
    for (const orientation of ['w', 'b']) {
      for (const sq of SQUARES) {
        const { x, y } = squareToXY(sq, orientation);
        assert.equal(xyToSquare(x, y, orientation), sq, `${sq} at ${orientation}`);
      }
    }
  });

  test('two squares never share a place', () => {
    for (const orientation of ['w', 'b']) {
      const seen = SQUARES.map((sq) => {
        const { x, y } = squareToXY(sq, orientation);
        return `${x},${y}`;
      });
      assert.equal(new Set(seen).size, 64, `overlap when ${orientation} is at the bottom`);
    }
  });

  test('a point off the board is nowhere, not the nearest square', () => {
    assert.equal(xyToSquare(-0.4, 3), null);
    assert.equal(xyToSquare(3, 8.2), null);
    assert.equal(xyToSquare(8, 8), null);
  });

  test('a point inside a square finds that square', () => {
    assert.equal(xyToSquare(4.99, 4.01, 'w'), 'e4');
    assert.equal(xyToSquare(0.5, 0.5, 'w'), 'a8');
  });
});

describe('reading a FEN', () => {
  test('the start position has 32 pieces in the right places', () => {
    const pos = fenToPosition(START);
    assert.equal(Object.keys(pos).length, 32);
    assert.equal(pos.e1, 'wK');
    assert.equal(pos.d8, 'bQ');
    assert.equal(pos.a2, 'wP');
    assert.equal(pos.h7, 'bP');
    assert.equal(pos.e4, undefined);
  });

  test('a board with no kings is fine, because the mini-games need it', () => {
    const pos = fenToPosition('8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1');
    assert.equal(Object.keys(pos).length, 16);
    assert.equal(pos.a7, 'bP');
    assert.equal(pos.a1, undefined);
  });

  test('an empty board is empty', () => {
    assert.deepEqual(fenToPosition('8/8/8/8/8/8/8/8 w - - 0 1'), {});
  });

  test('a broken FEN gives nothing rather than half a board', () => {
    for (const bad of ['', 'nonsense', '8/8/8 w - - 0 1', null, undefined, 42,
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNRX w - - 0 1',
      '9/8/8/8/8/8/8/8 w - - 0 1']) {
      assert.deepEqual(fenToPosition(bad), {}, `should have refused: ${bad}`);
    }
  });

  test('only the board part is read, so the rest may say anything', () => {
    const a = fenToPosition('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
    const b = fenToPosition('8/8/8/4k3/8/8/8/4K3 b KQkq e3 99 250');
    assert.deepEqual(a, b);
  });
});

describe('what a screen reader hears', () => {
  test('a square with a piece names the piece', () => {
    assert.equal(squareLabel('e4', 'wP'), 'E 4, white pawn');
    assert.equal(squareLabel('b8', 'bN'), 'B 8, black knight');
  });

  test('an empty square says so', () => {
    assert.equal(squareLabel('e4', undefined), 'E 4, empty');
  });
});

describe('what changed between two positions', () => {
  test('a quiet move touches exactly two squares', () => {
    const before = fenToPosition(START);
    const after = fenToPosition('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    assert.deepEqual([...positionDiff(before, after)].sort(), ['e2', 'e4']);
  });

  test('a capture touches two squares as well', () => {
    const before = fenToPosition('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');
    const after = fenToPosition('4k3/8/8/3P4/8/8/8/4K3 b - - 0 1');
    assert.deepEqual([...positionDiff(before, after)].sort(), ['d5', 'e4']);
  });

  test('castling touches four', () => {
    const before = fenToPosition('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
    const after = fenToPosition('4k3/8/8/8/8/8/8/5RK1 b - - 1 1');
    assert.deepEqual([...positionDiff(before, after)].sort(), ['e1', 'f1', 'g1', 'h1']);
  });

  test('the same position twice changes nothing', () => {
    const pos = fenToPosition(START);
    assert.equal(positionDiff(pos, fenToPosition(START)).size, 0);
  });

  test('a piece replaced by a different one on the same square counts', () => {
    const before = fenToPosition('8/8/8/8/8/8/8/4K2R w - - 0 1');
    const after = fenToPosition('8/8/8/8/8/8/8/4K2Q w - - 0 1');
    assert.deepEqual([...positionDiff(before, after)], ['h1']);
  });
});

describe('the board agrees with the drawing grid', () => {
  test('files and ranks are the eight each a board has', () => {
    assert.deepEqual(FILES, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    assert.deepEqual(RANKS, ['8', '7', '6', '5', '4', '3', '2', '1']);
  });
});

describe('matching a move to the piece that made it', () => {
  /* Build the two lists the way drawPieces does, from two FENs. */
  const movers = (beforeFen, afterFen, orientation = 'w') => {
    const before = fenToPosition(beforeFen);
    const after = fenToPosition(afterFen);
    const left = [];
    const arrived = [];
    for (const sq of positionDiff(before, after)) {
      if (before[sq]) left.push({ sq, code: before[sq] });
      if (after[sq]) arrived.push({ sq, code: after[sq] });
    }
    return pairMovers(left, arrived, orientation);
  };

  test('a quiet move is one piece travelling', () => {
    const p = movers(START, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    assert.equal(p.size, 1);
    assert.equal(p.get('e4'), 'e2');
  });

  test('a capture is the taker travelling; the taken piece is not paired', () => {
    const p = movers('4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1',
      '4k3/8/8/3N4/8/8/8/4K3 b - - 0 1');
    assert.equal(p.size, 1);
    assert.equal(p.get('d5'), 'e4');
  });

  test('castling moves the king to g1 and the rook to f1, not across each other', () => {
    const p = movers('4k3/8/8/8/8/8/8/4K2R w K - 0 1',
      '4k3/8/8/8/8/8/8/5RK1 b - - 1 1');
    assert.equal(p.size, 2);
    assert.equal(p.get('g1'), 'e1');
    assert.equal(p.get('f1'), 'h1');
  });

  test('long castling too', () => {
    const p = movers('4k3/8/8/8/8/8/8/R3K3 w Q - 0 1',
      '4k3/8/8/8/8/8/8/2KR4 b - - 1 1');
    assert.equal(p.get('c1'), 'e1');
    assert.equal(p.get('d1'), 'a1');
  });

  test('a promotion pairs nothing: a pawn is not a queen', () => {
    const p = movers('8/1P4k1/8/8/8/8/8/4K3 w - - 0 1',
      '1Q6/6k1/8/8/8/8/8/4K3 b - - 0 1');
    assert.equal(p.size, 0);
  });

  test('en passant leaves the captured pawn unpaired', () => {
    const p = movers('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',
      '4k3/8/3P4/8/8/8/8/4K3 b - - 0 1');
    assert.equal(p.size, 1);
    assert.equal(p.get('d6'), 'e5');
  });

  test('with two pieces of a kind, each takes the nearer square', () => {
    /* Both rooks move at once, which never happens in one ply but is exactly
       the ambiguity the distance rule exists to settle. */
    const p = movers('8/8/8/8/8/8/8/R6R w - - 0 1', '8/8/8/8/8/8/R6R/8 w - - 0 1');
    assert.equal(p.get('a2'), 'a1');
    assert.equal(p.get('h2'), 'h1');
  });

  test('nothing changing pairs nothing', () => {
    assert.equal(movers(START, START).size, 0);
  });

  test('a piece appearing from nowhere is simply new', () => {
    const p = movers('4k3/8/8/8/8/8/8/4K3 w - - 0 1', '4k3/8/8/4Q3/8/8/8/4K3 b - - 0 1');
    assert.equal(p.size, 0);
  });

  test('the pairing does not depend on which way the board faces', () => {
    const white = movers(START, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'w');
    const black = movers(START, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'b');
    assert.deepEqual([...white], [...black]);
  });
});
