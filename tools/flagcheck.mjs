#!/usr/bin/env node
/**
 * Check the flag game's data against the files on disk.
 *
 * The whole point of bundling flags from a maintained source was to avoid
 * mistakes, so the checks here are about the join: every country must have a
 * real image, every image must belong to a country, no two countries may share
 * a name, and every vault question must be answerable and not accidentally
 * give itself away.
 */

import fs from 'node:fs';
import path from 'node:path';

const DATA = 'data/fun/flags.json';
const DIR = 'assets/img/flags';
const PAST = path.join(DIR, 'past');

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const onDisk = new Set(
  fs.readdirSync(DIR).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4))
);

/* ---- countries ---- */

const seenCode = new Set();
const seenName = new Map();
const continents = new Set(data.continents.map((c) => c.id));

data.countries.forEach((c, i) => {
  const where = `country ${i + 1} (${c.code || '?'})`;
  if (!c.code || !/^[a-z]{2}$/.test(c.code)) err(`${where}: bad code`);
  if (seenCode.has(c.code)) err(`${where}: duplicate code`);
  seenCode.add(c.code);

  if (!c.name) err(`${where}: no name`);
  /* Two countries with the same name would make a question unanswerable. */
  if (seenName.has(c.name)) err(`${where}: name "${c.name}" also used by ${seenName.get(c.name)}`);
  else seenName.set(c.name, c.code);

  if (!continents.has(c.continent)) err(`${where}: unknown continent "${c.continent}"`);
  if (!onDisk.has(c.code)) err(`${where}: no image at ${DIR}/${c.code}.svg`);
});

/* Every bundled image should be reachable, or it is dead weight in the repo. */
const used = new Set(data.countries.map((c) => c.code));
[...onDisk].filter((f) => !used.has(f)).forEach((f) => warn(`${f}.svg is bundled but no country uses it`));

/* Enough countries per continent to fill a round of four choices. */
data.continents.forEach((k) => {
  const n = data.countries.filter((c) => c.continent === k.id).length;
  if (n === 0) err(`continent "${k.id}" has no countries`);
  else if (n < 4) warn(`continent "${k.name}" has only ${n}, so a question cannot offer 4 distinct choices from it alone`);
});

/* ---- the vault ---- */

const pastOnDisk = fs.existsSync(PAST)
  ? new Set(fs.readdirSync(PAST).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)))
  : new Set();

const seenSlug = new Set();
data.past.forEach((p, i) => {
  const where = `past flag ${i + 1} (${p.slug || '?'})`;
  if (!p.slug) err(`${where}: no slug`);
  if (seenSlug.has(p.slug)) err(`${where}: duplicate slug`);
  seenSlug.add(p.slug);
  if (!pastOnDisk.has(p.slug)) err(`${where}: no image at ${PAST}/${p.slug}.svg`);
  for (const key of ['name', 'years', 'story']) if (!p[key]) err(`${where}: missing "${key}"`);

  const ch = p.choices || [];
  if (ch.length < 3) err(`${where}: fewer than 3 choices`);
  if (new Set(ch).size !== ch.length) err(`${where}: a choice is repeated`);
  if (!(p.answer >= 0 && p.answer < ch.length)) err(`${where}: answer ${p.answer} is not one of the choices`);
  else if (ch[p.answer] !== p.name) {
    err(`${where}: the answer is "${ch[p.answer]}" but the flag is named "${p.name}"`);
  }
  /* The right answer must not be the only one that reads differently, or it
     gives itself away without the child looking at the flag. */
  const lens = ch.map((c) => c.length);
  const longest = Math.max(...lens);
  if (lens.filter((l) => l === longest).length === 1 && lens[p.answer] === longest && longest > Math.min(...lens) + 12) {
    warn(`${where}: the right answer is much longer than every wrong one, which is a giveaway`);
  }
});

[...pastOnDisk].filter((f) => !seenSlug.has(f)).forEach((f) => warn(`past/${f}.svg is bundled but unused`));

/* ---- attribution must be present, since these are other people's files ---- */

for (const key of ['flags', 'countries', 'past']) {
  if (!data.attribution || !data.attribution[key]) err(`no attribution recorded for "${key}"`);
}

/* ---- report ---- */

const bytes = (dir) => fs.readdirSync(dir)
  .filter((f) => f.endsWith('.svg'))
  .reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);

console.log(`${data.countries.length} countries, ${data.past.length} past flags`);
console.log(`${(bytes(DIR) / 1024 / 1024).toFixed(2)} MB of country flags, `
  + `${(bytes(PAST) / 1024).toFixed(0)} KB of past flags`);

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
