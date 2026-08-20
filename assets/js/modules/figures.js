/**
 * figures.js — Declarative SVG figure renderer for GiftedPrep.
 *
 * Visual reasoning items (matrices, series, classification sets, paper folding,
 * charts) are stored in JSON as a compact spec instead of raw SVG markup. This
 * module turns a spec into an inline <svg> string.
 *
 * Why a spec and not raw SVG in the JSON:
 *   - question files stay small, diffable and human-authorable
 *   - every figure inherits one consistent visual language
 *   - colours come from CSS custom properties, so figures follow light/dark mode
 *   - a single fix here fixes every question at once
 *
 * ---------------------------------------------------------------------------
 * SPEC REFERENCE
 * ---------------------------------------------------------------------------
 *
 * Shape  { s, c, f, n, r, z, x, y }
 *   s  shape name        see SHAPES below (default 'circle')
 *   c  colour key        see PALETTE below (default 'blue')
 *   f  fill style        see FILLS below  (default 'solid')
 *   n  repeat count      1..9, laid out in a tidy cluster (default 1)
 *   r  rotation degrees  (default 0)
 *   z  scale multiplier  0.2..1.6 (default 1)
 *   x,y explicit centre in a 0..100 cell box (optional; overrides clustering)
 *
 * Cell   { shapes, text, missing, ghost, note }
 *   shapes   array of Shape
 *   text     plain text drawn in the cell instead of shapes
 *   missing  true -> renders the "?" slot
 *   ghost    true -> dashed placeholder outline (used in paper folding)
 *   note     small caption under the cell
 *
 * Figure kinds
 *   { kind:'single',   cell }
 *   { kind:'series',   cells, missingIndex }
 *   { kind:'matrix',   rows, cols, cells }              cells is row-major
 *   { kind:'sets',     groups:[{label, cells}], odd }   classification
 *   { kind:'analogy',  a, b, c }                        a:b :: c:?
 *   { kind:'paperfold', steps:[...], punches:[{x,y,shape}] }
 *   { kind:'barchart', labels, values, unit, title }
 *   { kind:'pictograph', rows:[{label, s, c, n}], keyText }
 *   { kind:'balance',  left, right }
 *   { kind:'numberline', min, max, step, marks, missingAt }
 *   { kind:'table',    rows:[[..]], header }            text grid
 *
 * All kinds accept an optional { w } hint (target width in px) and { gap }.
 */

/* ------------------------------------------------------------------ */
/* Palette — resolved through CSS variables so figures follow the theme */
/* ------------------------------------------------------------------ */

const PALETTE = {
  blue:   'var(--gp-fig-blue, #3b82c4)',
  red:    'var(--gp-fig-red, #d9614f)',
  green:  'var(--gp-fig-green, #4f9d69)',
  yellow: 'var(--gp-fig-yellow, #e0a83c)',
  purple: 'var(--gp-fig-purple, #8a6bbf)',
  orange: 'var(--gp-fig-orange, #dd8341)',
  teal:   'var(--gp-fig-teal, #3f9aa6)',
  pink:   'var(--gp-fig-pink, #d174a3)',
  grey:   'var(--gp-fig-grey, #8b93a1)',
  ink:    'var(--gp-fig-ink, #2f3542)',
  none:   'transparent'
};

const STROKE = 'var(--gp-fig-stroke, #2f3542)';
const CANVAS = 'var(--gp-fig-canvas, #ffffff)';
const FRAME  = 'var(--gp-fig-frame, #c8cedb)';
const MUTED  = 'var(--gp-fig-muted, #98a0b0)';

function colour(key) {
  if (!key) return PALETTE.blue;
  return PALETTE[key] || key;
}

/* ------------------------------------------------------------------ */
/* Shape geometry — every shape is drawn inside a 100 x 100 box        */
/* ------------------------------------------------------------------ */

const P = (pts) => pts.map((p) => p.join(',')).join(' ');

const SHAPES = {
  circle:        () => `<circle cx="50" cy="50" r="42" />`,
  square:        () => `<rect x="10" y="10" width="80" height="80" rx="3" />`,
  rectwide:      () => `<rect x="4" y="26" width="92" height="48" rx="3" />`,
  recttall:      () => `<rect x="26" y="4" width="48" height="92" rx="3" />`,
  triangle:      () => `<polygon points="${P([[50, 8], [92, 88], [8, 88]])}" />`,
  triangledown:  () => `<polygon points="${P([[8, 12], [92, 12], [50, 92]])}" />`,
  righttriangle: () => `<polygon points="${P([[10, 90], [10, 10], [90, 90]])}" />`,
  diamond:       () => `<polygon points="${P([[50, 4], [96, 50], [50, 96], [4, 50]])}" />`,
  pentagon:      () => polygonN(5, -90),
  hexagon:       () => polygonN(6, -90),
  octagon:       () => polygonN(8, -112.5),
  star:          () => starN(5, 46, 19, -90),
  star6:         () => starN(6, 46, 24, -90),
  heart:         () => `<path d="M50 90 C 10 62, 6 30, 28 20 C 40 14, 50 22, 50 32 C 50 22, 60 14, 72 20 C 94 30, 90 62, 50 90 Z" />`,
  cross:         () => `<polygon points="${P([[36, 6], [64, 6], [64, 36], [94, 36], [94, 64], [64, 64], [64, 94], [36, 94], [36, 64], [6, 64], [6, 36], [36, 36]])}" />`,
  arrow:         () => `<polygon points="${P([[6, 38], [58, 38], [58, 14], [96, 50], [58, 86], [58, 62], [6, 62]])}" />`,
  oval:          () => `<ellipse cx="50" cy="50" rx="46" ry="30" />`,
  semicircle:    () => `<path d="M4 68 A 46 46 0 0 1 96 68 Z" />`,
  trapezoid:     () => `<polygon points="${P([[24, 14], [76, 14], [96, 86], [4, 86]])}" />`,
  parallelogram: () => `<polygon points="${P([[26, 16], [96, 16], [74, 84], [4, 84]])}" />`,
  crescent:      () => `<path d="M64 8 A 44 44 0 1 0 64 92 A 34 34 0 1 1 64 8 Z" />`,
  cloud:         () => `<path d="M24 74 A 17 17 0 0 1 26 41 A 24 24 0 0 1 72 38 A 19 19 0 0 1 76 74 Z" />`,
  lightning:     () => `<polygon points="${P([[58, 4], [22, 56], [46, 56], [38, 96], [78, 42], [52, 42]])}" />`,
  moon:          () => `<path d="M64 8 A 44 44 0 1 0 64 92 A 34 34 0 1 1 64 8 Z" />`,
  plus:          () => `<polygon points="${P([[40, 10], [60, 10], [60, 40], [90, 40], [90, 60], [60, 60], [60, 90], [40, 90], [40, 60], [10, 60], [10, 40], [40, 40]])}" />`,
  ring:          () => `<path d="M50 6 A 44 44 0 1 1 49.9 6 Z M50 30 A 20 20 0 1 0 50.1 30 Z" fill-rule="evenodd" />`,
  kite:          () => `<polygon points="${P([[50, 4], [88, 42], [50, 96], [12, 42]])}" />`,
  chevron:       () => `<polygon points="${P([[14, 8], [50, 8], [86, 50], [50, 92], [14, 92], [50, 50]])}" />`,
  bowtie:        () => `<polygon points="${P([[8, 14], [92, 86], [8, 86], [92, 14]])}" />`,
  line:          () => `<rect x="6" y="43" width="88" height="14" rx="7" />`,
  dot:           () => `<circle cx="50" cy="50" r="20" />`,
  flag:          () => `<path d="M22 96 L22 8 L86 8 L70 30 L86 52 L22 52 Z" />`,
  house:         () => `<polygon points="${P([[50, 6], [96, 44], [82, 44], [82, 94], [18, 94], [18, 44], [4, 44]])}" />`,
  apple:         () => `<path d="M50 24 C 40 10, 24 14, 22 30 C 8 34, 6 60, 20 80 C 30 94, 44 90, 50 86 C 56 90, 70 94, 80 80 C 94 60, 92 34, 78 30 C 76 14, 60 10, 50 24 Z" />`,
  leaf:          () => `<path d="M12 88 C 12 30, 52 6, 90 10 C 94 50, 70 90, 12 88 Z" />`,
  fish:          () => `<path d="M6 50 C 26 22, 62 22, 78 50 C 62 78, 26 78, 6 50 Z M78 50 L96 30 L96 70 Z" />`,
  star4:         () => starN(4, 48, 14, -90)
};

function polygonN(n, startDeg, r = 46) {
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = ((startDeg + (360 / n) * i) * Math.PI) / 180;
    pts.push([+(50 + r * Math.cos(a)).toFixed(2), +(50 + r * Math.sin(a)).toFixed(2)]);
  }
  return `<polygon points="${P(pts)}" />`;
}

function starN(points, outer, inner, startDeg) {
  const pts = [];
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((startDeg + (180 / points) * i) * Math.PI) / 180;
    pts.push([+(50 + r * Math.cos(a)).toFixed(2), +(50 + r * Math.sin(a)).toFixed(2)]);
  }
  return `<polygon points="${P(pts)}" />`;
}

export const SHAPE_NAMES = Object.keys(SHAPES);

/* ------------------------------------------------------------------ */
/* Fill styles                                                         */
/* ------------------------------------------------------------------ */

const FILLS = {
  solid:    (c) => ({ fill: c, extra: '' }),
  outline:  () => ({ fill: 'none', extra: '' }),
  stripesh: (c, id) => ({ fill: `url(#${id})`, extra: pattern(id, c, 'h') }),
  stripesv: (c, id) => ({ fill: `url(#${id})`, extra: pattern(id, c, 'v') }),
  stripesd: (c, id) => ({ fill: `url(#${id})`, extra: pattern(id, c, 'd') }),
  dots:     (c, id) => ({ fill: `url(#${id})`, extra: pattern(id, c, 'dots') }),
  grid:     (c, id) => ({ fill: `url(#${id})`, extra: pattern(id, c, 'grid') }),
  halfleft: (c, id) => ({ fill: `url(#${id})`, extra: halfGrad(id, c, 0) }),
  halfright:(c, id) => ({ fill: `url(#${id})`, extra: halfGrad(id, c, 180) }),
  halftop:  (c, id) => ({ fill: `url(#${id})`, extra: halfGrad(id, c, 90) }),
  halfbottom:(c, id) => ({ fill: `url(#${id})`, extra: halfGrad(id, c, 270) })
};

function pattern(id, c, mode) {
  const body = {
    h: `<rect width="10" height="4" fill="${c}" />`,
    v: `<rect width="4" height="10" fill="${c}" />`,
    d: `<path d="M-2 2 L2 -2 M0 10 L10 0 M8 12 L12 8" stroke="${c}" stroke-width="3" />`,
    dots: `<circle cx="5" cy="5" r="2.4" fill="${c}" />`,
    grid: `<path d="M0 0 H10 M0 0 V10" stroke="${c}" stroke-width="2" fill="none" />`
  }[mode];
  return `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse">${body}</pattern>`;
}

function halfGrad(id, c, angle) {
  const rad = (angle * Math.PI) / 180;
  const x1 = +(50 - 50 * Math.cos(rad)).toFixed(1);
  const y1 = +(50 + 50 * Math.sin(rad)).toFixed(1);
  const x2 = +(50 + 50 * Math.cos(rad)).toFixed(1);
  const y2 = +(50 - 50 * Math.sin(rad)).toFixed(1);
  return `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`
    + `<stop offset="50%" stop-color="${c}" /><stop offset="50%" stop-color="transparent" /></linearGradient>`;
}

export const FILL_NAMES = Object.keys(FILLS);

/* ------------------------------------------------------------------ */
/* Cluster layouts for n copies of a shape inside one cell             */
/* ------------------------------------------------------------------ */

const CLUSTERS = {
  1: [[50, 50, 1]],
  2: [[29, 50, 0.62], [71, 50, 0.62]],
  3: [[50, 28, 0.55], [28, 70, 0.55], [72, 70, 0.55]],
  4: [[29, 29, 0.5], [71, 29, 0.5], [29, 71, 0.5], [71, 71, 0.5]],
  5: [[27, 27, 0.42], [73, 27, 0.42], [50, 50, 0.42], [27, 73, 0.42], [73, 73, 0.42]],
  6: [[27, 26, 0.4], [50, 26, 0.4], [73, 26, 0.4], [27, 74, 0.4], [50, 74, 0.4], [73, 74, 0.4]],
  7: [[27, 24, 0.36], [50, 24, 0.36], [73, 24, 0.36], [50, 50, 0.36], [27, 76, 0.36], [50, 76, 0.36], [73, 76, 0.36]],
  8: [[25, 25, 0.34], [50, 25, 0.34], [75, 25, 0.34], [25, 50, 0.34], [75, 50, 0.34], [25, 75, 0.34], [50, 75, 0.34], [75, 75, 0.34]],
  9: [[24, 24, 0.32], [50, 24, 0.32], [76, 24, 0.32], [24, 50, 0.32], [50, 50, 0.32], [76, 50, 0.32], [24, 76, 0.32], [50, 76, 0.32], [76, 76, 0.32]]
};

/* ------------------------------------------------------------------ */
/* Core: draw one shape                                                */
/* ------------------------------------------------------------------ */

let uid = 0;
const nextId = () => `gpfx${(uid += 1)}`;

function drawShape(shape, defs) {
  const name = (shape.s || 'circle').toLowerCase();
  const geom = SHAPES[name] || SHAPES.circle;
  const c = colour(shape.c);
  const fillName = (shape.f || 'solid').toLowerCase();
  const fillFn = FILLS[fillName] || FILLS.solid;
  const id = nextId();
  const { fill, extra } = fillFn(c, id);
  if (extra) defs.push(extra);

  const n = Math.max(1, Math.min(9, shape.n || 1));
  const cluster = CLUSTERS[n] || CLUSTERS[1];
  const userScale = shape.z == null ? 1 : Math.max(0.15, Math.min(1.6, shape.z));
  const rot = shape.r || 0;
  const strokeW = fillName === 'outline' ? 7 : 4;
  const strokeCol = fillName === 'outline' ? c : STROKE;

  const parts = cluster.map(([cx, cy, s]) => {
    const px = shape.x != null && n === 1 ? shape.x : cx;
    const py = shape.y != null && n === 1 ? shape.y : cy;
    const k = s * userScale;
    // Translate to the slot, scale about the shape's own centre (50,50), rotate.
    const t = `translate(${px} ${py}) scale(${k}) rotate(${rot}) translate(-50 -50)`;
    return `<g transform="${t}" fill="${fill}" stroke="${strokeCol}" stroke-width="${(strokeW / k).toFixed(2)}" stroke-linejoin="round">${geom()}</g>`;
  });

  return parts.join('');
}

/* ------------------------------------------------------------------ */
/* Core: draw one cell                                                 */
/* ------------------------------------------------------------------ */

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* Split on what reads as one character. An emoji is often several code points
   -- a sun carries a variation selector, a flag is two regional letters -- so
   spreading the string would tear those apart and count them twice. */
const graphemes = (str) => {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(str)]
      .map((seg) => seg.segment);
  }
  return [...str];
};

/* Usable width inside a 100-unit cell once the frame is allowed for. */
const BOX = 88;

function drawCell(cell, defs, opts = {}) {
  const c = cell || {};
  const framed = opts.framed !== false;
  const frame = framed
    ? `<rect x="1.5" y="1.5" width="97" height="97" rx="8" fill="${CANVAS}" stroke="${c.ghost ? MUTED : FRAME}" stroke-width="${c.missing ? 3 : 2}"${c.ghost || c.missing ? ' stroke-dasharray="7 6"' : ''} />`
    : '';

  if (c.missing) {
    return `${frame}<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-size="46" font-weight="700" fill="${MUTED}" font-family="system-ui, sans-serif">?</text>`;
  }
  if (c.text != null) {
    const raw = String(c.text);
    /* Picture items for grades 1-2 use emoji, because a six-year-old needs a
       bird, not the word "bird". Emoji ship with every device, need no network
       and scale cleanly, so they beat bundling clip art. They are drawn larger
       than text and without the bold weight, which colour glyphs ignore. */
    const isPictorial = !/[A-Za-z0-9]/.test(raw);
    const chars = graphemes(raw);
    const glyphs = chars.length;
    const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

    /* Counting items show a handful of the same emoji and a child has to be
       able to count them, but past four on one line the row is wider than the
       cell and the ones at each end are cut in half. Wrap those into the
       squarest grid that fits, reading left to right and top to bottom.
       Four or fewer stay on one line: some items ask which picture has the
       star LAST or the sun BETWEEN two clouds, and a grid would muddle that. */
    if (isPictorial && glyphs > 4) {
      const cols = Math.ceil(Math.sqrt(glyphs));
      const rows = Math.ceil(glyphs / cols);
      const step = Math.min(BOX / cols, BOX / rows);
      const size = step * 0.86;
      const x0 = 50 - ((cols - 1) * step) / 2;
      const y0 = 50 - ((rows - 1) * step) / 2;
      const marks = chars.map((ch, i) => {
        const cx = x0 + (i % cols) * step;
        const cy = y0 + Math.floor(i / cols) * step;
        return `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" `
          + `dominant-baseline="central" font-size="${size.toFixed(1)}" `
          + `fill="${STROKE}" font-family='${EMOJI}'>${esc(ch)}</text>`;
      }).join('');
      return `${frame}${marks}`;
    }

    const size = isPictorial
      ? (glyphs === 1 ? 58 : glyphs === 2 ? 40 : glyphs === 3 ? 30 : 20)
      : (raw.length <= 2 ? 42 : raw.length <= 4 ? 32 : raw.length <= 7 ? 22 : 16);
    const family = isPictorial ? EMOJI : 'system-ui, sans-serif';
    return `${frame}<text x="50" y="50" text-anchor="middle" dominant-baseline="central" `
      + `font-size="${size}" font-weight="${isPictorial ? 400 : 700}" fill="${STROKE}" `
      + `font-family='${family}'>${esc(raw)}</text>`;
  }
  const shapes = (c.shapes || []).map((s) => drawShape(s, defs)).join('');
  return `${frame}${shapes}`;
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

function svgWrap(width, height, body, defs, label) {
  const d = defs.length ? `<defs>${defs.join('')}</defs>` : '';
  return `<svg class="gp-fig" viewBox="0 0 ${width} ${height}" width="100%" `
    + `preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" `
    + `role="img" aria-label="${esc(label || 'figure')}" focusable="false">${d}${body}</svg>`;
}

const at = (x, y, size, inner) =>
  `<g transform="translate(${x} ${y}) scale(${(size / 100).toFixed(4)})">${inner}</g>`;

/* ------------------------------------------------------------------ */
/* Figure kinds                                                        */
/* ------------------------------------------------------------------ */

const RENDERERS = {
  single(spec, defs) {
    const size = 120;
    return { w: size, h: size, body: at(0, 0, size, drawCell(spec.cell, defs, spec)) };
  },

  series(spec, defs) {
    const cells = (spec.cells || []).map((c, i) =>
      spec.missingIndex === i ? { missing: true } : c);
    const size = 96;
    const gap = spec.gap == null ? 16 : spec.gap;
    const w = cells.length * size + (cells.length - 1) * gap;
    const body = cells.map((c, i) => at(i * (size + gap), 0, size, drawCell(c, defs, spec))).join('');
    return { w, h: size, body };
  },

  matrix(spec, defs) {
    const rows = spec.rows || 2;
    const cols = spec.cols || 2;
    const size = 92;
    const gap = spec.gap == null ? 14 : spec.gap;
    const w = cols * size + (cols - 1) * gap;
    const h = rows * size + (rows - 1) * gap;
    const body = (spec.cells || []).slice(0, rows * cols).map((c, i) => {
      const r = Math.floor(i / cols);
      const col = i % cols;
      return at(col * (size + gap), r * (size + gap), size, drawCell(c, defs, spec));
    }).join('');
    return { w, h, body };
  },

  analogy(spec, defs) {
    const size = 96;
    const gap = 14;
    const sep = 34;
    const cells = [spec.a, spec.b, spec.c, { missing: true }];
    const xs = [0, size + gap, size * 2 + gap + sep + gap, size * 3 + gap * 2 + sep + gap];
    const w = xs[3] + size;
    const arrow = (x) =>
      `<path d="M${x} ${size / 2} h22" stroke="${MUTED}" stroke-width="4" stroke-linecap="round" marker-end="url(#gparrow)" />`;
    defs.push(`<marker id="gparrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${MUTED}" /></marker>`);
    const body = cells.map((c, i) => at(xs[i], 0, size, drawCell(c, defs, spec))).join('')
      + arrow(xs[0] + size + 2) + arrow(xs[2] + size + 2)
      + `<text x="${xs[1] + size + gap + sep / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central" font-size="34" font-weight="700" fill="${MUTED}" font-family="system-ui, sans-serif">::</text>`;
    return { w, h: size, body };
  },

  sets(spec, defs) {
    const size = 82;
    const gap = 10;
    const groupGap = 40;
    /* The label baseline sits at labelH - 16, so labelH has to leave room for
       the glyph ascender above it or the name is clipped by the top of the
       figure. At font-size 19 the ascender runs about 15 units. */
    const labelH = spec.groups && spec.groups.some((g) => g.label) ? 32 : 0;
    /* Each group is ringed by a dashed box drawn 10 units outside its cells,
       so the drawing starts inset by that much and the reported width adds it
       back. Without the inset the ring fell outside the figure and the left
       edge of the first group was cropped. */
    const pad = 12;
    let x = pad;
    const parts = [];
    (spec.groups || []).forEach((g, gi) => {
      const cells = g.cells || [];
      const gw = cells.length * size + Math.max(0, cells.length - 1) * gap;
      parts.push(`<rect x="${x - 10}" y="${labelH - 10}" width="${gw + 20}" height="${size + 20}" rx="14" fill="none" stroke="${MUTED}" stroke-width="2.5" stroke-dasharray="8 7" />`);
      if (g.label) {
        parts.push(`<text x="${x + gw / 2}" y="${labelH - 16}" text-anchor="middle" font-size="19" font-weight="600" fill="${MUTED}" font-family="system-ui, sans-serif">${esc(g.label)}</text>`);
      }
      cells.forEach((c, i) => {
        parts.push(at(x + i * (size + gap), labelH, size, drawCell(c, defs, spec)));
      });
      x += gw + groupGap + (gi < 0 ? 0 : 0);
    });
    return { w: Math.max(1, x - groupGap + pad), h: size + labelH + 12, body: parts.join('') };
  },

  paperfold(spec, defs) {
    // steps: array of { fold: 'left'|'right'|'top'|'bottom'|'none', punches:[{x,y,s}] }
    const size = 96;
    const gap = 30;
    const steps = spec.steps || [];
    const labelH = steps.some((st) => st.label) ? 20 : 0;
    const w = steps.length * size + (steps.length - 1) * gap;
    const parts = [];
    steps.forEach((st, i) => {
      const inner = [];
      inner.push(`<rect x="4" y="4" width="92" height="92" rx="5" fill="${CANVAS}" stroke="${FRAME}" stroke-width="2.5" />`);
      if (st.fold && st.fold !== 'none') {
        const line = {
          left:   'M50 4 V96', right: 'M50 4 V96',
          top:    'M4 50 H96', bottom: 'M4 50 H96',
          diag:   'M4 96 L96 4'
        }[st.fold] || 'M50 4 V96';
        const shade = {
          left:   '<rect x="4" y="4" width="46" height="92" />',
          right:  '<rect x="50" y="4" width="46" height="92" />',
          top:    '<rect x="4" y="4" width="92" height="46" />',
          bottom: '<rect x="4" y="50" width="92" height="46" />',
          diag:   '<polygon points="4,96 96,4 96,96" />'
        }[st.fold] || '';
        if (shade) inner.push(`<g fill="${MUTED}" opacity="0.16">${shade}</g>`);
        inner.push(`<path d="${line}" stroke="${MUTED}" stroke-width="3" stroke-dasharray="6 5" />`);
        // A small chevron showing which way the half folds over. Drawn as a
        // polyline rather than a marker so it cannot scale with stroke width.
        const tip = {
          left:   [30, 50, -1, 0], right: [70, 50, 1, 0],
          top:    [50, 30, 0, -1], bottom: [50, 70, 0, 1],
          diag:   [34, 66, -0.7, 0.7]
        }[st.fold];
        if (tip) {
          const [tx, ty, dx, dy] = tip;
          const len = 13, wing = 5;
          const ex = tx + dx * len, ey = ty + dy * len;
          const px = -dy, py = dx;
          inner.push(
            `<path d="M${tx} ${ty} L${ex} ${ey}" stroke="${MUTED}" stroke-width="3" stroke-linecap="round" fill="none" />`
            + `<path d="M${(ex - dx * wing + px * wing).toFixed(1)} ${(ey - dy * wing + py * wing).toFixed(1)} `
            + `L${ex.toFixed(1)} ${ey.toFixed(1)} `
            + `L${(ex - dx * wing - px * wing).toFixed(1)} ${(ey - dy * wing - py * wing).toFixed(1)}" `
            + `stroke="${MUTED}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />`);
        }
      }
      (st.punches || []).forEach((p) => {
        const shp = SHAPES[p.s || 'circle'] || SHAPES.circle;
        const k = (p.z || 0.17);
        inner.push(`<g transform="translate(${p.x} ${p.y}) scale(${k}) translate(-50 -50)" fill="${MUTED}" fill-opacity="0.35" stroke="${STROKE}" stroke-width="${(4 / k).toFixed(2)}">${shp()}</g>`);
      });
      const ox = i * (size + gap);
      if (st.label) {
        parts.push(`<text x="${ox + size / 2}" y="${labelH - 7}" text-anchor="middle" font-size="14" font-weight="600" fill="${MUTED}" font-family="system-ui, sans-serif">${esc(st.label)}</text>`);
      }
      parts.push(at(ox, labelH, size, inner.join('')));
      if (i < steps.length - 1) {
        // A small "then" arrow between steps, in absolute units so it stays
        // the same size however many steps there are.
        const ax = ox + size + 8;
        const ay = labelH + size / 2;
        parts.push(
          `<path d="M${ax} ${ay} h${gap - 16}" stroke="${MUTED}" stroke-width="3" stroke-linecap="round" fill="none" />`
          + `<path d="M${ax + gap - 21} ${ay - 4.5} L${ax + gap - 16} ${ay} L${ax + gap - 21} ${ay + 4.5}" `
          + `stroke="${MUTED}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />`);
      }
    });
    return { w, h: size + labelH, body: parts.join('') };
  },

  barchart(spec) {
    const labels = spec.labels || [];
    const values = spec.values || [];
    const maxV = Math.max(1, ...values, spec.max || 0);
    const barW = 54;
    const gapW = 30;
    const plotH = 190;
    const padL = 46;
    const padB = 46;
    const padT = spec.title ? 34 : 12;
    const w = padL + labels.length * (barW + gapW) + 14;
    const h = padT + plotH + padB;
    const series = ['blue', 'green', 'orange', 'purple', 'teal', 'pink'];
    const parts = [];
    if (spec.title) {
      parts.push(`<text x="${w / 2}" y="20" text-anchor="middle" font-size="19" font-weight="700" fill="${STROKE}" font-family="system-ui, sans-serif">${esc(spec.title)}</text>`);
    }
    // gridlines + y axis ticks
    const ticks = Math.min(6, maxV);
    for (let i = 0; i <= ticks; i += 1) {
      const v = Math.round((maxV / ticks) * i);
      const y = padT + plotH - (v / maxV) * plotH;
      parts.push(`<line x1="${padL - 6}" y1="${y}" x2="${w - 8}" y2="${y}" stroke="${FRAME}" stroke-width="1.5" ${i ? 'stroke-dasharray="4 5"' : ''} />`);
      parts.push(`<text x="${padL - 12}" y="${y}" text-anchor="end" dominant-baseline="central" font-size="15" fill="${MUTED}" font-family="system-ui, sans-serif">${v}</text>`);
    }
    labels.forEach((lab, i) => {
      const v = values[i] == null ? 0 : values[i];
      const bh = (v / maxV) * plotH;
      const x = padL + 8 + i * (barW + gapW);
      const y = padT + plotH - bh;
      const isMystery = values[i] == null;
      parts.push(`<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(2, bh)}" rx="6" fill="${isMystery ? 'none' : colour(series[i % series.length])}" stroke="${isMystery ? MUTED : STROKE}" stroke-width="2" ${isMystery ? 'stroke-dasharray="6 5"' : ''} />`);
      if (!isMystery) {
        parts.push(`<text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-size="16" font-weight="700" fill="${STROKE}" font-family="system-ui, sans-serif">${v}</text>`);
      }
      parts.push(`<text x="${x + barW / 2}" y="${padT + plotH + 22}" text-anchor="middle" font-size="16" fill="${STROKE}" font-family="system-ui, sans-serif">${esc(lab)}</text>`);
    });
    if (spec.unit) {
      parts.push(`<text x="${w / 2}" y="${h - 8}" text-anchor="middle" font-size="15" fill="${MUTED}" font-family="system-ui, sans-serif">${esc(spec.unit)}</text>`);
    }
    return { w, h, body: parts.join('') };
  },

  pictograph(spec, defs) {
    const rows = spec.rows || [];
    const iconSize = 34;
    const gap = 8;
    const rowH = 48;
    /* Room for a row label only when there is one; answer tiles have none and
       would otherwise carry a wide empty gutter. */
    const padL = rows.some((r) => r.label) ? 118 : 8;
    const maxN = Math.max(1, ...rows.map((r) => r.n || 0));
    const w = padL + maxN * (iconSize + gap) + 16;
    const keyH = spec.keyText ? 30 : 0;
    const h = rows.length * rowH + keyH + 10;
    const parts = [];
    rows.forEach((r, i) => {
      const y = i * rowH;
      parts.push(`<text x="${padL - 14}" y="${y + rowH / 2}" text-anchor="end" dominant-baseline="central" font-size="17" font-weight="600" fill="${STROKE}" font-family="system-ui, sans-serif">${esc(r.label)}</text>`);
      for (let k = 0; k < (r.n || 0); k += 1) {
        parts.push(at(padL + k * (iconSize + gap), y + (rowH - iconSize) / 2, iconSize,
          drawShape({ s: r.s || 'star', c: r.c || 'yellow', f: r.f || 'solid' }, defs)));
      }
    });
    if (spec.keyText) {
      parts.push(`<text x="${padL}" y="${rows.length * rowH + 18}" font-size="15" fill="${MUTED}" font-family="system-ui, sans-serif">${esc(spec.keyText)}</text>`);
    }
    return { w, h, body: parts.join('') };
  },

  balance(spec, defs) {
    const size = 44;
    const gap = 6;
    const w = 460;
    const h = 176;
    const draw = (items, cx) => {
      const n = items.length;
      const total = n * size + (n - 1) * gap;
      return items.map((s, i) =>
        at(cx - total / 2 + i * (size + gap), 16, size, drawShape(s, defs))).join('');
    };
    const parts = [];
    parts.push(`<rect x="18" y="6" width="180" height="76" rx="12" fill="none" stroke="${FRAME}" stroke-width="2.5" />`);
    parts.push(`<rect x="262" y="6" width="180" height="76" rx="12" fill="none" stroke="${FRAME}" stroke-width="2.5" />`);
    parts.push(draw(spec.left || [], 108));
    parts.push(draw(spec.right || [], 352));
    parts.push(`<text x="230" y="44" text-anchor="middle" dominant-baseline="central" font-size="38" font-weight="700" fill="${STROKE}" font-family="system-ui, sans-serif">=</text>`);
    // the seesaw
    parts.push(`<path d="M60 108 H400" stroke="${STROKE}" stroke-width="7" stroke-linecap="round" />`);
    parts.push(`<polygon points="230,108 258,164 202,164" fill="${MUTED}" />`);
    return { w, h, body: parts.join('') };
  },

  numberline(spec) {
    const min = spec.min == null ? 0 : spec.min;
    const max = spec.max == null ? 10 : spec.max;
    const step = spec.step || 1;
    const n = Math.round((max - min) / step);
    const gapPx = 56;
    const padX = 30;
    const w = padX * 2 + n * gapPx;
    const h = 96;
    const y = 46;
    const parts = [`<path d="M${padX - 16} ${y} H${w - padX + 16}" stroke="${STROKE}" stroke-width="4" stroke-linecap="round" />`];
    const missingAt = spec.missingAt == null ? -1 : spec.missingAt;
    for (let i = 0; i <= n; i += 1) {
      const x = padX + i * gapPx;
      const v = min + i * step;
      const hidden = i === missingAt;
      const marked = (spec.marks || []).includes(v);
      parts.push(`<path d="M${x} ${y - 11} V${y + 11}" stroke="${STROKE}" stroke-width="3.5" stroke-linecap="round" />`);
      if (marked) parts.push(`<circle cx="${x}" cy="${y}" r="11" fill="${colour('orange')}" stroke="${STROKE}" stroke-width="3" />`);
      parts.push(`<text x="${x}" y="${y + 32}" text-anchor="middle" font-size="20" font-weight="${hidden ? 700 : 600}" fill="${hidden ? MUTED : STROKE}" font-family="system-ui, sans-serif">${hidden ? '?' : v}</text>`);
    }
    return { w, h, body: parts.join('') };
  },

  table(spec) {
    const rows = spec.rows || [];
    const cols = Math.max(...rows.map((r) => r.length), 1);
    const cw = spec.cellWidth || 90;
    const ch = spec.cellHeight || 72;
    const w = cols * cw;
    const h = rows.length * ch;
    const parts = [];
    rows.forEach((row, r) => {
      row.forEach((cellText, c) => {
        const x = c * cw;
        const y = r * ch;
        const isHeader = spec.header && r === 0;
        const isMissing = cellText === '?' || cellText === null;
        parts.push(`<rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${ch - 4}" rx="8" fill="${isHeader ? MUTED : CANVAS}" fill-opacity="${isHeader ? 0.16 : 1}" stroke="${isMissing ? MUTED : FRAME}" stroke-width="${isMissing ? 3 : 2}" ${isMissing ? 'stroke-dasharray="7 6"' : ''} />`);
        const txt = cellText == null ? '?' : String(cellText);
        const size = txt.length <= 2 ? 30 : txt.length <= 5 ? 21 : 16;
        parts.push(`<text x="${x + cw / 2}" y="${y + ch / 2}" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="${isHeader || isMissing ? 700 : 600}" fill="${isMissing ? MUTED : STROKE}" font-family="system-ui, sans-serif">${esc(txt)}</text>`);
      });
    });
    return { w, h, body: parts.join('') };
  }
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Render a figure spec to an inline SVG string.
 * Returns '' for a null/unknown spec so callers can render unconditionally.
 */
export function renderFigure(spec, opts = {}) {
  if (!spec || typeof spec !== 'object') return '';
  // Shorthand: a bare { shapes: [...] } or { text: '...' } means one cell.
  // Question files use this constantly, so it saves a lot of JSON noise.
  if (!spec.kind && (spec.shapes || spec.text != null)) {
    spec = { kind: 'single', cell: spec, alt: spec.alt };
  }
  const kind = spec.kind || 'single';
  const fn = RENDERERS[kind];
  if (!fn) {
    console.warn(`[figures] unknown figure kind "${kind}"`);
    return '';
  }
  const defs = [];
  let out;
  try {
    out = fn(spec, defs);
  } catch (err) {
    console.error('[figures] failed to render', kind, err);
    return '';
  }
  const pad = opts.pad == null ? 6 : opts.pad;
  const body = `<g transform="translate(${pad} ${pad})">${out.body}</g>`;
  return svgWrap(out.w + pad * 2, out.h + pad * 2, body, defs, spec.alt || opts.alt || describeFigure(spec));
}

/**
 * Plain-language description of a figure, used for the aria-label and for the
 * read-aloud voice. Screen-reader users and 6-year-olds need the same thing:
 * words for the picture.
 */
export function describeFigure(spec) {
  if (!spec) return '';
  if (spec.alt) return spec.alt;
  switch (spec.kind) {
    case 'matrix':   return `A ${spec.rows || 2} by ${spec.cols || 2} grid of pictures with one square missing.`;
    case 'series':   return 'A row of pictures that follow a pattern, with one missing.';
    case 'analogy':  return 'Two pairs of pictures. The first pair shows a change. The second pair is missing its last picture.';
    case 'sets':     return 'Groups of pictures.';
    case 'paperfold':return 'A square of paper being folded, then a hole is punched through it.';
    case 'barchart': return `A bar graph titled ${spec.title || 'untitled'}.`;
    case 'pictograph': return 'A picture graph.';
    case 'balance':  return 'A balance scale with shapes on both sides.';
    case 'numberline': return 'A number line with one number missing.';
    case 'table':    return 'A grid of numbers with one box missing.';
    default:         return 'A picture.';
  }
}

/** Reset the pattern-id counter. Useful in tests for stable output. */
export function _resetIds() { uid = 0; }

export default { renderFigure, describeFigure, SHAPE_NAMES, FILL_NAMES };
