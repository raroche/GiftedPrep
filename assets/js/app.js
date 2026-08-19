/**
 * app.js — GiftedPrep controller.
 *
 * Holds the app state, owns the hash router, and wires the DOM in index.html to
 * the modules in ./modules. No framework: the whole app is five screens and one
 * question card, and a router plus template strings is genuinely less code than
 * any library would be, with nothing to install and nothing to go stale.
 */

import * as data from './modules/data.js';
import * as storage from './modules/storage.js';
import * as speech from './modules/speech.js';
import { QuizSession, encouragement } from './modules/quiz.js';
import { renderFigure, describeFigure } from './modules/figures.js';
import { icon } from './modules/icons.js';
import { ring, bars, escapeHtml } from './modules/charts.js';
import { renderParentGuide } from './modules/parents.js';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const state = {
  settings: storage.getSettings(),
  manifest: null,
  session: null,
  /** what the current session was built from, so "another set" can repeat it */
  lastRun: null,
  answered: false,
  audioUnlocked: false
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ------------------------------------------------------------------ */
/* Icons: index.html marks slots with data-icon, filled in once here    */
/* ------------------------------------------------------------------ */

function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    if (el.dataset.iconDone === '1') return;
    el.innerHTML = icon(el.dataset.icon);
    el.dataset.iconDone = '1';
  });
}

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

function applyTheme() {
  const t = state.settings.theme;
  document.documentElement.setAttribute('data-theme', t === 'auto' ? 'auto' : t);
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  const dark = t === 'dark'
    || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const btn = $('#gp-theme-toggle');
  if (btn) {
    btn.innerHTML = icon(dark ? 'sun' : 'moon');
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

function toggleTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
    || (!document.documentElement.getAttribute('data-theme')
        && window.matchMedia('(prefers-color-scheme: dark)').matches);
  state.settings.theme = dark ? 'light' : 'dark';
  storage.setSetting('theme', state.settings.theme);
  applyTheme();
}

/* ------------------------------------------------------------------ */
/* Read aloud                                                          */
/* ------------------------------------------------------------------ */

function applySpeechButton() {
  const btn = $('#gp-speak-toggle');
  if (!btn) return;
  if (!speech.isSupported()) { btn.hidden = true; return; }
  const on = state.settings.readAloud;
  btn.innerHTML = icon(on ? 'speaker' : 'speakerOff');
  btn.setAttribute('aria-pressed', String(on));
  btn.setAttribute('aria-label', on ? 'Turn read aloud off' : 'Turn read aloud on');
  btn.classList.toggle('is-active', on);
  speech.setEnabled(on);
}

/** Speak the current question: the stem, then a description of any picture. */
function speakQuestion() {
  const q = state.session && state.session.current;
  if (!q) return;
  const parts = [q.promptSpeech || q.prompt];
  if (q.figure) parts.push(describeFigure(q.figure));
  speech.speak(parts);
}

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */

const SCREENS = ['home', 'tests', 'categories', 'quiz', 'results', 'parents', 'error'];

function showScreen(name) {
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

function showError(message) {
  $('#gp-error-message').textContent = message;
  showScreen('error');
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

const GRADE_NOTES = {
  1: 'Grade 1 questions are all pictures and shapes, with nothing to read. That matches the real tests, where a teacher reads every question aloud.',
  2: 'Grade 2 is still pictures and shapes with nothing to read, but with more going on in each puzzle.',
  3: 'Grade 3 is where the real tests change. Words and numbers replace pictures, there are five answers instead of four, and the clock starts.',
  4: 'Grade 4 keeps words and numbers, with more rules running at once in each puzzle.'
};

function renderGradePicker() {
  const box = $('#gp-grade-picker');
  box.innerHTML = state.manifest.grades.map((g) => `
    <button type="button" class="gp-pill${g.n === state.settings.grade ? ' is-selected' : ''}"
            role="radio" aria-checked="${g.n === state.settings.grade}" data-grade="${g.n}">
      ${g.label}
    </button>`).join('');
  $('#gp-grade-note').textContent = GRADE_NOTES[state.settings.grade] || '';
}

function renderHomeStats() {
  const totals = storage.getTotals();
  const card = $('#gp-home-stats');
  if (!totals.answered) { card.hidden = true; return; }
  card.hidden = false;
  const stats = storage.getStats();
  const rows = state.manifest.categories
    .filter((c) => stats[c.id])
    .map((c) => ({ name: c.name, correct: stats[c.id].correct, seen: stats[c.id].seen }))
    .sort((a, b) => b.seen - a.seen)
    .slice(0, 6);
  $('#gp-home-stats-body').innerHTML =
    `<p class="gp-muted">${totals.answered} puzzles answered, ${totals.correct} right, across ${totals.sessions} session${totals.sessions === 1 ? '' : 's'}.</p>`
    + `<div class="gp-bars" style="margin-top:var(--gp-space-4)">${bars(rows)}</div>`;
}

/* ------------------------------------------------------------------ */
/* Test and category pickers                                           */
/* ------------------------------------------------------------------ */

function renderTests() {
  const counts = {};
  state.manifest.categories.forEach((c) => {
    if (c.grades.includes(state.settings.grade)) counts[c.test] = (counts[c.test] || 0) + 1;
  });

  const cards = state.manifest.tests.map((t) => `
    <a class="gp-card gp-card--test" href="#/categories/${t.id}">
      <span class="gp-card__icon">${icon(t.icon, { size: 34 })}</span>
      <span class="gp-card__title">${escapeHtml(t.name)}</span>
      <span class="gp-card__sub">${escapeHtml(t.blurb)}</span>
      <span class="gp-card__badge">${counts[t.id] || 0} puzzle types</span>
    </a>`).join('');

  $('#gp-test-grid').innerHTML = cards + `
    <button type="button" class="gp-card gp-card--test" data-action="quick-start">
      <span class="gp-card__icon">${icon('shuffle', { size: 34 })}</span>
      <span class="gp-card__title">Mix it up</span>
      <span class="gp-card__sub">A set drawn from all three tests. The best choice if you do not know which one your district uses.</span>
      <span class="gp-card__badge">12 puzzles</span>
    </button>`;
}

/** One tappable category card. */
function categoryCard(c, stats) {
  const s = stats[c.id];
  const n = (c.counts && c.counts[String(state.settings.grade)]) || 0;
  const badge = s && s.seen
    ? `<span class="gp-card__badge">${s.correct} of ${s.seen} right &middot; ${n} puzzles</span>`
    : `<span class="gp-card__badge">${n} puzzles</span>`;
  return `
    <button type="button" class="gp-card gp-card--category" data-category="${c.id}">
      <span class="gp-card__icon">${icon(c.icon, { size: 26 })}</span>
      <span class="gp-card__title">${escapeHtml(c.name)}</span>
      <span class="gp-card__sub">${escapeHtml(c.blurb || '')}</span>
      ${badge}
    </button>`;
}

/**
 * The category picker. `testId` may be a test id, or 'all' to browse every
 * puzzle type across all three tests in one place.
 *
 * Note the container is a plain stack, not a grid. Each group inside it gets
 * its own grid. Making the outer element a grid too puts the group headings
 * into the same columns as the cards, which is exactly the bug this replaced.
 */
function renderCategories(testId) {
  const all = testId === 'all';
  const test = all ? null : state.manifest.tests.find((t) => t.id === testId);
  if (!all && !test) { showError('That test does not exist.'); return; }

  const grade = state.settings.grade;
  const cats = state.manifest.categories
    .filter((c) => (all || c.test === testId) && c.grades.includes(grade));

  $('#screen-categories').dataset.test = all ? '' : testId;
  $('#categories-title').textContent = all
    ? 'Pick a puzzle type'
    : `${test.name}: pick a puzzle type`;
  $('#gp-category-lede').textContent = all
    ? 'Every puzzle type in the app, grouped by test. Tap one to practise only that kind.'
    : test.detail;

  const totalQ = cats.reduce((n, c) => n + ((c.counts && c.counts[String(grade)]) || 0), 0);
  $('#gp-category-count').textContent =
    `${cats.length} puzzle types · ${totalQ} puzzles for grade ${grade}`;

  const startAll = $('[data-action="start-all"]');
  if (startAll) {
    startAll.querySelector('.gp-btn__label').textContent =
      all ? 'Practise a mix of everything' : `Practise all ${test.name} types`;
  }

  const stats = storage.getStats();

  /* Group by test when browsing everything, otherwise by battery. */
  const groups = new Map();
  cats.forEach((c) => {
    const key = all ? c.test : (c.battery || 'other');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  });

  const box = $('#gp-category-grid');
  box.className = 'gp-catgroups';
  box.innerHTML = Array.from(groups.entries()).map(([key, list]) => {
    let name = key;
    let blurb = '';
    if (all) {
      const t = state.manifest.tests.find((x) => x.id === key);
      if (t) { name = t.name; blurb = t.blurb; }
    } else {
      const bat = (test.batteries || []).find((b) => b.id === key);
      if (bat) { name = bat.name; blurb = bat.blurb; }
    }
    const head = `<h2 class="gp-battery-head">${escapeHtml(name)}`
      + (blurb ? `<span class="gp-muted"> &mdash; ${escapeHtml(blurb)}</span>` : '')
      + `</h2>`;
    return `<section>${head}<div class="gp-grid gp-grid--categories">`
      + list.map((c) => categoryCard(c, stats)).join('')
      + `</div></section>`;
  }).join('');
}

/* ------------------------------------------------------------------ */
/* Building a session                                                  */
/* ------------------------------------------------------------------ */

async function startSession({ testId = null, categoryId = null, limit = 12, label = '' }) {
  try {
    const wantTest = testId && testId !== 'all' ? testId : null;
    const ids = categoryId
      ? [categoryId]
      : state.manifest.categories
          .filter((c) => (!wantTest || c.test === wantTest) && c.grades.includes(state.settings.grade))
          .map((c) => c.id);

    if (!ids.length) { showError('There are no puzzles for that grade yet.'); return; }

    const cats = await data.loadCategories(ids);
    const pool = data.selectQuestions(cats, { grade: state.settings.grade });
    if (!pool.length) { showError('There are no puzzles for that grade yet.'); return; }

    state.session = new QuizSession(pool, {
      limit: Math.min(limit, pool.length),
      seenIds: storage.getSeenQuestionIds(),
      mode: categoryId ? 'category' : 'mixed'
    });
    state.lastRun = { testId, categoryId, limit, label };
    state.answered = false;
    storage.markSessionStarted();
    storage.setSetting('lastTest', testId);
    storage.setSetting('lastCategory', categoryId);

    location.hash = '#/quiz';
    renderQuestion();
  } catch (err) {
    console.error(err);
    showError('The puzzles could not be loaded. If you opened this file directly, try serving the folder over http instead.');
  }
}

/* ------------------------------------------------------------------ */
/* The question screen                                                 */
/* ------------------------------------------------------------------ */

function choiceLayoutClass(q) {
  const anyFigure = q.choices.some((c) => c.figure);
  if (!anyFigure) return 'gp-choices--text';
  return q.choices.length >= 5 ? 'gp-choices--3col' : 'gp-choices--2col';
}

function renderQuestion() {
  const s = state.session;
  const q = s && s.current;
  if (!q) { renderResults(); return; }

  state.answered = false;
  speech.cancel();

  const pct = Math.round((s.answers.length / s.total) * 100);
  $('#gp-progress-fill').style.width = `${pct}%`;
  $('#gp-progress-bar').setAttribute('aria-valuenow', String(pct));
  $('#gp-progress-label').textContent = `Question ${s.index + 1} of ${s.total}`;
  $('#gp-score-text').textContent = `${s.correctCount} / ${s.answers.length}`;
  $('#gp-streak-text').textContent = String(s.streak);
  $('#gp-streak-chip').hidden = s.streak < 2;

  $('#gp-question-meta').textContent =
    `${q.categoryName} · Grade ${q.grade} · Level ${q.difficulty} of 5`;
  $('#gp-question-stem').textContent = q.prompt;
  $('#gp-question-figure').innerHTML = q.figure ? renderFigure(q.figure) : '';

  const letters = 'ABCDEF';
  $('#gp-choices').className = `gp-choices ${choiceLayoutClass(q)}`;
  $('#gp-choices').innerHTML = q.choices.map((c, i) => {
    const body = c.figure
      ? renderFigure(c.figure)
      : `<span>${escapeHtml(c.text)}</span>`;
    const label = c.label || c.text || `answer ${letters[i]}`;
    return `
      <button type="button" class="gp-choice" data-choice="${c.id}"
              aria-label="Answer ${letters[i]}: ${escapeHtml(label)}">
        <span class="gp-choice__badge" aria-hidden="true">${letters[i]}</span>
        <span class="gp-choice__body">${body}</span>
        <span class="gp-choice__mark" aria-hidden="true"></span>
      </button>`;
  }).join('');

  $('#gp-feedback').hidden = true;
  $('#gp-replay').hidden = !speech.isSupported();

  if (state.settings.readAloud) speakQuestion();
}

function handleAnswer(choiceId) {
  if (state.answered) return;
  const s = state.session;
  const q = s.current;
  const result = s.answer(choiceId);
  state.answered = true;

  storage.recordAnswer(q.categoryId, result.correct, q.id, result.streak);

  $$('.gp-choice').forEach((btn) => {
    const id = btn.dataset.choice;
    btn.classList.add('is-disabled');
    btn.setAttribute('aria-disabled', 'true');
    const mark = btn.querySelector('.gp-choice__mark');
    if (id === choiceId && result.correct) {
      btn.classList.add('is-correct');
      mark.innerHTML = icon('check', { size: 20 });
    } else if (id === choiceId) {
      btn.classList.add('is-incorrect');
      mark.innerHTML = icon('cross', { size: 20 });
    } else if (id === result.correctChoiceId) {
      btn.classList.add('is-revealed');
      mark.innerHTML = icon('check', { size: 20 });
    }
  });

  const fb = $('#gp-feedback');
  fb.className = `gp-feedback ${result.correct ? 'is-positive' : 'is-retry'}`;
  fb.hidden = false;
  $('#gp-feedback-icon').innerHTML = icon(result.correct ? 'check' : 'sparkle', { size: 22 });
  $('#gp-feedback-title').textContent = result.correct
    ? (result.streak >= 3 ? `That is ${result.streak} in a row!` : 'That is right!')
    : 'Not that one. Here is why.';
  $('#gp-feedback-body').textContent = result.explanation;

  const strat = $('#gp-feedback-strategy');
  if (result.strategy) {
    strat.hidden = false;
    strat.textContent = `Tip: ${result.strategy}`;
  } else {
    strat.hidden = true;
  }

  const isLast = s.answers.length >= s.total;
  $('#gp-next').querySelector('.gp-btn__label').textContent = isLast ? 'See how you did' : 'Next puzzle';

  $('#gp-score-text').textContent = `${s.correctCount} / ${s.answers.length}`;
  $('#gp-streak-text').textContent = String(s.streak);
  $('#gp-streak-chip').hidden = s.streak < 2;
  $('#gp-progress-fill').style.width = `${Math.round((s.answers.length / s.total) * 100)}%`;

  if (state.settings.readAloud) {
    speech.speak([
      result.correct ? 'That is right.' : 'Not that one.',
      result.explanation
    ]);
  }

  $('#gp-next').focus({ preventScroll: true });
  fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function nextQuestion() {
  speech.cancel();
  const s = state.session;
  if (s.answers.length >= s.total) { location.hash = '#/results'; renderResults(); return; }
  s.next();
  renderQuestion();
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

function renderResults() {
  const s = state.session;
  if (!s) { location.hash = '#/home'; return; }
  const sum = s.summary();

  $('#results-title').textContent = sum.percent >= 70 ? 'Nice work!' : 'All done!';
  $('#gp-results-message').textContent = encouragement(sum.percent);
  $('#gp-results-ring').innerHTML = ring({ correct: sum.correct, total: sum.total });
  $('#gp-results-bars').innerHTML = bars(sum.categories.map((c) => ({
    name: c.name, correct: c.correct, seen: c.seen
  })));

  const missed = s.questions.filter((q) => sum.missed.includes(q.id));
  const card = $('#gp-review-card');
  if (!missed.length) { card.hidden = true; return; }
  card.hidden = false;
  $('#gp-review-list').innerHTML = missed.map((q) => `
    <details class="gp-accordion">
      <summary class="gp-accordion__trigger">${escapeHtml(q.prompt)}</summary>
      <div class="gp-accordion__panel">
        ${q.figure ? `<div class="gp-question__figure">${renderFigure(q.figure)}</div>` : ''}
        <p>${escapeHtml(q.explanation)}</p>
        ${q.strategy ? `<p class="gp-muted"><strong>Tip:</strong> ${escapeHtml(q.strategy)}</p>` : ''}
      </div>
    </details>`).join('');
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

function route() {
  const hash = location.hash || '#/home';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const head = parts[0] || 'home';

  switch (head) {
    case 'home':
      renderGradePicker();
      renderHomeStats();
      showScreen('home');
      break;
    case 'tests':
      renderTests();
      showScreen('tests');
      break;
    case 'categories':
      if (!parts[1]) { location.hash = '#/tests'; return; }
      renderCategories(parts[1]);
      showScreen('categories');
      break;
    case 'quiz':
      if (!state.session) { location.hash = '#/home'; return; }
      showScreen('quiz');
      break;
    case 'results':
      if (!state.session) { location.hash = '#/home'; return; }
      renderResults();
      showScreen('results');
      break;
    case 'parents':
      if (!$('#gp-parents-body').dataset.rendered) {
        $('#gp-parents-body').innerHTML = renderParentGuide(state.manifest);
        $('#gp-parents-body').dataset.rendered = '1';
      }
      showScreen('parents');
      break;
    default:
      location.hash = '#/home';
  }
}

function goBack() {
  const hash = location.hash || '#/home';
  if (hash === '#/categories/all') location.hash = '#/home';
  else if (hash.startsWith('#/categories')) location.hash = '#/tests';
  else if (hash.startsWith('#/quiz')) {
    if (state.session && state.session.answers.length && !confirmLeave()) return;
    speech.cancel();
    location.hash = state.lastRun && state.lastRun.testId
      ? `#/categories/${state.lastRun.testId}` : '#/home';
  } else location.hash = '#/home';
}

function confirmLeave() {
  return window.confirm('Leave this set? Your answers so far are already saved.');
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

function onClick(ev) {
  /* iOS refuses to speak until synthesis is triggered inside a real gesture. */
  if (!state.audioUnlocked) { speech.unlock(); state.audioUnlocked = true; }

  const grade = ev.target.closest('[data-grade]');
  if (grade) {
    state.settings.grade = Number(grade.dataset.grade);
    storage.setSetting('grade', state.settings.grade);
    renderGradePicker();
    return;
  }

  const choice = ev.target.closest('.gp-choice');
  if (choice && !state.answered) { handleAnswer(choice.dataset.choice); return; }

  const cat = ev.target.closest('[data-category]');
  if (cat) {
    startSession({ categoryId: cat.dataset.category, limit: 10 });
    return;
  }

  const action = ev.target.closest('[data-action]');
  if (!action) return;
  switch (action.dataset.action) {
    case 'quick-start':
      startSession({ limit: 12 });
      break;
    case 'start-all': {
      const testId = $('#screen-categories').dataset.test || null;
      startSession({ testId, limit: 12 });
      break;
    }
    case 'again':
      startSession(state.lastRun || { limit: 12 });
      break;
    case 'reset-progress':
      if (window.confirm('Clear all practice history? Your grade and colour settings are kept.')) {
        storage.resetProgress();
        renderHomeStats();
      }
      break;
    default:
      break;
  }
}

function onKeydown(ev) {
  if (!document.getElementById('screen-quiz').classList.contains('is-active')) return;
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

  if (!state.answered && /^[1-6]$/.test(ev.key)) {
    const btn = $$('.gp-choice')[Number(ev.key) - 1];
    if (btn) { ev.preventDefault(); btn.click(); }
    return;
  }
  if (state.answered && (ev.key === 'Enter' || ev.key === ' ')) {
    ev.preventDefault();
    nextQuestion();
  }
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  hydrateIcons();
  applyTheme();
  applySpeechButton();

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('hashchange', route);

  $('#gp-back').addEventListener('click', goBack);
  $('#gp-next').addEventListener('click', nextQuestion);
  $('#gp-replay').addEventListener('click', () => speech.speak(
    [state.session?.current?.promptSpeech || state.session?.current?.prompt,
     state.session?.current?.figure ? describeFigure(state.session.current.figure) : ''],
    { force: true }
  ));
  $('#gp-theme-toggle').addEventListener('click', toggleTheme);
  $('#gp-speak-toggle').addEventListener('click', () => {
    state.settings.readAloud = !state.settings.readAloud;
    storage.setSetting('readAloud', state.settings.readAloud);
    applySpeechButton();
    if (!state.settings.readAloud) speech.cancel();
  });

  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => { if (state.settings.theme === 'auto') applyTheme(); });

  try {
    state.manifest = await data.loadManifest();
  } catch (err) {
    console.error(err);
    showError('The question list could not be loaded. If you opened index.html directly from the file system, run a small web server in this folder instead — for example: python3 -m http.server');
    return;
  }

  route();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
