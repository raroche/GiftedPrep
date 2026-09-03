#!/usr/bin/env node
/**
 * Follow every internal link and make sure it lands somewhere.
 *
 * Routing is entirely hash based, so a wrong link is not a 404 the server can
 * report or the browser can flag — it silently falls through the router's
 * default and dumps the child back on the home page. That is exactly what
 * happened when the country-shape game shipped: the link was right and the
 * deploy was stale, and the only symptom was landing on the wrong screen. A
 * genuinely wrong href would look identical.
 *
 * Checks both directions: every link resolves to a route, and every route is
 * reachable from somewhere.
 */

import fs from 'node:fs';
import path from 'node:path';

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* ---- what the router actually handles ---- */

const app = fs.readFileSync('assets/js/app.js', 'utf8');
const routeFn = app.slice(app.indexOf('function route()'));
const routeBody = routeFn.slice(0, routeFn.indexOf('\n}\n'));
const ROUTES = new Set([...routeBody.matchAll(/case '([a-z]+)'/g)].map((m) => m[1]));
if (!ROUTES.size) err('could not find any case labels in route()');

/* ---- what exists, for the second path segment ---- */

const grades = fs.readdirSync('data/math')
  .filter((f) => /^grade\d+\.json$/.test(f))
  .map((f) => f.match(/\d+/)[0]);

const manifest = JSON.parse(fs.readFileSync('data/manifest.json', 'utf8'));
const testIds = new Set((manifest.tests || []).map((t) => t.id).concat('all'));

const chessLessons = new Set();
for (const n of [1, 2, 3]) {
  const file = `data/chess/level${n}.json`;
  if (!fs.existsSync(file)) continue;
  for (const l of JSON.parse(fs.readFileSync(file, 'utf8')).lessons || []) chessLessons.add(l.id);
}

const { ROOMS } = await import('../assets/js/modules/sections.js');

/* ---- collect every link the app can produce ---- */

const files = ['index.html'];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const full = path.join(d, e.name);
  if (e.isDirectory()) walk(full);
  else if (e.name.endsWith('.js')) files.push(full);
});
walk('assets/js');

const links = new Map();   // link -> where it came from
const note = (raw, src) => {
  /* A link built in a template literal reaches here with its ${...} intact.
     Only the static prefix can be checked, so mark it open-ended rather than
     treating "${grade}" as a folder name. */
  const at = raw.indexOf('${');
  const link = at === -1 ? raw : raw.slice(0, at) + '*';
  if (!links.has(link)) links.set(link, new Set());
  links.get(link).add(src);
};

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/href=["'](#\/[^"'`]*)["']/g)) note(m[1], f);
  for (const m of src.matchAll(/href:\s*'(#\/[^']*)'/g)) note(m[1], f);
  for (const m of src.matchAll(/location\.hash\s*=\s*'(#\/[^']*)'/g)) note(m[1], f);
  /* Links built in a template literal: keep the static prefix, drop the rest. */
  for (const m of src.matchAll(/href="(#\/[^"]*?)\$\{/g)) note(m[1] + '*', f);
  for (const m of src.matchAll(/location\.hash\s*=\s*`(#\/[^`]*?)\$\{/g)) note(m[1] + '*', f);
}
for (const r of ROOMS) note(r.href, 'modules/sections.js (ROOMS)');

/* ---- resolve each one ---- */

const reached = new Set();
for (const [link, from] of links) {
  const where = [...from].join(', ');
  const parts = link.replace(/^#\//, '').replace(/\*$/, '').split('/').filter(Boolean);
  const head = parts[0];
  const open = link.endsWith('*');

  if (!head) { reached.add('home'); continue; }
  if (!ROUTES.has(head)) {
    err(`${link} -> no case '${head}' in route()   [${where}]`);
    continue;
  }
  reached.add(head);

  /* Second segment, where it is a fixed string we can check. */
  if (head === 'math' && parts[1] && !open && !grades.includes(parts[1])) {
    err(`${link} -> no data/math/grade${parts[1]}.json   [${where}]`);
  }
  if (head === 'categories' && parts[1] && !open && !testIds.has(parts[1])) {
    err(`${link} -> "${parts[1]}" is not a test id   [${where}]`);
  }
  /* The chess room's second segment is a level number, a fixed page, or the
     Phase 1 workbench. A typo here lands a child on the home page with no
     error, the same way the country game once did. */
  if (head === 'chess' && parts[1] && !open) {
    const pages = new Set(['1', '2', '3', 'play', 'puzzles', 'games', 'board']);
    if (!pages.has(parts[1])) err(`${link} -> no chess page called "${parts[1]}"   [${where}]`);
    /* A third segment is a lesson id, and it has to be one that exists: a
       typo lands the child on the level page with nothing to say why. */
    if (parts[2] && /^[123]$/.test(parts[1]) && !chessLessons.has(parts[2])) {
      err(`${link} -> no chess lesson called "${parts[2]}"   [${where}]`);
    }
  }
  if (head === 'fun' && parts[1] && !open) {
    const games = new Set(['flags', 'shapes', 'capitals', 'elements', 'angles']);
    if (!games.has(parts[1])) err(`${link} -> no game called "${parts[1]}"   [${where}]`);
    if (parts[2] && !['play', 'learn'].includes(parts[2])) {
      err(`${link} -> unknown step "${parts[2]}"   [${where}]`);
    }
  }
}

/* ---- and the other way: a route nobody can get to ---- */

for (const r of ROUTES) {
  if (!reached.has(r)) warn(`route '${r}' is handled but nothing links to it`);
}

/* ---- every live room must be linked from the map ---- */

for (const r of ROOMS.filter((x) => x.status === 'live')) {
  if (!links.has(r.href)) err(`room "${r.id}" (${r.href}) is not linked from anywhere`);
}

/* ---- report ---- */

console.log(`${links.size} distinct links, ${ROUTES.size} routes, `
  + `${grades.length} maths grades, ${testIds.size - 1} tests`);

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
