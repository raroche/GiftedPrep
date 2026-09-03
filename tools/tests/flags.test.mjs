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

/*
 * The one that failed deploys. Antarctica and Bouvet Island have no sovereign
 * neighbours at all, so every wrong answer has to come from the other side of
 * the world. The top-up used to reshuffle the whole world for each one and
 * take the first: when that was already picked it gave up and handed back
 * THREE choices. About one question in seventy, silently.
 *
 * A random() that always returns the same number makes every shuffle come out
 * the same way, so the collision happens every time instead of one run in
 * seventy. The test above would find this eventually; this one finds it now.
 */
test('four choices even when the shuffle keeps offering the same country', () => {
  const stubborn = () => 0;
  for (const scope of ['countries', 'all']) {
    for (const c of inScope(data, scope)) {
      const choices = makeChoices(c, data, 4, stubborn, scope);
      assert.equal(choices.length, 4, `${c.name} (${scope}): got ${choices.length} choices`);
      assert.equal(new Set(choices.map((x) => x.code)).size, 4,
        `${c.name} (${scope}): a choice was repeated`);
      assert.ok(choices.some((x) => x.code === c.code),
        `${c.name} (${scope}): the right answer is not among them`);
    }
  }
});

test('a place whose continent is nearly empty still gets a full question', () => {
  /* Named rather than found by search, so this keeps testing the hard case
     even if the data changes under it. */
  const lonely = askable(data).filter((c) => {
    const mates = inScope(data, 'countries')
      .filter((x) => x.continent === c.continent && x.code !== c.code);
    return mates.length < 3;
  });
  assert.ok(lonely.length > 0, 'no thin continent left to test — check the data');
  for (const c of lonely) {
    for (let i = 0; i < 200; i += 1) {
      assert.equal(makeChoices(c, data).length, 4,
        `${c.name} has ${c.continent} to itself and came up short`);
    }
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
