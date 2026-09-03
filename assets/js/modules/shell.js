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
import { setMood } from './mascot.js';
import { applyStyles } from './style.js';
import { backTarget } from './routes.js';

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
    setup: { count: 10, mode: 'random', continents: [], scope: 'countries' },
    round: null
  },
  /* Browsing mode, shared by the flag, outline and capital games. */
  learn: { game: null, order: 'alpha', index: 0, list: null },
  /* Name the element. `set` is which elements, `ask` is which of the four
     kinds of question. */
  elements: {
    data: null,
    setup: { set: 'everyday', ask: 'use', count: 10 },
    round: null
  },
  /* The capital game. Same shape as the others; `pick` is four choices or typed. */
  /* Guess the angle. `ask` is which of the six kinds of question, `set` is how
     close the wrong answers sit. */
  angles: {
    setup: { ask: 'mix', set: 'steps', count: 10 },
    round: null,
    /* The workshop's three demonstrations remember where the child left them,
       so scrolling away and back does not reset the lesson. */
    demo: { deg: 45, swap: false, hour: 4 }
  },

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
  /* Chess Club. `board` and `game` are the live board and the rules object
     for whatever screen is showing; both are torn down on the way out, since
     a board left behind keeps its pointer listeners. */
  chess: { board: null, game: null, level: null, lesson: null, run: null },
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

/**
 * Nudge the mascot in the top bar.
 *
 * It lives here rather than in each screen because the top bar is chrome: a
 * screen should be able to say "that was right" without knowing where the
 * mascot is or whether there is one. If the top bar ever loses it, this
 * quietly does nothing.
 */
export const react = (mood, ms = 1800) => setMood($('.gp-brand__mark'), mood, ms);

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
  'capsetup', 'capgame', 'elemsetup', 'elemgame', 'angsetup', 'anggame',
  'learn', 'elemlearn', 'anglearn', 'chess', 'error'];

/**
 * Show one screen and hide the rest.
 *
 * A name that is not in SCREENS used to hide everything and show nothing: the
 * loop turned each screen off and never found one to turn on. That shipped the
 * capital game as a blank page — the markup was in the DOM and the round had
 * been built, so nothing threw and nothing logged. It only looked broken to a
 * person. Now it says so.
 */
/**
 * The one back control, drawn into whichever screen is showing.
 *
 * It says where it goes rather than being a bare arrow, and it sits in the page
 * above the title instead of in the top bar, where it was a mystery arrow
 * beside the logo.
 */
function paintBack() {
  $$('.gp-backslot').forEach((slot) => { slot.innerHTML = ''; });
  const target = backTarget();
  if (!target) return;
  const slot = document.querySelector('.gp-screen.is-active .gp-backslot');
  if (!slot) return;
  slot.innerHTML = target.href
    ? `<a class="gp-btn gp-btn--ghost gp-backlink" href="${target.href}">`
      + `&larr; ${target.label}</a>`
    : '<button type="button" class="gp-btn gp-btn--ghost gp-backlink"'
      + ` data-action="${target.action}">&larr; ${target.label}</button>`;
}

export function showScreen(name) {
  if (!SCREENS.includes(name)) {
    throw new Error(`showScreen("${name}"): not in SCREENS, so every screen `
      + `would be hidden. Add it to modules/shell.js.`);
  }
  SCREENS.forEach((s) => {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.classList.toggle('is-active', s === name);
  });
  /* The back control lives in the page now, not the top bar, and is drawn
     here rather than in the router. The router calls route() before the screen
     it is building becomes active, so painting there filled the slot of the
     screen the child was leaving — which is to say, nothing appeared. */
  paintBack();
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
