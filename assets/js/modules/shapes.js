/**
 * Shapes — name the country from its outline.
 *
 * Built alongside the flag game and deliberately close to it, but with one
 * real difference: the child can answer from four choices or type the name,
 * which is much harder. Typed answers are accepted in English and Spanish and
 * under the names people actually use, so USA, United States, The United
 * States and Estados Unidos are all the same answer.
 *
 * The outlines are bundled, not fetched from anywhere: the site ships
 * `img-src 'self'`. They are also injected inline rather than used as an
 * <img>, because an <img> cannot inherit the page's colour, and these files
 * are a single silhouette that would otherwise be black on a black page.
 */

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

let cache = null;
const svgCache = new Map();

export async function loadShapes() {
  if (cache) return cache;
  const res = await fetch('data/fun/shapes.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load the country shapes');
  cache = await res.json();
  return cache;
}

/** Fetch one outline. Inlined so CSS can colour it in either theme. */
export async function shapeSvg(code) {
  if (svgCache.has(code)) return svgCache.get(code);
  const res = await fetch(`assets/img/shapes/${code}.svg`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No outline for ${code}`);
  let svg = await res.text();
  /* Strip the XML prolog and doctype: they are fine in a file of their own but
     invalid in the middle of an HTML document. */
  svg = svg.replace(/<\?xml[\s\S]*?\?>/i, '').replace(/<!DOCTYPE[\s\S]*?>/i, '').trim();
  svg = svg.replace('<svg', '<svg class="gp-shapefig" role="img" aria-label="A country outline"');
  svgCache.set(code, svg);
  return svg;
}

export const COUNTS = [10, 25, 50, 'all'];
export const PICKS = [
  { id: 'choice', name: 'Four choices', blurb: 'Pick the right country from four.' },
  { id: 'type', name: 'Type the name', blurb: 'Much harder. English or Spanish, and nicknames count.' }
];
export const MODES = [
  { id: 'random', name: 'Mixed up', blurb: 'Shapes from everywhere, in no order.' },
  { id: 'continent', name: 'By continent', blurb: 'Pick which parts of the world.' },
  { id: 'alpha', name: 'A to Z', blurb: 'In alphabetical order, Afghanistan first.' }
];

/* ------------------------------------------------------------------ */
/* Matching a typed answer                                             */
/* ------------------------------------------------------------------ */

/**
 * Fold a typed answer to something comparable: no accents, no punctuation, no
 * case, no leading article. So "The Côte d'Ivoire " and "cote divoire" match.
 *
 * "Republic of" is deliberately NOT stripped. Doing so made Taiwan's official
 * "Republic of China" collapse onto China, and a typed answer that could mean
 * two countries is worse than one that is simply strict.
 */
export function normaliseName(s) {
  let out = String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '');
  out = out.toLowerCase().replace(/&/g, ' and ');
  /* Apostrophes are deleted rather than turned into a space, so that a child
     typing "cote divoire" matches "Côte d'Ivoire". Every other punctuation
     mark becomes a space. */
  out = out.replace(/['\u2018\u2019\u02bc\u00b4`]/g, '');
  out = out.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  for (const art of ['the ', 'la ', 'el ', 'los ', 'las ']) {
    if (out.startsWith(art)) { out = out.slice(art.length); break; }
  }
  return out.trim();
}

/** Does what the child typed name this country? */
export function matchesCountry(typed, country) {
  const got = normaliseName(typed);
  if (!got) return false;
  return (country.names || [country.name]).some((n) => normaliseName(n) === got);
}

/** Which country a typed answer names, if any. Used to say "that is Chad". */
export function whichCountry(typed, data) {
  const got = normaliseName(typed);
  if (!got) return null;
  return data.countries.find((c) => (c.names || []).some((n) => normaliseName(n) === got)) || null;
}

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

export function buildRound(data, { count = 10, mode = 'random', continents = [], random = Math.random } = {}) {
  let pool = data.countries;
  if (mode === 'continent' && continents.length) {
    pool = pool.filter((c) => continents.includes(c.continent));
  }
  const want = count === 'all' ? pool.length : Math.min(Number(count), pool.length);
  if (mode === 'alpha') {
    return pool.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, want);
  }
  return shuffle(pool, random).slice(0, want);
}

/** Same-continent distractors, so the four choices are a real question. */
export function makeChoices(country, data, howMany = 4, random = Math.random) {
  const near = data.countries.filter((c) => c.code !== country.code && c.continent === country.continent);
  const far = data.countries.filter((c) => c.code !== country.code && c.continent !== country.continent);
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
            data-shapecount="${v}">${v === 'all' ? 'All' : v}</button>`;
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
              aria-pressed="${on}" data-shapecont="${c.id}">${esc(c.name)} <small>${n}</small></button>`;
  };

  const total = chosen.mode === 'continent' && chosen.continents.length
    ? data.countries.filter((c) => chosen.continents.includes(c.continent)).length
    : data.countries.length;
  const willPlay = chosen.count === 'all' ? total : Math.min(Number(chosen.count), total);
  const noContinent = chosen.mode === 'continent' && !chosen.continents.length;

  return `
    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">How many shapes?</legend>
      <div class="gp-row gp-row--wrap" id="gp-shape-counts" role="radiogroup" aria-label="How many shapes">
        ${COUNTS.map(countBtn).join('')}
      </div>
    </fieldset>

    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">How do you want to answer?</legend>
      <div class="gp-grid gp-grid--modes">${card('data-shapepick', PICKS, chosen.pick)}</div>
    </fieldset>

    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">Which shapes?</legend>
      <div class="gp-grid gp-grid--modes">${card('data-shapemode', MODES, chosen.mode)}</div>
    </fieldset>

    ${chosen.mode === 'continent' ? `
      <fieldset class="gp-fieldset">
        <legend class="gp-fieldset__legend">Pick as many as you like</legend>
        <div class="gp-row gp-row--wrap">${data.continents.map(contBtn).join('')}</div>
      </fieldset>` : ''}

    <p class="gp-muted gp-grade-note" id="gp-shape-note">
      ${noContinent ? 'Pick at least one part of the world.'
        : `That is <strong>${willPlay}</strong> shape${willPlay === 1 ? '' : 's'} to name.`}
    </p>

    <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-action="shape-start"
      ${noContinent ? 'disabled' : ''}>Start &rarr;</button>`;
}

export function renderQuestion(svg, choices, index, total, pick) {
  const answerArea = pick === 'type'
    ? `<div class="gp-numrow gp-typerow">
         <label class="gp-numrow__label" for="gp-shape-typed">Country</label>
         <input class="gp-numrow__input" id="gp-shape-typed" type="text" autocomplete="off"
                autocapitalize="words" spellcheck="false" data-shapetyped
                placeholder="English or Spanish">
         <button type="button" class="gp-btn gp-btn--primary" data-shapecheck>Check</button>
       </div>
       <p class="gp-muted gp-typehint">Nicknames count too. USA, Holland, Burma.</p>`
    : `<div class="gp-flagq__choices">
         ${choices.map((c) => `
           <button type="button" class="gp-choice gp-choice--flag" data-shapeanswer="${c.code}">
             <span class="gp-choice__body">${esc(c.name)}</span>
             <span class="gp-choice__mark" aria-hidden="true"></span>
           </button>`).join('')}
       </div>`;

  return `
    <div class="gp-flagq">
      <p class="gp-ex__count">Shape ${index + 1} of ${total}</p>
      <div class="gp-shapebox">${svg}</div>
      <p class="gp-flagq__ask">Which country is this?</p>
      ${answerArea}
    </div>`;
}

export function renderVault(entry, svg) {
  return `
    <div class="gp-vault">
      <p class="gp-vault__badge"><span aria-hidden="true">🗝️</span> The vault is open</p>
      <h3 class="gp-vault__head">A shape that looks like something else</h3>
      <div class="gp-shapebox">${svg}</div>
      <p class="gp-flagq__ask">What is this country famous for looking like?</p>
      <div class="gp-flagq__choices">
        ${shuffle(entry.choices.map((c, i) => ({ c, i }))).map(({ c, i }) => `
          <button type="button" class="gp-choice gp-choice--flag" data-shapevault="${i}">
            <span class="gp-choice__body">${esc(c)}</span>
            <span class="gp-choice__mark" aria-hidden="true"></span>
          </button>`).join('')}
      </div>
    </div>`;
}

export default {
  loadShapes, shapeSvg, buildRound, makeChoices, shuffle,
  normaliseName, matchesCountry, whichCountry,
  renderSetup, renderQuestion, renderVault, COUNTS, MODES, PICKS
};
