/**
 * capitals.js — name the capital city.
 *
 * The third game in the Fun section: the country is given, the capital is the
 * answer. Typed answers are forgiven a spelling slip; the rules for that, and
 * the measurements behind them, are in modules/fuzzy.js.
 */

import { judgeTyped, editDistance, allowedEdits, similarity } from './fuzzy.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

let cache = null;

export async function loadCapitals() {
  if (cache) return cache;
  const res = await fetch('data/fun/capitals.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load the capitals');
  cache = await res.json();
  return cache;
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

/**
 * Fold a typed city to something comparable: no accents, no case, no
 * punctuation. Unlike country names, a leading article is NOT stripped: "La
 * Paz" and "The Hague" are the names, not decorated versions of "Paz" and
 * "Hague", and stripping would invent collisions rather than remove them.
 */
export function normaliseCapital(s) {
  let out = String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '');
  out = out.toLowerCase().replace(/['‘’ʼ´`]/g, '');
  return out.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Judge a typed capital. See modules/fuzzy.js for the rules and why. */
export function judge(typed, country, data) {
  return judgeTyped({
    typed,
    normalise: normaliseCapital,
    target: { id: country.code, names: country.names || [country.capital] },
    all: (data.countries || []).map((c) => ({
      id: c.code, names: c.names || [c.capital], country: c.country, capital: c.capital
    }))
  });
}

/* ------------------------------------------------------------------ */
/* Rounds                                                              */
/* ------------------------------------------------------------------ */

export function shuffle(list, random = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const COUNTS = [10, 25, 50, 'all'];
export const PICKS = [
  { id: 'choice', name: 'Four choices', blurb: 'Pick the right capital from four.' },
  { id: 'type', name: 'Type the name', blurb: 'Harder. A small spelling slip still counts.' }
];
export const MODES = [
  { id: 'random', name: 'Mixed up', blurb: 'Countries from everywhere, in no order.' },
  { id: 'continent', name: 'By continent', blurb: 'Pick which parts of the world.' },
  { id: 'alpha', name: 'A to Z', blurb: 'In alphabetical order, Afghanistan first.' }
];

export function buildRound(data, { count = 10, mode = 'random', continents = [], random = Math.random } = {}) {
  let pool = data.countries;
  if (mode === 'continent' && continents.length) {
    pool = pool.filter((c) => continents.includes(c.continent));
  }
  const want = count === 'all' ? pool.length : Math.min(Number(count), pool.length);
  if (mode === 'alpha') {
    return pool.slice().sort((a, b) => a.country.localeCompare(b.country)).slice(0, want);
  }
  return shuffle(pool, random).slice(0, want);
}

/** Same-continent distractors, so the four choices are a real question. */
export function makeChoices(country, data, howMany = 4, random = Math.random) {
  const near = data.countries.filter(
    (c) => c.code !== country.code && c.continent === country.continent
  );
  const far = data.countries.filter(
    (c) => c.code !== country.code && c.continent !== country.continent
  );
  const picked = shuffle(near, random).slice(0, howMany - 1);
  for (const extra of shuffle(far, random)) {
    if (picked.length >= howMany - 1) break;
    if (!picked.some((p) => p.code === extra.code)) picked.push(extra);
  }
  return shuffle(picked.concat(country), random);
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

export function renderSetup(data, chosen) {
  const countBtn = (v) => `
    <button type="button" class="gp-pill${String(chosen.count) === String(v) ? ' is-selected' : ''}"
            role="radio" aria-checked="${String(chosen.count) === String(v)}"
            tabindex="${String(chosen.count) === String(v) ? 0 : -1}"
            data-capcount="${v}">${v === 'all' ? 'All' : v}</button>`;
  const card = (attr, list, current) => list.map((m) => `
    <button type="button" class="gp-card gp-card--mode${current === m.id ? ' is-selected' : ''}"
            ${attr}="${m.id}" aria-pressed="${current === m.id}">
      <span class="gp-card__title">${esc(m.name)}</span>
      <span class="gp-card__sub">${esc(m.blurb)}</span>
    </button>`).join('');
  const contBtn = (c) => {
    const n = data.countries.filter((x) => x.continent === c.id).length;
    const on = chosen.continents.includes(c.id);
    return `<button type="button" class="gp-pill${on ? ' is-selected' : ''}"
              aria-pressed="${on}" data-capcont="${c.id}">${esc(c.name)} <small>${n}</small></button>`;
  };

  const total = chosen.mode === 'continent' && chosen.continents.length
    ? data.countries.filter((c) => chosen.continents.includes(c.continent)).length
    : data.countries.length;
  const willPlay = chosen.count === 'all' ? total : Math.min(Number(chosen.count), total);
  const noContinent = chosen.mode === 'continent' && !chosen.continents.length;

  return `
    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">How many countries?</legend>
      <div class="gp-row gp-row--wrap" id="gp-cap-counts" role="radiogroup" aria-label="How many countries">
        ${COUNTS.map(countBtn).join('')}
      </div>
    </fieldset>

    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">How do you want to answer?</legend>
      <div class="gp-grid gp-grid--modes">${card('data-cappick', PICKS, chosen.pick)}</div>
    </fieldset>

    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">Which countries?</legend>
      <div class="gp-grid gp-grid--modes">${card('data-capmode', MODES, chosen.mode)}</div>
    </fieldset>

    ${chosen.mode === 'continent' ? `
      <fieldset class="gp-fieldset">
        <legend class="gp-fieldset__legend">Pick as many as you like</legend>
        <div class="gp-row gp-row--wrap">${data.continents.map(contBtn).join('')}</div>
      </fieldset>` : ''}

    <p class="gp-muted gp-grade-note" id="gp-cap-note">
      ${noContinent ? 'Pick at least one part of the world.'
        : `That is <strong>${willPlay}</strong> capital${willPlay === 1 ? '' : 's'} to name.`}
    </p>

    <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-action="cap-start"
      ${noContinent ? 'disabled' : ''}>Start &rarr;</button>`;
}

export function renderQuestion(country, choices, index, total, pick) {
  const answerArea = pick === 'type'
    ? `<div class="gp-numrow gp-typerow">
         <label class="gp-numrow__label" for="gp-cap-typed">Capital</label>
         <input class="gp-numrow__input" id="gp-cap-typed" type="text" autocomplete="off"
                autocapitalize="words" spellcheck="false" data-captyped
                placeholder="English or Spanish">
         <button type="button" class="gp-btn gp-btn--primary" data-capcheck>Check</button>
       </div>
       <p class="gp-muted gp-typehint">A small spelling slip still counts.</p>`
    : `<div class="gp-flagq__choices">
         ${choices.map((c) => `
           <button type="button" class="gp-choice gp-choice--flag" data-capanswer="${c.code}">
             <span class="gp-choice__body">${esc(c.capital)}</span>
             <span class="gp-choice__mark" aria-hidden="true"></span>
           </button>`).join('')}
       </div>`;

  return `
    <div class="gp-flagq">
      <p class="gp-ex__count">Country ${index + 1} of ${total}</p>
      <p class="cz-capital-country">${esc(country.country)}</p>
      <p class="gp-flagq__ask">What is the capital city?</p>
      ${answerArea}
    </div>`;
}

export default {
  loadCapitals, buildRound, makeChoices, shuffle,
  normaliseCapital, judge,
  renderSetup, renderQuestion, COUNTS, MODES, PICKS
};
