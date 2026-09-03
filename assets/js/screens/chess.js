/**
 * screens/chess.js — the Chess Club room.
 *
 * Three levels: Pawn Camp (the pieces and the rules), Knight School (openings,
 * tactics and the basic mates) and Queen's Guild (600 and up). The research
 * behind the design and the build plan live in docs/research/chess/.
 *
 * The hub is built around one question a child arrives with: what do I do now?
 * So the biggest thing on it is a single button that opens exactly the lesson
 * they should do next, and everything else — the stars, the badge, the week —
 * is a record of what they have already done rather than a demand.
 *
 * Being built in the phases set out in PLAN.md. Phases 0 to 2 are here: the
 * board, the memory, the hub and the level pages. The lesson player, the bots
 * and the puzzles come next, and until then a lesson card says so plainly
 * rather than opening an empty screen.
 */

import { ensurePieceDefs, pieceHref } from './../modules/chesspieces.js';
import * as progress from './../modules/chessprogress.js';
import { GAMES } from './../modules/chessgames.js';
import { escapeHtml } from './../modules/charts.js';
import { paintRoomHead } from './gifted.js';
import { openLesson, closeLesson, lessonAction, lessonChoice } from './chesslesson.js';
import { renderPlay, closePlay, playAction, playPick } from './chessplay.js';
import { renderPuzzles, closePuzzles, puzzleAction } from './chesspuzzle.js';
import { $, paint, showError, showScreen } from './../modules/shell.js';

const esc = escapeHtml;

/* ------------------------------------------------------------------ */
/* Loading the levels                                                  */
/* ------------------------------------------------------------------ */

const LEVEL_FILES = [1, 2, 3];
let levels = null;

async function loadLevels() {
  if (levels) return levels;
  const loaded = await Promise.all(LEVEL_FILES.map(async (n) => {
    const res = await fetch(`data/chess/level${n}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`No chess data for level ${n}`);
    return res.json();
  }));
  levels = loaded;
  return levels;
}

/* ------------------------------------------------------------------ */
/* Small pieces of the page                                            */
/* ------------------------------------------------------------------ */

/**
 * A piece drawn at a size, from the shared symbols.
 *
 * The badge and the level tiles both use it, so the Rook a child earns is
 * exactly the rook they have been moving around the board.
 */
function pieceMark(code, cls = '') {
  return `<svg class="cz-chess-piece ${cls}" viewBox="0 0 45 45" aria-hidden="true" focusable="false">`
    + `<use href="${pieceHref(code)}" width="45" height="45"/></svg>`;
}

/**
 * Stars as filled and hollow shapes, never as a number.
 *
 * Three of three is a picture a five-year-old reads at a glance; "3/3" is
 * arithmetic. The count is still in the label for anyone listening.
 */
function starRow(got, max = progress.MAX_STARS) {
  const stars = Array.from({ length: max }, (_, i) =>
    `<span class="cz-chess-star${i < got ? ' is-on' : ''}" aria-hidden="true">${
      i < got ? '★' : '☆'}</span>`).join('');
  return `<span class="cz-chess-stars" role="img" aria-label="${got} of ${max} stars">${stars}</span>`;
}

/** The seven days, as dots. No streak, so a gap costs nothing and says nothing. */
function weekRow(days) {
  const dots = progress.weekDots(days);
  const done = dots.filter((d) => d.done).length;
  const cells = dots.map((d) =>
    `<span class="cz-chess-day${d.done ? ' is-on' : ''}${d.today ? ' is-today' : ''}"
       aria-hidden="true"></span>`).join('');
  const label = done === 0
    ? 'No days played yet this week'
    : `Played on ${done} day${done === 1 ? '' : 's'} this week`;
  return `<span class="cz-chess-week" role="img" aria-label="${label}">${cells}</span>`;
}

/* ------------------------------------------------------------------ */
/* The hub                                                             */
/* ------------------------------------------------------------------ */

/**
 * The one-screen welcome, shown once.
 *
 * Common Sense's complaint about Magnus' Kingdom was that it "doesn't start
 * with much of an introduction", and NN/g's finding is that under-eights
 * cannot infer what to do from a screen that only offers choices. So the very
 * first thing is a sentence and a button, and nothing else.
 */
function renderIntro() {
  return `
    <section class="cz-chess-intro">
      <p class="cz-chess-intro__pic" aria-hidden="true">${pieceMark('wN', 'cz-chess-piece--big')}</p>
      <h2 class="cz-chess-intro__title">Tap a piece. Tap where it goes.</h2>
      <p class="cz-chess-intro__lede">That is everything you need to start. We will
        do one piece at a time, and you can play a real game by the end.</p>
      <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-action="chess-begin">
        Start with the board &rarr;
      </button>
    </section>`;
}

function statRow(p, all) {
  const rank = progress.badge(p, all);
  const goal = progress.badgeGoal(p, all);
  return `
    <div class="cz-chess-stats">
      <div class="cz-chess-stat">
        <span class="cz-chess-stat__pic" aria-hidden="true">${pieceMark(rank.code)}</span>
        <span class="cz-chess-stat__num">${esc(rank.name)}</span>
        <span class="cz-chess-stat__cap">Your rank</span>
      </div>
      <div class="cz-chess-stat">
        <span class="cz-chess-stat__pic cz-chess-stat__pic--star" aria-hidden="true">&#9733;</span>
        <span class="cz-chess-stat__num">${p.starTotal}</span>
        <span class="cz-chess-stat__cap">Stars<span class="gp-sr-only"> earned</span></span>
      </div>
      <div class="cz-chess-stat">
        <span class="cz-chess-stat__pic" aria-hidden="true">${weekRow(p.days)}</span>
        <span class="cz-chess-stat__num">${progress.weekCount(p.days)}</span>
        <span class="cz-chess-stat__cap">Days this week</span>
      </div>
    </div>
    ${goal ? `<p class="cz-chess-goal">${esc(goal)}</p>` : ''}`;
}

/** What the next board colour costs, in a sentence a child can act on. */
function nextColour(p) {
  const next = progress.nextTheme(p.starTotal);
  if (!next) return 'You have found every colour.';
  const left = next.stars - p.starTotal;
  return `${left} more star${left === 1 ? '' : 's'} and ${next.name} is yours.`;
}

/* The piece each level is named after. Pawn Camp shows a pawn, Knight School
   a knight, Queen's Guild a queen -- the icon and the name have to be the same
   word or the picture is decoration. */
const LEVEL_PIECE = ['wP', 'wN', 'wQ'];

function levelTile(level, index, p, all) {
  const gate = progress.levelGate(all, index, p);
  const started = progress.startedIn(level, p);
  const total = level.lessons.length;
  const stars = level.lessons.reduce((n, l) => n + (p.stars[l.id] || 0), 0);
  const body = `
    <span class="cz-tile__pic">${pieceMark(LEVEL_PIECE[index] || 'wP')}</span>
    <span class="cz-tile__text">
      <span class="cz-tile__name">${esc(level.name)}</span>
      <span class="cz-tile__blurb">${esc(level.blurb)}</span>
      <span class="cz-tile__meta${gate.open ? '' : ' cz-tile__meta--why'}">${gate.open
        ? `${started} of ${total} lessons done · ${stars} star${stars === 1 ? '' : 's'}`
        : esc(gate.why)}</span>
    </span>`;
  /* A shut level is a div, not a link: a card that looks tappable and does
     nothing is worse than one that plainly is not ready. */
  return gate.open
    ? `<a class="cz-tile cz-tile--${level.hue}" href="#/chess/${level.level}">
        ${body}<span class="cz-tile__go" aria-hidden="true">&rarr;</span></a>`
    : `<div class="cz-tile cz-tile--${level.hue} is-soon" aria-disabled="true">
        ${body}<span class="cz-tile__lock" aria-hidden="true">&#128274;</span></div>`;
}

/**
 * A lesson with no steps in its file is not written yet.
 *
 * Levels ship before their content does, which is deliberate -- the shape of
 * the room can be built and looked at first. But an unwritten lesson must
 * never be offered as the next thing to do, or the one button on the hub
 * leads to an apology. This is the only place that decides it, and the whole
 * question disappears on its own once the steps are written.
 */
const isReady = (lesson) => Array.isArray(lesson.steps) && lesson.steps.length > 0;

function nextReadyLesson(all, p) {
  const next = progress.nextLesson(all, p);
  return next && isReady(next.lesson) ? next : null;
}

function renderHub(all, p) {
  const next = nextReadyLesson(all, p);
  const anyReady = all.some((lv) => lv.lessons.some(isReady));
  const body = $('#gp-chess-body');

  if (!p.seenIntro) { body.innerHTML = renderIntro(); paint(); return; }

  body.innerHTML = `
    ${statRow(p, all)}

    ${next ? `
      <section class="cz-chess-next">
        <p class="cz-chess-next__tag">${p.starTotal ? 'Carry on' : 'Start here'}</p>
        <h2 class="cz-chess-next__title">${esc(next.lesson.emoji)} ${esc(next.lesson.name)}</h2>
        <p class="cz-chess-next__blurb">${esc(next.lesson.big)}</p>
        <a class="gp-btn gp-btn--primary gp-btn--big"
           href="#/chess/${next.level.level}/${esc(next.lesson.id)}">
          ${p.starTotal ? 'Keep going' : 'Begin'} &rarr;
        </a>
        <p class="cz-chess-next__meta">${next.lesson.minutes} minutes · ${esc(next.level.name)}</p>
      </section>` : anyReady ? `
      <section class="cz-chess-next">
        <p class="cz-chess-next__tag">All done</p>
        <h2 class="cz-chess-next__title">&#127881; You finished every lesson.</h2>
        <p class="cz-chess-next__blurb">Play games and puzzles to keep it sharp, or
          go back to any lesson and try for three stars.</p>
      </section>` : `
      <section class="cz-chess-next">
        <p class="cz-chess-next__tag">Nearly ready</p>
        <h2 class="cz-chess-next__title">The lessons are being written.</h2>
        <p class="cz-chess-next__blurb">All fifty-two of them, one piece and one
          trick at a time. Have a look at what is coming.</p>
      </section>`}

    <div class="cz-sectionhead"><h2>The three levels</h2></div>
    <div class="cz-tiles">${all.map((lv, i) => levelTile(lv, i, p, all)).join('')}</div>

    <div class="cz-sectionhead"><h2>Anytime</h2><p>No lesson, no order, no pressure.</p></div>
    <div class="gp-grid gp-grid--start">
      <a class="gp-card gp-card--action" href="#/chess/play">
        <span class="gp-card__icon" aria-hidden="true">${pieceMark('wK')}</span>
        <span class="gp-card__title">Play a game</span>
        <span class="gp-card__sub">A whole game against a friendly robot. Pick how hard.</span>
      </a>
      <a class="gp-card gp-card--action" href="#/chess/puzzles">
        <span class="gp-card__icon" aria-hidden="true">${pieceMark('wQ')}</span>
        <span class="gp-card__title">Puzzles</span>
        <span class="gp-card__sub">One position, one best move. Five in a row.</span>
        <span class="gp-card__badge">Puzzle power ${p.puzzles.r}</span>
      </a>
    </div>

    <div class="cz-sectionhead"><h2>Your board</h2>
      <p>${p.themes.length === progress.THEMES.length
        ? 'You have found every colour.'
        : `${esc(nextColour(p))}`}</p></div>
    <div class="cz-chess-themes">
      ${progress.THEMES.map((t) => {
        const owned = p.themes.includes(t.id);
        const swatch = `<span class="cz-chess-swatch cz-cb--${t.id}" aria-hidden="true">
          <i></i><i></i><i></i><i></i></span>`;
        const label = owned
          ? `<span class="cz-chess-theme__cost">${t.id === p.theme ? 'On the board' : 'Yours'}</span>`
          : `<span class="cz-chess-theme__cost">${t.stars} stars</span>`;
        const inner = `${swatch}<span class="cz-chess-theme__name">${esc(t.name)}</span>${label}`;
        return owned
          ? `<button type="button" class="cz-chess-theme${t.id === p.theme ? ' is-on' : ''}"
               aria-pressed="${t.id === p.theme}" data-chess-theme="${esc(t.id)}">${inner}</button>`
          : `<span class="cz-chess-theme is-locked" aria-disabled="true">${inner}</span>`;
      }).join('')}
    </div>

    <div class="cz-sectionhead"><h2>Small games</h2>
      <p>Each one is short and you can win it. Start at the top.</p></div>
    <div class="cz-chess-mini">
      ${GAMES.map((g) => `
        <a class="cz-chess-mini__one" href="#/chess/games/${esc(g.id)}">
          <span class="cz-chess-mini__name">${esc(g.name)}</span>
          <span class="cz-chess-mini__blurb">${esc(g.blurb)}</span>
        </a>`).join('')}
    </div>

    <p class="cz-chess-credits gp-muted">Pieces drawn by Colin M.L. Burnett.
      Puzzles from the Lichess database. Nothing you do here leaves this device.</p>`;
  paint();
}

/* ------------------------------------------------------------------ */
/* One level                                                           */
/* ------------------------------------------------------------------ */

/** The piece a lesson frees, drawn behind bars until it is done. */
const PIECE_CODE = {
  rook: 'wR', bishop: 'wB', queen: 'wQ', knight: 'wN', pawn: 'wP', king: 'wK'
};

/**
 * A caged piece, or a freed one.
 *
 * Magnus' Kingdom locks its pieces up and hands out keys, and it is the one
 * reward in the research that is not a number: a child can see at a glance
 * which pieces are theirs. The bars are drawn rather than drop-shadowed so
 * they survive both themes, and they slide away on a transition when the
 * lesson is finished.
 */
function cage(piece, freed) {
  const code = PIECE_CODE[piece];
  if (!code) return '';
  return `<span class="cz-chess-cage${freed ? ' is-free' : ''}"
      role="img" aria-label="${freed ? `the ${esc(piece)} is yours` : `the ${esc(piece)} is still locked up`}">
      ${pieceMark(code, 'cz-chess-cage__piece')}
      <span class="cz-chess-cage__bars" aria-hidden="true"></span>
    </span>`;
}

function lessonCard(lesson, i, level, all, p) {
  const stars = p.stars[lesson.id] || 0;
  const open = progress.isUnlocked(lesson.id, all, p);
  const ready = isReady(lesson);
  const inner = `
    <span class="gp-topic__num" aria-hidden="true">${i + 1}</span>
    ${lesson.piece
      ? cage(lesson.piece, p.unlocked.includes(lesson.piece))
      : `<span class="gp-topic__emoji" aria-hidden="true">${esc(lesson.emoji)}</span>`}
    <span class="gp-card__title">${esc(lesson.name)}</span>
    <span class="gp-card__sub">${esc(lesson.big)}</span>
    <span class="cz-chess-lesson__foot">
      ${open ? starRow(stars) : '<span class="cz-chess-lock" aria-hidden="true">&#128274;</span>'}
      <span class="cz-chess-lesson__mins">${
        !open ? 'Finish the one before it'
          : !ready ? 'Being written'
            : `${lesson.minutes} min`}</span>
    </span>`;
  const cls = `gp-card gp-card--topic cz-chess-lesson${open ? '' : ' is-locked'}${ready ? '' : ' is-soon'}`;
  return open && ready
    ? `<a class="${cls}" href="#/chess/${level.level}/${esc(lesson.id)}">${inner}</a>`
    : `<div class="${cls}" aria-disabled="true">${inner}</div>`;
}

function renderLevel(level, all, p) {
  const head = $('#cz-chesslevel-head');
  head.className = `cz-roomhead cz-tile--${level.hue}`;
  $('#screen-chesslevel').className = `gp-screen cz-room--${level.hue}`;
  $('#cz-chesslevel-pic').innerHTML = pieceMark(
    LEVEL_PIECE[all.indexOf(level)] || 'wP', 'cz-chess-piece--big');
  $('#chesslevel-title').textContent = level.name;
  $('#gp-chesslevel-lede').textContent = level.who;

  const done = progress.startedIn(level, p);
  const total = level.lessons.length;
  $('#gp-chesslevel-body').innerHTML = `
    <div class="cz-chess-levelbar">
      <span class="cz-chess-levelbar__band">${esc(level.band)}</span>
      <span class="cz-chess-levelbar__count">${done} of ${total} done</span>
      <div class="gp-bar__track cz-chess-levelbar__track">
        <div class="gp-bar__fill" data-style="width:${Math.round((done / total) * 100)}%"></div>
      </div>
    </div>
    <div class="gp-grid gp-grid--topics">
      ${level.lessons.map((l, i) => lessonCard(l, i, level, all, p)).join('')}
    </div>`;
  paint();
  showScreen('chesslevel');
}

/* ------------------------------------------------------------------ */
/* Reached out of order                                                */
/* ------------------------------------------------------------------ */

/**
 * A lesson whose turn has not come, reached by address rather than by card.
 *
 * It says the same thing the locked card says and offers the lesson a child
 * should actually be doing. A closed door with a sign on it and somewhere to
 * go is help; a closed door on its own is just a wall.
 */
function renderShutLesson(level, lesson, all, p) {
  const before = level.lessons[level.lessons.findIndex((l) => l.id === lesson.id) - 1];
  const next = nextReadyLesson(all, p);
  $('#chesslesson-title').textContent = `${lesson.emoji} ${lesson.name}`;
  $('#screen-chesslesson').className = `gp-screen cz-room--${level.hue}`;
  $('#gp-chesslesson-body').innerHTML = `
    <div class="gp-callout gp-callout--info">
      <p class="gp-callout__title">Not yet</p>
      <p>${before
        ? `Do "${esc(before.name)}" first. Each lesson uses the one before it.`
        : 'Work through the earlier lessons first.'}</p>
    </div>
    <div class="gp-row gp-row--wrap">
      ${next ? `<a class="gp-btn gp-btn--primary gp-btn--big"
         href="#/chess/${next.level.level}/${esc(next.lesson.id)}">
         Do ${esc(next.lesson.name)} instead &rarr;</a>` : ''}
      <a class="gp-btn gp-btn--quiet" href="#/chess/${level.level}">See the lessons</a>
    </div>`;
  paint();
  showScreen('chesslesson');
}

/** A whole level whose turn has not come. */
function renderShutLevel(level, gate) {
  $('#cz-chesslevel-head').className = `cz-roomhead cz-tile--${level.hue}`;
  $('#screen-chesslevel').className = `gp-screen cz-room--${level.hue}`;
  $('#cz-chesslevel-pic').innerHTML = pieceMark(
    LEVEL_PIECE[level.level - 1] || 'wP', 'cz-chess-piece--big');
  $('#chesslevel-title').textContent = level.name;
  $('#gp-chesslevel-lede').textContent = level.who;
  $('#gp-chesslevel-body').innerHTML = `
    <div class="gp-callout gp-callout--info">
      <p class="gp-callout__title">${esc(level.name)} is not open yet</p>
      <p>${esc(gate.why)}</p>
    </div>
    <a class="gp-btn gp-btn--primary" href="#/chess">&larr; Back to Chess Club</a>`;
  paint();
  showScreen('chesslevel');
}

/* ------------------------------------------------------------------ */
/* Not built yet                                                       */
/* ------------------------------------------------------------------ */

/**
 * A screen that says what it will be, rather than an empty one.
 *
 * Half-built rooms are normal here; a blank page is not. Each of these names
 * the phase that fills it, so a child sees a promise and a developer sees a
 * pointer.
 */
function renderSoon(screen, bodyId, title, what) {
  $(`#${bodyId}`).innerHTML = `
    <div class="gp-callout gp-callout--info">
      <p class="gp-callout__title">Being built</p>
      <p>${esc(what)}</p>
    </div>
    <a class="gp-btn gp-btn--primary" href="#/chess">&larr; Back to Chess Club</a>`;
  paint();
  showScreen(screen);
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/**
 * Everything with a data-action="chess-...", wired from app.js.
 *
 * The lesson player and the play screen each own some of these names, and one
 * of them shares a name with the other -- "chess-hint" means something on
 * both. Only one screen is ever showing, and whichever is live claims it
 * first by returning true.
 */
export function chessAction(name, el) {
  if (puzzleAction(name)) return;
  if (lessonAction(name, el)) return;
  if (playAction(name, el)) return;

  if (name === 'chess-theme') {
    const pick = el && el.dataset.chessTheme;
    progress.update((p) => (p.themes.includes(pick) ? { ...p, theme: pick } : p));
    renderChess();
    return;
  }

  if (name === 'chess-begin') {
    progress.update((p) => ({ ...p, seenIntro: true }));
    /* Straight into the first level rather than back to the hub: the child
       just answered "shall we start?" and should not be asked again. */
    window.location.hash = '#/chess/1';
  }
}

/** A tapped opponent or game on the play setup card. */
export { playPick };

/** A tapped choice in a lesson question. */
export { lessonChoice };

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Route target: #/chess, #/chess/<level>, #/chess/<level>/<lessonId>,
 * #/chess/play, #/chess/games/<id> and #/chess/puzzles.
 */
export async function renderChess(step, lessonId, third) {
  ensurePieceDefs();
  closePlay();

  if (step === 'play') { closeLesson(); closePuzzles(); renderPlay(null); return; }
  if (step === 'games') { closeLesson(); closePuzzles(); renderPlay(lessonId, third); return; }


  let all;
  try {
    all = await loadLevels();
  } catch (err) {
    console.error(err);
    showError('The chess lessons could not be loaded.');
    return;
  }
  const p = progress.load();

  if (step === 'puzzles') { closeLesson(); renderPuzzles(lessonId, all); return; }

  const level = all.find((lv) => String(lv.level) === step);

  if (level && lessonId) {
    const lesson = level.lessons.find((l) => l.id === lessonId);
    if (!lesson) { window.location.hash = `#/chess/${level.level}`; return; }
    /* The card that leads here is drawn locked, and the same rule has to hold
       when the address is typed instead. A lesson opened out of order is not
       cheating so much as being dropped somewhere that will not make sense --
       the whole point of the order is that each lesson assumes the one before. */
    if (!progress.isUnlocked(lesson.id, all, p)) {
      renderShutLesson(level, lesson, all, p);
      return;
    }
    $('#chesslesson-title').textContent = `${lesson.emoji} ${lesson.name}`;
    if (isReady(lesson)) { openLesson(level, lesson, all); return; }
    renderSoon('chesslesson', 'gp-chesslesson-body', lesson.name,
      `"${lesson.big}" This lesson is being written.`);
    return;
  }

  closeLesson();
  closePuzzles();
  if (level) {
    /* And the same for a whole level. */
    const gate = progress.levelGate(all, all.indexOf(level), p);
    if (!gate.open) { renderShutLevel(level, gate); return; }
    renderLevel(level, all, p);
    return;
  }

  paintRoomHead('chess', 'cz-chess-pic');
  renderHub(all, p);
  showScreen('chess');
}
