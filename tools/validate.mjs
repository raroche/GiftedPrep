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
import { canonicalFigure, canonical } from './_symmetry.mjs';

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

/* Every shape spec inside a figure, in document order. */
function shapesOf(node, out = []) {
  if (Array.isArray(node)) { node.forEach((v) => shapesOf(v, out)); return out; }
  if (node && typeof node === 'object') {
    if (node.s) out.push(node);
    Object.values(node).forEach((v) => shapesOf(v, out));
  }
  return out;
}

/* The same figure with every scale removed, so two specs can be compared on
   everything except how big they are drawn. */
function stripScale(node) {
  if (Array.isArray(node)) return node.map(stripScale);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'z') continue;
      out[k] = stripScale(v);
    }
    return out;
  }
  return node;
}

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

    /* A "wrong size" distractor only works if the size is visibly wrong. Two
       choices alike in every way but scale, at a ratio a child cannot see,
       give the question two right answers just as surely as an exact twin.
       15% is the floor; below that the pictures read as the same picture. */
    const MIN_SIZE_GAP = 0.85;
    const sized = choices.filter((c) => c.figure).map((c) => ({
      id: c.id,
      shapes: shapesOf(c.figure),
      bare: JSON.stringify(canonicalFigure(stripScale(c.figure)))
    }));
    for (let i = 0; i < sized.length; i += 1) {
      for (let j = i + 1; j < sized.length; j += 1) {
        const a = sized[i];
        const b = sized[j];
        if (a.bare !== b.bare) continue;
        if (a.shapes.length !== b.shapes.length) continue;
        let worst = 1;
        for (let k = 0; k < a.shapes.length; k += 1) {
          const za = a.shapes[k].z ?? 1;
          const zb = b.shapes[k].z ?? 1;
          if (za !== zb) worst = Math.min(worst, Math.min(za, zb) / Math.max(za, zb));
        }
        if (worst > MIN_SIZE_GAP) {
          const pct = Math.round((1 - worst) * 100);
          const fatal = a.id === q.answer || b.id === q.answer;
          const msg = `choices "${a.id}" and "${b.id}" differ only in size, by ${pct}%`
            + ' — too small to see'
            + (fatal ? ' — the question has two correct answers' : '');
          if (fatal) err(where, msg); else warn(where, msg);
        }
      }
    }

    /* The key must obey the rule the question demonstrates. In an analogy or a
       2x2 matrix, A becomes B by the row rule, and C must become the key by the
       same rule. The column may change the shape, and quantitative items may
       change the colour too, so this compares the RULE rather than raw values.

       This catches an item where the example shows one thing and the marked
       answer does another -- for instance a 90 degree turn demonstrated on a
       cloud but applied to a hexagon, where it only looks like 30 degrees. */
    {
      const f = q.figure || {};
      let A, B, C;
      if (f.kind === 'analogy') { A = f.a; B = f.b; C = f.c; }
      else if (f.kind === 'matrix' && f.rows === 2 && f.cols === 2) { [A, B, C] = (f.cells || []).slice(0, 3); }
      const one = (cell) => {
        const sh = cell && cell.shapes;
        return sh && sh.length === 1 ? canonical(sh[0]) : null;
      };
      const a = one(A), b = one(B), c = one(C);
      const keyFig = (choices.find((x) => x.id === q.answer) || {}).figure;
      const k = one(keyFig);
      if (a && b && c && k) {
        const v = (s, key) => (key in s ? s[key] : null);
        ['f', 'r', 'z', 'c'].forEach((attr) => {
          const changed = v(a, attr) !== v(b, attr);
          if (!changed && v(c, attr) !== v(k, attr)) {
            err(where, `the example leaves "${attr}" alone but the answer changes it`);
          } else if (changed && v(k, attr) !== v(b, attr)) {
            err(where, `the example sets "${attr}" to ${JSON.stringify(v(b, attr))} `
              + `but the answer has ${JSON.stringify(v(k, attr))}`);
          }
        });
        const cn = (s) => ('n' in s ? s.n : 1);
        const [na, nb, nc, nk] = [cn(a), cn(b), cn(c), cn(k)];
        if (na === nb) {
          if (nc !== nk) err(where, `the example keeps the count at ${na} but the answer changes it`);
        } else if (!(nk - nc === nb - na) && !(nc && na && nk / nc === nb / na)) {
          err(where, `the example goes ${na} to ${nb} but the answer goes ${nc} to ${nk}`);
        }
      }
    }

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
      /* Repetition in a series is only wrong when it is NOT the pattern.
         An alternating series repeats every other step on purpose, and a
         question like "which animal is between the two cats" needs the two
         cats to match. So flag adjacent duplicates, which really do mean
         nothing happened, and otherwise only complain when the repeats do not
         sit on a regular period. */
      const shown = (fig.cells || []).filter((c) => !c.missing);
      const keys = shown.map((c) => JSON.stringify(canonicalFigure(c)));
      keys.forEach((k, i) => {
        if (i > 0 && keys[i - 1] === k) {
          warn(where, `series steps ${i} and ${i + 1} are the same, so that step shows no change`);
        }
      });
      /* A period is regular if every repeat of a value is the same distance
         apart. 1,2,1,2 has period 2 everywhere and is fine. */
      const seenAt = new Map();
      keys.forEach((k, i) => {
        if (!seenAt.has(k)) seenAt.set(k, []);
        seenAt.get(k).push(i);
      });
      for (const [, at] of seenAt) {
        if (at.length < 2) continue;
        const gaps = at.slice(1).map((v, i) => v - at[i]);
        if (new Set(gaps).size > 1) {
          warn(where, `a step repeats at irregular spacing (${at.map((i) => i + 1).join(', ')}), which is probably not the pattern`);
        }
      }
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
