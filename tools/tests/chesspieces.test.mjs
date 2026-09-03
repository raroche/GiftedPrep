/**
 * The piece symbols.
 *
 * tools/chesscheck.mjs already reads the file and proves the drawings are
 * intact. These cover the small API around them, which the board depends on
 * and which has no other reader: a wrong href draws nothing at all, and a
 * wrong name is what a blind child hears instead of "black knight".
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  PIECE_CODES, PIECE_SYMBOLS, ensurePieceDefs, pieceHref, pieceName
} from '../../assets/js/modules/chesspieces.js';

describe('piece symbols', () => {
  test('there are twelve, white first', () => {
    assert.equal(PIECE_CODES.length, 12);
    assert.equal(PIECE_CODES[0], 'wK');
    assert.equal(PIECE_CODES.at(-1), 'bP');
  });

  test('every code has a symbol with a matching id', () => {
    for (const code of PIECE_CODES) {
      assert.ok(PIECE_SYMBOLS.includes(`<symbol id="cz-p-${code}"`), `${code} missing`);
      assert.equal(pieceHref(code), `#cz-p-${code}`);
    }
  });

  test('no style attribute survives, because CSP would delete it', () => {
    assert.equal(/\sstyle\s*=/.test(PIECE_SYMBOLS), false);
  });

  test('names are what a screen reader says', () => {
    assert.equal(pieceName('wK'), 'white king');
    assert.equal(pieceName('bN'), 'black knight');
    assert.equal(pieceName('wP'), 'white pawn');
    assert.equal(pieceName('zz'), '');
  });
});

describe('ensurePieceDefs', () => {
  /* The smallest document that exercises the guard. A real DOM is not needed
     and would be a dependency; what matters is that it inserts once. */
  const fakeDoc = () => {
    const ids = new Set();
    const body = { children: [], appendChild(el) { this.children.push(el); } };
    return {
      body,
      getElementById: (id) => (ids.has(id) ? {} : null),
      createElement: () => ({
        className: '', setAttribute() {},
        set innerHTML(html) {
          for (const m of html.matchAll(/<symbol id="([^"]+)"/g)) ids.add(m[1]);
        }
      })
    };
  };

  test('inserts the symbols once and is free to call again', () => {
    const doc = fakeDoc();
    ensurePieceDefs(doc);
    assert.equal(doc.body.children.length, 1);
    ensurePieceDefs(doc);
    ensurePieceDefs(doc);
    assert.equal(doc.body.children.length, 1, 'a second call must not add a second copy');
  });
});
