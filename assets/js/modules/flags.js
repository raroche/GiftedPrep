/**
 * Flags — the first game in the Fun section.
 *
 * Every flag is bundled in the repository rather than pulled from a CDN. That
 * is not a preference: the site ships `img-src 'self' data:`, so a remote flag
 * would be blocked outright. The country flags come from flag-icons (MIT) and
 * the historical ones from Wikimedia Commons, all public domain. Sources are
 * recorded in data/fun/flags.json and checked by tools/flagcheck.mjs.
 *
 * This module is DOM-free apart from the render helpers, so the round builder
 * and the distractor picker can be reasoned about and tested on their own.
 */

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

let cache = null;

export async function loadFlags() {
  if (cache) return cache;
  const res = await fetch('data/fun/flags.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load the flags');
  cache = await res.json();
  return cache;
}

export const COUNTS = [10, 25, 50, 'all'];
export const MODES = [
  { id: 'random', name: 'Mixed up', blurb: 'Flags from everywhere, in no order.' },
  { id: 'continent', name: 'By continent', blurb: 'Pick which parts of the world.' },
  { id: 'alpha', name: 'A to Z', blurb: 'In alphabetical order, Afghanistan first.' }
];

/* ------------------------------------------------------------------ */
/* Building a round                                                    */
/* ------------------------------------------------------------------ */

export function shuffle(list, random = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Choose the flags for one round.
 * `count` may be a number or 'all'. Asking for more than the pool holds gives
 * the whole pool rather than repeating a flag, which would look like a bug.
 */
export function buildRound(data, { count = 10, mode = 'random', continents = [], random = Math.random } = {}) {
  let pool = data.countries;
  if (mode === 'continent' && continents.length) {
    pool = pool.filter((c) => continents.includes(c.continent));
  }
  const want = count === 'all' ? pool.length : Math.min(Number(count), pool.length);

  if (mode === 'alpha') {
    /* Alphabetical means alphabetical: take the first n by name, in order. */
    return pool.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, want);
  }
  return shuffle(pool, random).slice(0, want);
}

/**
 * Answer options for one flag. Distractors come from the same continent first,
 * because "which of these four is Chad" is a real question and "Chad, Japan,
 * Peru, Norway" is not.
 */
export function makeChoices(country, data, howMany = 4, random = Math.random) {
  const sameArea = data.countries.filter(
    (c) => c.code !== country.code && c.continent === country.continent
  );
  const elsewhere = data.countries.filter(
    (c) => c.code !== country.code && c.continent !== country.continent
  );
  const picked = shuffle(sameArea, random).slice(0, howMany - 1);
  while (picked.length < howMany - 1 && elsewhere.length) {
    const extra = shuffle(elsewhere, random)[0];
    if (!picked.some((p) => p.code === extra.code)) picked.push(extra);
    else break;
  }
  return shuffle(picked.concat(country), random);
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

export const flagSrc = (code) => `assets/img/flags/${code}.svg`;
export const pastSrc = (slug) => `assets/img/flags/past/${slug}.svg`;

export function renderSetup(data, chosen) {
  const countBtn = (v) => `
    <button type="button" class="gp-pill${String(chosen.count) === String(v) ? ' is-selected' : ''}"
            role="radio" aria-checked="${String(chosen.count) === String(v)}"
            tabindex="${String(chosen.count) === String(v) ? 0 : -1}"
            data-flagcount="${v}">${v === 'all' ? 'All' : v}</button>`;
  const modeBtn = (m) => `
    <button type="button" class="gp-card gp-card--mode${chosen.mode === m.id ? ' is-selected' : ''}"
            data-flagmode="${m.id}" aria-pressed="${chosen.mode === m.id}">
      <span class="gp-card__title">${esc(m.name)}</span>
      <span class="gp-card__sub">${esc(m.blurb)}</span>
    </button>`;
  const contBtn = (c) => {
    const n = data.countries.filter((x) => x.continent === c.id).length;
    const on = chosen.continents.includes(c.id);
    return `<button type="button" class="gp-pill${on ? ' is-selected' : ''}"
              aria-pressed="${on}" data-flagcont="${c.id}">${esc(c.name)} <small>${n}</small></button>`;
  };

  const total = chosen.mode === 'continent' && chosen.continents.length
    ? data.countries.filter((c) => chosen.continents.includes(c.continent)).length
    : data.countries.length;
  const willPlay = chosen.count === 'all' ? total : Math.min(Number(chosen.count), total);

  return `
    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">How many flags?</legend>
      <div class="gp-row gp-row--wrap" id="gp-flag-counts" role="radiogroup" aria-label="How many flags">
        ${COUNTS.map(countBtn).join('')}
      </div>
    </fieldset>

    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">Which flags?</legend>
      <div class="gp-grid gp-grid--modes">${MODES.map(modeBtn).join('')}</div>
    </fieldset>

    ${chosen.mode === 'continent' ? `
      <fieldset class="gp-fieldset">
        <legend class="gp-fieldset__legend">Pick as many as you like</legend>
        <div class="gp-row gp-row--wrap">${data.continents.map(contBtn).join('')}</div>
      </fieldset>` : ''}

    <p class="gp-muted gp-grade-note" id="gp-flag-note">
      ${chosen.mode === 'continent' && !chosen.continents.length
        ? 'Pick at least one part of the world.'
        : `That is <strong>${willPlay}</strong> flag${willPlay === 1 ? '' : 's'} to name.`}
    </p>

    <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-action="flag-start"
      ${chosen.mode === 'continent' && !chosen.continents.length ? 'disabled' : ''}>
      Start &rarr;
    </button>`;
}

export function renderQuestion(country, choices, index, total) {
  return `
    <div class="gp-flagq">
      <p class="gp-ex__count">Flag ${index + 1} of ${total}</p>
      <div class="gp-flagq__img">
        <img src="${flagSrc(country.code)}" alt="A flag to identify" width="320" height="240" decoding="async">
      </div>
      <p class="gp-flagq__ask">Which country is this?</p>
      <div class="gp-flagq__choices">
        ${choices.map((c) => `
          <button type="button" class="gp-choice gp-choice--flag" data-flagpick="${c.code}">
            <span class="gp-choice__body">${esc(c.name)}</span>
            <span class="gp-choice__mark" aria-hidden="true"></span>
          </button>`).join('')}
      </div>
    </div>`;
}

export function renderVault(entry) {
  return `
    <div class="gp-vault">
      <p class="gp-vault__badge"><span aria-hidden="true">🗝️</span> The vault is open</p>
      <h3 class="gp-vault__head">A flag that does not exist any more</h3>
      <div class="gp-flagq__img">
        <img src="${pastSrc(entry.slug)}" alt="A flag from the past" width="320" height="240" decoding="async">
      </div>
      <p class="gp-flagq__ask">Whose flag was this?</p>
      <div class="gp-flagq__choices">
        ${shuffle(entry.choices.map((c, i) => ({ c, i }))).map(({ c, i }) => `
          <button type="button" class="gp-choice gp-choice--flag" data-vaultpick="${i}">
            <span class="gp-choice__body">${esc(c)}</span>
            <span class="gp-choice__mark" aria-hidden="true"></span>
          </button>`).join('')}
      </div>
    </div>`;
}

export default {
  loadFlags, buildRound, makeChoices, shuffle,
  renderSetup, renderQuestion, renderVault, flagSrc, pastSrc, COUNTS, MODES
};
