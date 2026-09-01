/**
 * Math Lab — grade-by-grade advanced maths pages.
 *
 * A topic is a short lesson followed by exercises taken one at a time. The
 * lesson is deliberately tiny: a first grader will not read a paragraph, so
 * the pictures do the explaining and the words only name what is shown.
 *
 * Six exercise types, because a page that asks the same thing eight times in
 * a row stops being interesting on the third:
 *
 *   choice     tap one of a few pictures or numbers
 *   number     type a number
 *   truefalse  decide whether an equation holds
 *   build      fill a ten frame or an array by tapping
 *   paper      leave the screen, work it out with a pencil, come back
 *   collect    open ended, find as many answers as you can
 *
 * This module owns the markup and the checking. Routing and persistence stay
 * in app.js, the same split the quiz screens use.
 */

import { renderFigure } from './figures.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

const cache = new Map();

export async function loadGrade(grade) {
  if (cache.has(grade)) return cache.get(grade);
  const res = await fetch(`data/math/grade${grade}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No math data for grade ${grade}`);
  const data = await res.json();
  cache.set(grade, data);
  return data;
}

/** Grades that have a page written. The rest are shown as not ready yet. */
export const READY_GRADES = [1, 2, 3, 4, 5];

/* ------------------------------------------------------------------ */
/* Grade index                                                         */
/* ------------------------------------------------------------------ */

export function renderGradeIndex() {
  const cards = [1, 2, 3, 4].map((g) => {
    const ready = READY_GRADES.includes(g);
    const inner = `
      <span class="gp-card__icon" aria-hidden="true">${g}</span>
      <span class="gp-card__title">Grade ${g}</span>
      <span class="gp-card__sub">${ready
        ? 'Eight big ideas, with lessons and puzzles.'
        : 'Not written yet.'}</span>`;
    return ready
      ? `<a class="gp-card gp-card--action" href="#/math/${g}">${inner}</a>`
      : `<div class="gp-card gp-card--action is-disabled" aria-disabled="true">${inner}</div>`;
  }).join('');
  return `<div class="gp-grid gp-grid--start">${cards}</div>`;
}

/* ------------------------------------------------------------------ */
/* Topic index for one grade                                           */
/* ------------------------------------------------------------------ */

export function renderTopicIndex(data, done = {}) {
  /* Two tracks. Big ideas lead, because that is what a child comes back for,
     and the number work sits underneath where it belongs. */
  const tracks = data.tracks || [{ id: null, name: '', blurb: '' }];
  return tracks.map((tr) => {
    const inTrack = data.topics.filter((t) => (t.track || null) === tr.id);
    if (!inTrack.length) return '';
    return `<section class="gp-track">
      ${tr.name ? `<h2 class="gp-track__head">${esc(tr.name)}</h2>` : ''}
      ${tr.blurb ? `<p class="gp-track__sub">${esc(tr.blurb)}</p>` : ''}
      ${topicCards(inTrack, data.grade, done)}
    </section>`;
  }).join('');
}

function topicCards(topics, grade, done) {
  const cards = topics.map((t, i) => {
    const n = (done[t.id] || 0);
    const total = t.exercises.length;
    const bar = n
      ? `<span class="gp-topic__bar"><span data-style="width:${Math.round((n / total) * 100)}%"></span></span>`
      : '';
    return `
      <a class="gp-card gp-card--topic" href="#/math/${grade}/${t.id}">
        <span class="gp-topic__num" aria-hidden="true">${i + 1}</span>
        <span class="gp-topic__emoji" aria-hidden="true">${t.emoji}</span>
        <span class="gp-card__title">${esc(t.name)}</span>
        <span class="gp-card__sub">${esc(t.big)}</span>
        ${bar}
        <span class="gp-topic__count">${n ? `${n} of ${total} done` : `${total} puzzles`}</span>
      </a>`;
  }).join('');
  return `<div class="gp-grid gp-grid--topics">${cards}</div>`;
}

/* ------------------------------------------------------------------ */
/* The lesson                                                          */
/* ------------------------------------------------------------------ */

export function renderTeach(topic) {
  const blocks = (topic.teach || []).map((b) => {
    if (b.t === 'say') return `<p class="gp-teach__say">${esc(b.text)}</p>`;
    if (b.t === 'tip') {
      return `<div class="gp-teach__tip"><span aria-hidden="true">💡</span><p>${esc(b.text)}</p></div>`;
    }
    if (b.t === 'show') {
      return `<figure class="gp-teach__show">
        <div class="gp-teach__fig">${renderFigure(b.figure)}</div>
        ${b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ''}
      </figure>`;
    }
    return '';
  }).join('');
  /* Collapsible, with the control repeated at the bottom. The lesson is taller
     than a phone screen, so a single toggle at the top is out of reach by the
     time you have finished reading, which reads as no way to close it at all.
     The button at the end is the one that will actually get used: it closes
     the lesson and drops you straight onto the first puzzle. */
  return `<details class="gp-teachwrap" open>
    <summary class="gp-teach__toggle">
      <span aria-hidden="true">📖</span>
      <span class="gp-teach__toggle-open">Hide the lesson</span>
      <span class="gp-teach__toggle-shut">Show the lesson</span>
    </summary>
    <section class="gp-teach">
      ${blocks}
      <button type="button" class="gp-btn gp-btn--primary gp-teach__go" data-lesson-done>
        Start the puzzles &darr;
      </button>
    </section>
  </details>`;
}

/* ------------------------------------------------------------------ */
/* Exercises                                                           */
/* ------------------------------------------------------------------ */

const TYPE_BADGE = {
  choice: { label: 'Tap it', icon: '👆' },
  number: { label: 'Type it', icon: '⌨️' },
  truefalse: { label: 'True or false', icon: '🤔' },
  build: { label: 'Build it', icon: '🧱' },
  paper: { label: 'Pencil job', icon: '✏️' },
  collect: { label: 'Find them all', icon: '🔎' },
  colormap: { label: 'Colour it in', icon: '🎨' },
  hanoi: { label: 'Play it', icon: '🕹️' },
  sieve: { label: 'Cross them out', icon: '🧹' },
  magic: { label: 'Fill it in', icon: '🔢' },
  cipher: { label: 'Crack it', icon: '🕵️' },
  nim: { label: 'Beat me', icon: '♟️' },
  doors: { label: 'Try it 20 times', icon: '🚪' }
};

function badge(type) {
  const b = TYPE_BADGE[type] || { label: 'Puzzle', icon: '❓' };
  return `<span class="gp-ex__badge"><span aria-hidden="true">${b.icon}</span> ${b.label}</span>`;
}

/** Build the body of one exercise. Returns HTML only; wiring happens later. */
export function renderExercise(ex, index, total) {
  const head = `
    <div class="gp-ex__head">
      ${badge(ex.type)}
      <span class="gp-ex__count">${index + 1} of ${total}</span>
    </div>
    <p class="gp-ex__ask">${esc(ex.ask)}</p>
    ${ex.figure ? `<div class="gp-ex__fig">${renderFigure(ex.figure)}</div>` : ''}`;

  let body = '';

  if (ex.type === 'choice') {
    body = `<div class="gp-ex__choices" role="group">${
      (ex.choices || []).map((c) => `
        <button type="button" class="gp-mchoice" data-pick="${c.id}">
          ${c.figure ? renderFigure(c.figure) : `<span class="gp-mchoice__label">${esc(c.label)}</span>`}
        </button>`).join('')
    }</div>`;
  } else if (ex.type === 'truefalse') {
    body = `<div class="gp-ex__choices gp-ex__choices--tf" role="group">
      <button type="button" class="gp-mchoice gp-mchoice--tf" data-pick="true"><span aria-hidden="true">✅</span> True</button>
      <button type="button" class="gp-mchoice gp-mchoice--tf" data-pick="false"><span aria-hidden="true">❌</span> False</button>
    </div>`;
  } else if (ex.type === 'number') {
    body = numberBox('What is it?');
  } else if (ex.type === 'paper') {
    body = `
      <div class="gp-paper">
        <p class="gp-paper__cue"><span aria-hidden="true">✏️</span> Grab a pencil and paper for this one.</p>
        ${ex.hint ? `<p class="gp-paper__hint">Hint: ${esc(ex.hint)}</p>` : ''}
      </div>
      ${numberBox('Your answer')}`;
  } else if (ex.type === 'build') {
    body = `
      <div class="gp-build" data-mode="${ex.mode}" data-rows="${ex.rows || 2}" data-cols="${ex.cols || 5}">
        ${buildGrid(ex)}
      </div>
      <p class="gp-build__now">${ex.mode === 'binary'
        ? `Your total: <strong data-build-count>0</strong> &middot; aiming for ${ex.target}`
        : 'Tapped: <strong data-build-count>0</strong>'}</p>
      <button type="button" class="gp-btn gp-btn--primary" data-check>Check it</button>`;
  } else if (ex.type === 'hanoi') {
    const n = ex.discs || 3;
    body = `
      <p class="gp-cm__rule">Tap a tower to pick up its top disc, then tap where it goes.
      A bigger disc may never sit on a smaller one.</p>
      <div class="gp-hanoi" data-hanoi data-discs="${n}" data-goal="${ex.goal == null ? 2 : ex.goal}">
        ${[0, 1, 2].map((peg) => `
          <button type="button" class="gp-peg" data-peg="${peg}" aria-label="Tower ${peg + 1}">
            <span class="gp-peg__discs"></span>
            <span class="gp-peg__post" aria-hidden="true"></span>
            <span class="gp-peg__base" aria-hidden="true"></span>
          </button>`).join('')}
      </div>
      <p class="gp-hanoi__count">Moves: <strong data-hanoi-moves>0</strong>
        &middot; best possible: ${Math.pow(2, n) - 1}</p>
      <p class="gp-hanoi__say" data-hanoi-say></p>`;
  } else if (ex.type === 'nim') {
    body = `
      <p class="gp-cm__rule">${esc(ex.rule || 'Take 1, 2 or 3 counters. Whoever takes the last one wins.')}</p>
      <div class="gp-nim" data-nim data-start="${ex.start}" data-max="${ex.max || 3}">
        <p class="gp-nim__pile"><strong data-nim-left>${ex.start}</strong> left</p>
        <div class="gp-nim__take">${
          Array.from({ length: ex.max || 3 }, (_, i) => i + 1).map((k) =>
            `<button type="button" class="gp-btn gp-btn--ghost" data-take="${k}">Take ${k}</button>`).join('')
        }</div>
        <p class="gp-nim__say" data-nim-say>Your go.</p>
        <p class="gp-nim__score">Games you won: <strong data-nim-wins>0</strong> of ${ex.wins}</p>
      </div>`;
  } else if (ex.type === 'doors') {
    body = `
      <p class="gp-cm__rule">Pick a door. One hides the prize. I will open an empty one,
      then you decide: stay or switch. Play ${ex.rounds} rounds.</p>
      <div class="gp-doors" data-doors data-rounds="${ex.rounds}">
        ${[0, 1, 2].map((d) => `<button type="button" class="gp-door" data-door="${d}">🚪<span>${d + 1}</span></button>`).join('')}
      </div>
      <div class="gp-doors__choice" data-doors-choice hidden>
        <button type="button" class="gp-btn gp-btn--ghost" data-stay>Stay</button>
        <button type="button" class="gp-btn gp-btn--primary" data-switch>Switch</button>
      </div>
      <p class="gp-nim__say" data-doors-say>Pick a door.</p>
      <p class="gp-nim__score">Round <strong data-doors-round>1</strong> of ${ex.rounds}
        &middot; stayed and won <strong data-doors-stay>0</strong>
        &middot; switched and won <strong data-doors-switch>0</strong></p>`;
  } else if (ex.type === 'cipher') {
    body = `
      <p class="gp-cm__rule">Every letter has been pushed along the alphabet by the
      same amount. Try shifts until the words appear.</p>
      <p class="gp-cipher__coded" data-cipher-out>${esc(ex.coded)}</p>
      <div class="gp-cipher__dial">
        <button type="button" class="gp-btn gp-btn--ghost" data-shift="-1">&minus;1</button>
        <span class="gp-cipher__n">Shift: <strong data-cipher-shift>0</strong></span>
        <button type="button" class="gp-btn gp-btn--ghost" data-shift="1">+1</button>
      </div>
      ${numberBox(ex.askFor || 'The shift is')}`;
  } else if (ex.type === 'sieve') {
    const upto = ex.upto || 30;
    body = `
      <p class="gp-cm__rule">${esc(ex.rule || 'Tap a number to cross it out.')}</p>
      <div class="gp-sieve" data-sieve data-upto="${upto}">${
        Array.from({ length: upto }, (_, i) => i + 1).map((n) =>
          `<button type="button" class="gp-scell" data-num="${n}">${n}</button>`).join('')
      }</div>
      <p class="gp-cm__score">Left standing: <strong data-sieve-left>${upto}</strong></p>
      <button type="button" class="gp-btn gp-btn--primary" data-check>Check</button>`;
  } else if (ex.type === 'magic') {
    const given = ex.given || [];
    body = `
      <p class="gp-cm__rule">Every row, every column and both diagonals must add to
      <strong>${ex.total}</strong>. Use each number once.</p>
      <div class="gp-magic" data-magic>${
        given.map((row, y) => row.map((v, x) => v == null
          ? `<input class="gp-mcell" type="number" inputmode="numeric" data-cell="${y}-${x}" aria-label="Row ${y + 1} column ${x + 1}">`
          : `<span class="gp-mcell is-given">${v}</span>`).join('')).join('')
      }</div>
      ${ex.pool ? `<p class="gp-magic__pool">Numbers to use: ${ex.pool.join(', ')}</p>` : ''}
      <button type="button" class="gp-btn gp-btn--primary" data-check>Check it</button>`;
  } else if (ex.type === 'colormap') {
    body = `
      <p class="gp-cm__rule">Tap a country to change its colour. Two countries that
      share a <strong>border</strong> may not match. Touching at a corner is fine.</p>
      <div class="gp-cm" data-colormap>${mapButtons(ex)}</div>
      <p class="gp-cm__score">Colours used: <strong data-cm-used>0</strong>${
        ex.limit ? ` &middot; allowed: ${ex.limit}` : ''}</p>
      <button type="button" class="gp-btn gp-btn--primary" data-check>Check my map</button>`;
  } else if (ex.type === 'collect') {
    body = `
      ${numberBox('Add one', 'Add')}
      <ul class="gp-collect" data-collect></ul>
      <p class="gp-collect__score">Found <strong data-collect-count>0</strong> of ${ex.need}</p>`;
  }

  return `${head}<div class="gp-ex__body">${body}</div>
    <div class="gp-ex__feedback" data-feedback hidden></div>`;
}

function numberBox(label, action = 'Check') {
  return `
    <div class="gp-numrow">
      <label class="gp-numrow__label" for="gp-num">${esc(label)}</label>
      <input class="gp-numrow__input" id="gp-num" type="number" inputmode="numeric"
             autocomplete="off" data-answer-input>
      <button type="button" class="gp-btn gp-btn--primary" data-check>${esc(action)}</button>
    </div>`;
}

function buildGrid(ex) {
  /* Doubling chips. Tapping them on and off is the whole lesson: a number is
     one particular set of doubles and no other. */
  if (ex.mode === 'binary') {
    return `<div class="gp-dchips">${
      (ex.chips || [1, 2, 4, 8, 16]).map((v, i) =>
        `<button type="button" class="gp-dchip" data-cell="${i}" data-value="${v}">${v}</button>`).join('')
    }</div>`;
  }
  if (ex.mode === 'tenframe') {
    const cells = Array.from({ length: 10 }, (_, i) =>
      `<button type="button" class="gp-bcell" data-cell="${i}" aria-label="Square ${i + 1}"></button>`).join('');
    return `<div class="gp-bframe">${cells}</div>`;
  }
  const rows = ex.rows || 2;
  const cols = ex.cols || 5;
  const cells = Array.from({ length: rows * cols }, (_, i) =>
    `<button type="button" class="gp-bcell" data-cell="${i}" aria-label="Dot ${i + 1}"></button>`).join('');
  return `<div class="gp-barray" data-style="grid-template-columns:repeat(${cols}, 1fr)">${cells}</div>`;
}

/* ------------------------------------------------------------------ */
/* Tower of Hanoi                                                      */
/* ------------------------------------------------------------------ */

/** Fresh state: every disc on peg 0, biggest (n) at the bottom. */
export function hanoiStart(n) {
  return { pegs: [Array.from({ length: n }, (_, i) => n - i), [], []], moves: 0, picked: null };
}

/** Is moving the top of `from` onto `to` allowed? */
export function hanoiLegal(state, from, to) {
  const src = state.pegs[from];
  const dst = state.pegs[to];
  if (!src || !src.length) return false;
  if (from === to) return false;
  const disc = src[src.length - 1];
  const top = dst[dst.length - 1];
  return top === undefined || disc < top;
}

/** Apply a move. Returns a new state, or null if the move is not allowed. */
export function hanoiMove(state, from, to) {
  if (!hanoiLegal(state, from, to)) return null;
  const pegs = state.pegs.map((p) => p.slice());
  pegs[to].push(pegs[from].pop());
  return { pegs, moves: state.moves + 1, picked: null };
}

export function hanoiWon(state, goal, n) {
  return state.pegs[goal].length === n;
}

/* The palette a child colours with. Four is the whole point of the topic, so
   there are exactly four to reach for. */
export const MAP_COLOURS = ['red', 'blue', 'green', 'yellow'];

/** Region ids that appear in a grid map, in reading order. */
export function regionsOf(cells) {
  const seen = [];
  cells.forEach((row) => row.forEach((id) => { if (!seen.includes(id)) seen.push(id); }));
  return seen;
}

/** Pairs of regions that share an edge. Corners do not count, which is exactly
    the rule the four colour theorem is about. */
export function adjacency(cells) {
  const pairs = new Set();
  for (let y = 0; y < cells.length; y += 1) {
    for (let x = 0; x < cells[y].length; x += 1) {
      const a = cells[y][x];
      const right = cells[y][x + 1];
      const down = cells[y + 1] ? cells[y + 1][x] : undefined;
      [right, down].forEach((b) => {
        if (b === undefined || b === a) return;
        pairs.add([a, b].sort().join('|'));
      });
    }
  }
  return [...pairs].map((k) => k.split('|'));
}

function mapButtons(ex) {
  const cells = ex.cells || [[0]];
  const cols = cells[0].length;
  const size = cols > 5 ? 46 : 56;
  return `<div class="gp-cm__grid" data-style="grid-template-columns:repeat(${cols}, ${size}px)">${
    cells.map((row, y) => row.map((id, x) => {
      const right = row[x + 1] !== id;
      const down = !cells[y + 1] || cells[y + 1][x] !== id;
      const left = x === 0 || row[x - 1] !== id;
      const up = y === 0 || cells[y - 1][x] !== id;
      const edges = [up ? 'u' : '', right ? 'r' : '', down ? 'd' : '', left ? 'l' : ''].join('');
      return `<button type="button" class="gp-cm__cell" data-region="${id}"
        data-edge="${edges}" aria-label="Country ${id}"></button>`;
    }).join('')).join('')
  }</div>`;
}

/**
 * Check a coloured map. Returns what went wrong so the feedback can name it,
 * because "wrong" on its own teaches a six-year-old nothing.
 */
export function checkMap(ex, painted) {
  const regions = regionsOf(ex.cells);
  const missing = regions.filter((r) => !painted[r]);
  if (missing.length) return { ok: false, reason: 'blank', count: missing.length };
  const clash = adjacency(ex.cells).find(([a, b]) => painted[a] === painted[b]);
  if (clash) return { ok: false, reason: 'clash', pair: clash };
  const used = new Set(regions.map((r) => painted[r])).size;
  if (ex.limit && used > ex.limit) return { ok: false, reason: 'toomany', used };
  return { ok: true, used };
}

/* ------------------------------------------------------------------ */
/* Prime sieve and magic square                                        */
/* ------------------------------------------------------------------ */

/**
 * The subtraction game. With a pile of n and a take of 1..max, the player to
 * move loses exactly when n is a multiple of max+1, because whatever they take
 * the opponent can restore the multiple. So a perfect reply leaves one.
 */
export function nimReply(left, max) {
  const block = max + 1;
  const want = left % block;          // leaves a multiple of block when possible
  if (want === 0) return Math.min(max, left);   // already lost; take something
  return want;
}

export function nimLosing(left, max) {
  return left % (max + 1) === 0;
}

/** Shift every letter along the alphabet, wrapping round. */
export function shiftLetters(text, by) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return text.toUpperCase().replace(/[A-Z]/g, (ch) =>
    A[(A.indexOf(ch) + (by % 26) + 26) % 26]);
}

export function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false;
  return true;
}

/** Numbers up to `upto` that should be left standing, per the exercise. */
export function sieveKeep(ex) {
  const upto = ex.upto || 30;
  const all = Array.from({ length: upto }, (_, i) => i + 1);
  if (ex.keep === 'primes') return all.filter(isPrime);
  if (ex.keep === 'multiples') return all.filter((n) => n % ex.of === 0);
  return all;
}

/** What is wrong with the child's sieve, in words worth reading. */
export function checkSieve(ex, crossed) {
  const upto = ex.upto || 30;
  const keep = new Set(sieveKeep(ex));
  const standing = [];
  for (let n = 1; n <= upto; n += 1) if (!crossed.has(String(n))) standing.push(n);
  const extra = standing.filter((n) => !keep.has(n));
  const missing = [...keep].filter((n) => !standing.includes(n));
  if (extra.length) return { ok: false, reason: 'extra', n: extra[0] };
  if (missing.length) return { ok: false, reason: 'missing', n: missing[0] };
  return { ok: true };
}

/** A filled magic square: every line must hit the total, no repeats. */
export function checkMagic(ex, values) {
  const n = ex.given.length;
  const grid = ex.given.map((row, y) => row.map((v, x) =>
    v == null ? values[`${y}-${x}`] : v));
  if (grid.flat().some((v) => v == null || v === '' || Number.isNaN(Number(v)))) {
    return { ok: false, reason: 'blank' };
  }
  const g = grid.map((r) => r.map(Number));
  const flat = g.flat();
  if (new Set(flat).size !== flat.length) return { ok: false, reason: 'repeat' };
  if (ex.pool) {
    const outside = flat.find((v) => !ex.pool.includes(v));
    if (outside !== undefined) return { ok: false, reason: 'outside', n: outside };
  }
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const lines = [
    ...g.map((r) => r),
    ...g[0].map((_, x) => g.map((r) => r[x])),
    g.map((r, i) => r[i]),
    g.map((r, i) => r[n - 1 - i])
  ];
  const wrong = lines.find((l) => sum(l) !== ex.total);
  if (wrong) return { ok: false, reason: 'line', got: sum(wrong) };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Checking                                                            */
/* ------------------------------------------------------------------ */

/**
 * Decide whether a given response is right.
 * `given` is a string for choice and truefalse, a number otherwise.
 */
export function check(ex, given) {
  if (ex.type === 'choice') return String(given) === String(ex.answer);
  if (ex.type === 'truefalse') return String(given) === String(ex.answer);
  if (ex.type === 'build') return Number(given) === Number(ex.answer);
  return Number(given) === Number(ex.answer);
}

/** For collect: is this a fresh, valid find? Returns a short label or null. */
export function collectHit(ex, value, found) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (ex.mode === 'pairs') {
    if (n < 0 || n > ex.total) return null;
    const pair = [Math.min(n, ex.total - n), Math.max(n, ex.total - n)];
    const key = pair.join('+');
    if (found.has(key)) return { key, label: `${pair[0]} + ${pair[1]} = ${ex.total}`, repeat: true };
    return { key, label: `${pair[0]} + ${pair[1]} = ${ex.total}` };
  }
  if (!(ex.valid || []).includes(n)) return null;
  const key = String(n);
  if (found.has(key)) return { key, label: key, repeat: true };
  return { key, label: key };
}

/* ------------------------------------------------------------------ */
/* Feedback wording                                                    */
/* ------------------------------------------------------------------ */

const CHEERS = ['Nice one.', 'Got it.', 'Yes!', 'Exactly.', 'Sharp.', 'That is it.'];

export function feedbackHtml(ok, ex, seed = 0) {
  const title = ok
    ? CHEERS[seed % CHEERS.length]
    : 'Not quite. Here is why.';
  return `
    <div class="gp-fb ${ok ? 'is-right' : 'is-wrong'}">
      <p class="gp-fb__title"><span aria-hidden="true">${ok ? '🎉' : '💡'}</span> ${title}</p>
      <p class="gp-fb__why">${esc(ex.why || '')}</p>
    </div>`;
}

export default {
  loadGrade, renderGradeIndex, renderTopicIndex, renderTeach,
  renderExercise, check, collectHit, feedbackHtml, READY_GRADES,
  checkMap, adjacency, regionsOf, MAP_COLOURS,
  hanoiStart, hanoiLegal, hanoiMove, hanoiWon,
  isPrime, sieveKeep, checkSieve, checkMagic, shiftLetters,
  nimReply, nimLosing
};
