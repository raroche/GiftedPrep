#!/usr/bin/env node
/**
 * Check the capital data, and the thing unique to this game: that forgiving a
 * typo never quietly accepts a different country's answer.
 *
 * The join checks are the same as the flag and shape games. The last one is not:
 * it walks every accepted spelling of every country against every other country
 * and asserts the matcher never returns "right" or "close". That property is the
 * whole reason the tolerance is safe to ship.
 */

import fs from 'node:fs';

const DATA = 'data/fun/capitals.json';
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const { judge, normaliseCapital } = await import('../assets/js/modules/capitals.js');
const { allowedEdits, editDistance } = await import('../assets/js/modules/fuzzy.js');

const continents = new Set(data.continents.map((c) => c.id));
const seenCode = new Set();

for (const [i, c] of data.countries.entries()) {
  const where = `${c.country || `country ${i + 1}`}`;
  if (!/^[a-z]{2}$/.test(c.code || '')) err(`${where}: bad code`);
  if (seenCode.has(c.code)) err(`${where}: duplicate code`);
  seenCode.add(c.code);
  if (!c.capital) err(`${where}: no capital`);
  if (!continents.has(c.continent)) err(`${where}: unknown continent "${c.continent}"`);
  if (!(c.names || []).length) err(`${where}: no accepted spellings`);
  if (!(c.names || []).some((n) => normaliseCapital(n) === normaliseCapital(c.capital))) {
    err(`${where}: the displayed capital "${c.capital}" is not among its own accepted names`);
  }
  for (const n of c.names || []) {
    if (!normaliseCapital(n)) err(`${where}: an accepted name folds away to nothing`);
  }
}

/* ---- a capital must answer for exactly one country ---- */
const owner = new Map();
for (const c of data.countries) {
  for (const n of c.names || []) {
    const k = normaliseCapital(n);
    if (owner.has(k) && owner.get(k) !== c.code) {
      err(`"${n}" is accepted for both ${owner.get(k)} and ${c.code}`);
    }
    owner.set(k, c.code);
  }
}

/* ---- how many real answers sit within typo range of each other ---- */
const flat = [];
for (const c of data.countries) for (const n of c.names || []) flat.push([normaliseCapital(n), c]);
const near = [];
for (let i = 0; i < flat.length; i += 1) {
  for (let j = i + 1; j < flat.length; j += 1) {
    if (flat[i][1].code === flat[j][1].code) continue;
    const budget = Math.min(allowedEdits(flat[i][0].length), allowedEdits(flat[j][0].length));
    if (budget === 0) continue;
    if (editDistance(flat[i][0], flat[j][0], budget) <= budget) {
      near.push(`${flat[i][0]} (${flat[i][1].country}) / ${flat[j][0]} (${flat[j][1].country})`);
    }
  }
}

/* ---- the property that matters: no cross-acceptance, ever ---- */
let crossed = 0;
for (const target of data.countries) {
  for (const other of data.countries) {
    if (other.code === target.code) continue;
    for (const name of other.names || []) {
      const v = judge(name, target, data);
      if (v.verdict === 'right' || v.verdict === 'close') {
        err(`"${name}" (${other.country}) is accepted for ${target.country} as "${v.verdict}"`);
        crossed += 1;
      }
    }
  }
}

/* ---- report ---- */

const spellings = data.countries.reduce((n, c) => n + (c.names || []).length, 0);
console.log(`${data.countries.length} countries, ${spellings} accepted spellings `
  + `(${(spellings / data.countries.length).toFixed(1)} each)`);
console.log(`${near.length} pairs of different countries sit within typo range; `
  + `${crossed} of them are wrongly accepted`);
if (near.length) console.log(`  ${near.slice(0, 6).join('\n  ')}`);

if (!data.attribution || !data.attribution.capitals) err('no attribution recorded');

if (warnings.length) {
  console.log(`\nwarnings (${warnings.length}):`);
  warnings.forEach((m) => console.log(`  ! ${m}`));
}
if (errors.length) {
  console.log(`\nERRORS (${errors.length}):`);
  errors.slice(0, 20).forEach((m) => console.log(`  x ${m}`));
  process.exit(1);
}
console.log('\nNo errors.');
