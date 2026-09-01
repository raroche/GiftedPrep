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
import { QuizSession, encouragement, relabel } from './modules/quiz.js';
import { renderFigure, describeFigure } from './modules/figures.js';
import { icon } from './modules/icons.js';
import { ring, bars, escapeHtml } from './modules/charts.js';
import { renderParentGuide } from './modules/parents.js';
import * as mathlab from './modules/mathlab.js';
import { applyStyles } from './modules/style.js';
import * as flags from './modules/flags.js';
import * as shapes from './modules/shapes.js';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const state = {
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
const paint = () => applyStyles(document.body);

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

const SCREENS = ['home', 'tests', 'categories', 'quiz', 'results', 'parents', 'math', 'mathtopic',
  'fun', 'flagsetup', 'flaggame', 'shapesetup', 'shapegame', 'error'];

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
            role="radio" aria-checked="${g.n === state.settings.grade}" data-grade="${g.n}"
            tabindex="${g.n === state.settings.grade ? 0 : -1}">
      ${g.label}
    </button>`).join('');
  $('#gp-grade-note').textContent = GRADE_NOTES[state.settings.grade] || '';
}

/* Set lengths a child can sit through. 10 is about five minutes at this age;
   30 is close to a real screening section and is there for grades 3-4. */
const QUESTION_COUNTS = [10, 15, 20, 30];

const COUNT_NOTES = {
  10: 'A short set, about five minutes. Good for a first try or a school night.',
  15: 'A little longer. Still short enough to finish in one sitting.',
  20: 'A solid practice set. Take a break afterwards.',
  30: 'The longest set, close to the length of a real test section.'
};

function questionCount() {
  const n = Number(state.settings.questionCount);
  return QUESTION_COUNTS.includes(n) ? n : 10;
}

function renderCountPicker() {
  const chosen = questionCount();
  $('#gp-count-picker').innerHTML = QUESTION_COUNTS.map((n) => `
    <button type="button" class="gp-pill${n === chosen ? ' is-selected' : ''}"
            role="radio" aria-checked="${n === chosen}" data-count="${n}"
            tabindex="${n === chosen ? 0 : -1}"
            aria-label="${n} questions">
      ${n}
    </button>`).join('');
  $('#gp-count-note').textContent = COUNT_NOTES[chosen] || '';
  const sub = $('#gp-quick-sub');
  if (sub) sub.textContent = `${chosen} mixed puzzles from all three tests. Best place to start.`;
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
    + `<div class="gp-bars" data-style="margin-top:var(--gp-space-4)">${bars(rows)}</div>`;
    paint();
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

async function startSession({ testId = null, categoryId = null, limit = 10, label = '' }) {
  try {
    const wantTest = testId && testId !== 'all' ? testId : null;
    const ids = categoryId
      ? [categoryId]
      : state.manifest.categories
          .filter((c) => (!wantTest || c.test === wantTest) && c.grades.includes(state.settings.grade))
          .map((c) => c.id);

    if (!ids.length) { showError('There are no puzzles for that grade yet.'); return; }

    const cats = await data.loadCategories(ids);
    const failed = cats.failed || [];

    /* Asking for one puzzle type and not getting it is a plain error: there is
       nothing to fall back to. */
    if (categoryId && failed.length) {
      showError('That puzzle type could not be loaded. Please try again, or pick a different one.');
      return;
    }

    const pool = data.selectQuestions(cats, { grade: state.settings.grade });
    if (!pool.length) { showError('There are no puzzles for that grade yet.'); return; }

    state.session = new QuizSession(pool, {
      limit: Math.min(limit, pool.length),
      seenIds: storage.getSeenQuestionIds(),
      mode: categoryId ? 'category' : 'mixed'
    });
    state.lastRun = { testId, categoryId, limit, label };
    state.missingTypes = failed;
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
  paint();

  $('#gp-feedback').hidden = true;
  $('#gp-replay').hidden = !speech.isSupported();
  showMissingTypes();

  /* Stepping back onto a question already answered restores what happened:
     the same tiles marked, the same explanation. It never re-scores. */
  const recorded = s.answerFor(q.id);
  if (recorded) {
    state.answered = true;
    showResult(q, recorded.choiceId, recorded.correct, { speak: false, review: true });
  } else if (state.settings.readAloud) {
    speakQuestion();
  }

  updateNav();
}

/** Enable or disable the review arrows and label the Next button. */
function updateNav() {
  const s = state.session;
  if (!s) return;
  const prev = $('#gp-prev');
  const fwd = $('#gp-fwd');
  prev.disabled = !s.canGoBack;
  fwd.disabled = !s.canGoForward;
  prev.setAttribute('aria-disabled', String(prev.disabled));
  fwd.setAttribute('aria-disabled', String(fwd.disabled));

  const label = $('#gp-next').querySelector('.gp-btn__label');
  if (s.canGoForward) label.textContent = 'Next puzzle';
  else if (s.answers.length >= s.total) label.textContent = 'See how you did';
  else label.textContent = 'Next puzzle';
}

function handleAnswer(choiceId) {
  if (state.answered) return;
  const s = state.session;
  const q = s.current;
  const result = s.answer(choiceId);
  state.answered = true;

  storage.recordAnswer(q.categoryId, result.correct, q.id, result.streak);
  showResult(q, choiceId, result.correct, { speak: state.settings.readAloud, review: false });
  updateNav();
}

/**
 * Paint the outcome of a question: mark the tiles, show the explanation.
 * Used both when the child answers and when they step back to look again, so
 * a revisited question looks exactly as it did the first time.
 */
function showResult(q, choiceId, correct, { speak = false, review = false } = {}) {
  const s = state.session;
  const result = {
    correct,
    correctChoiceId: q.answer,
    explanation: relabel(q.explanation || '', q.letterOf),
    strategy: relabel(q.strategy || '', q.letterOf),
    streak: s.streak
  };

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
  if (review) {
    $('#gp-feedback-title').textContent = result.correct
      ? 'You got this one right' : 'You picked this one before';
  } else {
    $('#gp-feedback-title').textContent = result.correct
      ? (result.streak >= 3 ? `That is ${result.streak} in a row!` : 'That is right!')
      : 'Not that one. Here is why.';
  }
  $('#gp-feedback-body').textContent = result.explanation;

  const strat = $('#gp-feedback-strategy');
  if (result.strategy) {
    strat.hidden = false;
    strat.textContent = `Tip: ${result.strategy}`;
  } else {
    strat.hidden = true;
  }

  $('#gp-score-text').textContent = `${s.correctCount} / ${s.answers.length}`;
  $('#gp-streak-text').textContent = String(s.streak);
  $('#gp-streak-chip').hidden = s.streak < 2 || review;
  $('#gp-progress-fill').style.width = `${Math.round((s.answers.length / s.total) * 100)}%`;

  if (speak) {
    speech.speak([result.correct ? 'That is right.' : 'Not that one.', result.explanation]);
  }

  if (!review) {
    $('#gp-next').focus({ preventScroll: true });
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function nextQuestion() {
  speech.cancel();
  const s = state.session;
  /* When looking back over answered puzzles, Next walks forward through them
     rather than skipping to the end of the set. */
  if (s.canGoForward) { s.forward(); renderQuestion(); return; }
  if (s.answers.length >= s.total) { location.hash = '#/results'; renderResults(); return; }
  s.next();
  renderQuestion();
}

function goPrev() {
  if (!state.session || !state.session.canGoBack) return;
  speech.cancel();
  state.session.back();
  renderQuestion();
}

function goForward() {
  if (!state.session || !state.session.canGoForward) return;
  speech.cancel();
  state.session.forward();
  renderQuestion();
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

/**
 * Say so when part of the question bank did not load.
 *
 * A mixed round still runs, because a child mid-click should not be dumped
 * back to the home screen, but the round is shorter than it should be and
 * pretending otherwise would be dishonest to both child and parent.
 */
function showMissingTypes() {
  const box = $('#gp-missing-types');
  if (!box) return;
  const failed = state.missingTypes || [];
  if (!failed.length) { box.hidden = true; return; }
  const names = failed.map((id) => {
    const cat = (state.manifest.categories || []).find((c) => c.id === id);
    return cat ? cat.name : id;
  });
  box.hidden = false;
  box.innerHTML = `<p><strong>Some puzzle types are missing right now.</strong>
    This round is shorter than it should be. Missing: ${escapeHtml(names.join(', '))}.</p>`;
}

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
  paint();

  const missed = s.questions.filter((q) => sum.missed.includes(q.id));
  const card = $('#gp-review-card');
  if (!missed.length) { card.hidden = true; return; }
  card.hidden = false;
  $('#gp-review-list').innerHTML = missed.map((q) => `
    <details class="gp-accordion">
      <summary class="gp-accordion__trigger">${escapeHtml(q.prompt)}</summary>
      <div class="gp-accordion__panel">
        ${q.figure ? `<div class="gp-question__figure">${renderFigure(q.figure)}</div>` : ''}
        <p>${escapeHtml(relabel(q.explanation, q.letterOf))}</p>
        ${q.strategy ? `<p class="gp-muted"><strong>Tip:</strong> ${escapeHtml(relabel(q.strategy, q.letterOf))}</p>` : ''}
      </div>
    </details>`).join('');
}

/* ------------------------------------------------------------------ */
/* Parent guide                                                        */
/* ------------------------------------------------------------------ */

const GUIDE_TITLE = { en: 'For parents', es: 'Para padres' };
/* The button offers the language you are NOT reading, so it shows that flag. */
const LANG_SWITCH = {
  en: { flag: '🇪🇸', label: 'Español', aria: 'Ver esta guía en español', lang: 'es' },
  es: { flag: '🇺🇸', label: 'English', aria: 'Read this guide in English', lang: 'en' }
};

function renderParents() {
  const lang = state.settings.guideLang === 'es' ? 'es' : 'en';
  const body = $('#gp-parents-body');
  if (body.dataset.lang !== lang) {
    body.innerHTML = renderParentGuide(state.manifest, lang);
    body.dataset.lang = lang;
    body.setAttribute('lang', lang);
    paint();
  }
  $('#parents-title').textContent = GUIDE_TITLE[lang];
  document.getElementById('screen-parents').setAttribute('lang', lang);

  const sw = LANG_SWITCH[lang];
  const btn = $('#gp-lang-toggle');
  btn.querySelector('.gp-flag').textContent = sw.flag;
  btn.querySelector('.gp-btn__label').textContent = sw.label;
  btn.setAttribute('aria-label', sw.aria);
  btn.setAttribute('lang', sw.lang);
}

function toggleGuideLanguage() {
  const next = state.settings.guideLang === 'es' ? 'en' : 'es';
  state.settings.guideLang = next;
  storage.setSetting('guideLang', next);
  renderParents();
  $('#parents-title').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ------------------------------------------------------------------ */
/* Math Lab                                                            */
/* ------------------------------------------------------------------ */

const MATH_DONE_KEY = 'mathDone';

function mathDone() {
  const raw = state.settings[MATH_DONE_KEY];
  return raw && typeof raw === 'object' ? raw : {};
}

function markTopicProgress(gradeId, topicId, count) {
  const all = { ...mathDone() };
  const key = `${gradeId}:${topicId}`;
  if ((all[key] || 0) >= count) return;
  all[key] = count;
  state.settings[MATH_DONE_KEY] = all;
  storage.setSetting(MATH_DONE_KEY, all);
}

/** Route target: #/math, #/math/1, #/math/1/<topic> */
async function renderMath(gradeArg, topicArg) {
  if (!gradeArg) {
    $('#math-title').textContent = 'Math Lab';
    $('#screen-math .gp-page-lede').textContent =
      'Advanced maths, one grade at a time. Short lessons, then puzzles.';
    $('#gp-math-body').innerHTML = mathlab.renderGradeIndex();
  paint();
    showScreen('math');
    return;
  }
  const grade = Number(gradeArg);
  if (!mathlab.READY_GRADES.includes(grade)) {
    showError('That grade is not written yet.');
    return;
  }
  let payload;
  try {
    payload = await mathlab.loadGrade(grade);
  } catch (err) {
    console.error(err);
    showError('The maths page could not be loaded.');
    return;
  }
  state.math.data = payload;

  if (!topicArg) {
    const done = {};
    const all = mathDone();
    payload.topics.forEach((t) => { done[t.id] = all[`${grade}:${t.id}`] || 0; });
    $('#gp-math-body').innerHTML = mathlab.renderTopicIndex(payload, done);
    paint();
    $('#math-title').textContent = payload.title;
    $('#screen-math .gp-page-lede').textContent = payload.blurb;
    showScreen('math');
    return;
  }

  const topic = payload.topics.find((t) => t.id === topicArg);
  if (!topic) { showError('That topic does not exist.'); return; }
  state.math.topic = topic;
  state.math.index = 0;
  openTopic(grade, topic);
}

function openTopic(grade, topic) {
  $('#gp-math-crumb').innerHTML =
    `<a href="#/math/${grade}">Grade ${grade} Math Lab</a>`;
  $('#mathtopic-title').textContent = topic.name;
  $('#gp-topic-big').textContent = topic.big;
  $('#gp-topic-teach').innerHTML = mathlab.renderTeach(topic);
  paint();
  showScreen('mathtopic');
  showExercise();
}

function exDots(topic, index) {
  return topic.exercises.map((_, i) => {
    const cls = i === index ? 'is-now' : (i < index ? 'is-done' : '');
    return `<span class="gp-dot ${cls}" aria-hidden="true"></span>`;
  }).join('');
}

function showExercise() {
  const { topic, index } = state.math;
  if (!topic) return;
  state.math.collected = new Set();
  state.math.built = new Set();
  state.math.painted = {};
  state.math.settled = false;
  state.math.hanoi = null;
  state.math.builtTotal = 0;
  state.math.crossed = new Set();
  state.math.shift = 0;
  state.math.nim = null;
  state.math.doors = null;
  const total = topic.exercises.length;

  if (index >= total) {
    $('#gp-exercise').innerHTML = `
      <div class="gp-done">
        <p class="gp-done__mark" aria-hidden="true">🏅</p>
        <h3>Topic finished.</h3>
        <p>You worked through all ${total} puzzles in ${escapeHtml(topic.name)}.</p>
        <a class="gp-btn gp-btn--primary" href="#/math/${state.math.data.grade}">Pick another topic</a>
      </div>`;
    $('#gp-ex-dots').innerHTML = exDots(topic, index);
    $('#gp-ex-next').hidden = true;
    $('#gp-ex-prev').disabled = index === 0;
    return;
  }

  const ex = topic.exercises[index];
  $('#gp-exercise').innerHTML = mathlab.renderExercise(ex, index, total);
  $('#gp-ex-dots').innerHTML = exDots(topic, index);
  $('#gp-ex-next').hidden = false;
  paint();
  $('#gp-ex-next').disabled = false;
  $('#gp-ex-prev').disabled = index === 0;
  if (ex.type === 'hanoi') {
    state.math.hanoi = mathlab.hanoiStart(ex.discs || 3);
    drawHanoi();
  }
  if (ex.type === 'nim') { nimSetup(ex); nimShow('Your go.'); }
  if (ex.type === 'doors') { doorsSetup(ex); doorsShow('Pick a door.'); }

  const input = $('#gp-exercise [data-answer-input]');
  if (input) input.focus({ preventScroll: true });
}

function settleExercise(ok) {
  const { topic, index, data: payload } = state.math;
  const ex = topic.exercises[index];
  const box = $('#gp-exercise [data-feedback]');
  box.hidden = false;
  box.innerHTML = mathlab.feedbackHtml(ok, ex, index);
  state.math.settled = true;
  if (ok) markTopicProgress(payload.grade, topic.id, index + 1);
  $$('#gp-exercise .gp-mchoice').forEach((b) => { b.disabled = true; });
  const check = $('#gp-exercise [data-check]');
  if (check) check.disabled = true;
  const input = $('#gp-exercise [data-answer-input]');
  if (input) input.disabled = true;
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function answerMath(pick) {
  const { topic, index } = state.math;
  const ex = topic.exercises[index];
  if ($('#gp-exercise [data-feedback]') && !$('#gp-exercise [data-feedback]').hidden) return;
  const btn = $(`#gp-exercise [data-pick="${CSS.escape(pick)}"]`);
  const ok = mathlab.check(ex, pick);
  if (btn) btn.classList.add(ok ? 'is-right' : 'is-wrong');
  if (!ok) {
    const right = $(`#gp-exercise [data-pick="${CSS.escape(String(ex.answer))}"]`);
    if (right) right.classList.add('is-right');
  }
  settleExercise(ok);
}

function checkMath() {
  const { topic, index } = state.math;
  const ex = topic.exercises[index];

  if (ex.type === 'build') {
    const got = ex.mode === 'binary' ? (state.math.builtTotal || 0) : state.math.built.size;
    settleExercise(mathlab.check(ex, got));
    return;
  }

  if (ex.type === 'colormap') { checkColourMap(ex); return; }
  if (ex.type === 'sieve') { checkSieveNow(ex); return; }
  if (ex.type === 'magic') { checkMagicNow(ex); return; }

  const input = $('#gp-exercise [data-answer-input]');
  if (!input) return;
  const raw = input.value.trim();
  if (raw === '') { input.focus(); return; }

  if (ex.type === 'collect') {
    const hit = mathlab.collectHit(ex, raw, state.math.collected);
    const list = $('#gp-exercise [data-collect]');
    input.value = '';
    input.focus();
    if (!hit) {
      list.insertAdjacentHTML('beforeend',
        `<li class="gp-collect__item is-wrong">${escapeHtml(raw)} does not work</li>`);
      return;
    }
    if (hit.repeat) {
      list.insertAdjacentHTML('beforeend',
        `<li class="gp-collect__item is-repeat">${escapeHtml(hit.label)} — already had that one</li>`);
      return;
    }
    state.math.collected.add(hit.key);
    list.insertAdjacentHTML('beforeend',
      `<li class="gp-collect__item is-right">${escapeHtml(hit.label)}</li>`);
    $('#gp-exercise [data-collect-count]').textContent = state.math.collected.size;
    if (state.math.collected.size >= ex.need) settleExercise(true);
    return;
  }

  settleExercise(mathlab.check(ex, raw));
}

/* Tapping a country steps it through the four colours and back to blank, so a
   child can undo without needing a separate eraser. */
/* ---- Tower of Hanoi ---- */

const DISC_TONE = ['blue', 'green', 'yellow', 'orange', 'red', 'teal'];

function drawHanoi() {
  const box = $('#gp-exercise [data-hanoi]');
  if (!box || !state.math.hanoi) return;
  const st = state.math.hanoi;
  const n = Number(box.dataset.discs);
  $$('#gp-exercise [data-peg]').forEach((peg) => {
    const i = Number(peg.dataset.peg);
    const stack = st.pegs[i];
    const holder = peg.querySelector('.gp-peg__discs');
    holder.innerHTML = stack.map((d) => {
      const pct = 34 + (d / n) * 62;
      return `<span class="gp-disc" data-tone="${DISC_TONE[(d - 1) % DISC_TONE.length]}"
        data-style="width:${pct.toFixed(0)}%">${d}</span>`;
    }).reverse().join('');
    peg.classList.toggle('is-picked', st.picked === i);
  });
  $('#gp-exercise [data-hanoi-moves]').textContent = st.moves;
  paint();
}

function tapPeg(pegEl) {
  if (state.math.settled) return;
  const box = $('#gp-exercise [data-hanoi]');
  const n = Number(box.dataset.discs);
  const goal = Number(box.dataset.goal);
  const i = Number(pegEl.dataset.peg);
  const st = state.math.hanoi;
  const say = $('#gp-exercise [data-hanoi-say]');

  if (st.picked === null) {
    if (!st.pegs[i].length) { say.textContent = 'That tower is empty. Pick one with a disc.'; return; }
    st.picked = i;
    say.textContent = `Holding disc ${st.pegs[i][st.pegs[i].length - 1]}. Where does it go?`;
    drawHanoi();
    return;
  }
  if (st.picked === i) { st.picked = null; say.textContent = 'Put it back. Pick again.'; drawHanoi(); return; }

  const next = mathlab.hanoiMove(st, st.picked, i);
  if (!next) {
    say.textContent = 'That disc is too big to go on top of that one.';
    st.picked = null;
    drawHanoi();
    return;
  }
  state.math.hanoi = next;
  say.textContent = '';
  drawHanoi();

  if (mathlab.hanoiWon(next, goal, n)) {
    const best = Math.pow(2, n) - 1;
    say.textContent = next.moves === best
      ? `Done in ${next.moves}. That is the fewest possible.`
      : `Done in ${next.moves}. It can be done in ${best}, so there is a shorter way.`;
    settleExercise(true);
  }
}

function runMachine() {
  const ex = state.math.topic.exercises[state.math.index];
  const box = $('#gp-exercise [data-feed]');
  const raw = box.value.trim();
  if (raw === '') { box.focus(); return; }
  const x = Number(raw);
  if (!Number.isFinite(x)) { box.value = ''; return; }
  const y = mathlab.runMachine(ex.rule, x);
  $('#gp-exercise [data-machine-log]').insertAdjacentHTML('afterbegin',
    `<li class="gp-machine__row"><strong>${escapeHtml(String(x))}</strong> goes in,
      <strong>${escapeHtml(String(y))}</strong> comes out</li>`);
  box.value = '';
  box.focus();
}

/* ---- the subtraction game ---- */

function nimSetup(ex) {
  state.math.nim = { left: ex.start, wins: 0, over: false };
}

function nimShow(msg) {
  const n = state.math.nim;
  $('#gp-exercise [data-nim-left]').textContent = n.left;
  $('#gp-exercise [data-nim-wins]').textContent = n.wins;
  if (msg) $('#gp-exercise [data-nim-say]').textContent = msg;
  $$('#gp-exercise [data-take]').forEach((b) => {
    b.disabled = n.over || Number(b.dataset.take) > n.left;
  });
}

function nimTake(k) {
  const ex = state.math.topic.exercises[state.math.index];
  const n = state.math.nim;
  if (!n || n.over || k > n.left) return;
  n.left -= k;
  if (n.left === 0) {
    n.wins += 1;
    if (n.wins >= ex.wins) { nimShow(`You took the last one. That is ${n.wins} in a row.`); settleExercise(true); return; }
    n.left = ex.start;
    nimShow(`You win that one. ${n.wins} of ${ex.wins}. New pile.`);
    return;
  }
  /* The computer plays perfectly, so the only way through is the real rule. */
  const reply = mathlab.nimReply(n.left, ex.max || 3);
  n.left -= reply;
  if (n.left === 0) {
    n.wins = 0;
    n.left = ex.start;
    nimShow(`I took the last ${reply}. I win that one, so the count goes back to nought. Try again.`);
    return;
  }
  nimShow(`I take ${reply}. Your go.`);
}

/* ---- three doors ---- */

function doorsSetup(ex) {
  state.math.doors = { round: 1, stay: 0, switched: 0, prize: null, picked: null, shown: null, phase: 'pick' };
}

function doorsShow(msg) {
  const d = state.math.doors;
  $('#gp-exercise [data-doors-round]').textContent = d.round;
  $('#gp-exercise [data-doors-stay]').textContent = d.stay;
  $('#gp-exercise [data-doors-switch]').textContent = d.switched;
  $('#gp-exercise [data-doors-choice]').hidden = d.phase !== 'choose';
  if (msg) $('#gp-exercise [data-doors-say]').textContent = msg;
}

function pickDoor(i) {
  const d = state.math.doors;
  if (!d || d.phase !== 'pick') return;
  d.prize = Math.floor(Math.random() * 3);
  d.picked = i;
  /* Open a door that is neither the pick nor the prize. */
  d.shown = [0, 1, 2].find((x) => x !== i && x !== d.prize);
  d.phase = 'choose';
  $$('#gp-exercise [data-door]').forEach((b) => {
    const n = Number(b.dataset.door);
    b.classList.toggle('is-picked', n === i);
    b.classList.toggle('is-open', n === d.shown);
  });
  doorsShow(`You picked door ${i + 1}. Door ${d.shown + 1} is empty. Stay or switch?`);
}

function settleDoor(switching) {
  const ex = state.math.topic.exercises[state.math.index];
  const d = state.math.doors;
  if (!d || d.phase !== 'choose') return;
  const final = switching ? [0, 1, 2].find((x) => x !== d.picked && x !== d.shown) : d.picked;
  const won = final === d.prize;
  if (won) { if (switching) d.switched += 1; else d.stay += 1; }
  d.round += 1;
  d.phase = d.round > ex.rounds ? 'done' : 'pick';
  $$('#gp-exercise [data-door]').forEach((b) => b.classList.remove('is-picked', 'is-open'));
  if (d.phase === 'done') {
    doorsShow(`Done. Switching won ${d.switched}, staying won ${d.stay}.`);
    settleExercise(true);
    return;
  }
  doorsShow(`${won ? 'Prize!' : 'Empty.'} It was door ${d.prize + 1}. Pick again.`);
}

function turnDial(step) {
  const ex = state.math.topic.exercises[state.math.index];
  state.math.shift = (state.math.shift + step + 26) % 26;
  $('#gp-exercise [data-cipher-shift]').textContent = state.math.shift;
  $('#gp-exercise [data-cipher-out]').textContent =
    mathlab.shiftLetters(ex.coded, state.math.shift);
}

function crossOut(cell) {
  if (state.math.settled) return;
  const n = cell.dataset.num;
  const off = cell.classList.toggle('is-out');
  if (off) state.math.crossed.add(n); else state.math.crossed.delete(n);
  const left = $('#gp-exercise [data-sieve-left]');
  const box = $('#gp-exercise [data-sieve]');
  if (left && box) left.textContent = Number(box.dataset.upto) - state.math.crossed.size;
  const fb = $('#gp-exercise [data-feedback]');
  if (fb) fb.hidden = true;
}

function say(msg) {
  const box = $('#gp-exercise [data-feedback]');
  box.hidden = false;
  box.innerHTML = `<div class="gp-fb is-wrong">
      <p class="gp-fb__title"><span aria-hidden="true">🔍</span> Not yet.</p>
      <p class="gp-fb__why">${escapeHtml(msg)}</p>
    </div>`;
}

function checkSieveNow(ex) {
  const v = mathlab.checkSieve(ex, state.math.crossed);
  if (v.ok) { settleExercise(true); return; }
  say(v.reason === 'extra'
    ? `${v.n} should have been crossed out. Look at it again.`
    : `You crossed out ${v.n}, but it belongs in the list. Put it back.`);
}

function checkMagicNow(ex) {
  const values = {};
  $$('#gp-exercise [data-cell]').forEach((el) => {
    if (el.value !== '') values[el.dataset.cell] = el.value;
  });
  const v = mathlab.checkMagic(ex, values);
  if (v.ok) { settleExercise(true); return; }
  const msg = {
    blank: 'Some squares are still empty.',
    repeat: 'A number is used more than once. Each one goes in exactly once.',
    outside: `${v.n} is not one of the numbers you may use.`,
    line: `One line adds to ${v.got}, not ${ex.total}. Check every row, column and diagonal.`
  }[v.reason] || 'Not right yet.';
  say(msg);
}

function paintRegion(id) {
  /* A map that is not finished yet says so and stays editable. Only a correct
     map locks, otherwise the child is told what is wrong and then cannot
     touch it, which is worse than saying nothing. */
  if (state.math.settled) return;
  const box = $('#gp-exercise [data-feedback]');
  if (box) box.hidden = true;
  const cycle = [null, ...mathlab.MAP_COLOURS];
  const now = state.math.painted[id] || null;
  const next = cycle[(cycle.indexOf(now) + 1) % cycle.length];
  if (next) state.math.painted[id] = next; else delete state.math.painted[id];
  $$(`#gp-exercise [data-region="${CSS.escape(id)}"]`).forEach((el) => {
    el.dataset.paint = next || '';
  });
  const used = new Set(Object.values(state.math.painted)).size;
  const label = $('#gp-exercise [data-cm-used]');
  if (label) label.textContent = used;
}

function checkColourMap(ex) {
  const verdict = mathlab.checkMap(ex, state.math.painted);
  if (verdict.ok) { settleExercise(true); return; }
  /* Say what is actually wrong. "Wrong" on its own teaches nothing. */
  const box = $('#gp-exercise [data-feedback]');
  const msg = verdict.reason === 'blank'
    ? `${verdict.count} ${verdict.count === 1 ? 'country is' : 'countries are'} still blank. Every one needs a colour.`
    : verdict.reason === 'clash'
      ? 'Two countries that share a border have the same colour. Find them and change one.'
      : `You used ${verdict.used} colours. See if you can do it with ${ex.limit}.`;
  box.hidden = false;
  box.innerHTML = `<div class="gp-fb is-wrong">
      <p class="gp-fb__title"><span aria-hidden="true">🔍</span> Not yet.</p>
      <p class="gp-fb__why">${escapeHtml(msg)}</p>
    </div>`;
}

function toggleBuildCell(cell) {
  const i = cell.dataset.cell;
  const on = cell.classList.toggle('is-on');
  if (on) state.math.built.add(i); else state.math.built.delete(i);
  const count = $('#gp-exercise [data-build-count]');
  if (!count) return;
  /* Doubling chips add up to a number; every other build just counts taps. */
  if (cell.dataset.value != null) {
    let total = 0;
    $$('#gp-exercise .gp-dchip.is-on').forEach((c) => { total += Number(c.dataset.value); });
    count.textContent = total;
    state.math.builtTotal = total;
  } else {
    count.textContent = state.math.built.size;
  }
}

function stepExercise(delta) {
  const { topic } = state.math;
  if (!topic) return;
  const next = state.math.index + delta;
  if (next < 0 || next > topic.exercises.length) return;
  state.math.index = next;
  showExercise();
  $('#gp-turn-head').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/* ------------------------------------------------------------------ */
/* Fun: name the flag                                                  */
/* ------------------------------------------------------------------ */

const FUN_GAMES = [
  { id: 'flags', icon: '🚩', name: 'Name the Flag',
    sub: 'Every flag in the world, and a locked vault of flags that no longer exist.' },
  { id: 'shapes', icon: '🗺️', name: 'Name the Country',
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

async function renderFun(game, step) {
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

function drawFlagSetup() {
  $('#gp-flag-setup').innerHTML = flags.renderSetup(state.flags.data, state.flags.setup);
  paint();
  showScreen('flagsetup');
}

function startFlagRound() {
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

function drawFlagQuestion() {
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

function answerFlag(code) {
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

function answerVault(pick) {
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

function drawShapeSetup() {
  $('#gp-shape-setup').innerHTML = shapes.renderSetup(state.shapes.data, state.shapes.setup);
  paint();
  showScreen('shapesetup');
}

function startShapeRound() {
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

async function drawShapeQuestion() {
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

function answerShapeChoice(code) {
  const r = state.shapes.round;
  if (!r || r.answered) return;
  settleShape(code === r.list[r.index].code, code);
}

function answerShapeTyped() {
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

function answerShapeVault(pick) {
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
/* Router                                                              */
/* ------------------------------------------------------------------ */

function route() {
  const hash = location.hash || '#/home';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const head = parts[0] || 'home';

  switch (head) {
    case 'home':
      renderGradePicker();
      renderCountPicker();
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
    case 'fun':
      renderFun(parts[1], parts[2]);
      break;
    case 'math':
      renderMath(parts[1], parts[2]);
      break;
    case 'parents':
      renderParents();
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

  const count = ev.target.closest('[data-count]');
  if (count) {
    state.settings.questionCount = Number(count.dataset.count);
    storage.setSetting('questionCount', state.settings.questionCount);
    renderCountPicker();
    return;
  }

  if (ev.target.closest('[data-lesson-done]')) {
    const wrap = document.querySelector('.gp-teachwrap');
    if (wrap) wrap.open = false;
    $('#gp-turn-head').scrollIntoView({ block: 'start', behavior: 'smooth' });
    return;
  }

  /* ---- country shape game ---- */
  const sc = ev.target.closest('[data-shapecount]');
  if (sc) { state.shapes.setup.count = sc.dataset.shapecount; drawShapeSetup(); return; }

  const sp = ev.target.closest('[data-shapepick]');
  if (sp) { state.shapes.setup.pick = sp.dataset.shapepick; drawShapeSetup(); return; }

  const sm = ev.target.closest('[data-shapemode]');
  if (sm) {
    state.shapes.setup.mode = sm.dataset.shapemode;
    if (sm.dataset.shapemode !== 'continent') state.shapes.setup.continents = [];
    drawShapeSetup();
    return;
  }

  const sk = ev.target.closest('[data-shapecont]');
  if (sk) {
    const id = sk.dataset.shapecont;
    const on = state.shapes.setup.continents;
    state.shapes.setup.continents = on.includes(id) ? on.filter((x) => x !== id) : on.concat(id);
    drawShapeSetup();
    return;
  }

  const sa = ev.target.closest('[data-shapeanswer]');
  if (sa) { answerShapeChoice(sa.dataset.shapeanswer); return; }

  if (ev.target.closest('[data-shapecheck]')) { answerShapeTyped(); return; }

  const sv = ev.target.closest('[data-shapevault]');
  if (sv) { answerShapeVault(sv.dataset.shapevault); return; }

  /* ---- flag game ---- */
  const fc = ev.target.closest('[data-flagcount]');
  if (fc) { state.flags.setup.count = fc.dataset.flagcount; drawFlagSetup(); return; }

  const fm = ev.target.closest('[data-flagmode]');
  if (fm) {
    state.flags.setup.mode = fm.dataset.flagmode;
    if (fm.dataset.flagmode !== 'continent') state.flags.setup.continents = [];
    drawFlagSetup();
    return;
  }

  const fk = ev.target.closest('[data-flagcont]');
  if (fk) {
    const id = fk.dataset.flagcont;
    const on = state.flags.setup.continents;
    state.flags.setup.continents = on.includes(id) ? on.filter((x) => x !== id) : on.concat(id);
    drawFlagSetup();
    return;
  }

  const flagPick = ev.target.closest('[data-flagpick]');
  if (flagPick) { answerFlag(flagPick.dataset.flagpick); return; }

  const vault = ev.target.closest('[data-vaultpick]');
  if (vault) { answerVault(vault.dataset.vaultpick); return; }

  if (ev.target.closest('[data-run]')) { runMachine(); return; }

  const take = ev.target.closest('[data-take]');
  if (take) { nimTake(Number(take.dataset.take)); return; }

  const door = ev.target.closest('[data-door]');
  if (door) { pickDoor(Number(door.dataset.door)); return; }
  if (ev.target.closest('[data-stay]')) { settleDoor(false); return; }
  if (ev.target.closest('[data-switch]')) { settleDoor(true); return; }

  const dial = ev.target.closest('[data-shift]');
  if (dial) { turnDial(Number(dial.dataset.shift)); return; }

  const scell = ev.target.closest('[data-num]');
  if (scell) { crossOut(scell); return; }

  const peg = ev.target.closest('[data-peg]');
  if (peg) { tapPeg(peg); return; }

  const region = ev.target.closest('[data-region]');
  if (region) { paintRegion(region.dataset.region); return; }

  const cell = ev.target.closest('[data-cell]');
  if (cell) { toggleBuildCell(cell); return; }

  const pick = ev.target.closest('[data-pick]');
  if (pick && !pick.disabled) { answerMath(pick.dataset.pick); return; }

  if (ev.target.closest('#gp-exercise [data-check]')) { checkMath(); return; }

  const choice = ev.target.closest('.gp-choice');
  if (choice && !state.answered) { handleAnswer(choice.dataset.choice); return; }

  const cat = ev.target.closest('[data-category]');
  if (cat) {
    startSession({ categoryId: cat.dataset.category, limit: questionCount() });
    return;
  }

  const action = ev.target.closest('[data-action]');
  if (!action) return;
  switch (action.dataset.action) {
    case 'shape-start':
      startShapeRound();
      break;
    case 'shape-next':
      state.shapes.round.index += 1;
      drawShapeQuestion();
      break;
    case 'shape-again':
      startShapeRound();
      break;
    case 'flag-start':
      startFlagRound();
      break;
    case 'flag-next': {
      const r = state.flags.round;
      r.index += 1;
      drawFlagQuestion();
      break;
    }
    case 'flag-again':
      startFlagRound();
      break;
    case 'quick-start':
      startSession({ limit: questionCount() });
      break;
    case 'start-all': {
      const testId = $('#screen-categories').dataset.test || null;
      startSession({ testId, limit: questionCount() });
      break;
    }
    case 'again':
      startSession({ ...(state.lastRun || {}), limit: questionCount() });
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

/**
 * The ARIA radio group pattern for the grade, question-count and flag-count
 * pickers.
 *
 * These are buttons wearing role="radio". The README promised full keyboard
 * control and they did not have it: every pill was its own tab stop and the
 * arrow keys did nothing at all. A radio group should be a single tab stop
 * that the arrows move through, selecting as they go.
 */
function radioGroupKeys(ev) {
  const el = ev.target;
  if (!el || !el.closest) return false;
  const group = el.closest('[role="radiogroup"]');
  if (!group || el.getAttribute('role') !== 'radio') return false;

  const radios = Array.from(group.querySelectorAll('[role="radio"]'));
  const at = radios.indexOf(el);
  if (at === -1) return false;

  if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); el.click(); return true; }

  let to = -1;
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') to = (at + 1) % radios.length;
  else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') to = (at - 1 + radios.length) % radios.length;
  else if (ev.key === 'Home') to = 0;
  else if (ev.key === 'End') to = radios.length - 1;
  else return false;

  ev.preventDefault();
  const groupId = group.id;
  radios[to].click();
  /* Clicking re-renders the group, so the element to focus is looked up again
     rather than held across the redraw. */
  const after = groupId ? document.getElementById(groupId) : group;
  const fresh = after && after.querySelectorAll('[role="radio"]')[to];
  if (fresh) fresh.focus();
  return true;
}

function onKeydown(ev) {
  if (!document.getElementById('screen-quiz').classList.contains('is-active')) return;
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

  if (!state.answered && /^[1-6]$/.test(ev.key)) {
    const btn = $$('.gp-choice')[Number(ev.key) - 1];
    if (btn) { ev.preventDefault(); btn.click(); }
    return;
  }
  if (ev.key === 'ArrowLeft') { ev.preventDefault(); goPrev(); return; }
  if (ev.key === 'ArrowRight') { ev.preventDefault(); goForward(); return; }
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
  document.addEventListener('keydown', (ev) => { radioGroupKeys(ev); });
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('hashchange', route);

  $('#gp-back').addEventListener('click', goBack);
  $('#gp-next').addEventListener('click', nextQuestion);
  $('#gp-prev').addEventListener('click', goPrev);
  $('#gp-fwd').addEventListener('click', goForward);
  $('#gp-replay').addEventListener('click', () => speech.speak(
    [state.session?.current?.promptSpeech || state.session?.current?.prompt,
     state.session?.current?.figure ? describeFigure(state.session.current.figure) : ''],
    { force: true }
  ));
  $('#gp-theme-toggle').addEventListener('click', toggleTheme);
  $('#gp-lang-toggle').addEventListener('click', toggleGuideLanguage);
  $('#gp-ex-prev').addEventListener('click', () => stepExercise(-1));
  $('#gp-ex-next').addEventListener('click', () => stepExercise(1));
  /* Enter should submit the answer box, the way any small form behaves. */
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    if (ev.target.matches('[data-shapetyped]')) { ev.preventDefault(); answerShapeTyped(); return; }
    if (ev.target.matches('#gp-exercise [data-feed]')) { ev.preventDefault(); runMachine(); return; }
    if (!ev.target.matches('#gp-exercise [data-answer-input]')) return;
    ev.preventDefault();
    checkMath();
  });
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
