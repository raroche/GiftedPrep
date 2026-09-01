#!/usr/bin/env node
/**
 * Keep the layering that Phase 3 created.
 *
 * app.js was one 1,864-line file holding every screen, which was survivable at
 * three sections and would not have been at ten. Splitting it is only worth
 * anything if it stays split, and the two ways it would quietly come undone are
 * a cycle (a screen reaching back into app.js) and a screen reaching sideways
 * into another screen. Both are easy to write and neither fails at parse time:
 * a cycle in ES modules gives you `undefined` at call time, in one branch, on
 * some route nobody clicked before deploying.
 *
 *   modules/  may import modules/
 *   screens/  may import modules/ and screens/  (checked for cycles)
 *   app.js    may import both
 *
 * Nothing may import app.js.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'assets/js';
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* ---- collect the graph ---- */

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.js')) files.push(full);
  }
};
walk(ROOT);

const graph = new Map();
const layerOf = (f) => (f === `${ROOT}/app.js` ? 'app'
  : f.includes(`${ROOT}/screens/`) ? 'screens' : 'modules');

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const deps = [...src.matchAll(/^import\s[\s\S]*?from\s+'([^']+)';/gm)]
    .map((m) => path.normalize(path.join(path.dirname(f), m[1])));
  graph.set(f, deps);
  for (const d of deps) {
    if (!files.includes(d)) { err(`${f} imports ${d}, which does not exist`); continue; }
    const [from, to] = [layerOf(f), layerOf(d)];
    if (to === 'app') err(`${f} imports app.js — nothing may depend on the shell`);
    if (from === 'modules' && to === 'screens') {
      err(`${f} is a module but imports the screen ${d}; modules must not know about screens`);
    }
  }
}

/* ---- cycles ---- */

const state = new Map();
const stack = [];
const seenCycle = new Set();
function visit(f) {
  if (state.get(f) === 'done') return;
  if (state.get(f) === 'open') {
    const cycle = stack.slice(stack.indexOf(f)).concat(f)
      .map((x) => x.replace(`${ROOT}/`, '')).join(' -> ');
    if (!seenCycle.has(cycle)) { seenCycle.add(cycle); err(`import cycle: ${cycle}`); }
    return;
  }
  state.set(f, 'open');
  stack.push(f);
  for (const d of graph.get(f) || []) if (files.includes(d)) visit(d);
  stack.pop();
  state.set(f, 'done');
}
files.forEach(visit);

/* ---- size, as a warning only ---- */

const LIMIT = 700;
for (const f of files) {
  const n = fs.readFileSync(f, 'utf8').split('\n').length;
  if (n > LIMIT) warn(`${f} is ${n} lines; past ${LIMIT} it is probably two things`);
}

/* ---- every room's route must be handled ---- */

const { ROOMS } = await import('../assets/js/modules/sections.js');
const app = fs.readFileSync(`${ROOT}/app.js`, 'utf8');
for (const r of ROOMS.filter((x) => x.status === 'live')) {
  const head = r.href.replace(/^#\//, '').split('/')[0];
  if (!new RegExp(`case '${head}'`).test(app)) {
    err(`room "${r.id}" points at ${r.href} but the router has no case '${head}'`);
  }
}

/* ---- report ---- */

const byLayer = { app: 0, screens: 0, modules: 0 };
let total = 0;
for (const f of files) {
  const n = fs.readFileSync(f, 'utf8').split('\n').length;
  byLayer[layerOf(f)] += n;
  total += n;
}
console.log(`${files.length} files, ${total} lines — `
  + `app ${byLayer.app}, screens ${byLayer.screens}, modules ${byLayer.modules}`);

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
