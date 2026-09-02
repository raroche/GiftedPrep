/**
 * screens/learn.js — the browsing modes.
 *
 * Two things live here. A shared browser for the flags, the outlines and the
 * capitals, which are the same job with a different picture. And the periodic
 * table page, which is not: a table is meant to be seen whole, and what makes
 * it worth learning is its shape rather than any one cell.
 */

import { escapeHtml } from './../modules/charts.js';
import * as flags from './../modules/flags.js';
import * as shapes from './../modules/shapes.js';
import * as capitals from './../modules/capitals.js';
import * as elements from './../modules/elements.js';
import { renderBrowser, order, ORDERS } from './../modules/learn.js';
import { $, $$, paint, showError, showScreen, state } from './../modules/shell.js';

/* ------------------------------------------------------------------ */
/* The shared browser                                                  */
/* ------------------------------------------------------------------ */

/**
 * One adapter per game: where the list comes from, and how one item is drawn.
 * `media` may return a promise, because an outline has to be fetched.
 */
const GAMES = {
  flags: {
    title: 'Every flag in the world',
    back: '#/fun/flags',
    load: () => flags.loadFlags(),
    list: (d) => d.countries,
    nameOf: (c) => c.name,
    continentOf: (c) => c.continent,
    media: (c) => `<img class="cz-learn__flag" src="${flags.flagSrc(c.code)}"
      alt="The flag of ${escapeHtml(c.name)}" width="320" height="240" decoding="async">`,
    sub: (c, d) => continentName(d, c.continent),
    /* Eleven places have no flag of their own. That is worth meeting here even
       though it cannot be asked as a question. */
    note: (c, d) => (c.usesFlagOf
      ? `No flag of its own — it flies the flag of `
        + `${(d.countries.find((x) => x.code === c.usesFlagOf) || {}).name || c.usesFlagOf}.`
      : '')
  },
  shapes: {
    title: 'Every country by its outline',
    back: '#/fun/shapes',
    load: () => shapes.loadShapes(),
    list: (d) => d.countries,
    nameOf: (c) => c.name,
    continentOf: (c) => c.continent,
    media: (c) => shapes.shapeSvg(c.code).catch(() => ''),
    sub: (c, d) => continentName(d, c.continent)
  },
  capitals: {
    title: 'Every country and its capital',
    back: '#/fun/capitals',
    load: () => capitals.loadCapitals(),
    list: (d) => d.countries,
    nameOf: (c) => c.country,
    continentOf: (c) => c.continent,
    /* No picture: the country IS the question, so it is set large. */
    media: (c) => `<p class="cz-learn__big">${escapeHtml(c.country)}</p>`,
    title2: (c) => c.capital,
    sub: (c, d) => continentName(d, c.continent),
    note: (c) => (c.names.length > 1 ? `Also written: ${c.names.slice(1).join(', ')}` : '')
  }
};

const continentName = (d, id) =>
  ((d.continents || []).find((x) => x.id === id) || {}).name || '';

/** Where each continent starts, so a child can jump rather than press 200 times. */
function groupsOf(list, game, data) {
  const g = GAMES[game];
  const seen = [];
  list.forEach((item, at) => {
    const id = g.continentOf(item);
    if (!seen.some((s) => s.id === id)) seen.push({ id, at, name: continentName(data, id) || id });
  });
  return seen;
}

export async function renderLearn(game) {
  const g = GAMES[game];
  if (!g) { showError('There is nothing to learn here yet.'); return; }
  let data;
  try {
    data = await g.load();
  } catch (err) {
    console.error(err);
    showError('That could not be loaded.');
    return;
  }
  const L = state.learn;
  if (L.game !== game) { L.game = game; L.index = 0; L.order = 'alpha'; }
  L.data = data;
  L.list = order(g.list(data), L.order, g);
  if (L.index >= L.list.length) L.index = 0;
  await paintLearn();
  showScreen('learn');
}

export async function paintLearn() {
  const L = state.learn;
  const g = GAMES[L.game];
  if (!g || !L.list) return;
  const item = L.list[L.index];
  const media = await g.media(item);
  $('#gp-learn-body').innerHTML = renderBrowser({
    title: g.title,
    backHref: g.back,
    orders: ORDERS,
    current: L.order,
    index: L.index,
    total: L.list.length,
    groups: L.order === 'continent' ? groupsOf(L.list, L.game, L.data) : null,
    item: {
      media,
      title: g.title2 ? g.title2(item) : g.nameOf(item),
      sub: g.title2 ? g.nameOf(item) : g.sub(item, L.data),
      note: g.note ? g.note(item, L.data) : ''
    }
  });
  paint();
}

export function learnStep(by) {
  const L = state.learn;
  if (!L.list || !L.list.length) return;
  L.index = (L.index + Number(by) + L.list.length) % L.list.length;
  paintLearn();
}

export function learnJump(at) {
  const L = state.learn;
  L.index = Math.max(0, Math.min(L.list.length - 1, Number(at)));
  paintLearn();
}

export function learnOrder(how) {
  const L = state.learn;
  const g = GAMES[L.game];
  if (!g) return;
  /* Keep the child on the same item when the order changes, rather than
     dumping them back at the start of a 250-item list. */
  const here = L.list[L.index];
  L.order = how;
  L.list = order(g.list(L.data), how, g);
  const at = L.list.indexOf(here);
  L.index = at === -1 ? 0 : at;
  paintLearn();
}

/* ------------------------------------------------------------------ */
/* The periodic table                                                  */
/* ------------------------------------------------------------------ */

const FAMILIES = [
  ['alkali-metal', 'Alkali metals', 'So reactive they are stored under oil. Drop one in water and it fizzes, or explodes.'],
  ['alkaline-earth-metal', 'Alkaline earth metals', 'Your bones are built from one of these.'],
  ['transition-metal', 'Transition metals', 'The metals you can name: iron, copper, silver, gold.'],
  ['metal', 'Other metals', 'Softer, lower-melting metals like aluminium, tin and lead.'],
  ['metalloid', 'Metalloids', 'Half metal, half not. Silicon is why computers work.'],
  ['nonmetal', 'Nonmetals', 'What living things are mostly made of.'],
  ['halogen', 'Halogens', 'Eager to join with almost anything. Salt is one of them plus a metal.'],
  ['noble-gas', 'Noble gases', 'The loners. They react with almost nothing at all.'],
  ['lanthanide', 'Lanthanides', 'The top row pulled out below, to keep the table from being far too wide.'],
  ['actinide', 'Actinides', 'The bottom row pulled out below. Most are radioactive.']
];

export async function renderElemLearn() {
  let data;
  try {
    data = state.elements.data || (state.elements.data = await elements.loadElements());
  } catch (err) {
    console.error(err);
    showError('The elements could not be loaded.');
    return;
  }

  $('#gp-elemlearn-body').innerHTML = `
    <a class="gp-btn gp-btn--ghost gp-backlink" href="#/fun/elements">&larr; Back to the game</a>
    <h1 class="gp-page-title" id="elemlearn-title">The periodic table</h1>
    <p class="gp-page-lede">Everything you have ever touched is made of these, in some
       combination. Tap any one of them.</p>

    ${elements.renderTable(data)}

    <div class="cz-elem-detail" id="cz-elem-detail" aria-live="polite"></div>

    <div class="cz-facts">
      <section class="gp-card cz-fact">
        <h2>What the number means</h2>
        <p>The number above each symbol is how many <strong>protons</strong> are in the
           middle of one atom. That is the whole identity of an element. Six protons is
           carbon, and it cannot be anything else. Add one and it is nitrogen.</p>
        <p>The table is laid out in that order, one proton at a time, from hydrogen
           at 1 to oganesson at 118. There are no gaps left.</p>
      </section>

      <section class="gp-card cz-fact">
        <h2>Why it is a table and not a list</h2>
        <p>A list would tell you nothing. Laid out this way, <strong>a column is a
           family</strong>: elements in the same column behave alike.</p>
        <p>The whole last column barely reacts with anything, which is why helium is
           safe in a balloon. The whole first column reacts so fiercely that it is kept
           under oil. Nobody designed that. It falls out of putting the elements in
           order of their protons, and it is the reason the table is one of the great
           discoveries.</p>
      </section>

      <section class="gp-card cz-fact">
        <h2>Who worked it out</h2>
        <p>A Russian chemist, <strong>Dmitri Mendeleev</strong>, in 1869. He was writing
           a textbook and could not decide what order to put the elements in.</p>
        <p>He is often said to have seen the finished table in a dream. It is a lovely
           story and you should know where it comes from: a friend wrote it down years
           afterwards, and Mendeleev never described the dream himself. Most historians
           do not believe it. Checking who told you a story, and when, is a good habit
           to keep.</p>
      </section>

      <section class="gp-card cz-fact cz-fact--wide">
        <h2>The part that is genuinely astonishing</h2>
        <p>Mendeleev's table had <strong>holes</strong> in it. Rather than shuffle the
           elements to close them, he decided the holes were elements nobody had found
           yet, and he described what they would be like when somebody did.</p>
        <p>Six years later a Frenchman found a new metal and called it gallium. Its
           properties matched a hole Mendeleev had described. When the measured weight
           came out slightly off, Mendeleev wrote to Paris to say the measurement was
           wrong. He had never held the metal. <strong>He was right.</strong></p>
        <p>Germanium turned up in 1886 and matched a fifteen-year-old prediction almost
           exactly. That is what a real theory does: it tells you about things that have
           not happened yet.</p>
      </section>
    </div>

    <div class="cz-legend">
      <h2 class="cz-legend__head">The families, by colour</h2>
      ${FAMILIES.map(([id, name, blurb]) => `
        <div class="cz-legend__row">
          <span class="cz-legend__swatch cz-pt__cell--${id}" aria-hidden="true"></span>
          <span><strong>${escapeHtml(name)}</strong> — ${escapeHtml(blurb)}</span>
        </div>`).join('')}
    </div>`;
  paint();
  showScreen('elemlearn');
}

/** Tapping a cell on the learning page explains it rather than scoring it. */
export function showElementDetail(z) {
  const data = state.elements.data;
  if (!data) return;
  const e = data.elements.find((x) => x.z === Number(z));
  if (!e) return;
  $$('#screen-elemlearn .cz-pt__cell').forEach((b) => b.classList.remove('is-picked'));
  const cell = $(`#screen-elemlearn [data-elemcell="${e.z}"]`);
  if (cell) cell.classList.add('is-picked');
  $('#cz-elem-detail').innerHTML = `
    <div class="cz-elem-card cz-pt__cell--${e.family.replace(/ /g, '-')}">
      <span class="cz-elem-card__z">${e.z}</span>
      <span class="cz-elem-card__sym">${escapeHtml(e.symbol)}</span>
    </div>
    <div class="cz-elem-facts">
      <p class="cz-elem-facts__name">${escapeHtml(e.name)}</p>
      <p class="cz-elem-facts__es">In Spanish, ${escapeHtml(e.es)}</p>
      <p class="cz-elem-facts__meta">${escapeHtml(e.family)} &middot;
         ${escapeHtml(e.phase)} at room temperature &middot;
         ${e.z} proton${e.z === 1 ? '' : 's'}</p>
      ${e.use ? `<p class="cz-elem-facts__use">${escapeHtml(e.use)}</p>` : ''}
    </div>`;
  paint();
  $('#cz-elem-detail').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
