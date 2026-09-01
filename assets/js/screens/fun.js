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
import { $, $$, paint, showError, showScreen, state } from './../modules/shell.js';

/* ------------------------------------------------------------------ */
/* Fun: name the flag                                                  */
/* ------------------------------------------------------------------ */

const FUN_GAMES = [
  { id: 'flags', icon: '🚩', name: 'Name the Flag',
    sub: 'Every flag in the world, and a locked vault of flags that no longer exist.' },
  { id: 'shapes', icon: '🗺️', name: 'Name the Country Shape',
    sub: 'Guess the country from its outline. Pick from four, or type it and make it hard.' }
];

function renderFunHub() {
  $('#gp-fun-grid').innerHTML = FUN_GAMES.map((g) => `
    <a class="gp-card gp-card--action" href="#/fun/${g.id}">
      <span class="gp-card__icon" aria-hidden="true">${g.icon}</span>
      <span class="gp-card__title">${escapeHtml(g.name)}</span>
      <span class="gp-card__sub">${escapeHtml(g.sub)}</span>
    </a>`).join('');
  showScreen('fun');
}

export async function renderFun(game, step) {
  if (!game) { renderFunHub(); return; }
  if (game === 'shapes') { await renderShapes(step); return; }
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
    list, index: 0, right: 0, wrong: 0, answered: false,
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
  r.choices = flags.makeChoices(country, state.flags.data);
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
    list, index: 0, right: 0, wrong: 0, answered: false,
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
  const choices = r.pick === 'choice' ? shapes.makeChoices(country, state.shapes.data) : [];
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
  say.className = `gp-flagq__say ${right ? 'is-right' : 'is-wrong'}`;
  /* Naming another real country is a different kind of wrong from a typo, and
     saying which one turns a miss into something learned. */
  say.textContent = right
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
  const right = shapes.matchesCountry(said, country);
  const named = right ? null : shapes.whichCountry(said, state.shapes.data);
  settleShape(right, named ? { namedCountry: named.name } : null);
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
