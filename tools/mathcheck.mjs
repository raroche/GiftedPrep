#!/usr/bin/env node
/**
 * Check the Math Lab data files.
 *
 * The quiz validator does not look at these, because the shape is different:
 * a maths exercise has a typed answer rather than a set of lettered choices.
 * This checks the things that would silently ship a broken puzzle.
 */

import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data/math';
const TYPES = ['choice', 'number', 'truefalse', 'build', 'paper', 'collect', 'colormap'];


/* Regions of a grid map, and which pairs share an edge. */
function mapRegions(cells) {
  const seen = [];
  cells.forEach((row) => row.forEach((id) => { if (!seen.includes(id)) seen.push(id); }));
  return seen;
}

function mapEdges(cells) {
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

/* Smallest number of colours that works. Brute force, fine at this size. */
function chromatic(cells) {
  const regions = mapRegions(cells).map(String);
  const edges = mapEdges(cells);
  if (regions.length > 12) return null;
  for (let k = 1; k <= 5; k += 1) {
    const paint = {};
    const fits = (i) => {
      if (i === regions.length) return true;
      for (let c = 0; c < k; c += 1) {
        paint[regions[i]] = c;
        const clash = edges.some(([a, b]) =>
          paint[a] !== undefined && paint[b] !== undefined && paint[a] === paint[b]);
        if (!clash && fits(i + 1)) return true;
      }
      delete paint[regions[i]];
      return false;
    };
    if (fits(0)) return k;
  }
  return 6;
}

const errors = [];
const warnings = [];
const err = (w, m) => errors.push(`${w}: ${m}`);
const warn = (w, m) => warnings.push(`${w}: ${m}`);

if (!fs.existsSync(DIR)) {
  console.log('No math data yet.');
  process.exit(0);
}

let files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
let topicCount = 0;
let exCount = 0;

for (const file of files) {
  const full = path.join(DIR, file);
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  const seenTopics = new Set();

  if (!data.grade) err(file, 'no grade');
  if (!Array.isArray(data.topics) || !data.topics.length) { err(file, 'no topics'); continue; }

  data.topics.forEach((t, ti) => {
    const where = `${file} topic ${ti + 1} (${t.id || '?'})`;
    topicCount += 1;

    if (!t.id) err(where, 'no id');
    if (seenTopics.has(t.id)) err(where, `duplicate topic id "${t.id}"`);
    seenTopics.add(t.id);
    for (const key of ['name', 'emoji', 'big', 'parentNote']) {
      if (!t[key]) err(where, `missing "${key}"`);
    }
    if (!Array.isArray(t.teach) || !t.teach.length) err(where, 'no lesson');
    (t.teach || []).forEach((b, bi) => {
      if (!['say', 'show', 'tip'].includes(b.t)) err(where, `lesson block ${bi + 1} has unknown type "${b.t}"`);
      if (b.t === 'show' && !b.figure) err(where, `lesson block ${bi + 1} shows nothing`);
      if (b.t !== 'show' && !b.text) err(where, `lesson block ${bi + 1} has no text`);
      if (b.text && b.text.length > 120) {
        warn(where, `lesson block ${bi + 1} is ${b.text.length} characters; a first grader will not read it`);
      }
    });

    if (!Array.isArray(t.exercises) || t.exercises.length < 4) {
      err(where, 'fewer than 4 exercises');
    }

    const kinds = new Set();
    (t.exercises || []).forEach((e, ei) => {
      const w = `${where} exercise ${ei + 1}`;
      exCount += 1;
      kinds.add(e.type);

      if (!TYPES.includes(e.type)) { err(w, `unknown type "${e.type}"`); return; }
      if (!e.ask) err(w, 'no question');
      if (e.ask && e.ask.length > 110) warn(w, `question is ${e.ask.length} characters, too long to read`);
      if (!e.why) err(w, 'no explanation');

      if (e.type === 'choice') {
        const ids = (e.choices || []).map((c) => c.id);
        if (ids.length < 2) err(w, 'fewer than 2 choices');
        if (new Set(ids).size !== ids.length) err(w, 'duplicate choice ids');
        if (!ids.includes(e.answer)) err(w, `answer "${e.answer}" matches no choice`);
        (e.choices || []).forEach((c) => {
          if (!c.figure && c.label == null) err(w, `choice "${c.id}" has neither a picture nor a label`);
        });
        /* Two choices that render the same give the question two right answers. */
        const seen = new Map();
        (e.choices || []).forEach((c) => {
          const key = JSON.stringify(c.figure || `T:${c.label}`);
          if (seen.has(key)) err(w, `choices "${seen.get(key)}" and "${c.id}" are identical`);
          else seen.set(key, c.id);
        });
      } else if (e.type === 'truefalse') {
        if (typeof e.answer !== 'boolean') err(w, 'answer must be true or false');
      } else if (e.type === 'collect') {
        if (!e.need) err(w, 'no target count');
        if (e.mode === 'pairs') {
          if (typeof e.total !== 'number') err(w, 'pairs mode needs a total');
          else if (e.need > Math.floor(e.total / 2) + 1) {
            err(w, `asks for ${e.need} pairs but only ${Math.floor(e.total / 2) + 1} exist`);
          }
        } else if (e.mode === 'list') {
          if (!Array.isArray(e.valid) || !e.valid.length) err(w, 'list mode needs valid answers');
          else if (e.need > e.valid.length) err(w, `asks for ${e.need} but only ${e.valid.length} are valid`);
        } else err(w, `unknown collect mode "${e.mode}"`);
      } else if (e.type === 'colormap') {
        if (!Array.isArray(e.cells) || !e.cells.length) { err(w, 'no map'); return; }
        const width = e.cells[0].length;
        if (e.cells.some((r) => r.length !== width)) err(w, 'map rows are different lengths');
        /* A colour limit the map cannot meet would be unwinnable. Work out the
           real answer by brute force; these maps are small. */
        const need = chromatic(e.cells);
        if (need === null) err(w, 'map is too big to check');
        else if (e.limit && e.limit < need) {
          err(w, `allows ${e.limit} colours but the map needs ${need}`);
        } else if (e.limit && e.limit > need) {
          warn(w, `allows ${e.limit} colours but ${need} would do`);
        }
        if (need > 4) err(w, `map needs ${need} colours, which cannot happen on a real map`);
      } else if (e.type === 'build') {
        if (!['tenframe', 'array'].includes(e.mode)) err(w, `unknown build mode "${e.mode}"`);
        if (typeof e.answer !== 'number') err(w, 'answer must be a number');
        const cap = e.mode === 'tenframe' ? 10 : (e.rows || 2) * (e.cols || 5);
        if (e.answer > cap) err(w, `answer ${e.answer} does not fit in ${cap} cells`);
      } else if (typeof e.answer !== 'number') {
        err(w, 'answer must be a number');
      }

      if (e.type === 'paper' && !e.hint) warn(w, 'a pencil task with no hint');
    });

    /* A topic that asks the same way every time stops being interesting. */
    if (kinds.size < 3) warn(where, `only ${kinds.size} exercise type(s); mix them up`);
  });
}

console.log(`${files.length} file(s), ${topicCount} topics, ${exCount} exercises`);
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
