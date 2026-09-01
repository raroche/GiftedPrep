#!/usr/bin/env node
/**
 * Check the country-shape game.
 *
 * The risk here is different from the flag game. Typed answers mean a country
 * can be made unanswerable in a new way: if two countries accept the same
 * typed string, no answer is right. That is the main thing checked.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { normaliseName } from '../assets/js/modules/shapes.js';

const DATA = 'data/fun/shapes.json';
const DIR = 'assets/img/shapes';
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const onDisk = new Set(fs.readdirSync(DIR).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)));
const continents = new Set(data.continents.map((c) => c.id));

const byName = new Map();
const seenCode = new Set();

data.countries.forEach((c, i) => {
  const where = `country ${i + 1} (${c.code || '?'})`;
  if (!/^[a-z]{2}$/.test(c.code || '')) err(`${where}: bad code`);
  if (seenCode.has(c.code)) err(`${where}: duplicate code`);
  seenCode.add(c.code);
  if (!c.name) err(`${where}: no name`);
  if (!continents.has(c.continent)) err(`${where}: unknown continent "${c.continent}"`);
  if (!onDisk.has(c.code)) err(`${where}: no outline at ${DIR}/${c.code}.svg`);

  const names = c.names || [];
  if (!names.length) err(`${where}: no accepted names`);
  /* The displayed name must itself be accepted, or the child can be shown an
     answer that the game then rejects. */
  if (!names.some((n) => normaliseName(n) === normaliseName(c.name))) {
    err(`${where}: its own name "${c.name}" is not in the accepted list`);
  }
  if (c.es && !names.some((n) => normaliseName(n) === normaliseName(c.es))) {
    err(`${where}: the Spanish name "${c.es}" is not accepted`);
  }
  names.forEach((n) => {
    const k = normaliseName(n);
    if (!k) { err(`${where}: "${n}" normalises to nothing`); return; }
    if (byName.has(k) && byName.get(k) !== c.code) {
      err(`typing "${n}" could mean ${byName.get(k)} or ${c.code}`);
    }
    byName.set(k, c.code);
  });
});

/* An outline nobody can reach is dead weight in the repository. */
[...onDisk].filter((f) => !seenCode.has(f)).forEach((f) => warn(`${f}.svg is bundled but unused`));

data.continents.forEach((k) => {
  const n = data.countries.filter((c) => c.continent === k.id).length;
  if (!n) err(`continent "${k.id}" has no countries`);
  else if (n < 4) warn(`"${k.name}" has only ${n}, so four distinct choices cannot come from it alone`);
});

/* The vault */
const seenLook = new Set();
(data.lookalikes || []).forEach((l, i) => {
  const where = `lookalike ${i + 1} (${l.code || '?'})`;
  if (!onDisk.has(l.code)) err(`${where}: no outline`);
  if (seenLook.has(l.code)) err(`${where}: duplicate`);
  seenLook.add(l.code);
  for (const key of ['thing', 'story', 'country']) if (!l[key]) err(`${where}: missing "${key}"`);
  const ch = l.choices || [];
  if (ch.length < 3) err(`${where}: fewer than 3 choices`);
  if (new Set(ch).size !== ch.length) err(`${where}: a choice repeats`);
  if (!(l.answer >= 0 && l.answer < ch.length)) err(`${where}: answer out of range`);
  else if (ch[l.answer] !== l.thing) err(`${where}: answer "${ch[l.answer]}" is not the stated thing "${l.thing}"`);
  const known = data.countries.find((c) => c.code === l.code);
  if (known && known.name !== l.country) err(`${where}: country says "${l.country}" but ${l.code} is ${known.name}`);
});

for (const key of ['shapes', 'names']) {
  if (!data.attribution || !data.attribution[key]) err(`no attribution recorded for "${key}"`);
}

/* ---- no two countries may share an outline ----
   Rwanda shipped showing Saudi Arabia, because mapsicon's own rw folder holds
   the Saudi file. Identical bytes are the cheap half of catching that;
   tools/shapeverify.py is the half that catches a wrong outline which does not
   happen to duplicate another one in the set. */
const seenBytes = new Map();
for (const c of data.countries) {
  const f = `${DIR}/${c.code}.svg`;
  if (!fs.existsSync(f)) continue;
  const h = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
  if (seenBytes.has(h)) {
    err(`${c.code} (${c.name}) and ${seenBytes.get(h)} are the same outline file`);
  } else {
    seenBytes.set(h, `${c.code} (${c.name})`);
  }
}

const bytes = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg'))
  .reduce((n, f) => n + fs.statSync(path.join(DIR, f)).size, 0);

console.log(`${data.countries.length} countries, ${data.lookalikes.length} lookalikes, `
  + `${byName.size} accepted spellings, ${(bytes / 1024 / 1024).toFixed(2)} MB of outlines`);
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
