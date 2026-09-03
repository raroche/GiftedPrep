/**
 * chessboard.js — the board a child touches.
 *
 * One SVG on an 8x8 grid, drawn from a FEN, plus the marks a lesson needs to
 * point at things: the last move, legal-move dots, a check ring, stars to
 * collect, and arrows. It knows nothing about rules. It is handed a position
 * and asks its caller two questions — may this piece be lifted, and where may
 * it go — so the same board serves a lesson diagram, a mini-game with no
 * kings, a puzzle and a full game. The arithmetic under it all lives in
 * chesssquares.js, which has no DOM and is tested in node.
 *
 * Why hand-drawn rather than a library: the two good ones are chessground,
 * which is GPL-3 and would put its licence on this whole app, and
 * cm-chessboard, which is twenty modules and ships a non-commercial piece set
 * by default. This file is smaller than either and matches the SVG the rest of
 * the site already draws.
 *
 * Three things here are load-bearing and easy to undo by accident:
 *
 *   Pieces are positioned with a `transform` ATTRIBUTE, not a style. Under
 *   `style-src 'self'` the browser drops style attributes silently, so a
 *   board positioned that way is thirty-two pieces stacked on a1. The CSS
 *   transition on `.cz-cb__piece` still animates the attribute, because a
 *   presentation attribute is just a low-priority CSS declaration.
 *
 *   Every <use> points at a symbol from chesspieces.js. If those symbols are
 *   not in the document, SVG draws nothing, logs nothing and throws nothing —
 *   an empty board looks exactly like one that has not loaded. ensurePieceDefs
 *   runs before the first draw.
 *
 *   The SVG is aria-hidden and a real grid of 64 buttons sits beside it,
 *   invisible but focusable. That grid is not decoration: it is the only way
 *   the board can be played with a keyboard or heard by a screen reader, and
 *   both halves call the same two functions.
 */

import { ensurePieceDefs } from './chesspieces.js';
import {
  SQUARES, isSquare, squareToXY, xyToSquare, isLightSquare,
  fenToPosition, squareLabel, positionDiff, pairMovers
} from './chesssquares.js';

/* Re-exported so a screen can import the board and its square maths from one
   place. chesssquares.js is the home of all of it. */
export {
  FILES, RANKS, SQUARES, isSquare, squareToXY, xyToSquare, isLightSquare,
  fenToPosition, squareLabel, positionDiff, pairMovers
} from './chesssquares.js';

/* ------------------------------------------------------------------ */
/* Drawing                                                             */
/* ------------------------------------------------------------------ */

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) node.setAttribute(k, String(v));
  }
  return node;
};

/* How far a pointer may wander before it counts as a drag rather than a tap.
   Six pixels: a finger on an iPad never holds still, and treating the wobble
   as a drag made tap-to-move feel broken. */
const DRAG_SLOP = 6;

const PROMO_ORDER = ['q', 'r', 'b', 'n'];

/**
 * Build a board inside `container`.
 *
 * @param {Element} container
 * @param {object} opts
 * @param {string} [opts.fen]              starting position
 * @param {'w'|'b'} [opts.orientation]     which colour is at the bottom
 * @param {boolean} [opts.interactive]     may anything be moved at all
 * @param {(from:string)=>boolean} [opts.canMove]   may this piece be lifted
 * @param {(from:string)=>string[]} [opts.dests]    where may it go
 * @param {(from:string,to:string,promo?:string)=>boolean} [opts.onMove]
 *        return false to refuse the move; the piece goes home
 * @param {(sq:string)=>void} [opts.onSquare]  tapped a square with nothing selected
 * @param {boolean} [opts.coords]          draw file letters and rank numbers
 * @param {string} [opts.label]            what the grid is called out loud
 */
export function createBoard(container, opts = {}) {
  if (!container) throw new Error('createBoard: no container');
  ensurePieceDefs(container.ownerDocument || document);

  const state = {
    fen: opts.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    position: {},
    orientation: opts.orientation === 'b' ? 'b' : 'w',
    interactive: opts.interactive !== false,
    locked: false,
    /* Marks the caller asked for, kept apart from the ones the board makes
       for itself while a child is mid-move. Merging them at paint time is
       what stops a lesson's arrow vanishing the moment a piece is picked up. */
    marks: {},
    select: null,
    dots: [],
    drag: null,
    promo: null
  };

  /* A board with no onMove cannot move anything, so nothing on it should
     look pickable-up. Without this a "tap the right square" step selected the
     piece standing on the square instead of counting the tap, and the child
     could never answer a question whose answer had a piece on it. */
  const onMove = opts.onMove || null;
  const canMove = opts.canMove || (onMove ? () => true : () => false);
  const dests = opts.dests || (() => []);
  const onSquare = opts.onSquare || null;

  /* ---- skeleton ---- */

  container.classList.add('cz-cb');
  container.innerHTML = '';
  container.dataset.orientation = state.orientation;

  const svg = el('svg', {
    class: 'cz-cb__svg',
    viewBox: '0 0 8 8',
    'aria-hidden': 'true',
    focusable: 'false'
  });

  const defs = el('defs');
  /* One marker per board rather than one per document: two boards on a page
     with the same marker id is a bug nobody sees until the second one. */
  const arrowId = `cz-cb-arrow-${Math.random().toString(36).slice(2, 8)}`;
  const marker = el('marker', {
    id: arrowId, viewBox: '0 0 10 10', refX: '7', refY: '5',
    markerWidth: '4', markerHeight: '4', orient: 'auto-start-reverse'
  });
  marker.appendChild(el('path', { d: 'M0 0 L10 5 L0 10 z', class: 'cz-cb__arrowhead' }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  const gSquares = el('g', { class: 'cz-cb__squares' });
  const gUnder = el('g', { class: 'cz-cb__under' });
  const gPieces = el('g', { class: 'cz-cb__pieces' });
  const gOver = el('g', { class: 'cz-cb__over' });
  const gPromo = el('g', { class: 'cz-cb__promo', hidden: 'hidden' });
  svg.append(gSquares, gUnder, gPieces, gOver, gPromo);

  for (const sq of SQUARES) {
    const { x, y } = squareToXY(sq, state.orientation);
    gSquares.appendChild(el('rect', {
      class: `cz-cb__sq cz-cb__sq--${isLightSquare(sq) ? 'light' : 'dark'}`,
      x, y, width: 1, height: 1, 'data-sq': sq
    }));
  }

  const gCoords = el('g', { class: 'cz-cb__coords', 'aria-hidden': 'true' });
  if (opts.coords !== false) svg.appendChild(gCoords);

  container.appendChild(svg);

  /* The accessible half. Invisible, focusable, and wired to the same two
     functions the pointer uses, so it can never drift out of step. */
  const grid = document.createElement('div');
  grid.className = 'cz-cb__grid gp-sr-only';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', opts.label || 'Chess board');
  const cells = new Map();
  const cellAt = [];              // [row][col], in drawing order
  for (let r = 0; r < 8; r += 1) {
    const row = document.createElement('div');
    row.setAttribute('role', 'row');
    cellAt[r] = [];
    for (let c = 0; c < 8; c += 1) {
      const sq = xyToSquare(c, r, state.orientation);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'gridcell');
      /* Roving tabindex: the grid is ONE tab stop and the arrows move inside
         it. Sixty-four tab stops is what this had first, which means a
         keyboard user pressing Tab past the board does it sixty-four times. */
      btn.tabIndex = (r === 7 && c === 0) ? 0 : -1;
      btn.dataset.sq = sq;
      row.appendChild(btn);
      cells.set(sq, btn);
      cellAt[r][c] = btn;
    }
    grid.appendChild(row);
  }
  container.appendChild(grid);

  /* Which cell carries the tab stop. It starts in the near-left corner, which
     is a1 for White and h8 for Black: where a player's own pieces are. */
  let cursor = { r: 7, c: 0 };

  function moveCursor(to) {
    cellAt[cursor.r][cursor.c].tabIndex = -1;
    cursor = { r: Math.min(7, Math.max(0, to.r)), c: Math.min(7, Math.max(0, to.c)) };
    const btn = cellAt[cursor.r][cursor.c];
    btn.tabIndex = 0;
    btn.focus();
  }

  const ARROWS = {
    ArrowUp: { r: -1, c: 0 }, ArrowDown: { r: 1, c: 0 },
    ArrowLeft: { r: 0, c: -1 }, ArrowRight: { r: 0, c: 1 }
  };

  grid.addEventListener('keydown', (ev) => {
    const btn = ev.target.closest('[data-sq]');
    if (!btn) return;
    /* Re-find where focus actually is, so a click followed by an arrow key
       does not jump back to wherever the cursor was last left. */
    for (let r = 0; r < 8; r += 1) {
      const c = cellAt[r].indexOf(btn);
      if (c !== -1) { cursor = { r, c }; break; }
    }
    const step = ARROWS[ev.key];
    if (step) { ev.preventDefault(); moveCursor({ r: cursor.r + step.r, c: cursor.c + step.c }); return; }
    if (ev.key === 'Home') {
      ev.preventDefault();
      moveCursor(ev.ctrlKey ? { r: 0, c: 0 } : { r: cursor.r, c: 0 });
      return;
    }
    if (ev.key === 'End') {
      ev.preventDefault();
      moveCursor(ev.ctrlKey ? { r: 7, c: 7 } : { r: cursor.r, c: 7 });
    }
  });

  const live = document.createElement('div');
  live.className = 'cz-cb__live gp-sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  container.appendChild(live);

  /* ---- painting ---- */

  const pieces = new Map();   // square -> <use>

  /**
   * File letters along the bottom, rank numbers up the left.
   *
   * Each one is tinted with the colour of the OTHER kind of square, because a
   * coordinate painted in one fixed colour disappears on half the board —
   * which is how this first shipped, showing only 8, 6, 4 and 2.
   */
  function drawCoords() {
    if (opts.coords === false) return;
    gCoords.innerHTML = '';
    const inkFor = (sq) => (isLightSquare(sq) ? 'on-light' : 'on-dark');
    for (let i = 0; i < 8; i += 1) {
      const fileSq = xyToSquare(i, 7, state.orientation);
      const rankSq = xyToSquare(0, i, state.orientation);

      const f = el('text', {
        class: `cz-cb__coord cz-cb__coord--file is-${inkFor(fileSq)}`,
        x: i + 0.93, y: 7.9
      });
      f.textContent = fileSq[0];
      const r = el('text', {
        class: `cz-cb__coord cz-cb__coord--rank is-${inkFor(rankSq)}`,
        x: 0.07, y: i + 0.28
      });
      r.textContent = rankSq[1];
      gCoords.append(f, r);
    }
  }

  const place = (node, sq) => {
    const { x, y } = squareToXY(sq, state.orientation);
    node.setAttribute('transform', `translate(${x} ${y})`);
  };

  /**
   * Redraw from state.fen, moving pieces rather than replacing them.
   *
   * The first version deleted every changed square and made new elements, so
   * a move was a teleport: the CSS transition on .cz-cb__piece existed and
   * never once ran, because a brand-new element has nothing to transition
   * FROM. Matching each arriving piece to a departing one of the same kind
   * means the node survives the move and slides, which is the difference
   * between a board that feels alive and a board that blinks.
   *
   * It falls out of this that a promotion does NOT slide: a pawn leaves and a
   * queen arrives, and they are not the same piece. That is the right answer.
   */
  function drawPieces() {
    const next = fenToPosition(state.fen);
    const changed = positionDiff(state.position, next);
    if (!changed.size) { state.position = next; labelCells(); return; }

    const left = [];        // pieces that are no longer where they were
    const arrived = [];     // pieces that are somewhere they were not
    for (const sq of changed) {
      if (state.position[sq]) left.push({ sq, code: state.position[sq], node: pieces.get(sq) });
      if (next[sq]) arrived.push({ sq, code: next[sq] });
      pieces.delete(sq);
    }

    const pairs = pairMovers(left.filter((x) => x.node), arrived, state.orientation);
    const bySquare = new Map(left.map((x) => [x.sq, x]));
    for (const to of arrived) {
      const from = bySquare.get(pairs.get(to.sq));
      if (!from) continue;
      from.used = true;
      to.node = from.node;
    }

    /* Whatever was not paired has been captured, or has promoted away. */
    for (const from of left) if (!from.used && from.node) from.node.remove();

    for (const to of arrived) {
      if (to.node) {
        to.node.dataset.sq = to.sq;
        /* On top of the others while it travels, so it passes over anything
           it crosses rather than under. */
        gPieces.appendChild(to.node);
        place(to.node, to.sq);
      } else {
        /* A new element has no previous position, so it simply appears; the
           transition has nothing to run from and needs no suppressing. */
        to.node = el('use', {
          class: 'cz-cb__piece',
          href: `#cz-p-${to.code}`,
          width: 1, height: 1,
          'data-sq': to.sq, 'data-piece': to.code
        });
        place(to.node, to.sq);
        gPieces.appendChild(to.node);
      }
      pieces.set(to.sq, to.node);
    }
    state.position = next;
    labelCells();
  }

  function labelCells() {
    for (const [sq, btn] of cells) {
      const label = squareLabel(sq, state.position[sq]);
      if (btn.getAttribute('aria-label') !== label) btn.setAttribute('aria-label', label);
    }
  }

  function drawMarks() {
    gUnder.innerHTML = '';
    gOver.innerHTML = '';
    const m = state.marks;
    const at = (sq) => squareToXY(sq, state.orientation);

    for (const sq of m.last || []) {
      if (!isSquare(sq)) continue;
      const { x, y } = at(sq);
      gUnder.appendChild(el('rect', { class: 'cz-cb__last', x, y, width: 1, height: 1 }));
    }
    if (state.select) {
      const { x, y } = at(state.select);
      gUnder.appendChild(el('rect', { class: 'cz-cb__select', x, y, width: 1, height: 1 }));
    }
    for (const sq of m.stars || []) {
      if (!isSquare(sq)) continue;
      const { x, y } = at(sq);
      gUnder.appendChild(el('path', {
        class: 'cz-cb__star',
        d: starPath(x + 0.5, y + 0.5, 0.3, 0.135)
      }));
    }
    if (m.check && isSquare(m.check)) {
      const { x, y } = at(m.check);
      gOver.appendChild(el('circle', {
        class: 'cz-cb__check', cx: x + 0.5, cy: y + 0.5, r: 0.46
      }));
    }
    for (const sq of m.ring || []) {
      if (!isSquare(sq)) continue;
      const { x, y } = at(sq);
      gOver.appendChild(el('rect', {
        class: 'cz-cb__ring', x: x + 0.05, y: y + 0.05, width: 0.9, height: 0.9, rx: 0.1
      }));
    }
    /* Dots for where a lifted piece may go. A capture gets a ring instead of
       a dot, because a dot under a piece is invisible and "you may take that"
       is the one thing a beginner most needs to see.

       While a piece is held they are that piece's moves; the rest of the time
       they are whatever the caller asked for. That second half was missing at
       first, so a lesson saying mark({ dots: [...] }) to show where a rook can
       go drew nothing at all, in silence. */
    const dots = state.select ? state.dots : (m.dots || []);
    for (const sq of dots) {
      if (!isSquare(sq)) continue;
      const { x, y } = at(sq);
      gOver.appendChild(state.position[sq]
        ? el('circle', { class: 'cz-cb__dot cz-cb__dot--take', cx: x + 0.5, cy: y + 0.5, r: 0.45 })
        : el('circle', { class: 'cz-cb__dot', cx: x + 0.5, cy: y + 0.5, r: 0.16 }));
    }
    for (const [from, to] of m.arrows || []) {
      if (!isSquare(from) || !isSquare(to)) continue;
      const a = at(from);
      const b = at(to);
      gOver.appendChild(el('line', {
        class: 'cz-cb__arrow',
        x1: a.x + 0.5, y1: a.y + 0.5, x2: b.x + 0.5, y2: b.y + 0.5,
        'marker-end': `url(#${arrowId})`
      }));
    }
  }

  function starPath(cx, cy, outer, inner) {
    const pts = [];
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 ? inner : outer;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(3)} ${(cy + r * Math.sin(a)).toFixed(3)}`);
    }
    return `M${pts.join('L')}Z`;
  }

  /* ---- interaction ---- */

  const playable = () => state.interactive && !state.locked && !state.promo;

  function select(sq) {
    state.select = sq;
    state.dots = sq ? (dests(sq) || []).filter(isSquare) : [];
    drawMarks();
  }

  /** One square was chosen, by finger, mouse, keyboard or screen reader. */
  function tapSquare(sq) {
    if (!playable()) return;
    if (state.select) {
      if (sq === state.select) { select(null); return; }
      if (state.dots.includes(sq)) { attempt(state.select, sq); return; }
      if (state.position[sq] && canMove(sq)) { select(sq); return; }
      select(null);
      return;
    }
    if (state.position[sq] && canMove(sq)) { select(sq); return; }
    if (onSquare) onSquare(sq);
  }

  /** A pawn reaching the far rank has to be asked what it becomes. */
  const needsPromotion = (from, to) => {
    const code = state.position[from];
    if (!code || code[1] !== 'P') return false;
    return (code[0] === 'w' && to[1] === '8') || (code[0] === 'b' && to[1] === '1');
  };

  function attempt(from, to, promo) {
    if (needsPromotion(from, to) && !promo) { askPromotion(from, to); return; }
    select(null);
    const ok = onMove ? onMove(from, to, promo) : false;
    if (ok === false) render();
  }

  function askPromotion(from, to) {
    state.promo = { from, to };
    /* The veil only dims what is under it, so the move dots stayed bright on
       top of a darkened board and looked like a second thing to choose. */
    state.select = null;
    state.dots = [];
    drawMarks();
    const colour = (state.position[from] || 'w')[0];
    const { x } = squareToXY(to, state.orientation);
    gPromo.innerHTML = '';
    gPromo.removeAttribute('hidden');
    gPromo.appendChild(el('rect', {
      class: 'cz-cb__promoveil', x: 0, y: 0, width: 8, height: 8
    }));
    /* The column of choices grows down from the promotion square when that
       square is at the top, and up when it is at the bottom, so it is always
       on the board rather than half off the edge. */
    const top = squareToXY(to, state.orientation).y === 0;
    PROMO_ORDER.forEach((letter, i) => {
      const y = top ? i : 7 - i;
      const code = colour + letter.toUpperCase();
      const cell = el('g', { class: 'cz-cb__promopick', 'data-promo': letter });
      cell.appendChild(el('rect', { class: 'cz-cb__promocell', x, y, width: 1, height: 1 }));
      const use = el('use', { href: `#cz-p-${code}`, width: 1, height: 1 });
      use.setAttribute('transform', `translate(${x} ${y})`);
      cell.appendChild(use);
      gPromo.appendChild(cell);
    });
    announce('Choose a piece: queen, rook, bishop or knight.');
  }

  function closePromotion() {
    state.promo = null;
    gPromo.innerHTML = '';
    gPromo.setAttribute('hidden', 'hidden');
  }

  /** Pointer position in board units. */
  function pointAt(ev) {
    const box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    return { x: ((ev.clientX - box.left) / box.width) * 8, y: ((ev.clientY - box.top) / box.height) * 8 };
  }

  function onPointerDown(ev) {
    if (ev.button != null && ev.button !== 0) return;
    const pt = pointAt(ev);
    if (!pt) return;

    if (state.promo) {
      const pick = ev.target.closest && ev.target.closest('[data-promo]');
      const { from, to } = state.promo;
      closePromotion();
      if (pick) attempt(from, to, pick.dataset.promo);
      else { select(null); render(); }
      return;
    }
    if (!playable()) return;

    const sq = xyToSquare(pt.x, pt.y, state.orientation);
    if (!sq) return;

    /* A press on a liftable piece might become a drag; anything else is
       settled on release, so a tap that lands on a dot still works. */
    const node = pieces.get(sq);
    state.drag = {
      from: sq, node, moved: false, start: pt,
      liftable: Boolean(node) && canMove(sq),
      hadSelection: state.select
    };
    try { svg.setPointerCapture(ev.pointerId); } catch { /* mouse in old browsers */ }
  }

  function onPointerMove(ev) {
    const d = state.drag;
    if (!d || !d.liftable) return;
    const pt = pointAt(ev);
    if (!pt) return;
    const far = Math.hypot((pt.x - d.start.x) * 60, (pt.y - d.start.y) * 60) > DRAG_SLOP;
    if (!d.moved && !far) return;
    if (!d.moved) {
      d.moved = true;
      d.node.classList.add('is-dragging');
      gPieces.appendChild(d.node);   // on top of the others while it is held
      if (state.select !== d.from) select(d.from);
    }
    ev.preventDefault();
    d.node.setAttribute('transform', `translate(${pt.x - 0.5} ${pt.y - 0.5})`);
  }

  function onPointerUp(ev) {
    const d = state.drag;
    state.drag = null;
    try { svg.releasePointerCapture(ev.pointerId); } catch { /* never captured */ }
    if (!d) return;

    const pt = pointAt(ev);
    const sq = pt ? xyToSquare(pt.x, pt.y, state.orientation) : null;

    if (!d.moved) { if (sq) tapSquare(sq); return; }

    d.node.classList.remove('is-dragging');
    if (sq && sq !== d.from && state.dots.includes(sq)) { attempt(d.from, sq); return; }
    /* Dropped somewhere it may not go. Put it back and keep it selected, so
       the dots stay up and the next tap still works. */
    place(d.node, d.from);
    if (sq === d.from && d.hadSelection === d.from) select(null);
  }

  function onCancel() {
    const d = state.drag;
    state.drag = null;
    if (d && d.moved) { d.node.classList.remove('is-dragging'); place(d.node, d.from); }
  }

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('pointercancel', onCancel);
  /* Without this a drag on a touch screen scrolls the page instead. */
  svg.addEventListener('touchstart', (ev) => { if (playable()) ev.preventDefault(); }, { passive: false });

  grid.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-sq]');
    if (!btn) return;
    if (state.promo) return;
    tapSquare(btn.dataset.sq);
  });

  /* ---- the board object ---- */

  /**
   * Move every piece with no animation at all, right now.
   *
   * Turning the board round is not a move and must not look like thirty-two
   * pieces swimming across each other. The class comes off in the same task
   * after a forced reflow, rather than on the next animation frame: a hidden
   * tab does not run animation frames, so the frame-based version left every
   * piece permanently unable to animate if the board was built in the
   * background — silently, because a board that does not animate still looks
   * like a board.
   */
  function withoutAnimation(fn) {
    container.classList.add('is-still');
    fn();
    void svg.getBoundingClientRect();   // commit the new positions un-animated
    container.classList.remove('is-still');
  }

  function render() {
    drawPieces();
    drawMarks();
  }

  function announce(text) {
    if (!text) return;
    /* Same string twice in a row is not re-read by a screen reader unless the
       node changes, and "e4" twice is a real thing to say in chess. */
    live.textContent = live.textContent === text ? `${text} ` : text;
  }

  drawCoords();
  render();

  const board = {
    el: container,
    svg,

    setFen(fen, { animate = true } = {}) {
      state.fen = fen;
      state.select = null;
      state.dots = [];
      closePromotion();
      if (animate) render(); else withoutAnimation(render);
      return board;
    },

    /** Replace the caller's marks. Anything left out is cleared. */
    mark(marks = {}) {
      state.marks = marks;
      drawMarks();
      return board;
    },

    clear() { return board.mark({}); },

    flip(to) {
      state.orientation = to || (state.orientation === 'w' ? 'b' : 'w');
      container.dataset.orientation = state.orientation;
      /* Rebuild rather than move: squares, labels and the accessible grid all
         have to agree about which way round the board is. */
      gSquares.querySelectorAll('[data-sq]').forEach((rect) => {
        const { x, y } = squareToXY(rect.dataset.sq, state.orientation);
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
      });
      cells.clear();
      for (let r = 0; r < 8; r += 1) {
        for (let c = 0; c < 8; c += 1) {
          const btn = cellAt[r][c];
          btn.dataset.sq = xyToSquare(c, r, state.orientation);
          /* cells is keyed by square name, so turning the board round means
             rebuilding it, not just relabelling the buttons. */
          cells.set(btn.dataset.sq, btn);
        }
      }
      withoutAnimation(() => pieces.forEach((node, sq) => place(node, sq)));
      drawCoords();
      labelCells();
      drawMarks();
      return board;
    },

    get orientation() { return state.orientation; },
    get fen() { return state.fen; },
    get position() { return { ...state.position }; },

    select(sq) { select(isSquare(sq) ? sq : null); return board; },
    lock() { state.locked = true; container.classList.add('is-locked'); select(null); return board; },
    unlock() { state.locked = false; container.classList.remove('is-locked'); return board; },
    announce,

    destroy() {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointercancel', onCancel);
      container.innerHTML = '';
      container.classList.remove('cz-cb');
    }
  };

  return board;
}

export default { createBoard };
