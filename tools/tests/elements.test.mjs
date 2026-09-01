/**
 * Name the Element.
 *
 * The table is provable rather than spot-checkable, so the tests assert the
 * properties that make it complete instead of sampling rows.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pool, buildRound, makeChoices, judge } from '../../assets/js/modules/elements.js';
import { elementArt, ART_KEYS } from '../../assets/js/modules/elemart.js';

const data = JSON.parse(readFileSync(new URL('../../data/fun/elements.json', import.meta.url)));
const el = (sym) => data.elements.find((e) => e.symbol === sym);

test('the table is complete: 1 to 118, no gaps, no repeats', () => {
  const nums = data.elements.map((e) => e.z).sort((a, b) => a - b);
  assert.equal(nums.length, 118);
  assert.deepEqual(nums, Array.from({ length: 118 }, (_, i) => i + 1));
  assert.equal(new Set(data.elements.map((e) => e.symbol)).size, 118);
});

test('every element has its own cell, and the shape is the real one', () => {
  const cells = data.elements.map((e) => `${e.row}:${e.col}`);
  assert.equal(new Set(cells).size, 118);
  /* Helium belongs top right with the noble gases, not next to hydrogen. */
  assert.deepEqual([el('He').row, el('He').col], [1, 18]);
  /* The f-block is pulled out below, as on every printed table. */
  assert.equal(data.elements.filter((e) => e.row === 9).length, 15);
  assert.equal(data.elements.filter((e) => e.row === 10).length, 15);
});

test('the sets are what they claim to be', () => {
  assert.equal(pool(data, 'first20', 'symbol').length, 20);
  assert.equal(pool(data, 'all', 'symbol').length, 118);
  /* "What is it in" can only ask about elements that have a use. */
  assert.ok(pool(data, 'all', 'use').every((e) => e.use));
});

test('every drawing named in the data actually exists', () => {
  for (const e of data.elements.filter((x) => x.art)) {
    assert.ok(ART_KEYS.includes(e.art), `${e.symbol} wants a drawing called ${e.art}`);
    assert.ok(elementArt(e.art).startsWith('<svg'), `${e.art} did not draw`);
  }
});

test('four choices always include the answer and never repeat', () => {
  for (const e of data.elements) {
    const ch = makeChoices(e, data);
    assert.equal(ch.length, 4);
    assert.equal(new Set(ch.map((c) => c.z)).size, 4);
    assert.ok(ch.some((c) => c.z === e.z), `${e.symbol} not among its own choices`);
  }
});

test('a round never repeats an element', () => {
  const round = buildRound(data, { set: 'all', ask: 'symbol', count: 20 });
  assert.equal(round.length, 20);
  assert.equal(new Set(round.map((e) => e.z)).size, 20);
});

test('typed names work in both languages, and forgive a slip', () => {
  assert.equal(judge('Iron', el('Fe'), data).verdict, 'right');
  assert.equal(judge('Hierro', el('Fe'), data).verdict, 'right');
  assert.equal(judge('Hydrogen', el('H'), data).verdict, 'right');
  assert.equal(judge('Hidrogeno', el('H'), data).verdict, 'right');
  assert.equal(judge('Magnesiun', el('Mg'), data).verdict, 'close');
});

test('no element name is ever accepted for a different element', () => {
  for (const target of data.elements) {
    for (const other of data.elements) {
      if (other.z === target.z) continue;
      for (const name of [other.name, other.es]) {
        const v = judge(name, target, data);
        assert.ok(v.verdict === 'other' || v.verdict === 'wrong',
          `"${name}" accepted for ${target.name}`);
      }
    }
  }
});
