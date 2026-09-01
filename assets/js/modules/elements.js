/**
 * elements.js — Name the Element.
 *
 * Four different questions rather than one asked repeatedly, because the
 * periodic table is four different things to learn and they do not all yield to
 * the same drill:
 *
 *   what is it       a symbol, name it            Fe is ...?
 *   write it         a name, give the symbol      Iron is written ...?
 *   what is it in    a use and a picture          which one is in a pencil?
 *   where is it      click the cell on the table  find Iron
 *
 * The third is the important one. Reading how this is taught, the single most
 * recommended way to make an element stick is meeting it somewhere real, and
 * the fourth is the only one that teaches the table has a SHAPE — that the
 * noble gases are a column and the metals are most of it.
 *
 * Three sets, because 118 at once is nobody's idea of a good time: the ones a
 * child actually meets, the first twenty (the usual elementary starting point),
 * and the whole table.
 */

import { judgeTyped } from './fuzzy.js';
import { elementArt } from './elemart.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

let cache = null;

export async function loadElements() {
  if (cache) return cache;
  const res = await fetch('data/fun/elements.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load the elements');
  cache = await res.json();
  return cache;
}

/* ------------------------------------------------------------------ */
/* Sets and modes                                                      */
/* ------------------------------------------------------------------ */

export const SETS = [
  { id: 'everyday', name: 'The ones you meet',
    blurb: 'Elements in a pencil, a balloon, a banana, your bones.' },
  { id: 'first20', name: 'The first twenty',
    blurb: 'Hydrogen to calcium. Where every chemistry class starts.' },
  { id: 'all', name: 'The whole table',
    blurb: 'All 118, including the ones made in a laboratory.' }
];

export const ASKS = [
  { id: 'symbol', name: 'What is it?', blurb: 'A symbol is shown. Name the element.' },
  { id: 'sign', name: 'Write it', blurb: 'An element is named. Pick its symbol.' },
  { id: 'use', name: 'What is it in?', blurb: 'A picture and a clue. Which element?' },
  { id: 'where', name: 'Where is it?', blurb: 'Find the element on the table itself.' }
];

export const COUNTS = [10, 20, 'all'];

/** The pool for a set. 'use' can only ask about elements that have one. */
export function pool(data, set, ask) {
  let list = data.elements;
  if (set === 'everyday') list = list.filter((e) => e.use);
  else if (set === 'first20') list = list.filter((e) => e.z <= 20);
  if (ask === 'use') list = list.filter((e) => e.use);
  return list;
}

export function shuffle(list, random = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildRound(data, { set = 'everyday', ask = 'symbol', count = 10,
  random = Math.random } = {}) {
  const list = pool(data, set, ask);
  const want = count === 'all' ? list.length : Math.min(Number(count), list.length);
  return shuffle(list, random).slice(0, want);
}

/**
 * Four choices. Distractors come from the same family first — telling sodium
 * from potassium is a real question, telling it from oganesson is not.
 */
export function makeChoices(el, data, howMany = 4, random = Math.random) {
  const same = data.elements.filter((e) => e.z !== el.z && e.family === el.family);
  const near = data.elements.filter((e) => e.z !== el.z && e.family !== el.family
    && Math.abs(e.z - el.z) <= 12);
  const rest = data.elements.filter((e) => e.z !== el.z);
  const picked = [];
  for (const group of [same, near, rest]) {
    for (const c of shuffle(group, random)) {
      if (picked.length >= howMany - 1) break;
      if (!picked.some((p) => p.z === c.z)) picked.push(c);
    }
  }
  return shuffle(picked.concat(el), random);
}

/* ------------------------------------------------------------------ */
/* Typed answers                                                       */
/* ------------------------------------------------------------------ */

export function normaliseElement(s) {
  let out = String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '');
  return out.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const namesOf = (e) => [e.name, e.es];

/** Judge a typed element name, in either language, forgiving a spelling slip. */
export function judge(typed, el, data) {
  return judgeTyped({
    typed,
    normalise: normaliseElement,
    target: { id: el.z, names: namesOf(el) },
    all: data.elements.map((e) => ({ id: e.z, names: namesOf(e), name: e.name, symbol: e.symbol }))
  });
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

export function renderSetup(data, chosen) {
  const card = (attr, list, current) => list.map((m) => `
    <button type="button" class="gp-card gp-card--mode${current === m.id ? ' is-selected' : ''}"
            ${attr}="${m.id}" aria-pressed="${current === m.id}">
      <span class="gp-card__title">${esc(m.name)}</span>
      <span class="gp-card__sub">${esc(m.blurb)}</span>
    </button>`).join('');
  const countBtn = (v) => `
    <button type="button" class="gp-pill${String(chosen.count) === String(v) ? ' is-selected' : ''}"
            role="radio" aria-checked="${String(chosen.count) === String(v)}"
            tabindex="${String(chosen.count) === String(v) ? 0 : -1}"
            data-elemcount="${v}">${v === 'all' ? 'All' : v}</button>`;

  const n = pool(data, chosen.set, chosen.ask).length;
  const willPlay = chosen.count === 'all' ? n : Math.min(Number(chosen.count), n);

  return `
    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">Which elements?</legend>
      <div class="gp-grid gp-grid--modes">${card('data-elemset', SETS, chosen.set)}</div>
    </fieldset>

    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">What kind of question?</legend>
      <div class="gp-grid gp-grid--modes">${card('data-elemask', ASKS, chosen.ask)}</div>
    </fieldset>

    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">How many?</legend>
      <div class="gp-row gp-row--wrap" id="gp-elem-counts" role="radiogroup" aria-label="How many">
        ${COUNTS.map(countBtn).join('')}
      </div>
    </fieldset>

    <p class="gp-muted gp-grade-note">
      ${chosen.ask === 'use' && chosen.set !== 'everyday'
        ? `Only the elements with an everyday use can be asked this way. `
          + `That is <strong>${willPlay}</strong>.`
        : `That is <strong>${willPlay}</strong> question${willPlay === 1 ? '' : 's'}.`}
    </p>

    <button type="button" class="gp-btn gp-btn--primary gp-btn--big"
            data-action="elem-start">Start &rarr;</button>`;
}

/** The table itself, as buttons. Used for the "where is it" question. */
export function renderTable(data, { pickable = true } = {}) {
  const cells = data.elements.map((e) => `
    <button type="button" class="cz-pt__cell cz-pt__cell--${e.family.replace(/ /g, '-')}"
            ${pickable ? `data-elemcell="${e.z}"` : 'disabled'}
            data-style="grid-row:${e.row};grid-column:${e.col}"
            aria-label="${esc(e.name)}, number ${e.z}">
      <span class="cz-pt__z">${e.z}</span>
      <span class="cz-pt__sym">${esc(e.symbol)}</span>
    </button>`).join('');
  /* The f-block sits under the table on every printed periodic table, so the
     two rows it lives on get a gap above them.

     The scroller matters on a phone: 18 columns across 375px gives 12px cells,
     which can be seen but not reliably tapped. Inside a scroller the cells keep
     a usable size and the table moves instead. */
  return `<div class="cz-pt-scroll">`
    + `<div class="cz-pt" role="group" aria-label="Periodic table">${cells}</div></div>`;
}

export function renderQuestion(el, choices, index, total, ask, data) {
  const head = `<p class="gp-ex__count">Question ${index + 1} of ${total}</p>`;

  if (ask === 'where') {
    return `<div class="gp-flagq cz-elemq">
      ${head}
      <p class="cz-elem-ask">Find <strong>${esc(el.name)}</strong> on the table</p>
      <p class="gp-muted cz-elem-hint">Symbol <strong>${esc(el.symbol)}</strong>,
         number <strong>${el.z}</strong>.</p>
      ${renderTable(data)}
    </div>`;
  }

  if (ask === 'use') {
    return `<div class="gp-flagq cz-elemq">
      ${head}
      <div class="cz-elem-pic">${elementArt(el.art, '')}</div>
      <p class="cz-elem-ask">${esc(el.use)}</p>
      <p class="gp-flagq__ask">Which element is it?</p>
      <div class="gp-flagq__choices">
        ${choices.map((c) => `
          <button type="button" class="gp-choice gp-choice--flag" data-elemanswer="${c.z}">
            <span class="gp-choice__body">${esc(c.name)}</span>
            <span class="gp-choice__mark" aria-hidden="true"></span>
          </button>`).join('')}
      </div>
    </div>`;
  }

  if (ask === 'sign') {
    return `<div class="gp-flagq cz-elemq">
      ${head}
      <p class="cz-elem-ask">${esc(el.name)}</p>
      <p class="gp-flagq__ask">How is it written?</p>
      <div class="gp-flagq__choices gp-flagq__choices--tight">
        ${choices.map((c) => `
          <button type="button" class="gp-choice gp-choice--flag" data-elemanswer="${c.z}">
            <span class="gp-choice__body cz-elem-sym">${esc(c.symbol)}</span>
            <span class="gp-choice__mark" aria-hidden="true"></span>
          </button>`).join('')}
      </div>
    </div>`;
  }

  /* symbol -> name */
  return `<div class="gp-flagq cz-elemq">
    ${head}
    <div class="cz-elem-tile cz-pt__cell--${el.family.replace(/ /g, '-')}">
      <span class="cz-elem-tile__z">${el.z}</span>
      <span class="cz-elem-tile__sym">${esc(el.symbol)}</span>
    </div>
    <p class="gp-flagq__ask">Which element is this?</p>
    <div class="gp-flagq__choices">
      ${choices.map((c) => `
        <button type="button" class="gp-choice gp-choice--flag" data-elemanswer="${c.z}">
          <span class="gp-choice__body">${esc(c.name)}</span>
          <span class="gp-choice__mark" aria-hidden="true"></span>
        </button>`).join('')}
    </div>
  </div>`;
}

export default {
  loadElements, pool, buildRound, makeChoices, shuffle, judge, normaliseElement,
  renderSetup, renderQuestion, renderTable, SETS, ASKS, COUNTS
};
