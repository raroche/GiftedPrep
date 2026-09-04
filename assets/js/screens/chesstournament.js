/**
 * screens/chesstournament.js — getting ready for a real tournament.
 *
 * The rules are the US Chess Federation's, 7th edition, and every drill cites
 * the rule number it comes from. A child will not read the number. It is
 * there so a parent, a coach or a tournament director can check that the app
 * is not making things up, which matters more here than anywhere else in the
 * room: a child who learns a wrong rule finds out at a real tournament, in
 * front of people, in a game that counts.
 *
 * The shape comes from docs/research/chess/07-tournament.md. Rules are not
 * taught as a list of rules — nobody learns anything that way, least of all a
 * seven-year-old. Each one arrives as a situation at your own board: this has
 * just happened, what do you do? The rule is the explanation for something
 * that already went right or wrong, which is how the rest of the Chess Club
 * teaches everything.
 *
 * The walkthrough of the day comes first, on purpose. What frightens a
 * first-timer is not rule 10B. It is not knowing where to stand.
 */

import { escapeHtml } from './../modules/charts.js';
import * as progress from './../modules/chessprogress.js';
import { $, paint, react, showScreen, state } from './../modules/shell.js';

const esc = escapeHtml;

let book = null;

export function closeTournament() {
  state.chess.tourn = null;
}

async function load() {
  if (book) return book;
  const res = await fetch('data/chess/tournament.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load the tournament guide');
  book = await res.json();
  return book;
}

/* ------------------------------------------------------------------ */
/* The front page                                                      */
/* ------------------------------------------------------------------ */

function renderFront(data) {
  const done = progress.load().tourn || {};

  const setCard = (s) => {
    const score = done[s.id];
    return `<a class="cz-tn-set" href="#/chess/tournament/${esc(s.id)}">
        <span class="cz-tn-set__emoji" aria-hidden="true">${s.emoji}</span>
        <span class="cz-tn-set__name">${esc(s.name)}</span>
        <span class="cz-tn-set__blurb">${esc(s.blurb)}</span>
        <span class="cz-tn-set__meta">${s.drills.length} things that happen${
          score ? ` &middot; best ${score} of ${s.drills.length}` : ''}</span>
      </a>`;
  };

  $('#gp-chesstournament-body').innerHTML = `
    <p class="gp-page-lede">Your first real tournament, before you get there.</p>

    <section class="cz-tn-day">
      <h2 class="cz-tn-h">How the day goes</h2>
      <ol class="cz-tn-steps">
        ${data.day.map((d) => `<li class="cz-tn-step">
          <span class="cz-tn-step__icon" aria-hidden="true">${d.icon}</span>
          <span class="cz-tn-step__body">
            <strong>${esc(d.head)}</strong>
            <span>${esc(d.say)}</span>
          </span></li>`).join('')}
      </ol>
    </section>

    <section class="cz-tn-drills">
      <h2 class="cz-tn-h">What if that happens?</h2>
      <p class="cz-tn-sub">Real things that happen at real tournaments. Pick what
        you would do, and find out. Every answer says which US Chess rule it is,
        so a grown-up can check.</p>
      <div class="cz-tn-sets">${data.sets.map(setCard).join('')}</div>
    </section>

    <section class="cz-tn-kit">
      <h2 class="cz-tn-h">What to bring</h2>
      <ul class="cz-tn-kitlist">
        ${data.kit.map((k) => `<li><strong>${esc(k.thing)}</strong>
          <span>${esc(k.why)}</span></li>`).join('')}
      </ul>
    </section>

    <p class="cz-tn-note">Rules from the US Chess Federation's Official Rules of
      Chess, 7th edition. If a tournament director ever tells you something
      different from this, the director is right.</p>`;
  paint();
  showScreen('chesstournament');
}

/* ------------------------------------------------------------------ */
/* A run of drills                                                     */
/* ------------------------------------------------------------------ */

function renderRun(set) {
  state.chess.tourn = { set, at: 0, right: 0, answered: false };
  $('#chesstournament-title').textContent = `${set.emoji} ${set.name}`;
  $('#gp-chesstournament-body').innerHTML = `
    <div class="cz-tn-run">
      <div class="cz-tn-run__dots" id="gp-tn-dots"></div>
      <div class="cz-tn-card" id="gp-tn-card"></div>
    </div>`;
  drawDrill();
}

function dots() {
  const run = state.chess.tourn;
  if (!run) return;
  const box = $('#gp-tn-dots');
  if (!box) return;
  box.innerHTML = run.set.drills.map((_, i) =>
    `<span class="gp-dot ${i === run.at ? 'is-now' : i < run.at ? 'is-done' : ''}"
      aria-hidden="true"></span>`).join('')
    + `<span class="gp-sr-only">Question ${run.at + 1} of ${run.set.drills.length}</span>`;
}

function drawDrill() {
  const run = state.chess.tourn;
  if (!run) return;
  const drill = run.set.drills[run.at];
  if (!drill) { finish(); return; }
  run.answered = false;
  dots();

  $('#gp-tn-card').innerHTML = `
    <p class="cz-tn-ask">${esc(drill.ask)}</p>
    <div class="gp-choices gp-choices--text" id="gp-tn-choices">
      ${drill.choices.map((c) => `
        <button type="button" class="gp-choice" data-tnpick="${esc(c.id)}">
          <span class="gp-choice__body">${esc(c.text)}</span>
        </button>`).join('')}
    </div>
    <div class="cz-tn-after" id="gp-tn-after" hidden></div>`;
  paint();
}

/** One answer. It is never marked wrong twice: the rule shows either way. */
export function answerDrill(id) {
  const run = state.chess.tourn;
  if (!run || run.answered) return;
  const drill = run.set.drills[run.at];
  if (!drill) return;
  run.answered = true;
  const ok = id === drill.answer;
  if (ok) run.right += 1;
  react(ok ? 'happy' : 'oops', 1400);

  for (const btn of document.querySelectorAll('[data-tnpick]')) {
    const mine = btn.dataset.tnpick;
    btn.disabled = true;
    if (mine === drill.answer) btn.classList.add('is-right');
    else if (mine === id) btn.classList.add('is-wrong');
  }

  const last = run.at + 1 >= run.set.drills.length;
  const after = $('#gp-tn-after');
  if (after) {
    after.hidden = false;
    /* The rule number is shown whether they were right or wrong. Being wrong
       is the moment a child is most likely to actually read it. */
    after.innerHTML = `
      <p class="cz-tn-verdict ${ok ? 'is-good' : 'is-retry'}">${
        ok ? 'Yes.' : 'Not that one.'}</p>
      <p class="cz-tn-why">${esc(drill.why)}</p>
      <p class="cz-tn-rule">${esc(drill.rule)}</p>
      <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-action="chess-tnnext">
        ${last ? 'See how I did' : 'Next'} &rarr;</button>`;
  }
  paint();
}

function finish() {
  const run = state.chess.tourn;
  if (!run) return;
  const total = run.set.drills.length;
  const { right } = run;

  /* Kept per set, best only, because it never goes down — the same rule the
     stars follow everywhere else in this room. */
  progress.update((p) => {
    const tourn = { ...(p.tourn || {}) };
    tourn[run.set.id] = Math.max(tourn[run.set.id] || 0, right);
    return progress.touchDay({ ...p, tourn });
  });

  react(right === total ? 'wow' : 'happy', 2400);
  $('#gp-chesstournament-body').innerHTML = `
    <div class="gp-done cz-tn-done">
      <h2>${right} of ${total}</h2>
      <p class="gp-muted">${right === total
        ? 'Every one. You are ready for the table.'
        : 'The ones you missed are the ones worth reading twice.'}</p>
      <div class="gp-row gp-row--wrap cz-lesson__after">
        <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-action="chess-tnagain">
          Go again</button>
        <a class="gp-btn gp-btn--quiet" href="#/chess/tournament">The other sets</a>
        <a class="gp-btn gp-btn--quiet" href="#/chess">Back to Chess Club</a>
      </div>
    </div>`;
  paint();
}

/* ------------------------------------------------------------------ */
/* Buttons and routing                                                 */
/* ------------------------------------------------------------------ */

/** Every data-action="chess-tn..." on this screen. */
export function tournamentAction(name) {
  const run = state.chess.tourn;

  if (name === 'chess-tnnext') {
    if (!run) return true;
    run.at += 1;
    drawDrill();
    return true;
  }
  if (name === 'chess-tnagain') {
    if (!run) return true;
    renderRun(run.set);
    return true;
  }
  return false;
}

/** #/chess/tournament and #/chess/tournament/<setId>. */
export async function renderTournament(setId) {
  closeTournament();
  let data;
  try {
    data = await load();
  } catch (err) {
    console.error(err);
    return false;
  }
  if (setId) {
    const set = data.sets.find((s) => s.id === setId);
    /* An address nobody wrote goes to the front page, not a blank screen. */
    if (!set) { window.location.hash = '#/chess/tournament'; return true; }
    renderRun(set);
    showScreen('chesstournament');
    return true;
  }
  $('#chesstournament-title').textContent = 'Your first tournament';
  renderFront(data);
  return true;
}

export default { renderTournament, closeTournament, tournamentAction, answerDrill };
