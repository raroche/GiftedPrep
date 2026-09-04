/**
 * screens/chessopenings.js — the openings library.
 *
 * A place to look up a named opening: what it is, what it is trying to do,
 * when to choose it, how to meet it when you are on the other side, and the
 * trap that comes with it if it has one.
 *
 * The research note (docs/research/chess/06-openings-and-tactics.md) is
 * emphatic about the shape of this, and every coaching source agrees: an
 * openings page must not be a move dump. A child who memorises a list is
 * helpless on the first move that is not in it. So the moves are never shown
 * as a paragraph of notation. They are played, one at a time, on a board,
 * with a sentence saying what the whole thing is FOR sitting above them.
 *
 * "How to meet it" is the part most opening resources skip, and it is half of
 * what anybody actually needs: you are on the other side of every opening
 * roughly half the time.
 */

import { Chess } from './../vendor/chess.js';
import { createBoard } from './../modules/chessboard.js';
import * as progress from './../modules/chessprogress.js';
import { escapeHtml } from './../modules/charts.js';
import { $, paint, showScreen, state } from './../modules/shell.js';

const esc = escapeHtml;

let book = null;

export function closeOpenings() {
  if (state.chess.board) { state.chess.board.destroy(); state.chess.board = null; }
  state.chess.opening = null;
}

/** The library, fetched once. */
async function load() {
  if (book) return book;
  const res = await fetch('data/chess/openings.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load the openings');
  book = await res.json();
  return book;
}

/* ------------------------------------------------------------------ */
/* The shelf                                                           */
/* ------------------------------------------------------------------ */

function renderShelf(data) {
  const card = (o) => `
    <a class="cz-open-card" href="#/chess/openings/${esc(o.id)}">
      <span class="cz-open-card__emoji" aria-hidden="true">${o.emoji}</span>
      <span class="cz-open-card__name">${esc(o.name)}</span>
      <span class="cz-open-card__idea">${esc(o.idea)}</span>
      <span class="cz-open-card__tags">
        <span class="cz-open-tag">${o.side === 'w' ? 'White' : 'Black'}</span>
        ${o.trap ? '<span class="cz-open-tag cz-open-tag--trap">Trap inside</span>' : ''}
      </span>
    </a>`;

  const family = (f) => {
    const mine = data.openings.filter((o) => o.family === f.id);
    if (!mine.length) return '';
    return `<section class="cz-open-family">
        <h2 class="cz-open-family__name">${esc(f.name)}</h2>
        <p class="cz-open-family__blurb">${esc(f.blurb)}</p>
        <div class="cz-open-cards">${mine.map(card).join('')}</div>
      </section>`;
  };

  $('#gp-chessopenings-body').innerHTML = `
    <p class="gp-page-lede">Famous openings, and what each one is really trying
      to do. Nothing here is worth learning by heart.</p>
    <p class="cz-open-note">Take the middle, get your pieces out, make your king
      safe. Every opening below is one way of doing those three things. If you
      remember the reason you will find a good move even when they surprise you.</p>
    ${data.families.map(family).join('')}`;
  paint();
  showScreen('chessopenings');
}

/* ------------------------------------------------------------------ */
/* One opening                                                         */
/* ------------------------------------------------------------------ */

/** Replay `moves` up to `to`, and hand back the position and the last move. */
function positionAfter(moves, to) {
  const game = new Chess();
  let played = 0;
  for (let i = 0; i < to; i += 1) {
    try { game.move(moves[i]); played += 1; } catch { break; }
  }
  return { game, played, last: game.history({ verbose: true }).at(-1) || null };
}

function renderOne(data, o) {
  state.chess.opening = { spec: o, line: 'main', at: 0 };

  $('#chessopenings-title').textContent = `${o.emoji} ${o.name}`;
  $('#gp-chessopenings-body').innerHTML = `
    <div class="cz-open">
      <div class="cz-open__board" id="gp-open-board"></div>
      <div class="cz-open__side">
        <p class="cz-open__idea">${esc(o.idea)}</p>

        <div class="cz-open__moves" id="gp-open-moves"></div>
        <div class="cz-open__nav">
          <button type="button" class="gp-btn gp-btn--icon" data-action="chess-openback"
            aria-label="A move back">&larr;</button>
          <span class="cz-open__at" id="gp-open-at" aria-live="polite"></span>
          <button type="button" class="gp-btn gp-btn--icon" data-action="chess-openfwd"
            aria-label="A move on">&rarr;</button>
          <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-openreset">
            Start again</button>
        </div>

        ${o.trap ? `<div class="gp-row gp-row--wrap cz-open__lines">
          <button type="button" class="gp-btn gp-btn--quiet is-on" data-action="chess-openmain">
            The main line</button>
          <button type="button" class="gp-btn gp-btn--quiet" data-action="chess-opentrap">
            ${esc(o.trap.name)}</button>
        </div>` : ''}

        <dl class="cz-open__facts">
          <dt>When to play it</dt><dd>${esc(o.when)}</dd>
          <dt>How to meet it</dt><dd>${esc(o.meet)}</dd>
          <dt>Who played it</dt><dd>${esc(o.famous)}</dd>
        </dl>

        <p class="cz-open__back"><a class="gp-btn gp-btn--quiet"
          href="#/chess/openings">All the openings</a></p>
      </div>
    </div>`;

  const board = createBoard($('#gp-open-board'), {
    fen: new Chess().fen(),
    orientation: o.side,
    label: `${o.name} board`,
    theme: progress.load().theme
  });
  state.chess.board = board;
  board.lock();
  paint();
  showScreen('chessopenings');
  drawLine();
}

/** The moves of whichever line is showing, and where we are in it. */
function currentMoves() {
  const open = state.chess.opening;
  if (!open) return [];
  return open.line === 'trap' && open.spec.trap ? open.spec.trap.moves : open.spec.moves;
}

function drawLine() {
  const open = state.chess.opening;
  const board = state.chess.board;
  if (!open || !board) return;
  const moves = currentMoves();
  const { game, played, last } = positionAfter(moves, open.at);

  board.setFen(game.fen());
  board.mark(last ? { last: [last.from, last.to] } : {});
  if (last) board.announce(`${last.color === 'w' ? 'White' : 'Black'} plays ${last.san}.`);

  /* Every move as its own button, so a child can jump straight to the one
     they want instead of clicking an arrow nine times. */
  const list = $('#gp-open-moves');
  if (list) {
    list.innerHTML = moves.map((san, i) => {
      const n = i % 2 === 0 ? `<span class="cz-open__no">${i / 2 + 1}.</span>` : '';
      return `${n}<button type="button" class="cz-open__move${i < open.at ? ' is-done' : ''}${
        i === open.at - 1 ? ' is-now' : ''}" data-openat="${i + 1}">${esc(san)}</button>`;
    }).join('');
  }

  const at = $('#gp-open-at');
  if (at) at.textContent = played === 0 ? 'the start' : `move ${played} of ${moves.length}`;

  const back = $('[data-action="chess-openback"]');
  const fwd = $('[data-action="chess-openfwd"]');
  if (back) back.disabled = open.at === 0;
  if (fwd) fwd.disabled = open.at >= moves.length;

  /* What the trap is about, once a child has switched to it. */
  const idea = $('.cz-open__idea');
  if (idea) {
    idea.textContent = open.line === 'trap' && open.spec.trap
      ? open.spec.trap.say : open.spec.idea;
  }
  for (const [name, on] of [['chess-openmain', open.line === 'main'],
    ['chess-opentrap', open.line === 'trap']]) {
    const el = $(`[data-action="${name}"]`);
    if (el) el.classList.toggle('is-on', on);
  }
  paint();
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

/** Every data-action="chess-open..." on this screen. */
export function openingsAction(name, el) {
  const open = state.chess.opening;
  if (!open) return false;
  const moves = currentMoves();

  switch (name) {
    case 'chess-openback':
      open.at = Math.max(0, open.at - 1);
      drawLine();
      return true;

    case 'chess-openfwd':
      open.at = Math.min(moves.length, open.at + 1);
      drawLine();
      return true;

    case 'chess-openreset':
      open.at = 0;
      drawLine();
      return true;

    case 'chess-openmain':
      open.line = 'main';
      open.at = 0;
      drawLine();
      return true;

    case 'chess-opentrap':
      open.line = 'trap';
      open.at = 0;
      drawLine();
      return true;

    case 'chess-openat': {
      const to = Number(el && el.dataset.openat);
      if (Number.isFinite(to)) { open.at = Math.max(0, Math.min(moves.length, to)); drawLine(); }
      return true;
    }

    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

/** #/chess/openings and #/chess/openings/<id>. */
export async function renderOpenings(id) {
  closeOpenings();
  let data;
  try {
    data = await load();
  } catch (err) {
    console.error(err);
    return false;
  }
  if (id) {
    const o = data.openings.find((x) => x.id === id);
    /* An address nobody wrote goes to the shelf rather than to a blank page. */
    if (!o) { window.location.hash = '#/chess/openings'; return true; }
    renderOne(data, o);
    return true;
  }
  $('#chessopenings-title').textContent = 'Openings';
  renderShelf(data);
  return true;
}

export default { renderOpenings, closeOpenings, openingsAction };
