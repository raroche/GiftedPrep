/**
 * screens/fun.js — the Fun and Games room.
 *
 * The hub, Name the Flag and Name the Country Shape. Round building, distractors and
 * typed-answer matching live in modules/flags.js and modules/shapes.js.
 */

import * as data from './../modules/data.js';
import { icon } from './../modules/icons.js';
import { escapeHtml } from './../modules/charts.js';
import * as flags from './../modules/flags.js';
import * as shapes from './../modules/shapes.js';
import * as capitals from './../modules/capitals.js';
import * as elements from './../modules/elements.js';
import { spreadAnswer, noteSlot } from './../modules/slots.js';
import { renderLearn, renderElemLearn } from './learn.js';
import { $, $$, paint, react, showError, showScreen, state } from './../modules/shell.js';

/* ------------------------------------------------------------------ */
/* Fun: name the flag                                                  */
/* ------------------------------------------------------------------ */

/* Drawn rather than picked from the emoji table. An emoji is whatever the
   device decides it is -- a different colour, a different style and a different
   weight on every platform -- which is a poor way to build the front door of a
   room. These are flat, use the palette, and re-theme with the page. */
const ART = {
  flag: (t, p) => `
    <path d="M14 8 V58" stroke="var(--gp-ink)" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    <path d="M14 11 H55 L46 23.5 L55 36 H14 Z" fill="${t}"/>
    <circle cx="28" cy="23.5" r="5.4" fill="${p}"/>`,

  /* Straight edges made this read as an octagon on a grid, not a country. A
     coastline is curves, a peninsula and an island, so it is drawn as those. */
  outline: (t, p) => `
    <rect x="4" y="4" width="56" height="56" rx="13" fill="${p}"/>
    <path d="M4 25 H60 M4 43 H60 M23 4 V60 M43 4 V60" stroke="${t}" stroke-width="1.1"
          opacity=".22" fill="none"/>
    <path d="M17 28 C16 20 22 14 29 15 C33 11 41 12 43 17 C50 17 53 23 50 28
             C54 31 53 38 48 39 C48 45 42 48 38 45 C33 51 25 49 24 43
             C17 42 14 34 17 28 Z" fill="${t}"/>
    <circle cx="49" cy="48" r="3.1" fill="${t}"/>
    <circle cx="44" cy="53" r="1.8" fill="${t}"/>`,

  flask: (t, p) => `
    <rect x="4" y="4" width="56" height="56" rx="13" fill="${p}"/>
    <path d="M27 12v14L15 46a4 4 0 0 0 3.5 6h27A4 4 0 0 0 49 46L37 26V12Z"
          fill="none" stroke="${t}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M22.5 34h19l7 12a4 4 0 0 1-3.5 6h-26a4 4 0 0 1-3.5-6Z" fill="${t}"/>
    <path d="M24 10h16" stroke="${t}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="28" cy="43" r="2.6" fill="${p}"/>
    <circle cx="36" cy="47" r="2" fill="${p}"/>`,

  capital: (t, p) => `
    <rect x="4" y="4" width="56" height="56" rx="13" fill="${p}"/>
    <path d="M32 10 l2.6 5.6 6.1 .8 -4.5 4.2 1.1 6 -5.3 -2.9 -5.3 2.9 1.1 -6 -4.5 -4.2 6.1 -.8 Z"
          fill="${t}"/>
    <rect x="13" y="36" width="11" height="16" rx="2" fill="${t}"/>
    <rect x="26.5" y="29" width="11" height="23" rx="2" fill="${t}"/>
    <rect x="40" y="33" width="11" height="19" rx="2" fill="${t}"/>
    <path d="M10 52 H54" stroke="${t}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`
};

const gameArt = (kind) => `<svg class="cz-gameart" viewBox="0 0 64 64" aria-hidden="true"
  focusable="false">${ART[kind](
    'var(--room, var(--gp-accent))', 'var(--room-soft, var(--gp-accent-soft))')}</svg>`;

const FUN_GAMES = [
  { id: 'flags', art: 'flag', hue: 'mango', name: 'Name the Flag',
    sub: 'Every flag in the world, and a locked vault of flags that no longer exist.',
    meta: '250 flags \u00b7 a hidden vault' },
  { id: 'shapes', art: 'outline', hue: 'lagoon', name: 'Name the Country Shape',
    sub: 'Guess the country from its outline. Pick from four, or type it and make it hard.',
    meta: '242 outlines \u00b7 English or Spanish' },
  { id: 'capitals', art: 'capital', hue: 'honey', name: 'Name the Capital',
    sub: 'The country is given. Name its capital city, from four or by typing it.',
    meta: '192 capitals \u00b7 a typo still counts' },
  { id: 'elements', art: 'flask', hue: 'jade', name: 'Name the Element',
    sub: 'Everything is made of these. What is in a pencil, a balloon, a banana?',
    meta: '118 elements \u00b7 4 kinds of question' }
];

function renderFunHub() {
  /* Same tile as the rooms on the home page. A game is a room one level down,
     so it should not look like a different kind of object. */
  $('#gp-fun-grid').innerHTML = `<div class="cz-tiles">${FUN_GAMES.map((g) => `
    <a class="cz-tile cz-tile--${g.hue}" href="#/fun/${g.id}">
      <span class="cz-tile__pic">${gameArt(g.art)}</span>
      <span class="cz-tile__text">
        <span class="cz-tile__name">${escapeHtml(g.name)}</span>
        <span class="cz-tile__blurb">${escapeHtml(g.sub)}</span>
        <span class="cz-tile__meta">${escapeHtml(g.meta)}</span>
      </span>
      <span class="cz-tile__go" aria-hidden="true">&rarr;</span>
    </a>`).join('')}</div>`;
  showScreen('fun');
}

export async function renderFun(game, step) {
  if (!game) { renderFunHub(); return; }
  if (step === 'learn') {
    await (game === 'elements' ? renderElemLearn() : renderLearn(game));
    return;
  }
  if (game === 'shapes') { await renderShapes(step); return; }
  if (game === 'capitals') { await renderCapitals(step); return; }
  if (game === 'elements') { await renderElements(step); return; }
  if (game !== 'flags') { renderFunHub(); return; }
  try {
    if (!state.flags.data) state.flags.data = await flags.loadFlags();
  } catch (err) {
    console.error(err);
    showError('The flags could not be loaded.');
    return;
  }
  if (step === 'play' && state.flags.round) { drawFlagQuestion(); return; }
  drawFlagSetup();
}

export function drawFlagSetup() {
  $('#gp-flag-setup').innerHTML = flags.renderSetup(state.flags.data, state.flags.setup);
  paint();
  showScreen('flagsetup');
}

export function startFlagRound() {
  const setup = state.flags.setup;
  const list = flags.buildRound(state.flags.data, setup);
  if (!list.length) return;
  state.flags.round = {
    list, index: 0, right: 0, wrong: 0, answered: false, slots: [],
    choices: null, vault: null, vaultDone: false
  };
  location.hash = '#/fun/flags/play';
  drawFlagQuestion();
}

function flagScore() {
  const r = state.flags.round;
  $('[data-flag-right]').textContent = r.right;
  $('[data-flag-wrong]').textContent = r.wrong;
}

export function drawFlagQuestion() {
  const r = state.flags.round;
  if (!r) { drawFlagSetup(); return; }
  if (r.index >= r.list.length) { drawFlagResults(); return; }
  const country = r.list[r.index];
  /* Choices stay inside the chosen scope: a child who asked for countries
     should not be shown Guam as a plausible wrong answer. */
  r.choices = spreadAnswer(
    flags.makeChoices(country, state.flags.data, 4, Math.random, state.flags.setup.scope),
    (x) => x.code === country.code, r.slots);
  noteSlot(r.slots, r.choices.findIndex((x) => x.code === country.code));
  r.answered = false;
  $('#gp-flag-body').innerHTML = flags.renderQuestion(country, r.choices, r.index, r.list.length);
  flagScore();
  showScreen('flaggame');
}

export function answerFlag(code) {
  const r = state.flags.round;
  if (!r || r.answered) return;
  r.answered = true;
  const country = r.list[r.index];
  const right = code === country.code;
  if (right) r.right += 1; else r.wrong += 1;
  react(right ? 'happy' : 'oops', right ? 2300 : 1800);
  flagScore();

  $$('#gp-flag-body [data-flagpick]').forEach((b) => {
    b.disabled = true;
    if (b.dataset.flagpick === country.code) b.classList.add('is-correct');
    else if (b.dataset.flagpick === code) b.classList.add('is-incorrect');
  });
  $$('#gp-flag-body .gp-choice.is-correct .gp-choice__mark').forEach((m) => {
    m.innerHTML = icon('check', { size: 20 });
  });
  $$('#gp-flag-body .gp-choice.is-incorrect .gp-choice__mark').forEach((m) => {
    m.innerHTML = icon('cross', { size: 20 });
  });

  const say = document.createElement('p');
  say.className = `gp-flagq__say ${right ? 'is-right' : 'is-wrong'}`;
  say.textContent = right
    ? `Yes. That is ${country.name}.`
    : `No, that one is ${country.name}.`;
  $('#gp-flag-body .gp-flagq').appendChild(say);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'gp-btn gp-btn--primary gp-btn--big';
  next.dataset.action = 'flag-next';
  next.textContent = r.index + 1 >= r.list.length ? 'See how you did →' : 'Next flag →';
  $('#gp-flag-body .gp-flagq').appendChild(next);
  next.focus({ preventScroll: true });
}

function drawFlagResults() {
  const r = state.flags.round;
  const total = r.list.length;
  const perfect = r.right === total && total > 0;
  /* A clean sweep opens the vault. One flag from the past, once. */
  if (perfect && !r.vaultDone) {
    const past = state.flags.data.past;
    r.vault = past[Math.floor(Math.random() * past.length)];
  }
  $('#gp-flag-body').innerHTML = `
    <div class="gp-flagdone${perfect ? ' is-perfect' : ''}">
      ${perfect ? '<div class="gp-confetti" aria-hidden="true">' +
        Array.from({ length: 14 }, (_, i) => `<span data-style="--i:${i}"></span>`).join('') + '</div>' : ''}
      <h2 class="gp-flagdone__head">${perfect ? 'Every single one.' : 'Round finished.'}</h2>
      <p class="gp-flagdone__score"><strong>${r.right}</strong> right,
        <strong>${r.wrong}</strong> wrong, out of ${total}.</p>
      ${perfect && r.vault ? flags.renderVault(r.vault) : ''}
      ${!perfect ? `<p class="gp-muted">Name every flag in a round without a single mistake and
        something locked opens up.</p>` : ''}
      <div class="gp-flagdone__again">
        <button type="button" class="gp-btn gp-btn--primary" data-action="flag-again">Play again</button>
        <a class="gp-btn gp-btn--ghost" href="#/fun/flags">Change the round</a>
      </div>
    </div>`;
  paint();
  flagScore();
  showScreen('flaggame');
}

export function answerVault(pick) {
  const r = state.flags.round;
  if (!r || !r.vault || r.vaultDone) return;
  r.vaultDone = true;
  const entry = r.vault;
  const right = Number(pick) === entry.answer;
  $$('#gp-flag-body [data-vaultpick]').forEach((b) => {
    b.disabled = true;
    if (Number(b.dataset.vaultpick) === entry.answer) b.classList.add('is-correct');
    else if (Number(b.dataset.vaultpick) === Number(pick)) b.classList.add('is-incorrect');
  });
  $$('#gp-flag-body .gp-choice.is-correct .gp-choice__mark').forEach((m) => {
    m.innerHTML = icon('check', { size: 20 });
  });
  $$('#gp-flag-body .gp-choice.is-incorrect .gp-choice__mark').forEach((m) => {
    m.innerHTML = icon('cross', { size: 20 });
  });

  const box = document.createElement('div');
  box.className = `gp-vault__told ${right ? 'is-right' : 'is-wrong'}`;
  box.innerHTML = `
    <p class="gp-vault__name">${right ? 'Got it. ' : ''}${escapeHtml(entry.name)},
      ${escapeHtml(entry.years)}.</p>
    <p class="gp-vault__story">${escapeHtml(entry.story)}</p>`;
  $('#gp-flag-body .gp-vault').appendChild(box);
}

/* ------------------------------------------------------------------ */
/* Fun: name the country from its shape                                */
/* ------------------------------------------------------------------ */

async function renderShapes(step) {
  try {
    if (!state.shapes.data) state.shapes.data = await shapes.loadShapes();
  } catch (err) {
    console.error(err);
    showError('The country shapes could not be loaded.');
    return;
  }
  if (step === 'play' && state.shapes.round) { await drawShapeQuestion(); return; }
  drawShapeSetup();
}

export function drawShapeSetup() {
  $('#gp-shape-setup').innerHTML = shapes.renderSetup(state.shapes.data, state.shapes.setup);
  paint();
  showScreen('shapesetup');
}

export function startShapeRound() {
  const setup = state.shapes.setup;
  const list = shapes.buildRound(state.shapes.data, setup);
  if (!list.length) return;
  state.shapes.round = {
    list, index: 0, right: 0, wrong: 0, answered: false, slots: [],
    pick: setup.pick, vault: null, vaultDone: false
  };
  location.hash = '#/fun/shapes/play';
  drawShapeQuestion();
}

function shapeScore() {
  const r = state.shapes.round;
  $('[data-shape-right]').textContent = r.right;
  $('[data-shape-wrong]').textContent = r.wrong;
}

export async function drawShapeQuestion() {
  const r = state.shapes.round;
  if (!r) { drawShapeSetup(); return; }
  if (r.index >= r.list.length) { await drawShapeResults(); return; }
  const country = r.list[r.index];
  r.answered = false;
  showScreen('shapegame');
  $('#gp-shape-body').innerHTML = '<p class="gp-muted">Loading the outline…</p>';
  let svg;
  try { svg = await shapes.shapeSvg(country.code); }
  catch (err) { console.error(err); showError('That outline could not be loaded.'); return; }
  const choices = r.pick === 'choice'
    ? spreadAnswer(shapes.makeChoices(country, state.shapes.data),
      (x) => x.code === country.code, r.slots)
    : [];
  if (choices.length) noteSlot(r.slots, choices.findIndex((x) => x.code === country.code));
  $('#gp-shape-body').innerHTML = shapes.renderQuestion(svg, choices, r.index, r.list.length, r.pick);
  shapeScore();
  const box = $('#gp-shape-body [data-shapetyped]');
  if (box) box.focus({ preventScroll: true });
}

/** Finish one shape, however it was answered. */
function settleShape(right, saidWhat) {
  const r = state.shapes.round;
  const country = r.list[r.index];
  r.answered = true;
  if (right) r.right += 1; else r.wrong += 1;
  react(right ? 'happy' : 'oops', right ? 2300 : 1800);
  shapeScore();

  $$('#gp-shape-body [data-shapeanswer]').forEach((b) => {
    b.disabled = true;
    if (b.dataset.shapeanswer === country.code) b.classList.add('is-correct');
    else if (b.dataset.shapeanswer === saidWhat) b.classList.add('is-incorrect');
  });
  $$('#gp-shape-body .gp-choice.is-correct .gp-choice__mark').forEach((m) => { m.innerHTML = icon('check', { size: 20 }); });
  $$('#gp-shape-body .gp-choice.is-incorrect .gp-choice__mark').forEach((m) => { m.innerHTML = icon('cross', { size: 20 }); });
  const typed = $('#gp-shape-body [data-shapetyped]');
  if (typed) typed.disabled = true;
  const checkBtn = $('#gp-shape-body [data-shapecheck]');
  if (checkBtn) checkBtn.disabled = true;

  const say = document.createElement('p');
  say.className = `gp-flagq__say ${right ? 'is-right' : 'is-wrong'}`
    + (saidWhat && saidWhat.spelling ? ' is-nearly' : '');
  /* Three kinds of outcome, not two. A near-miss is marked right and then
     shown the spelling, because the point is to learn the country and the
     spelling both, and being told "no" over one letter teaches neither. */
  say.textContent = saidWhat && saidWhat.spelling
    ? `Right country, small slip. It is spelled ${saidWhat.spelling}.`
    : right
      ? `Yes. That is ${country.name}.`
      : (saidWhat && saidWhat.namedCountry
        ? `That is ${saidWhat.namedCountry}. This one is ${country.name}.`
        : `No, that one is ${country.name}.`);
  $('#gp-shape-body .gp-flagq').appendChild(say);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'gp-btn gp-btn--primary gp-btn--big';
  next.dataset.action = 'shape-next';
  next.textContent = r.index + 1 >= r.list.length ? 'See how you did →' : 'Next shape →';
  $('#gp-shape-body .gp-flagq').appendChild(next);
  next.focus({ preventScroll: true });
}

export function answerShapeChoice(code) {
  const r = state.shapes.round;
  if (!r || r.answered) return;
  settleShape(code === r.list[r.index].code, code);
}

export function answerShapeTyped() {
  const r = state.shapes.round;
  if (!r || r.answered) return;
  const box = $('#gp-shape-body [data-shapetyped]');
  const said = (box.value || '').trim();
  if (!said) { box.focus(); return; }
  const country = r.list[r.index];
  /* A spelling slip now counts, but only when it is unambiguous. See
     modules/fuzzy.js: 23 pairs of countries here are within a typo of each
     other, and every one of those is refused rather than guessed. */
  const v = shapes.judge(said, country, state.shapes.data);
  settleShape(v.verdict === 'right' || v.verdict === 'close', {
    namedCountry: v.verdict === 'other' ? v.other.name : null,
    spelling: v.verdict === 'close' ? v.shown : null
  });
}

async function drawShapeResults() {
  const r = state.shapes.round;
  const total = r.list.length;
  const perfect = r.right === total && total > 0;
  let vaultHtml = '';
  if (perfect && !r.vaultDone) {
    const pool = state.shapes.data.lookalikes;
    r.vault = pool[Math.floor(Math.random() * pool.length)];
    try { vaultHtml = shapes.renderVault(r.vault, await shapes.shapeSvg(r.vault.code)); }
    catch (err) { console.error(err); r.vault = null; }
  }
  $('#gp-shape-body').innerHTML = `
    <div class="gp-flagdone${perfect ? ' is-perfect' : ''}">
      ${perfect ? '<div class="gp-confetti" aria-hidden="true">' +
        Array.from({ length: 14 }, (_, i) => `<span data-style="--i:${i}"></span>`).join('') + '</div>' : ''}
      <h2 class="gp-flagdone__head">${perfect ? 'Every single one.' : 'Round finished.'}</h2>
      <p class="gp-flagdone__score"><strong>${r.right}</strong> right,
        <strong>${r.wrong}</strong> wrong, out of ${total}.</p>
      ${vaultHtml}
      ${!perfect ? `<p class="gp-muted">Name every shape in a round without a single mistake and
        something locked opens up.</p>` : ''}
      <div class="gp-flagdone__again">
        <button type="button" class="gp-btn gp-btn--primary" data-action="shape-again">Play again</button>
        <a class="gp-btn gp-btn--ghost" href="#/fun/shapes">Change the round</a>
      </div>
    </div>`;
  paint();
  shapeScore();
  showScreen('shapegame');
}

export function answerShapeVault(pick) {
  const r = state.shapes.round;
  if (!r || !r.vault || r.vaultDone) return;
  r.vaultDone = true;
  const entry = r.vault;
  const right = Number(pick) === entry.answer;
  $$('#gp-shape-body [data-shapevault]').forEach((b) => {
    b.disabled = true;
    if (Number(b.dataset.shapevault) === entry.answer) b.classList.add('is-correct');
    else if (Number(b.dataset.shapevault) === Number(pick)) b.classList.add('is-incorrect');
  });
  $$('#gp-shape-body .gp-choice.is-correct .gp-choice__mark').forEach((m) => { m.innerHTML = icon('check', { size: 20 }); });
  $$('#gp-shape-body .gp-choice.is-incorrect .gp-choice__mark').forEach((m) => { m.innerHTML = icon('cross', { size: 20 }); });
  const box = document.createElement('div');
  box.className = `gp-vault__told ${right ? 'is-right' : 'is-wrong'}`;
  box.innerHTML = `<p class="gp-vault__name">${right ? 'Got it. ' : ''}${escapeHtml(entry.country)}
      &mdash; ${escapeHtml(entry.thing.toLowerCase())}.</p>
    <p class="gp-vault__story">${escapeHtml(entry.story)}</p>`;
  $('#gp-shape-body .gp-vault').appendChild(box);
}


/* ------------------------------------------------------------------ */
/* Fun: name the capital city                                          */
/* ------------------------------------------------------------------ */

export async function renderCapitals(step) {
  try {
    if (!state.capitals.data) state.capitals.data = await capitals.loadCapitals();
  } catch (err) {
    console.error(err);
    showError('The capitals could not be loaded.');
    return;
  }
  if (step === 'play' && state.capitals.round) { drawCapQuestion(); return; }
  drawCapSetup();
}

export function drawCapSetup() {
  $('#gp-cap-setup').innerHTML = capitals.renderSetup(state.capitals.data, state.capitals.setup);
  paint();
  showScreen('capsetup');
}

export function startCapRound() {
  const list = capitals.buildRound(state.capitals.data, state.capitals.setup);
  if (!list.length) return;
  state.capitals.round = {
    list, index: 0, right: 0, wrong: 0, answered: false, choices: null, slots: []
  };
  location.hash = '#/fun/capitals/play';
  drawCapQuestion();
}

function capScore() {
  const r = state.capitals.round;
  $('[data-cap-right]').textContent = r.right;
  $('[data-cap-wrong]').textContent = r.wrong;
}

export function drawCapQuestion() {
  const r = state.capitals.round;
  if (!r) { drawCapSetup(); return; }
  if (r.index >= r.list.length) { drawCapResults(); return; }
  const country = r.list[r.index];
  const pick = state.capitals.setup.pick;
  if (!r.choices) {
    r.choices = spreadAnswer(capitals.makeChoices(country, state.capitals.data),
      (x) => x.code === country.code, r.slots);
    noteSlot(r.slots, r.choices.findIndex((x) => x.code === country.code));
  }
  r.answered = false;
  $('#gp-cap-body').innerHTML =
    capitals.renderQuestion(country, r.choices, r.index, r.list.length, pick);
  capScore();
  paint();
  showScreen('capgame');
  if (pick === 'type') {
    const box = $('#gp-cap-body [data-captyped]');
    if (box) box.focus();
  }
}

/**
 * Finish one capital.
 *
 * Three outcomes, not two: right, right-but-misspelled, and a real capital
 * belonging to somewhere else. See modules/fuzzy.js for why the middle one
 * exists and why it is scored as correct.
 */
function settleCap(verdict) {
  const r = state.capitals.round;
  const country = r.list[r.index];
  if (r.answered) return;
  r.answered = true;
  const right = verdict.verdict === 'right' || verdict.verdict === 'close';
  if (right) r.right += 1; else r.wrong += 1;
  react(right ? 'happy' : 'oops', right ? 2300 : 1800);
  capScore();

  $$('#gp-cap-body [data-capanswer]').forEach((b) => {
    b.disabled = true;
    if (b.dataset.capanswer === country.code) b.classList.add('is-correct');
    else if (b.dataset.capanswer === verdict.pickedCode) b.classList.add('is-incorrect');
  });
  $$('#gp-cap-body .gp-choice.is-correct .gp-choice__mark')
    .forEach((m) => { m.innerHTML = icon('check', { size: 20 }); });
  $$('#gp-cap-body .gp-choice.is-incorrect .gp-choice__mark')
    .forEach((m) => { m.innerHTML = icon('cross', { size: 20 }); });
  const typed = $('#gp-cap-body [data-captyped]');
  if (typed) typed.disabled = true;
  const checkBtn = $('#gp-cap-body [data-capcheck]');
  if (checkBtn) checkBtn.disabled = true;

  const say = document.createElement('p');
  say.className = `gp-flagq__say ${right ? 'is-right' : 'is-wrong'}`
    + (verdict.verdict === 'close' ? ' is-nearly' : '');
  say.textContent = verdict.verdict === 'close'
    ? `Right city, small slip. It is spelled ${verdict.shown}.`
    : verdict.verdict === 'right'
      ? `Yes. ${country.capital} is the capital of ${country.country}.`
      : verdict.verdict === 'other'
        ? `${verdict.other.capital} is the capital of ${verdict.other.country}. `
          + `${country.country}'s is ${country.capital}.`
        : `No. The capital of ${country.country} is ${country.capital}.`;
  $('#gp-cap-body .gp-flagq').appendChild(say);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'gp-btn gp-btn--primary gp-btn--big';
  next.dataset.action = 'cap-next';
  next.textContent = r.index + 1 >= r.list.length ? 'See how you did \u2192' : 'Next country \u2192';
  $('#gp-cap-body .gp-flagq').appendChild(next);
  next.focus();
}

export function answerCapChoice(code) {
  const r = state.capitals.round;
  if (!r || r.answered) return;
  const country = r.list[r.index];
  if (code === country.code) { settleCap({ verdict: 'right' }); return; }
  const picked = state.capitals.data.countries.find((c) => c.code === code);
  settleCap({ verdict: 'other', other: picked, pickedCode: code });
}

export function answerCapTyped() {
  const r = state.capitals.round;
  if (!r || r.answered) return;
  const box = $('#gp-cap-body [data-captyped]');
  const said = (box.value || '').trim();
  if (!said) { box.focus(); return; }
  settleCap(capitals.judge(said, r.list[r.index], state.capitals.data));
}

export function nextCapital() {
  const r = state.capitals.round;
  r.index += 1;
  r.choices = null;
  drawCapQuestion();
}

function drawCapResults() {
  const r = state.capitals.round;
  const total = r.right + r.wrong;
  const pct = total ? Math.round((r.right / total) * 100) : 0;
  $('#gp-cap-body').innerHTML = `
    <div class="gp-flagdone">
      <h2 class="gp-flagdone__title">${pct >= 70 ? 'Nice work!' : 'All done!'}</h2>
      <p class="gp-flagdone__score"><strong>${r.right}</strong> out of ${total}</p>
      <div class="gp-row gp-row--wrap">
        <button type="button" class="gp-btn gp-btn--primary" data-action="cap-again">Play again</button>
        <a class="gp-btn gp-btn--ghost" href="#/fun/capitals">Change the round</a>
        <a class="gp-btn gp-btn--quiet" href="#/fun">Back to games</a>
      </div>
    </div>`;
  paint();
  showScreen('capgame');
}


/* ------------------------------------------------------------------ */
/* Fun: name the element                                               */
/* ------------------------------------------------------------------ */

export async function renderElements(step) {
  try {
    if (!state.elements.data) state.elements.data = await elements.loadElements();
  } catch (err) {
    console.error(err);
    showError('The elements could not be loaded.');
    return;
  }
  if (step === 'play' && state.elements.round) { drawElemQuestion(); return; }
  drawElemSetup();
}

export function drawElemSetup() {
  $('#gp-elem-setup').innerHTML =
    elements.renderSetup(state.elements.data, state.elements.setup);
  paint();
  showScreen('elemsetup');
}

export function startElemRound() {
  const list = elements.buildRound(state.elements.data, state.elements.setup);
  if (!list.length) return;
  state.elements.round = {
    list, index: 0, right: 0, wrong: 0, answered: false, choices: null, slots: []
  };
  location.hash = '#/fun/elements/play';
  drawElemQuestion();
}

function elemScore() {
  const r = state.elements.round;
  $('[data-elem-right]').textContent = r.right;
  $('[data-elem-wrong]').textContent = r.wrong;
}

export function drawElemQuestion() {
  const r = state.elements.round;
  if (!r) { drawElemSetup(); return; }
  if (r.index >= r.list.length) { drawElemResults(); return; }
  const el = r.list[r.index];
  const ask = state.elements.setup.ask;
  if (!r.choices) {
    r.choices = spreadAnswer(elements.makeChoices(el, state.elements.data),
      (x) => x.z === el.z, r.slots);
    noteSlot(r.slots, r.choices.findIndex((x) => x.z === el.z));
  }
  r.answered = false;
  $('#gp-elem-body').innerHTML = elements.renderQuestion(
    el, r.choices, r.index, r.list.length, ask, state.elements.data);
  elemScore();
  paint();
  showScreen('elemgame');
}

function settleElem(pickedZ) {
  const r = state.elements.round;
  if (r.answered) return;
  const el = r.list[r.index];
  const ask = state.elements.setup.ask;
  const right = pickedZ === el.z;
  r.answered = true;
  if (right) r.right += 1; else r.wrong += 1;
  react(right ? 'happy' : 'oops', right ? 2300 : 1800);
  elemScore();

  const mark = (sel) => $$(sel).forEach((b) => {
    b.disabled = true;
    const z = Number(b.dataset.elemanswer || b.dataset.elemcell);
    if (z === el.z) b.classList.add('is-correct');
    else if (z === pickedZ) b.classList.add('is-incorrect');
  });
  mark('#gp-elem-body [data-elemanswer]');
  mark('#gp-elem-body [data-elemcell]');
  $$('#gp-elem-body .gp-choice.is-correct .gp-choice__mark')
    .forEach((m) => { m.innerHTML = icon('check', { size: 20 }); });
  $$('#gp-elem-body .gp-choice.is-incorrect .gp-choice__mark')
    .forEach((m) => { m.innerHTML = icon('cross', { size: 20 }); });

  /* Every answer teaches the same three facts, whichever way it was asked, so
     a child who came in by "what is it in" still leaves knowing the symbol. */
  const picked = state.elements.data.elements.find((e) => e.z === pickedZ);
  const say = document.createElement('p');
  say.className = `gp-flagq__say ${right ? 'is-right' : 'is-wrong'}`;
  say.textContent = right
    ? `Yes. ${el.symbol} is ${el.name}, number ${el.z}. In Spanish, ${el.es}.`
    : `That is ${picked ? picked.name : 'something else'}. `
      + `This one is ${el.name} — ${el.symbol}, number ${el.z}.`;
  $('#gp-elem-body .gp-flagq').appendChild(say);

  if (el.use && ask !== 'use') {
    const extra = document.createElement('p');
    extra.className = 'gp-muted cz-elem-extra';
    extra.textContent = el.use;
    $('#gp-elem-body .gp-flagq').appendChild(extra);
  }

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'gp-btn gp-btn--primary gp-btn--big';
  next.dataset.action = 'elem-next';
  next.textContent = r.index + 1 >= r.list.length ? 'See how you did \u2192' : 'Next one \u2192';
  $('#gp-elem-body .gp-flagq').appendChild(next);
  next.focus();
}

export function answerElement(z) { settleElem(Number(z)); }

export function nextElement() {
  const r = state.elements.round;
  r.index += 1;
  r.choices = null;
  drawElemQuestion();
}

function drawElemResults() {
  const r = state.elements.round;
  const total = r.right + r.wrong;
  const pct = total ? Math.round((r.right / total) * 100) : 0;
  $('#gp-elem-body').innerHTML = `
    <div class="gp-flagdone">
      <h2 class="gp-flagdone__title">${pct >= 70 ? 'Nice work!' : 'All done!'}</h2>
      <p class="gp-flagdone__score"><strong>${r.right}</strong> out of ${total}</p>
      <div class="gp-row gp-row--wrap">
        <button type="button" class="gp-btn gp-btn--primary" data-action="elem-again">Play again</button>
        <a class="gp-btn gp-btn--ghost" href="#/fun/elements">Change the round</a>
        <a class="gp-btn gp-btn--quiet" href="#/fun">Back to games</a>
      </div>
    </div>`;
  paint();
  showScreen('elemgame');
}
