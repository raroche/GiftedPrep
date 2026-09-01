/**
 * screens/gifted.js — the Test Practice room.
 *
 * Everything that used to be the whole application: the grade and count
 * pickers, the test and category lists, building a session, the question
 * screen and the results. Read-aloud lives here too, because the only thing
 * the site reads out is a question.
 */

import * as data from './../modules/data.js';
import * as storage from './../modules/storage.js';
import * as speech from './../modules/speech.js';
import { QuizSession, encouragement, relabel } from './../modules/quiz.js';
import { renderFigure, describeFigure } from './../modules/figures.js';
import { icon } from './../modules/icons.js';
import { ring, bars, escapeHtml } from './../modules/charts.js';
import { ROOMS, roomGrid, creature, roomById } from './../modules/sections.js';
import { $, $$, paint, showError, state } from './../modules/shell.js';

/* ------------------------------------------------------------------ */
/* Read aloud                                                          */
/* ------------------------------------------------------------------ */

export function applySpeechButton() {
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
/* Home                                                                */
/* ------------------------------------------------------------------ */

const GRADE_NOTES = {
  1: 'Grade 1 questions are all pictures and shapes, with nothing to read. That matches the real tests, where a teacher reads every question aloud.',
  2: 'Grade 2 is still pictures and shapes with nothing to read, but with more going on in each puzzle.',
  3: 'Grade 3 is where the real tests change. Words and numbers replace pictures, there are five answers instead of four, and the clock starts.',
  4: 'Grade 4 keeps words and numbers, with more rules running at once in each puzzle.'
};

export function renderGradePicker() {
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

export function questionCount() {
  const n = Number(state.settings.questionCount);
  return QUESTION_COUNTS.includes(n) ? n : 10;
}

export function renderCountPicker() {
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

/**
 * Draw the zoo map. Reading from ROOMS rather than from markup is the whole
 * point of Phase 2: a new section appears here, in the navigation and in the
 * checker without anyone editing this function.
 */
export function renderRooms() {
  const host = document.getElementById('cz-rooms');
  if (host) host.innerHTML = roomGrid(ROOMS);
}

/* The room banner is painted from the same registry entry as its card, so the
   creature on the section page can never drift from the one on the map. */
export function paintRoomHead(id, picId) {
  const pic = document.getElementById(picId);
  const room = roomById(id);
  if (pic && room && !pic.childElementCount) pic.innerHTML = creature(room.creature);
}

export function renderHomeStats() {
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

export function renderTests() {
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
export function renderCategories(testId) {
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

export async function startSession({ testId = null, categoryId = null, limit = 10, label = '' }) {
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

export function handleAnswer(choiceId) {
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

export function nextQuestion() {
  speech.cancel();
  const s = state.session;
  /* When looking back over answered puzzles, Next walks forward through them
     rather than skipping to the end of the set. */
  if (s.canGoForward) { s.forward(); renderQuestion(); return; }
  if (s.answers.length >= s.total) { location.hash = '#/results'; renderResults(); return; }
  s.next();
  renderQuestion();
}

export function goPrev() {
  if (!state.session || !state.session.canGoBack) return;
  speech.cancel();
  state.session.back();
  renderQuestion();
}

export function goForward() {
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

export function renderResults() {
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
