/**
 * Typed-answer matching for the country shape game.
 *
 * A typed answer is the hard mode, so it has to be generous about how people
 * really write country names while never accepting a different country.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normaliseName, matchesCountry, whichCountry, buildRound, makeChoices } from '../../assets/js/modules/shapes.js';

const data = JSON.parse(fs.readFileSync('data/fun/shapes.json', 'utf8'));
const get = (code) => data.countries.find((c) => c.code === code);

describe('typed country names', () => {
  test('the United States under every name people use', () => {
    for (const said of ['USA', 'usa', 'US', 'United States', 'the united states',
                        'The United States of America', 'Estados Unidos', '  estados unidos  ']) {
      assert.ok(matchesCountry(said, get('us')), `should accept "${said}"`);
    }
  });

  test('Spanish names are accepted', () => {
    assert.ok(matchesCountry('España', get('es')));
    assert.ok(matchesCountry('espana', get('es')), 'without the tilde too');
    assert.ok(matchesCountry('Alemania', get('de')));
    assert.ok(matchesCountry('Países Bajos', get('nl')));
    assert.ok(matchesCountry('Reino Unido', get('gb')));
  });

  test('nicknames and old names are accepted', () => {
    assert.ok(matchesCountry('Holland', get('nl')));
    assert.ok(matchesCountry('Burma', get('mm')));
    assert.ok(matchesCountry('UK', get('gb')));
    assert.ok(matchesCountry('Great Britain', get('gb')));
  });

  test('accents and punctuation do not matter', () => {
    assert.ok(matchesCountry("Cote d'Ivoire", get('ci')));
    assert.ok(matchesCountry('cote divoire', get('ci')));
    assert.ok(matchesCountry('Côte d’Ivoire', get('ci')), 'a curly apostrophe too');
  });

  test('a different country is never accepted', () => {
    assert.equal(matchesCountry('Canada', get('us')), false);
    assert.equal(matchesCountry('Austria', get('au')), false, 'Austria is not Australia');
    assert.equal(matchesCountry('Australia', get('at')), false);
    assert.equal(matchesCountry('Niger', get('ng')), false, 'Niger is not Nigeria');
    assert.equal(matchesCountry('Nigeria', get('ne')), false);
  });

  test('empty or nonsense is not accepted', () => {
    for (const said of ['', '   ', '!!!', '12345']) {
      assert.equal(matchesCountry(said, get('fr')), false, `should reject "${said}"`);
    }
  });

  test('China and Taiwan stay apart', () => {
    /* Taiwan's official name is "Republic of China", so a careless normaliser
       collapses the two and makes both unanswerable. */
    assert.ok(matchesCountry('China', get('cn')));
    assert.equal(matchesCountry('China', get('tw')), false);
    assert.ok(matchesCountry('Taiwan', get('tw')));
  });

  test('no typed answer can mean two different countries', () => {
    const seen = new Map();
    for (const c of data.countries) {
      for (const n of c.names) {
        const k = normaliseName(n);
        assert.ok(!seen.has(k) || seen.get(k) === c.code,
          `"${n}" would match both ${seen.get(k)} and ${c.code}`);
        seen.set(k, c.code);
      }
    }
  });

  test('a wrong answer that names a real country is identified', () => {
    const named = whichCountry('Brazil', data);
    assert.equal(named && named.code, 'br');
    assert.equal(whichCountry('qwertyuiop', data), null);
  });

  test('every country accepts its own displayed name', () => {
    for (const c of data.countries) {
      assert.ok(matchesCountry(c.name, c), `${c.code} rejects its own name "${c.name}"`);
    }
  });
});

describe('shape rounds', () => {
  test('alphabetical starts at the top and stays in order', () => {
    const names = buildRound(data, { count: 5, mode: 'alpha' }).map((c) => c.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  });

  test('choices contain the answer once and never repeat', () => {
    for (const c of data.countries.slice(0, 30)) {
      const ch = makeChoices(c, data, 4, () => 0.42);
      assert.equal(ch.length, 4);
      assert.equal(ch.filter((x) => x.code === c.code).length, 1);
      assert.equal(new Set(ch.map((x) => x.code)).size, 4);
    }
  });

  test('every lookalike answer matches its stated thing', () => {
    for (const l of data.lookalikes) assert.equal(l.choices[l.answer], l.thing, l.code);
  });
});
