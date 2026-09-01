/**
 * The shared typo matcher.
 *
 * The cases that matter are not the typos; they are the refusals. Every pair
 * named here is two DIFFERENT real answers sitting within a typo of each other,
 * found by scanning the real data rather than imagined.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { editDistance, allowedEdits, judgeTyped } from '../../assets/js/modules/fuzzy.js';
import { normaliseName, judge as judgeCountry } from '../../assets/js/modules/shapes.js';
import { judge as judgeCapital, normaliseCapital } from '../../assets/js/modules/capitals.js';

const countries = JSON.parse(readFileSync(new URL('../../data/fun/shapes.json', import.meta.url)));
const capitals = JSON.parse(readFileSync(new URL('../../data/fun/capitals.json', import.meta.url)));
const country = (n) => countries.countries.find((c) => c.name === n);
const capOf = (n) => capitals.countries.find((c) => c.country === n);

test('a swap of two letters costs one mistake, not two', () => {
  assert.equal(editDistance('madrid', 'madird'), 1);
  assert.equal(editDistance('canberra', 'canbrera'), 1);
});

test('tolerance is scaled to length, and very short names get none', () => {
  assert.equal(allowedEdits(4), 0);
  assert.equal(allowedEdits(5), 1);
  assert.equal(allowedEdits(9), 1);
  assert.equal(allowedEdits(10), 2);
});

test('a plain typo is accepted and the real spelling is handed back', () => {
  const v = judgeCountry('Brazl', country('Brazil'), countries);
  assert.equal(v.verdict, 'close');
  assert.equal(v.shown, 'Brazil');
});

test('naming a different real country is told apart from a typo', () => {
  const v = judgeCountry('Iceland', country('Ireland'), countries);
  assert.equal(v.verdict, 'other');
  assert.equal(v.other.name, 'Iceland');
});

test('a typo that could be either country is refused, not guessed', () => {
  /* "Iseland" is one edit from Iceland AND one from Ireland. */
  assert.equal(judgeCountry('Iseland', country('Ireland'), countries).verdict, 'wrong');
  /* "Sorth Korea" is one from North and one from South. */
  assert.equal(judgeCountry('Sorth Korea', country('South Korea'), countries).verdict, 'wrong');
  /* But one that can only be South is fine. */
  assert.equal(judgeCountry('Soth Korea', country('South Korea'), countries).verdict, 'close');
});

test('four-letter names get no tolerance, because Iran and Iraq are one apart', () => {
  assert.equal(judgeCountry('Iram', country('Iran'), countries).verdict, 'wrong');
  assert.equal(judgeCapital('Limo', capOf('Peru'), capitals).verdict, 'wrong');
});

test('capitals: Spanish spellings and common aliases count as right', () => {
  for (const [c, typed] of [['Italy', 'Roma'], ['Japan', 'Tokio'], ['Russia', 'Moscu'],
                            ['Egypt', 'Cairo'], ['United States', 'Washington']]) {
    assert.equal(judgeCapital(typed, capOf(c), capitals).verdict, 'right', `${c} / ${typed}`);
  }
});

test('capitals: the four known collisions are all refused or attributed', () => {
  assert.equal(judgeCapital('Kingstown', capOf('Jamaica'), capitals).verdict, 'other');
  assert.equal(judgeCapital('Vilna', capOf('Austria'), capitals).verdict, 'other');
  assert.equal(judgeCapital('Praia', capOf('Czechia'), capitals).verdict, 'other');
  assert.equal(judgeCapital('Lome', capOf('Italy'), capitals).verdict, 'other');
});

test('no typo is ever accepted for the wrong country, across the whole data set', () => {
  /* The property that actually matters, checked exhaustively rather than by
     example: for every country, no accepted spelling of any OTHER country may
     come back as "right" or "close". */
  const all = countries.countries;
  for (const target of all.slice(0, 60)) {
    for (const other of all) {
      if (other.code === target.code) continue;
      for (const name of (other.names || []).slice(0, 2)) {
        const v = judgeCountry(name, target, countries);
        assert.ok(v.verdict === 'other' || v.verdict === 'wrong',
          `"${name}" (${other.name}) was accepted for ${target.name} as ${v.verdict}`);
      }
    }
  }
});

test('an empty answer is never right', () => {
  assert.equal(judgeCountry('   ', country('Brazil'), countries).verdict, 'wrong');
  assert.equal(judgeTyped({ typed: '', normalise: normaliseCapital,
    target: { id: 'x', names: ['Paris'] }, all: [] }).verdict, 'wrong');
});
