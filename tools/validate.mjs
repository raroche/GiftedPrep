#!/usr/bin/env node
/**
 * validate.mjs — Check the question bank before shipping it.
 *
 *   node tools/validate.mjs
 *
 * Catches the mistakes that are easy to make by hand and impossible to see in
 * a browser: an answer id that matches no choice, the wrong number of choices
 * for a grade, a figure that references a shape the renderer does not know, a
 * category file that does not match its manifest entry.
 *
 * Exits non-zero on any error, so it works as a pre-commit or CI step.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SHAPE_NAMES, FILL_NAMES, renderFigure } from '../assets/js/modules/figures.js';
import { canonicalFigure } from './_symmetry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const KNOWN_FIGURE_KINDS = new Set([
  'single', 'series', 'matrix', 'sets', 'analogy', 'paperfold',
  'barchart', 'pictograph', 'balance', 'numberline', 'table'
]);
const KNOWN_COLOURS = new Set([
  'blue', 'red', 'green', 'yellow', 'purple', 'orange',
  'teal', 'pink', 'grey', 'ink', 'none'
]);
/* Pearson validates the NNAT on exactly these five. Nothing else may appear
   in an NNAT item. See docs/research/nnat-olsat.md. */
const NNAT_COLOURS = new Set(['blue', 'green', 'yellow', 'grey', 'ink', 'none']);

const manifest = JSON.parse(readFileSync(join(DATA, 'manifest.json'), 'utf8'));

/* Optional filter: `node tools/validate.mjs cogat/figure-matrices` checks only
   the categories whose id or file contains that string. Useful when several
   people (or agents) are editing different category files at the same time. */
const filter = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const wanted = (cat) => !filter.length
  || filter.some((f) => cat.id.includes(f) || cat.file.includes(f));

/* ---------------------------------------------------------------- */
/* Walk every figure spec and check its shapes, fills and colours     */
/* ---------------------------------------------------------------- */

function checkShapes(node, where, testId) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) { node.forEach((n) => checkShapes(n, where, testId)); return; }

  if (node.kind && !KNOWN_FIGURE_KINDS.has(node.kind)) {
    err(where, `unknown figure kind "${node.kind}"`);
  }
  if (node.s && !SHAPE_NAMES.includes(String(node.s).toLowerCase())) {
    err(where, `unknown shape "${node.s}"`);
  }
  if (node.f && !FILL_NAMES.includes(String(node.f).toLowerCase())) {
    err(where, `unknown fill "${node.f}"`);
  }
  if (typeof node.c === 'string') {
    if (!KNOWN_COLOURS.has(node.c)) err(where, `unknown colour "${node.c}"`);
    else if (testId === 'nnat' && !NNAT_COLOURS.has(node.c)) {
      err(where, `colour "${node.c}" is outside the NNAT palette (black, white, yellow, blue, green)`);
    }
  }
  if (node.n != null && (node.n < 1 || node.n > 9)) err(where, `count n=${node.n} is outside 1-9`);
  if (node.z != null && (node.z < 0.15 || node.z > 1.6)) warn(where, `scale z=${node.z} is outside the useful range`);

  Object.values(node).forEach((v) => {
    if (v && typeof v === 'object') checkShapes(v, where, testId);
  });
}

/* ---------------------------------------------------------------- */

let totalQuestions = 0;
const seenIds = new Set();
const perGrade = { 1: 0, 2: 0, 3: 0, 4: 0 };
const perTest = {};
const missingFiles = [];

for (const cat of manifest.categories) {
  if (!wanted(cat)) continue;
  const path = join(DATA, cat.file);
  if (!existsSync(path)) { missingFiles.push(cat.file); continue; }

  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    err(cat.file, `invalid JSON — ${e.message}`);
    continue;
  }

  if (data.id !== cat.id) err(cat.file, `id "${data.id}" does not match manifest id "${cat.id}"`);
  if (data.test !== cat.test) err(cat.file, `test "${data.test}" does not match manifest "${cat.test}"`);
  ['blurb', 'howItWorks', 'childIntro', 'parentTip'].forEach((k) => {
    if (!data[k]) warn(cat.file, `missing "${k}"`);
  });

  const gradesSeen = new Set();

  (data.questions || []).forEach((q, i) => {
    const where = `${cat.file}[${i}] ${q.id || '(no id)'}`;
    totalQuestions += 1;

    if (!q.id) err(where, 'missing id');
    else if (seenIds.has(q.id)) err(where, `duplicate question id "${q.id}"`);
    else seenIds.add(q.id);

    if (![1, 2, 3, 4].includes(q.grade)) err(where, `grade must be 1-4, got ${q.grade}`);
    else {
      gradesSeen.add(q.grade);
      perGrade[q.grade] += 1;
      if (!cat.grades.includes(q.grade)) {
        err(where, `grade ${q.grade} is not listed in the manifest for this category`);
      }
    }

    if (!(q.difficulty >= 1 && q.difficulty <= 5)) err(where, `difficulty must be 1-5, got ${q.difficulty}`);
    if (!q.prompt) err(where, 'missing prompt');
    if (!q.explanation) err(where, 'missing explanation');
    if (!q.strategy) warn(where, 'missing strategy');

    const choices = q.choices || [];
    if (choices.length < 2) err(where, 'needs at least 2 choices');

    const expected = manifest.grades.find((g) => g.n === q.grade)?.choices?.[cat.test];
    if (expected && choices.length !== expected) {
      err(where, `grade ${q.grade} ${cat.test} should have ${expected} choices, found ${choices.length}`);
    }

    const ids = new Set();
    choices.forEach((c, ci) => {
      if (!c.id) err(where, `choice ${ci} has no id`);
      if (ids.has(c.id)) err(where, `duplicate choice id "${c.id}"`);
      ids.add(c.id);
      if (c.text == null && !c.figure) err(where, `choice "${c.id}" has neither text nor figure`);
      checkShapes(c.figure, `${where} choice ${c.id}`, cat.test);
    });

    if (!ids.has(q.answer)) err(where, `answer "${q.answer}" matches no choice`);

    /* Two choices that DRAW the same thing give the question two right answers.
       Comparing the raw specs is not enough: a plus turned 90 degrees is a
       different spec but an identical picture, because a plus is four-fold
       symmetric. canonicalFigure() collapses a spec to what it looks like. */
    const drawn = new Map();
    choices.forEach((c) => {
      const key = c.figure
        ? JSON.stringify(canonicalFigure(c.figure))
        : `TEXT:${String(c.text).trim().toLowerCase()}`;
      if (drawn.has(key)) {
        const first = drawn.get(key);
        const fatal = first === q.answer || c.id === q.answer;
        const msg = `choices "${first}" and "${c.id}" are the same`
          + (c.figure ? ' picture' : ' text')
          + (fatal ? ' — the question has two correct answers' : '');
        if (fatal) err(where, msg); else warn(where, msg);
      } else drawn.set(key, c.id);
    });

    /* A transformation the child cannot see makes the key indistinguishable
       from "nothing happened". Catches a rotation applied to a shape whose own
       symmetry hides it. */
    const fig = q.figure || {};
    let pair = null;
    if (fig.kind === 'analogy') pair = [fig.a, fig.b];
    else if (fig.kind === 'matrix' && fig.rows === 2 && fig.cols === 2) pair = (fig.cells || []).slice(0, 2);
    if (pair && pair[0] && pair[1]
        && JSON.stringify(canonicalFigure(pair[0])) === JSON.stringify(canonicalFigure(pair[1]))) {
      err(where, 'the first pair shows no visible change, so the rule cannot be worked out');
    }
    if (fig.kind === 'series') {
      const steps = new Map();
      (fig.cells || []).filter((c) => !c.missing).forEach((c, i) => {
        const k = JSON.stringify(canonicalFigure(c));
        if (steps.has(k)) warn(where, `series steps ${steps.get(k) + 1} and ${i + 1} look identical`);
        else steps.set(k, i);
      });
    }

    /* Explanations name the tempting wrong answer by letter. If a choice is
       later removed or renumbered, that reference silently points at nothing
       and the explanation stops making sense to the child reading it. */
    const named = `${q.explanation || ''} ${q.strategy || ''}`.match(/\b[Cc]hoice ([a-f])\b/g) || [];
    named.forEach((m) => {
      const letter = m.slice(-1);
      if (!ids.has(letter)) err(where, `explanation refers to choice "${letter}", which does not exist`);
    });

    checkShapes(q.figure, `${where} stem figure`, cat.test);

    /* A question a child cannot read is a question a child cannot answer.
       Grades 1-2 are read aloud, so keep stems short and single-clause. */
    if (q.grade <= 2 && q.prompt && q.prompt.split(/\s+/).length > 20) {
      warn(where, `grade ${q.grade} prompt is ${q.prompt.split(/\s+/).length} words; aim for 20 or fewer`);
    }

    /* Every figure must actually render. */
    if (q.figure) {
      const svg = renderFigure(q.figure);
      if (!svg) err(where, 'stem figure failed to render');
    }
    choices.forEach((c) => {
      if (c.figure && !renderFigure(c.figure)) err(where, `choice "${c.id}" figure failed to render`);
    });
  });

  cat.grades.forEach((g) => {
    if (!gradesSeen.has(g)) warn(cat.file, `manifest lists grade ${g} but no question has it`);
  });

  /* Near-duplicate detection: the same stem twice inside one category almost
     always means a question was pasted rather than written. */
  const byPrompt = new Map();
  (data.questions || []).forEach((q) => {
    /* Odd-one-out items legitimately share a stem ("Which one does not
       belong?") because all the content lives in the choices, so the choices
       have to be part of the key. */
    const key = `${q.grade}|${String(q.prompt || '').toLowerCase().replace(/\s+/g, ' ').trim()}`
      + `|${JSON.stringify(q.figure || '')}`
      + `|${JSON.stringify((q.choices || []).map((c) => c.text ?? c.figure).sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1))}`;
    if (byPrompt.has(key)) err(cat.file, `"${q.id}" duplicates "${byPrompt.get(key)}" (same grade, stem and figure)`);
    else byPrompt.set(key, q.id);
  });

  perTest[cat.test] = (perTest[cat.test] || 0) + (data.questions || []).length;
}

/* ---------------------------------------------------------------- */

const pad = (s, n) => String(s).padEnd(n);
console.log('\nGiftedPrep question bank\n' + '='.repeat(46));
console.log(`categories in manifest   ${manifest.categories.length}`);
console.log(`category files present   ${manifest.categories.length - missingFiles.length}`);
console.log(`questions                ${totalQuestions}`);
console.log('\nby test');
Object.entries(perTest).forEach(([t, n]) => console.log(`  ${pad(t, 8)} ${n}`));
console.log('\nby grade');
Object.entries(perGrade).forEach(([g, n]) => console.log(`  grade ${g}  ${n}`));

if (missingFiles.length) {
  console.log(`\nnot written yet (${missingFiles.length}):`);
  missingFiles.forEach((f) => console.log(`  - ${f}`));
}
if (warnings.length) {
  console.log(`\nwarnings (${warnings.length}):`);
  warnings.slice(0, 40).forEach((w) => console.log(`  ! ${w}`));
  if (warnings.length > 40) console.log(`  ... and ${warnings.length - 40} more`);
}
if (errors.length) {
  console.log(`\nERRORS (${errors.length}):`);
  errors.forEach((e) => console.log(`  x ${e}`));
  process.exit(1);
}
console.log('\nNo errors.\n');
