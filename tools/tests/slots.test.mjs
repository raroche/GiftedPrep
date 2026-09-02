/**
 * Where the right answer sits.
 *
 * The shuffle was never biased — measured over 40,000 questions per game it put
 * the answer in each position 24.7% to 25.3% of the time. The problem it does
 * not solve is runs: four in the same place happens about once every 256
 * questions, and a child who sees it starts tapping that place.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spreadAnswer, noteSlot } from '../../assets/js/modules/slots.js';
import { inScope, makeChoices } from '../../assets/js/modules/flags.js';

const data = JSON.parse(readFileSync(new URL('../../data/fun/flags.json', import.meta.url)));

test('a run of two is left alone', () => {
  const choices = ['a', 'B', 'c', 'd'];
  const same = spreadAnswer(choices, (x) => x === 'B', [1], 2);
  assert.equal(same.indexOf('B'), 1, 'moved after only one repeat');
});

test('the third in the same place is moved', () => {
  const choices = ['a', 'B', 'c', 'd'];
  const moved = spreadAnswer(choices, (x) => x === 'B', [1, 1], 2);
  assert.notEqual(moved.indexOf('B'), 1);
  /* And nothing is lost or duplicated in the swap. */
  assert.deepEqual([...moved].sort(), ['B', 'a', 'c', 'd']);
});

test('a run somewhere else does not move this one', () => {
  const choices = ['a', 'B', 'c', 'd'];
  const same = spreadAnswer(choices, (x) => x === 'B', [3, 3], 2);
  assert.equal(same.indexOf('B'), 1);
});

test('the memory keeps only what the cap needs', () => {
  const recent = [];
  for (let i = 0; i < 10; i += 1) noteSlot(recent, i % 4, 4);
  assert.equal(recent.length, 4);
});

test('nothing breaks when there is no answer or nothing to swap with', () => {
  assert.deepEqual(spreadAnswer(['a', 'b'], (x) => x === 'z', [0, 0]), ['a', 'b']);
  assert.deepEqual(spreadAnswer(['A'], (x) => x === 'A', [0, 0]), ['A']);
});

test('over a long run the four positions stay even and no streak exceeds two', () => {
  /* A seeded generator, because a chi-square test against the 5% threshold
     fails 5% of runs by definition. A test that cries wolf one time in twenty
     teaches people to ignore it. */
  let seed = 20260901;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const pool = inScope(data, 'countries');
  const at = [0, 0, 0, 0];
  const recent = [];
  let longest = 0, run = 0, last = -1;
  for (let i = 0; i < 8000; i += 1) {
    const c = pool[i % pool.length];
    const choices = spreadAnswer(
      makeChoices(c, data, 4, random, 'countries'),
      (x) => x.code === c.code, recent, 2, random);
    const k = choices.findIndex((x) => x.code === c.code);
    noteSlot(recent, k);
    at[k] += 1;
    if (k === last) { run += 1; if (run > longest) longest = run; } else { run = 1; last = k; }
  }
  assert.ok(longest <= 2, `the answer sat in one place ${longest} times running`);
  const expected = 8000 / 4;
  const chi = at.reduce((s, o) => s + ((o - expected) ** 2) / expected, 0);
  assert.ok(chi < 7.81, `positions are uneven: chi-square ${chi.toFixed(2)}`);
});
