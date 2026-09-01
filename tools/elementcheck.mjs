#!/usr/bin/env node
/**
 * Check the periodic table data.
 *
 * The table is the one data set on this site that can be proved complete rather
 * than merely spot-checked: the atomic numbers are the integers 1 to 118 with
 * no gaps, every symbol is unique, and every element occupies its own cell. If
 * all three hold, nothing is missing and nothing is duplicated.
 */

import fs from 'node:fs';

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const data = JSON.parse(fs.readFileSync('data/fun/elements.json', 'utf8'));
const { ART_KEYS } = await import('../assets/js/modules/elemart.js');
const { judge, pool, makeChoices } = await import('../assets/js/modules/elements.js');

const els = data.elements;

/* ---- complete, by construction ---- */
const nums = els.map((e) => e.z).sort((a, b) => a - b);
for (let z = 1; z <= 118; z += 1) {
  if (!nums.includes(z)) err(`atomic number ${z} is missing`);
}
if (els.length !== 118) err(`${els.length} elements, expected 118`);

const bySymbol = new Map();
const byCell = new Map();
for (const e of els) {
  for (const key of ['z', 'symbol', 'name', 'es', 'row', 'col', 'family', 'phase']) {
    if (e[key] === undefined || e[key] === '') err(`${e.symbol || e.z}: missing "${key}"`);
  }
  if (bySymbol.has(e.symbol)) err(`symbol ${e.symbol} used by ${bySymbol.get(e.symbol)} and ${e.z}`);
  bySymbol.set(e.symbol, e.z);

  const cell = `${e.row}:${e.col}`;
  if (byCell.has(cell)) err(`${e.symbol} and ${byCell.get(cell)} both sit at row ${e.row} col ${e.col}`);
  byCell.set(cell, e.symbol);

  if (e.col < 1 || e.col > 18) err(`${e.symbol}: column ${e.col} is off the table`);
  if (e.row < 1 || e.row > 10) err(`${e.symbol}: row ${e.row} is off the table`);
  if (!/^[A-Z][a-z]{0,2}$/.test(e.symbol)) err(`${e.symbol}: not a valid element symbol`);
  if (e.use && !e.art) err(`${e.symbol}: has a use but no picture`);
  if (e.art && !ART_KEYS.includes(e.art)) {
    err(`${e.symbol}: no drawing called "${e.art}" (have: ${ART_KEYS.join(', ')})`);
  }
}

/* ---- known landmarks, so a silently shuffled table is caught ---- */
const spot = { 1: 'H', 2: 'He', 6: 'C', 8: 'O', 26: 'Fe', 47: 'Ag', 79: 'Au', 80: 'Hg', 92: 'U', 118: 'Og' };
for (const [z, sym] of Object.entries(spot)) {
  const e = els.find((x) => x.z === Number(z));
  if (e && e.symbol !== sym) err(`element ${z} should be ${sym}, is ${e.symbol}`);
}
const helium = els.find((e) => e.symbol === 'He');
if (helium && (helium.row !== 1 || helium.col !== 18)) {
  err('helium must sit top right, above the other noble gases');
}

/* ---- every set can fill a round of four choices ---- */
for (const set of ['everyday', 'first20', 'all']) {
  for (const ask of ['symbol', 'sign', 'use', 'where']) {
    const list = pool(data, set, ask);
    if (!list.length) err(`set "${set}" with question "${ask}" has nothing to ask`);
    else if (list.length < 4 && ask !== 'where') {
      err(`set "${set}" / "${ask}" has only ${list.length}; four choices need four`);
    }
  }
}
for (const e of els.slice(0, 40)) {
  const ch = makeChoices(e, data);
  if (ch.length !== 4) err(`${e.symbol}: got ${ch.length} choices, not 4`);
  if (new Set(ch.map((c) => c.z)).size !== 4) err(`${e.symbol}: a choice is repeated`);
  if (!ch.some((c) => c.z === e.z)) err(`${e.symbol}: the right answer is not among the choices`);
}

/* ---- typed answers must not be ambiguous ---- */
let crossed = 0;
for (const target of els) {
  for (const other of els) {
    if (other.z === target.z) continue;
    for (const name of [other.name, other.es]) {
      const v = judge(name, target, data);
      if (v.verdict === 'right' || v.verdict === 'close') {
        err(`"${name}" (${other.name}) accepted for ${target.name} as "${v.verdict}"`);
        crossed += 1;
      }
    }
  }
}

/* ---- report ---- */

const withUse = els.filter((e) => e.use).length;
const diffEs = els.filter((e) => e.es.toLowerCase() !== e.name.toLowerCase()).length;
console.log(`118 elements, ${bySymbol.size} unique symbols, ${byCell.size} distinct cells`);
console.log(`${withUse} with an everyday use and a drawing, ${ART_KEYS.length} drawings available`);
console.log(`${diffEs} have a different Spanish name; ${crossed} typed answers are ambiguous`);

if (!data.attribution || !data.attribution.names) err('no attribution recorded');

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
