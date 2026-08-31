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
const TYPES = ['choice', 'number', 'truefalse', 'build', 'paper', 'collect'];

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
