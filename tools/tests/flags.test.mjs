/**
 * The flag game.
 *
 * The property that matters is not that a round is built, but that every
 * question has exactly one right answer. Eleven territories fly a parent
 * country's flag — nine of them France's — so a naive round could show the
 * tricolour with Saint Martin and Saint Pierre and Miquelon among the choices
 * and France absent, which is what shipped.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { askable, inScope, buildRound, makeChoices } from '../../assets/js/modules/flags.js';

const data = JSON.parse(readFileSync(new URL('../../data/fun/flags.json', import.meta.url)));
/* Two files that draw the same flag differ only in their id, and in the url(#id)
   references that point at it — the US and its Minor Outlying Islands are an
   example. Both have to be neutralised or identical flags look different. */
const drawn = (c) => readFileSync(new URL(`../../assets/img/flags/${c.code}.svg`, import.meta.url), 'utf8')
  .replace(/\sid="[^"]*"/g, '')
  .replace(/url\(#[^)]*\)/g, 'url(#x)')
  .replace(/\s+/g, ' ')
  .trim();

test('a territory with no flag of its own is never asked about', () => {
  const pool = askable(data);
  assert.ok(pool.length > 200);
  for (const c of pool) assert.equal(c.usesFlagOf, undefined, `${c.name} is askable`);
  /* And the ones excluded really are the shared-flag ones. */
  const excluded = data.countries.filter((c) => c.usesFlagOf).map((c) => c.code).sort();
  assert.deepEqual(excluded,
    ['bl', 'gf', 'gp', 'hm', 'mf', 'pm', 're', 'sh', 'um', 'wf', 'yt']);
});

test('every question has exactly one correct answer among its four choices', () => {
  for (const c of askable(data)) {
    const choices = makeChoices(c, data);
    assert.equal(choices.length, 4, `${c.name}: wrong number of choices`);
    assert.equal(new Set(choices.map((x) => x.code)).size, 4, `${c.name}: repeated choice`);
    assert.ok(choices.some((x) => x.code === c.code), `${c.name}: answer missing`);
    const showing = choices.filter((x) => drawn(x) === drawn(c));
    assert.equal(showing.length, 1,
      `${c.name}: ${showing.length} choices show this same flag — unanswerable`);
  }
});

test('a territory is never offered as a wrong answer either', () => {
  for (const c of askable(data).slice(0, 60)) {
    for (const x of makeChoices(c, data)) {
      assert.equal(x.usesFlagOf, undefined,
        `${x.name} was offered as a choice but flies ${x.usesFlagOf}'s flag`);
    }
  }
});

test('every usesFlagOf points at a real country that has its own flag', () => {
  for (const c of data.countries.filter((x) => x.usesFlagOf)) {
    const parent = data.countries.find((x) => x.code === c.usesFlagOf);
    assert.ok(parent, `${c.name} points at ${c.usesFlagOf}, which does not exist`);
    assert.equal(parent.usesFlagOf, undefined, `${c.name} points at another pointer`);
    assert.equal(drawn(c), drawn(parent),
      `${c.name} claims to fly ${parent.name}'s flag but draws something else`);
  }
});

test('the two scopes are what they claim, and countries is the default', () => {
  const countries = inScope(data, 'countries');
  const everywhere = inScope(data, 'all');
  assert.ok(countries.every((c) => c.sovereign), 'a territory leaked into countries');
  assert.ok(everywhere.length > countries.length, 'the wider scope is not wider');
  assert.equal(everywhere.length, askable(data).length);
  /* No argument means countries, so a child gets the friendlier set by default. */
  const round = buildRound(data, { count: 250 });
  assert.ok(round.every((c) => c.sovereign));
});

test('choices never leave the scope that was asked for', () => {
  for (const c of inScope(data, 'countries').slice(0, 60)) {
    for (const x of makeChoices(c, data, 4, Math.random, 'countries')) {
      assert.ok(x.sovereign, `${x.name} was offered to a countries-only round`);
    }
  }
});

test('no round ever contains a place with no flag of its own', () => {
  for (const scope of ['countries', 'all']) {
    const round = buildRound(data, { count: 50, mode: 'random', scope });
    assert.equal(round.length, 50);
    for (const c of round) assert.equal(c.usesFlagOf, undefined);
  }
});
