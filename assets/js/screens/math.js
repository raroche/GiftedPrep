/**
 * screens/math.js — the Math Lab room.
 *
 * Lessons, topics and every kind of exercise: the tower, the sieve, the magic
 * square, the cipher wheel, Nim, the doors, the map colouring. The rules for
 * all of them live in modules/mathlab.js, which is pure and tested; this file
 * is the screen and the handlers.
 */

import * as data from './../modules/data.js';
import * as storage from './../modules/storage.js';
import { escapeHtml } from './../modules/charts.js';
import * as mathlab from './../modules/mathlab.js';
import { $, $$, paint, showError, showScreen, state } from './../modules/shell.js';

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
export async function renderMath(gradeArg, topicArg) {
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
  $('#gp-exercise').innerHTML = mathlab.renderExercise(ex, index, total, topic.recap);
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

export function answerMath(pick) {
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

export function checkMath() {
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

export function tapPeg(pegEl) {
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

export function runMachine() {
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

export function nimTake(k) {
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

export function pickDoor(i) {
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

export function settleDoor(switching) {
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

export function turnDial(step) {
  const ex = state.math.topic.exercises[state.math.index];
  state.math.shift = (state.math.shift + step + 26) % 26;
  $('#gp-exercise [data-cipher-shift]').textContent = state.math.shift;
  $('#gp-exercise [data-cipher-out]').textContent =
    mathlab.shiftLetters(ex.coded, state.math.shift);
}

export function crossOut(cell) {
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

export function paintRegion(id) {
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

export function toggleBuildCell(cell) {
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

export function stepExercise(delta) {
  const { topic } = state.math;
  if (!topic) return;
  const next = state.math.index + delta;
  if (next < 0 || next > topic.exercises.length) return;
  state.math.index = next;
  showExercise();
  $('#gp-turn-head').scrollIntoView({ block: 'start', behavior: 'smooth' });
}
