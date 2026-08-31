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
  audioUnlocked: false,
  /** Math Lab: the topic being worked through and where we are in it. */
  math: { data: null, topic: null, index: 0, done: {}, collected: new Set(), built: new Set(), painted: {}, settled: false }
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

const SCREENS = ['home', 'tests', 'categories', 'quiz', 'results', 'parents', 'math', 'mathtopic', 'error'];

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
  $('#gp-ex-next').disabled = false;
  $('#gp-ex-prev').disabled = index === 0;
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
    settleExercise(mathlab.check(ex, state.math.built.size));
    return;
  }

  if (ex.type === 'colormap') { checkColourMap(ex); return; }

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
  if (count) count.textContent = state.math.built.size;
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
