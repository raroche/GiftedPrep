#!/usr/bin/env node
/**
 * Check the room registry against the things it depends on.
 *
 * Phase 2 moved the home page from hand-written markup to a list, which is
 * only a win if a wrong entry fails loudly. Every bug this catches is one that
 * actually happened while building it: a creature whose ears were hidden and
 * so was indistinguishable from another room's, a hue with no CSS class, and a
 * room banner painted in the brand orange because the component declared its
 * own colour defaults after the hue classes and quietly won.
 */

import fs from 'node:fs';

const CSS = 'assets/css/design-system.css';
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const { ROOMS, CREATURES, creature, roomCard } = await import('../assets/js/modules/sections.js');
const css = fs.readFileSync(CSS, 'utf8');

/* ---- every room is complete and unique ---- */

const ids = new Set();
const hues = new Set();
for (const [i, r] of ROOMS.entries()) {
  const where = `room ${i + 1} (${r.id || '?'})`;
  for (const key of ['id', 'name', 'hue', 'creature', 'href', 'status', 'blurb', 'meta']) {
    if (!r[key]) err(`${where}: missing "${key}"`);
  }
  if (ids.has(r.id)) err(`${where}: duplicate id`);
  ids.add(r.id);
  hues.add(r.hue);

  if (!['live', 'soon'].includes(r.status)) err(`${where}: status must be live or soon`);
  if (!CREATURES.includes(r.creature)) {
    err(`${where}: no creature called "${r.creature}" (have: ${CREATURES.join(', ')})`);
  }
  if (!/^#\//.test(r.href)) err(`${where}: href "${r.href}" is not a hash route`);
  if (r.blurb.length > 90) warn(`${where}: blurb is ${r.blurb.length} chars; it wraps past two lines`);
}

/* ---- two rooms must not look alike ---- */

const seenCreature = new Map();
const seenHue = new Map();
for (const r of ROOMS.filter((x) => x.status === 'live')) {
  if (seenCreature.has(r.creature)) {
    err(`"${r.id}" and "${seenCreature.get(r.creature)}" both use the ${r.creature}: `
      + 'two live rooms cannot share a creature');
  }
  seenCreature.set(r.creature, r.id);
  if (seenHue.has(r.hue)) {
    err(`"${r.id}" and "${seenHue.get(r.hue)}" are both ${r.hue}`);
  }
  seenHue.set(r.hue, r.id);
}

/* ---- the stylesheet has to know about every hue ---- */

for (const hue of hues) {
  for (const suffix of ['', '-soft', '-line', '-ink']) {
    if (!css.includes(`--cz-${hue}${suffix}:`)) err(`no --cz-${hue}${suffix} token in ${CSS}`);
  }
  if (!css.includes(`.cz-room--${hue}`)) err(`no .cz-room--${hue} class in ${CSS}`);
}

/* ---- a room's own colour must not be declared after the hue classes ----
   Equal specificity means the later rule wins, so a component that sets its
   own --room default below the hue block silently overrides every room. */
const hueAt = css.indexOf('.cz-room--mango');
for (const comp of ['.cz-roomhead', '.cz-welcome']) {
  const at = css.indexOf(comp + ' {');
  if (at > hueAt && at !== -1 && /--room(-soft|-line|-ink)?:/.test(css.slice(at, css.indexOf('}', at)))) {
    err(`${comp} declares its own --room* after the hue classes, so it overrides every room`);
  }
}

/* ---- a creature has to be visible, not hidden behind the eyes ----
   The eye disc covers x 10.5..53.5 and y 16..38. A feature drawn only inside
   that box cannot be seen, which is how three rooms once showed one animal. */
const outsideEyes = (svg) => {
  const ys = [...svg.matchAll(/(?:cy|y)="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
  const pathTops = [...svg.matchAll(/[ML]\s*-?[\d.]+\s+(-?[\d.]+)/g)].map((m) => Number(m[1]));
  return [...ys, ...pathTops].some((v) => v < 16);
};
for (const kind of CREATURES) {
  const svg = creature(kind);
  if (!outsideEyes(svg)) err(`creature "${kind}" draws nothing above y=16, so its ears are hidden`);
}

/* ---- the card markup a room produces ---- */
for (const r of ROOMS) {
  const html = roomCard(r);
  if (r.status === 'live' && !html.includes(`href="${r.href}"`)) err(`${r.id}: card is not a link`);
  if (r.status === 'soon' && html.includes('href=')) err(`${r.id}: a "soon" room must not be clickable`);
  if (!html.includes(`cz-room--${r.hue}`)) err(`${r.id}: card is missing its hue class`);
}

/* ---- report ---- */

console.log(`${ROOMS.length} rooms (${ROOMS.filter((r) => r.status === 'live').length} live), `
  + `${CREATURES.length} creatures, ${hues.size} hues in use`);

if (warnings.length) {
  console.log(`\nwarnings (${warnings.length}):`);
  warnings.forEach((m) => console.log(`  ! ${m}`));
}
if (errors.length) {
  console.log(`\nERRORS (${errors.length}):`);
  errors.forEach((m) => console.log(`  x ${m}`));
  process.exit(1);
}
console.log('\nNo errors.');
