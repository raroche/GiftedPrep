/**
 * Tests for the parts of the app that are pure logic.
 *
 * These modules were written DOM-free on purpose so they could be checked
 * without a browser. Anything that needs `document`, `fetch` or `localStorage`
 * is covered by the browser pass instead; what is here is the reasoning the
 * app depends on being right.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { orderPool, shuffle, relabel, QuizSession } from '../../assets/js/modules/quiz.js';
import { buildRound, makeChoices } from '../../assets/js/modules/flags.js';
import {
  hanoiStart, hanoiMove, hanoiLegal, hanoiWon,
  checkMagic, checkSieve, sieveKeep, isPrime,
  runMachine, nimReply, nimLosing, shiftLetters, adjacency, checkMap
} from '../../assets/js/modules/mathlab.js';
import { canonical, symmetryOf } from '../../tools/_symmetry.mjs';

/* A fixed generator, so "random" behaviour is reproducible in a test. */
function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const q = (id, cat, difficulty = 1) => ({
  id, categoryId: cat, difficulty, prompt: id,
  choices: [{ id: 'a' }, { id: 'b' }], answer: 'a'
});

/* ------------------------------------------------------------------ */

describe('quiz session', () => {
  const pool = [
    q('a1', 'alpha', 3), q('a2', 'alpha', 1), q('a3', 'alpha', 2),
    q('b1', 'beta', 2), q('b2', 'beta', 1), q('b3', 'beta', 3)
  ];

  test('orders easiest first so a session warms up', () => {
    const got = orderPool(pool, { limit: 6, random: seeded(7) });
    const diffs = got.map((x) => x.difficulty);
    assert.deepEqual(diffs, [...diffs].sort((a, b) => a - b));
  });

  test('never repeats a question inside one round', () => {
    const got = orderPool(pool, { limit: 6, random: seeded(3) });
    assert.equal(new Set(got.map((x) => x.id)).size, got.length);
  });

  test('spreads across categories rather than clumping', () => {
    /* The whole reason orderPool deals round-robin: a flat draw put three of
       one category in a short set nearly a third of the time. */
    const got = orderPool(pool, { limit: 2, random: seeded(11) });
    assert.equal(new Set(got.map((x) => x.categoryId)).size, 2);
  });

  test('prefers unseen questions before seen ones', () => {
    const seen = new Set(['a1', 'a2', 'a3']);
    const got = orderPool(pool, { limit: 3, seenIds: seen, random: seeded(5) });
    assert.ok(got.every((x) => x.categoryId === 'beta'), 'should take the unseen category first');
  });

  test('asking for more than exists returns the pool, not repeats', () => {
    const got = orderPool(pool, { limit: 99, random: seeded(2) });
    assert.equal(got.length, pool.length);
  });

  test('the same seed gives the same round', () => {
    const a = orderPool(pool, { limit: 4, random: seeded(42) }).map((x) => x.id);
    const b = orderPool(pool, { limit: 4, random: seeded(42) }).map((x) => x.id);
    assert.deepEqual(a, b);
  });

  test('scores each answer once and review does not re-score', () => {
    const s = new QuizSession(pool, { limit: 3, seed: 9 });
    const first = s.current;
    s.answer(first.answer);
    assert.equal(s.correctCount, 1);
    s.next();
    s.answer('b');                      // wrong on purpose
    assert.equal(s.correctCount, 1);
    s.back();                           // revisit the first
    s.answer(first.answer);             // answering again must not add a point
    assert.equal(s.correctCount, 1, 'reviewing an answered question must not re-score');
  });

  test('cannot skip forward past the furthest question reached', () => {
    const s = new QuizSession(pool, { limit: 3, seed: 4 });
    assert.equal(s.canGoForward, false);
    s.goTo(2);
    assert.equal(s.index, 0, 'goTo must refuse a question not yet reached');
  });

  test('relabel rewrites choice letters to the shuffled positions', () => {
    const map = { a: 'C', b: 'A' };
    assert.equal(relabel('Choice a is wrong.', map), 'Choice C is wrong.');
    assert.equal(relabel('Choice z is wrong.', map), 'Choice z is wrong.',
      'an unknown id must be left alone rather than mangled');
  });

  test('shuffle keeps every member', () => {
    const src = [1, 2, 3, 4, 5];
    assert.deepEqual(shuffle(src, seeded(8)).sort(), src);
  });
});

/* ------------------------------------------------------------------ */

describe('flag game', () => {
  const data = JSON.parse(fs.readFileSync('data/fun/flags.json', 'utf8'));

  test('alphabetical really is alphabetical and starts at the top', () => {
    const got = buildRound(data, { count: 5, mode: 'alpha' });
    const names = got.map((c) => c.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
    assert.equal(names[0], 'Afghanistan');
  });

  test('by continent returns only that continent', () => {
    const got = buildRound(data, { count: 'all', mode: 'continent', continents: ['europe'] });
    assert.ok(got.length > 0);
    assert.ok(got.every((c) => c.continent === 'europe'));
  });

  test('asking for more than a continent holds gives what exists, with no repeats', () => {
    const got = buildRound(data, { count: 50, mode: 'continent', continents: ['antarctic'] });
    const pool = data.countries.filter((c) => c.continent === 'antarctic');
    assert.equal(got.length, pool.length);
    assert.equal(new Set(got.map((c) => c.code)).size, got.length);
  });

  test('a round never repeats a country', () => {
    const got = buildRound(data, { count: 50, mode: 'random', random: seeded(6) });
    assert.equal(new Set(got.map((c) => c.code)).size, 50);
  });

  test('choices always include the answer, exactly once, with no duplicates', () => {
    for (const country of data.countries.slice(0, 40)) {
      const ch = makeChoices(country, data, 4, seeded(country.code.charCodeAt(0)));
      assert.equal(ch.length, 4, `${country.name}: wrong number of choices`);
      assert.equal(ch.filter((c) => c.code === country.code).length, 1,
        `${country.name}: the answer must appear exactly once`);
      assert.equal(new Set(ch.map((c) => c.code)).size, 4,
        `${country.name}: a choice is repeated`);
    }
  });

  test('every vault answer names the flag it is shown against', () => {
    for (const p of data.past) {
      assert.equal(p.choices[p.answer], p.name, `${p.slug}: answer does not match the flag`);
      assert.equal(new Set(p.choices).size, p.choices.length, `${p.slug}: repeated choice`);
    }
  });
});

/* ------------------------------------------------------------------ */

describe('math lab logic', () => {
  test('Tower of Hanoi refuses an illegal move and accepts a legal one', () => {
    let s = hanoiStart(3);
    assert.deepEqual(s.pegs[0], [3, 2, 1], 'biggest disc at the bottom');
    s = hanoiMove(s, 0, 1);                       // small disc across
    assert.equal(hanoiLegal(s, 0, 1), false, 'a bigger disc must not sit on a smaller one');
    assert.equal(hanoiMove(s, 0, 1), null);
  });

  test('Tower of Hanoi is winnable in exactly 2^n - 1 moves', () => {
    let s = hanoiStart(3);
    for (const [a, b] of [[0, 2], [0, 1], [2, 1], [0, 2], [1, 0], [1, 2], [0, 2]]) s = hanoiMove(s, a, b);
    assert.equal(s.moves, 2 ** 3 - 1);
    assert.equal(hanoiWon(s, 2, 3), true);
  });

  test('the magic square accepts the Lo Shu solution and names what is wrong', () => {
    const ex = { given: [[8, 1, null], [3, null, 7], [4, 9, 2]], total: 15, pool: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
    assert.deepEqual(checkMagic(ex, { '0-2': 6, '1-1': 5 }), { ok: true });
    assert.equal(checkMagic(ex, { '0-2': 6 }).reason, 'blank');
    assert.equal(checkMagic(ex, { '0-2': 8, '1-1': 5 }).reason, 'repeat');
    /* 5 and 6 are both unused, so nothing repeats; the top row just misses 15. */
    assert.equal(checkMagic(ex, { '0-2': 5, '1-1': 6 }).reason, 'line');
  });

  test('the sieve keeps exactly the primes and says which one is wrong', () => {
    assert.deepEqual(sieveKeep({ upto: 20, keep: 'primes' }), [2, 3, 5, 7, 11, 13, 17, 19]);
    const ex = { upto: 20, keep: 'primes' };
    const crossOut = (keep) => new Set(
      Array.from({ length: 20 }, (_, i) => String(i + 1)).filter((n) => !keep.includes(Number(n)))
    );
    assert.equal(checkSieve(ex, crossOut([2, 3, 5, 7, 11, 13, 17, 19])).ok, true);
    assert.equal(checkSieve(ex, crossOut([2, 3, 5, 7, 9, 11, 13, 17, 19])).reason, 'extra');
    assert.equal(checkSieve(ex, crossOut([2, 3, 5, 7, 11, 13, 17])).reason, 'missing');
  });

  test('isPrime agrees with trial division', () => {
    const slow = (n) => { if (n < 2) return false; for (let d = 2; d < n; d += 1) if (n % d === 0) return false; return true; };
    for (let n = 0; n <= 200; n += 1) assert.equal(isPrime(n), slow(n), `disagreed on ${n}`);
  });

  test('the function machine applies its rule', () => {
    assert.equal(runMachine({ m: 3, b: 1 }, 5), 16);
    assert.equal(runMachine({ m: 2, b: -2 }, 7), 12);
    assert.equal(runMachine({ sq: true }, 6), 36);
  });

  test('the subtraction game knows the losing positions', () => {
    for (let n = 0; n <= 24; n += 1) assert.equal(nimLosing(n, 3), n % 4 === 0);
    /* From a winning position the reply must hand back a losing one. */
    for (const n of [21, 19, 14, 7]) {
      assert.equal((n - nimReply(n, 3)) % 4, 0, `reply from ${n} did not leave a multiple of 4`);
    }
  });

  test('the Caesar shift wraps and reverses', () => {
    assert.equal(shiftLetters('ATTACK', 3), 'DWWDFN');
    assert.equal(shiftLetters('XYZ', 3), 'ABC');
    assert.equal(shiftLetters(shiftLetters('MATH', 21), -21), 'MATH');
    assert.equal(shiftLetters('RFYM', 21), 'MATH');
  });

  test('map adjacency counts shared edges, not corners', () => {
    /* 0 and 0 meet only at a corner here, so they are not adjacent. */
    const pairs = adjacency([[0, 1], [1, 0]]).map((p) => p.join('-'));
    assert.deepEqual(pairs, ['0-1']);
  });

  test('a map with two bordering countries the same colour is rejected', () => {
    const ex = { cells: [[0, 1], [1, 0]], limit: 2 };
    assert.equal(checkMap(ex, { 0: 'red', 1: 'blue' }).ok, true);
    assert.equal(checkMap(ex, { 0: 'red', 1: 'red' }).reason, 'clash');
    assert.equal(checkMap(ex, { 0: 'red' }).reason, 'blank');
  });
});

/* ------------------------------------------------------------------ */

describe('figure symmetry', () => {
  test('a rotation invisible on a symmetric shape is collapsed away', () => {
    /* A plus turned 90 degrees is the same picture, which once shipped a
       question with two correct answers. */
    assert.equal(symmetryOf('plus'), 4);
    assert.deepEqual(canonical({ s: 'plus', r: 90 }), { s: 'plus' });
    assert.deepEqual(canonical({ s: 'square', r: 180 }), { s: 'square' });
  });

  test('a rotation that really shows is kept', () => {
    assert.equal(symmetryOf('house'), 1);
    assert.deepEqual(canonical({ s: 'house', r: 90 }), { s: 'house', r: 90 });
  });

  test('a circle looks the same however it is turned', () => {
    assert.equal(symmetryOf('circle'), Infinity);
    assert.deepEqual(canonical({ s: 'circle', r: 137 }), { s: 'circle' });
  });
});
