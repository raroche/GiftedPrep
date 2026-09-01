/**
 * shell.js — the things every screen needs.
 *
 * Shared application state and the handful of DOM helpers that go with it.
 * Screens import from here; nothing here imports a screen, which is what keeps
 * the graph acyclic now that app.js is no longer one file.
 */

import * as data from './data.js';
import * as storage from './storage.js';
import { icon } from './icons.js';
import { applyStyles } from './style.js';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export const state = {
  settings: storage.getSettings(),
  manifest: null,
  session: null,
  /** what the current session was built from, so "another set" can repeat it */
  lastRun: null,
  missingTypes: [],
  answered: false,
  audioUnlocked: false,
  /** Math Lab: the topic being worked through and where we are in it. */
  /* The flag game. `setup` is what the child picked, `round` is the run. */
  flags: {
    data: null,
    setup: { count: 10, mode: 'random', continents: [] },
    round: null
  },
  /* The capital game. Same shape as the others; `pick` is four choices or typed. */
  capitals: {
    data: null,
    setup: { count: 10, mode: 'random', continents: [], pick: 'choice' },
    round: null
  },
  /* The shape game. `pick` is the answering modality: four choices, or typed. */
  shapes: {
    data: null,
    setup: { count: 10, mode: 'random', continents: [], pick: 'choice' },
    round: null
  },
  math: { data: null, topic: null, index: 0, done: {}, collected: new Set(), built: new Set(), painted: {}, settled: false, hanoi: null, builtTotal: 0, crossed: new Set(), shift: 0, nim: null, doors: null }
};

/* Runtime styles cannot ride in a style attribute: the site's CSP drops those.
   See modules/style.js. Call this after inserting any generated markup. */
export const paint = () => applyStyles(document.body);

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ------------------------------------------------------------------ */
/* Icons: index.html marks slots with data-icon, filled in once here    */
/* ------------------------------------------------------------------ */

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    if (el.dataset.iconDone === '1') return;
    el.innerHTML = icon(el.dataset.icon);
    el.dataset.iconDone = '1';
  });
}

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */

const SCREENS = ['home', 'gifted', 'tests', 'categories', 'quiz', 'results', 'parents',
  'math', 'mathtopic', 'fun', 'flagsetup', 'flaggame', 'shapesetup', 'shapegame',
  'capsetup', 'capgame', 'error'];

/**
 * Show one screen and hide the rest.
 *
 * A name that is not in SCREENS used to hide everything and show nothing: the
 * loop turned each screen off and never found one to turn on. That shipped the
 * capital game as a blank page — the markup was in the DOM and the round had
 * been built, so nothing threw and nothing logged. It only looked broken to a
 * person. Now it says so.
 */
export function showScreen(name) {
  if (!SCREENS.includes(name)) {
    throw new Error(`showScreen("${name}"): not in SCREENS, so every screen `
      + `would be hidden. Add it to modules/shell.js.`);
  }
  SCREENS.forEach((s) => {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.classList.toggle('is-active', s === name);
  });
  $('#gp-back').hidden = (name === 'home');
  const inQuiz = name === 'quiz';
  $('#gp-score-chip').hidden = !inQuiz;
  $('#gp-streak-chip').hidden = !inQuiz;
  window.scrollTo({ top: 0, behavior: 'auto' });
  /* Move focus to the new screen's heading so a keyboard or screen-reader
     user is not left behind at the top bar. */
  const heading = document.querySelector(`#screen-${name} h1`);
  if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
}

export function showError(message) {
  $('#gp-error-message').textContent = message;
  showScreen('error');
}
