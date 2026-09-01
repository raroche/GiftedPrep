#!/usr/bin/env node
/**
 * Prove every bundled country outline is actually that country.
 *
 * Rwanda shipped showing Saudi Arabia. The mistake was upstream — mapsicon's
 * own rw folder contains the Saudi file, byte for byte — so downloading by
 * country code was never going to catch it: the file was exactly where it
 * belonged and simply held the wrong country. A duplicate check (see
 * shapecheck.mjs) catches that case, but not the general one, because an
 * outline can be wrong without happening to duplicate another one in the set.
 *
 * So each outline is compared against independent geometry. Natural Earth's
 * public-domain polygons and the bundled SVG are each rasterised to a small
 * grid and compared by overlap.
 *
 * Three things had to be got right, and each wrong answer was informative:
 *
 *   An absolute similarity threshold flagged 32 countries including Croatia,
 *   Sweden and Mexico. The two sources do not share a projection, so a correct
 *   country scores modestly and no threshold separates it from a wrong one.
 *
 *   Ranking against all references reported France as the 174th best match for
 *   France. Whole-country comparison is dominated by overseas territories,
 *   date-line splits and island scatter, so only the largest landmass is
 *   compared: no two countries share a mainland.
 *
 *   It then claimed Italy resembled 168 countries more than itself, which is
 *   absurd enough to be a bug rather than a finding — and was. Every mapsicon
 *   file wraps its paths in transform="translate(0,1024) scale(0.1,-0.1)", and
 *   ignoring it compared every country upside down.
 *
 * The verdict is the gap: how much better some other country fits than your
 * own. Rwanda scored 0.48 for itself and 0.89 for Saudi Arabia. Nothing correct
 * came near that.
 *
 * Written in Node rather than Python so the build depends on one runtime. The
 * Python version used int.bit_count(), which needs 3.10, and failed the deploy.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GRID = 56;   /* raster size: enough to tell countries apart, quick enough */
const FLAT = 6;    /* straight segments per cubic curve */
const GAP = 0.30;  /* how much better another country must fit to be a verdict */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = 'assets/img/shapes';

/**
 * Countries the two sources genuinely disagree about, each checked by eye.
 * These are places where "which landmass is the country" is not a question the
 * two datasets answer the same way — not wrong outlines.
 */
const KNOWN = {
  aq: 'Antarctica: circumpolar, so the reference collapses to a line',
  gl: 'Greenland: near the pole, where the reference projection flattens it',
  my: 'Malaysia: peninsula and Borneo, and the sources pick different mainlands',
  ru: 'Russia: crosses the date line, which splits the reference in two',
  eh: 'Western Sahara: disputed, and the two datasets draw different borders'
};

/* ------------------------------------------------------------------ */
/* SVG paths                                                           */
/* ------------------------------------------------------------------ */

const TOKEN = /[A-Za-z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

/** Flatten one path to closed rings. Only what mapsicon emits: M/m L/l c z. */
function parsePath(d) {
  const t = d.match(TOKEN) || [];
  const rings = [];
  let ring = [];
  let x = 0, y = 0, sx = 0, sy = 0, i = 0, cmd = null;
  const num = () => Number(t[i++]);
  const flush = () => { if (ring.length > 2) rings.push(ring); ring = []; };

  while (i < t.length) {
    if (/^[A-Za-z]$/.test(t[i])) {
      cmd = t[i++];
      if (cmd === 'z' || cmd === 'Z') { flush(); x = sx; y = sy; continue; }
    }
    if (cmd === null) { i += 1; continue; }
    if (cmd === 'M' || cmd === 'm') {
      flush();
      const dx = num(), dy = num();
      if (cmd === 'M') { x = dx; y = dy; } else { x += dx; y += dy; }
      sx = x; sy = y;
      ring.push([x, y]);
      cmd = cmd === 'M' ? 'L' : 'l';
    } else if (cmd === 'L' || cmd === 'l') {
      const dx = num(), dy = num();
      if (cmd === 'L') { x = dx; y = dy; } else { x += dx; y += dy; }
      ring.push([x, y]);
    } else if (cmd === 'C' || cmd === 'c') {
      const p = [num(), num(), num(), num(), num(), num()];
      const [x1, y1, x2, y2, x3, y3] = cmd === 'c'
        ? [x + p[0], y + p[1], x + p[2], y + p[3], x + p[4], y + p[5]]
        : p;
      for (let k = 1; k <= FLAT; k += 1) {
        const s = k / FLAT, u = 1 - s;
        ring.push([
          u * u * u * x + 3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s * x3,
          u * u * u * y + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s * y3
        ]);
      }
      x = x3; y = y3;
    } else if (cmd === 'H' || cmd === 'h') {
      const dx = num(); x = cmd === 'H' ? dx : x + dx; ring.push([x, y]);
    } else if (cmd === 'V' || cmd === 'v') {
      const dy = num(); y = cmd === 'V' ? dy : y + dy; ring.push([x, y]);
    } else { i += 1; }
  }
  flush();
  return rings;
}

/** Rings from a file, with the group transform applied — the minus sign matters. */
function svgRings(file) {
  const src = fs.readFileSync(file, 'utf8');
  let tx = 0, ty = 0, sx = 1, sy = 1;
  const tm = src.match(/transform="([^"]+)"/);
  if (tm) {
    const tr = tm[1].match(/translate\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
    if (tr) { tx = Number(tr[1]); ty = Number(tr[2]); }
    const sc = tm[1].match(/scale\(\s*(-?[\d.]+)\s*(?:,\s*(-?[\d.]+)\s*)?\)/);
    if (sc) { sx = Number(sc[1]); sy = sc[2] === undefined ? sx : Number(sc[2]); }
  }
  const out = [];
  for (const m of src.matchAll(/\sd="([^"]+)"/g)) {
    for (const ring of parsePath(m[1])) {
      out.push(ring.map(([px, py]) => [tx + sx * px, ty + sy * py]));
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Rasterising                                                         */
/* ------------------------------------------------------------------ */

const area = (ring) => {
  let a = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
};

/** Only the largest landmass. See the header for why. */
const mainland = (rings) => (rings.length
  ? [rings.reduce((best, r) => (area(r) > area(best) ? r : best))] : []);

const WORDS = Math.ceil((GRID * GRID) / 32);

/** Normalise to fill the grid, scanline fill, pack to bits. */
function raster(ringsIn) {
  const rings = mainland(ringsIn);
  const pts = rings.flat();
  if (pts.length < 3) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [px, py] of pts) {
    if (px < minX) minX = px; if (px > maxX) maxX = px;
    if (py < minY) minY = py; if (py > maxY) maxY = py;
  }
  const w = maxX - minX, h = maxY - minY;
  if (!(w > 0) || !(h > 0)) return null;
  const k = (GRID - 2) / Math.max(w, h);
  const ox = (GRID - w * k) / 2 - minX * k;
  const oy = (GRID - h * k) / 2 - minY * k;
  const scaled = rings.map((r) => r.map(([px, py]) => [px * k + ox, py * k + oy]));

  const out = new Uint32Array(WORDS);
  for (let row = 0; row < GRID; row += 1) {
    const yc = row + 0.5;
    const hits = [];
    for (const r of scaled) {
      for (let j = 0; j < r.length; j += 1) {
        const [x1, y1] = r[j];
        const [x2, y2] = r[(j + 1) % r.length];
        if ((y1 <= yc && yc < y2) || (y2 <= yc && yc < y1)) {
          hits.push(x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1));
        }
      }
    }
    hits.sort((a, b) => a - b);
    for (let j = 0; j + 1 < hits.length; j += 2) {
      const a = Math.max(0, Math.ceil(hits[j] - 0.5));
      const b = Math.min(GRID - 1, Math.floor(hits[j + 1] - 0.5));
      for (let c = a; c <= b; c += 1) {
        const bit = row * GRID + c;
        out[bit >>> 5] |= 1 << (bit & 31);
      }
    }
  }
  return out;
}

const popcount = (v) => {
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

function iou(a, b) {
  let inter = 0, union = 0;
  for (let i = 0; i < WORDS; i += 1) {
    inter += popcount(a[i] & b[i]);
    union += popcount(a[i] | b[i]);
  }
  return union ? inter / union : 0;
}

/* ------------------------------------------------------------------ */

const geoRings = (entry) =>
  entry.rings.flatMap((poly) => poly.map((ring) => ring.map(([lon, lat]) => [lon, -lat])));

const refPath = path.join(HERE, 'reference', 'countries.json');
if (!fs.existsSync(refPath)) {
  console.log(`reference geometry not found: ${refPath}`);
  process.exit(1);
}
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
const data = JSON.parse(fs.readFileSync('data/fun/shapes.json', 'utf8'));
const names = Object.fromEntries(data.countries.map((c) => [c.code, c.name]));

const refs = [];
for (const entry of ref.countries) {
  const g = raster(geoRings(entry));
  if (g) refs.push([entry.iso, g]);
}
const haveRef = new Set(refs.map((r) => r[0]));

const misses = [];
let checked = 0, noRef = 0;
for (const c of data.countries) {
  const file = `${DIR}/${c.code}.svg`;
  if (!fs.existsSync(file)) continue;
  if (!haveRef.has(c.code)) { noRef += 1; continue; }
  const mine = raster(svgRings(file));
  if (!mine) { noRef += 1; continue; }
  checked += 1;
  let bestScore = -1, bestCode = '', own = 0;
  for (const [rc, r] of refs) {
    const s = iou(mine, r);
    if (rc === c.code) own = s;
    if (s > bestScore) { bestScore = s; bestCode = rc; }
  }
  if (bestCode !== c.code) {
    misses.push({ gap: bestScore - own, code: c.code, name: c.name,
      bestCode, bestName: names[bestCode] || bestCode, bestScore, own });
  }
}

misses.sort((a, b) => b.gap - a.gap);
const wrong = misses.filter((m) => m.gap >= GAP && !KNOWN[m.code]);
const allowed = misses.filter((m) => m.gap >= GAP && KNOWN[m.code]);

console.log(`${checked} outlines matched against ${refs.length} reference countries, `
  + `${noRef} had no reference`);

if (misses.length) {
  console.log('\nWidest gaps between how well an outline fits another country and its own:');
  for (const m of misses.slice(0, 8)) {
    const flag = m.gap >= GAP ? (KNOWN[m.code] ? 'known' : 'WRONG') : '     ';
    console.log(`  ${flag} +${m.gap.toFixed(2)}  ${m.code} (${m.name}) fits itself `
      + `${m.own.toFixed(2)}, but ${m.bestCode} (${m.bestName}) ${m.bestScore.toFixed(2)}`);
  }
}
if (allowed.length) {
  console.log('\nAllowed through, each checked by eye:');
  allowed.forEach((m) => console.log(`  ok  ${m.code} — ${KNOWN[m.code]}`));
}
if (wrong.length) {
  console.log(`\nERRORS (${wrong.length}):`);
  wrong.forEach((m) => console.log(`  x ${m.code} (${m.name}) is drawn as `
    + `${m.bestCode} (${m.bestName})`));
  process.exit(1);
}
console.log(`\nNo outline fits another country more than ${GAP} better than its own.`);
