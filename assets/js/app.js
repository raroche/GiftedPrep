/**
 * app.js — CurioZoo shell.
 *
 * The theme, the hash router, one delegated event listener, and boot. That is
 * all. Each room owns its own screen under ./screens, shared state and DOM
 * helpers live in ./modules/shell.js, and the rules a room needs live in
 * ./modules next to their tests.
 *
 * It used to be all of that in one 1,864-line file, which was fine for three
 * sections and would not have survived ten. The import graph is deliberately
 * one-directional -- app.js imports screens, screens import shell, shell
 * imports nothing of theirs -- so a new room cannot create a cycle.
 *
 * No framework: the whole app is a router plus template strings, which is
 * genuinely less code than any library would be, with nothing to install and
 * nothing to go stale.
 */

import * as data from './modules/data.js';
import * as storage from './modules/storage.js';
import * as speech from './modules/speech.js';
import * as flags from './modules/flags.js';
import { describeFigure } from './modules/figures.js';
import { icon } from './modules/icons.js';
import { hydrateMascots, setMood } from './modules/mascot.js';
import { $, $$, hydrateIcons, showError, showScreen, state } from './modules/shell.js';
import { answerAngle, drawAngSetup, nextAngle, startAngRound, answerElement, drawElemQuestion, drawElemSetup, nextElement, startElemRound, answerCapChoice, answerCapTyped, drawCapQuestion, drawCapSetup, nextCapital, startCapRound, answerFlag, answerShapeChoice, answerShapeTyped, answerShapeVault, answerVault, drawFlagQuestion, drawFlagSetup, drawShapeQuestion, drawShapeSetup, renderFun, startFlagRound, startShapeRound } from './screens/fun.js';
import { applySpeechButton, renderGiftedExplainer, goForward, goPrev, handleAnswer, nextQuestion, paintRoomHead, questionCount, renderCategories, renderCountPicker, renderGradePicker, renderHomeStats, renderResults, renderRooms, renderTests, startSession } from './screens/gifted.js';
import { answerMath, checkMath, crossOut, nimTake, paintRegion, pickDoor, renderMath, runMachine, settleDoor, stepExercise, tapPeg, toggleBuildCell, turnDial } from './screens/math.js';
import { renderParents, toggleGuideLanguage } from './screens/parents.js';
import { renderChess, chessAction } from './screens/chess.js';
import { renderLearn, renderElemLearn, renderAngleLearn, paintAngTurn, paintAngTrap, paintAngClock, learnStep, learnJump, learnOrder, showElementDetail } from './screens/learn.js';
import { backTarget } from './modules/routes.js';

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
/* Router                                                              */
/* ------------------------------------------------------------------ */

function route() {
  const hash = location.hash || '#/home';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const head = parts[0] || 'home';

  switch (head) {
    case 'home':
      renderRooms();
      renderHomeStats();
      showScreen('home');
      break;
    case 'gifted':
      paintRoomHead('gifted', 'cz-gifted-pic');
      renderGiftedExplainer();
      renderGradePicker();
      renderCountPicker();
      showScreen('gifted');
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
    case 'chess':
      renderChess(parts[1], parts[2]);
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
  const target = backTarget();
  if (!target) { location.hash = '#/home'; return; }
  if (target.href) { location.hash = target.href; return; }
  leaveQuiz();
}

function leaveQuiz() {
  if (state.session && state.session.answers.length && !confirmLeave()) return;
  speech.cancel();
  location.hash = state.lastRun && state.lastRun.testId
    ? `#/categories/${state.lastRun.testId}` : '#/gifted';
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
  /* ---- browsing mode ---- */
  const ls = ev.target.closest('[data-learnstep]');
  if (ls) { learnStep(ls.dataset.learnstep); return; }

  const lj = ev.target.closest('[data-learnjump]');
  if (lj) { learnJump(lj.dataset.learnjump); return; }

  const lo = ev.target.closest('[data-learnorder]');
  if (lo) { learnOrder(lo.dataset.learnorder); return; }

  /* On the learning page a cell explains itself instead of being an answer. */
  const learnCell = ev.target.closest('#screen-elemlearn [data-elemcell]');
  if (learnCell) { showElementDetail(learnCell.dataset.elemcell); return; }

  /* ---- name the element ---- */
  const es = ev.target.closest('[data-elemset]');
  if (es) { state.elements.setup.set = es.dataset.elemset; drawElemSetup(); return; }

  const ea = ev.target.closest('[data-elemask]');
  if (ea) { state.elements.setup.ask = ea.dataset.elemask; drawElemSetup(); return; }

  const en = ev.target.closest('[data-elemcount]');
  if (en) { state.elements.setup.count = en.dataset.elemcount; drawElemSetup(); return; }

  /* ---- the angle workshop ---- */
  const ad = ev.target.closest('[data-angdemo]');
  if (ad) { state.angles.demo.deg = Number(ad.dataset.angdemo); paintAngTurn(); return; }

  const ac = ev.target.closest('[data-angclock]');
  if (ac) { state.angles.demo.hour = Number(ac.dataset.angclock); paintAngClock(); return; }

  /* ---- guess the angle ---- */
  const aa = ev.target.closest('[data-angask]');
  if (aa) { state.angles.setup.ask = aa.dataset.angask; drawAngSetup(); return; }

  const asv = ev.target.closest('[data-angset]');
  if (asv) { state.angles.setup.set = asv.dataset.angset; drawAngSetup(); return; }

  const an = ev.target.closest('[data-angcount]');
  if (an) { state.angles.setup.count = an.dataset.angcount; drawAngSetup(); return; }

  const ap = ev.target.closest('[data-anganswer]');
  if (ap) { answerAngle(ap.dataset.anganswer); return; }

  const ans = ev.target.closest('[data-elemanswer]');
  if (ans) { answerElement(ans.dataset.elemanswer); return; }

  const cellPick = ev.target.closest('[data-elemcell]');
  if (cellPick) { answerElement(cellPick.dataset.elemcell); return; }

  /* ---- capital city game ---- */
  const cc = ev.target.closest('[data-capcount]');
  if (cc) { state.capitals.setup.count = cc.dataset.capcount; drawCapSetup(); return; }

  const cp = ev.target.closest('[data-cappick]');
  if (cp) { state.capitals.setup.pick = cp.dataset.cappick; drawCapSetup(); return; }

  const cm = ev.target.closest('[data-capmode]');
  if (cm) {
    state.capitals.setup.mode = cm.dataset.capmode;
    if (cm.dataset.capmode !== 'continent') state.capitals.setup.continents = [];
    drawCapSetup();
    return;
  }

  const ck = ev.target.closest('[data-capcont]');
  if (ck) {
    const id = ck.dataset.capcont;
    const on = state.capitals.setup.continents;
    const at = on.indexOf(id);
    if (at === -1) on.push(id); else on.splice(at, 1);
    drawCapSetup();
    return;
  }

  const ca = ev.target.closest('[data-capanswer]');
  if (ca) { answerCapChoice(ca.dataset.capanswer); return; }

  if (ev.target.closest('[data-capcheck]')) { answerCapTyped(); return; }

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
  const fs2 = ev.target.closest('[data-flagscope]');
  if (fs2) {
    state.flags.setup.scope = fs2.dataset.flagscope;
    /* A continent chosen under one scope may hold nothing under the other. */
    state.flags.setup.continents = state.flags.setup.continents.filter((id) =>
      flags.inScope(state.flags.data, state.flags.setup.scope).some((c) => c.continent === id));
    drawFlagSetup();
    return;
  }

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
  if (action.dataset.action.startsWith('chess-')) { chessAction(action.dataset.action); return; }
  switch (action.dataset.action) {
    case 'leave-quiz':
      leaveQuiz();
      break;
    case 'ang-arms':
      state.angles.demo.swap = !state.angles.demo.swap;
      paintAngTrap();
      break;
    case 'ang-start':
      startAngRound();
      break;
    case 'ang-next':
      nextAngle();
      break;
    case 'ang-again':
      startAngRound();
      break;
    case 'elem-start':
      startElemRound();
      break;
    case 'elem-next':
      nextElement();
      break;
    case 'elem-again':
      startElemRound();
      break;
    case 'cap-start':
      startCapRound();
      break;
    case 'cap-next':
      nextCapital();
      break;
    case 'cap-again':
      startCapRound();
      break;
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
  /* Arrows page through the browsing mode, the way any gallery behaves. */
  if (document.getElementById('screen-learn')?.classList.contains('is-active')
      && !/^(INPUT|TEXTAREA)$/.test(ev.target.tagName)) {
    if (ev.key === 'ArrowRight') { ev.preventDefault(); learnStep(1); return; }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); learnStep(-1); return; }
  }
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
/* The mascot                                                          */
/* ------------------------------------------------------------------ */

/**
 * Everything that makes the mascot in the top bar feel watched-over.
 *
 * All of it is chrome, none of it is load-bearing, and every listener is
 * passive or trivial. Answering a question is wired where the answer is
 * marked, not here: see screens/gifted.js and screens/fun.js.
 */
function wireMascot() {
  const brand = $('.gp-brand');
  const mark = brand && brand.querySelector('[data-mascot]');
  if (!mark) return;

  /* The one piece of the chrome a child is allowed to poke at for no reason. */
  brand.addEventListener('pointerenter', () => setMood(mark, 'curious', 2600));
  brand.addEventListener('click', () => setMood(mark, 'happy', 1800));

  /* Flipping the lights gets a wink. There is no reason for this beyond the
     fact that a child will flip it twenty times to see what happens, and the
     twentieth time should still answer. */
  $('#gp-theme-toggle').addEventListener('click', () => setMood(mark, 'wink', 1400));

  /* It looks over at whichever room you are pointing at. Delegated, because
     the room cards are rebuilt from ROOMS on every visit to the home page. */
  document.addEventListener('pointerover', (ev) => {
    if (ev.target.closest && ev.target.closest('.cz-tile:not(.is-soon)')) {
      setMood(mark, 'curious', 2200);
    }
  }, { passive: true });

  /* Left alone, it dozes off, and any sign of life wakes it. Forty seconds is
     long enough that it never nods off while a child is reading a question,
     and short enough that an abandoned iPad shows something friendly rather
     than a page that looks broken.

     pointermove fires hundreds of times a second, so the timer is only reset
     twice a second; without that this would be the most expensive listener on
     the page by a wide margin. */
  const IDLE = 40000;
  let timer = null;
  let last = 0;
  const doze = () => setMood(mark, 'sleep');
  const wake = () => {
    const now = Date.now();
    if (now - last < 500 && timer) return;
    last = now;
    clearTimeout(timer);
    const svg = mark.querySelector('.cz-mascot');
    if (svg && svg.dataset.mood === 'sleep') setMood(mark, 'idle');
    timer = setTimeout(doze, IDLE);
  };
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']
    .forEach((e) => document.addEventListener(e, wake, { passive: true }));
  wake();
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  hydrateIcons();
  hydrateMascots();
  applyTheme();
  applySpeechButton();

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', (ev) => { radioGroupKeys(ev); });
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('hashchange', route);

  $('#gp-next').addEventListener('click', nextQuestion);
  $('#gp-prev').addEventListener('click', goPrev);
  $('#gp-fwd').addEventListener('click', goForward);
  $('#gp-replay').addEventListener('click', () => speech.speak(
    [state.session?.current?.promptSpeech || state.session?.current?.prompt,
     state.session?.current?.figure ? describeFigure(state.session.current.figure) : ''],
    { force: true }
  ));
  $('#gp-theme-toggle').addEventListener('click', toggleTheme);

  wireMascot();
  $('#gp-lang-toggle').addEventListener('click', toggleGuideLanguage);
  $('#gp-ex-prev').addEventListener('click', () => stepExercise(-1));
  $('#gp-ex-next').addEventListener('click', () => stepExercise(1));
  /* Enter should submit the answer box, the way any small form behaves. */
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    if (ev.target.matches('[data-shapetyped]')) { ev.preventDefault(); answerShapeTyped(); return; }
    if (ev.target.matches('[data-captyped]')) { ev.preventDefault(); answerCapTyped(); return; }
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
