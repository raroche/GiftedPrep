#!/usr/bin/env node
/**
 * Verify that the key obeys the rule the question demonstrates.
 *
 * In an analogy or a 2x2 matrix, A becomes B by the row rule, and C must become
 * the key by that same rule. The column is allowed to change the shape, and in
 * quantitative items the colour too, so the test is on the RULE, not on raw
 * equality:
 *
 *   plain attributes (fill, rotation, scale, colour)
 *     - if A and B agree, then C and the key must agree
 *     - if A and B differ, the key must land on the same value B did
 *
 *   count
 *     - if A and B agree, C and the key must agree
 *     - otherwise the key must repeat the same step: the same difference, or
 *       the same ratio
 *
 * A failure here means the demonstrated change and the "correct" answer
 * disagree, and no child could get the item right.
 */
import { readFileSync } from 'node:fs';
import { canonical } from './_symmetry.mjs';

const man = JSON.parse(readFileSync(new URL('../data/manifest.json', import.meta.url)));
const PLAIN = ['f', 'r', 'z', 'c'];

const one = (cell) => {
  const sh = cell && cell.shapes;
  return sh && sh.length === 1 ? canonical(sh[0]) : null;
};
const v = (s, k) => (s && k in s ? s[k] : null);
const count = (s) => (s && 'n' in s ? s.n : 1);

let bad = [], checked = 0, skipped = 0;

for (const cat of man.categories) {
  const d = JSON.parse(readFileSync(new URL('../data/' + cat.file, import.meta.url)));
  for (const q of d.questions) {
    const fig = q.figure || {};
    let A, B, C;
    if (fig.kind === 'analogy') { A = fig.a; B = fig.b; C = fig.c; }
    else if (fig.kind === 'matrix' && fig.rows === 2 && fig.cols === 2) {
      [A, B, C] = (fig.cells || []).slice(0, 3);
    } else continue;

    const key = (q.choices.find((c) => c.id === q.answer) || {}).figure;
    const a = one(A), b = one(B), c = one(C), k = one(key);
    if (!a || !b || !c || !k) { skipped++; continue; }
    checked++;
    const say = (m) => bad.push(`${cat.file}  ${q.id}: ${m}`);

    for (const attr of PLAIN) {
      const changed = v(a, attr) !== v(b, attr);
      if (!changed) {
        if (v(c, attr) !== v(k, attr)) {
          say(`the example leaves "${attr}" alone, but the answer changes it `
            + `from ${JSON.stringify(v(c, attr))} to ${JSON.stringify(v(k, attr))}`);
        }
      } else if (v(k, attr) !== v(b, attr)) {
        say(`the example sets "${attr}" to ${JSON.stringify(v(b, attr))}, `
          + `but the answer has ${JSON.stringify(v(k, attr))}`);
      }
    }

    const [na, nb, nc, nk] = [count(a), count(b), count(c), count(k)];
    if (na === nb) {
      if (nc !== nk) say(`the example keeps the count at ${na}, but the answer goes ${nc} to ${nk}`);
    } else {
      const sameDiff = nk - nc === nb - na;
      const sameRatio = nc !== 0 && na !== 0 && nk / nc === nb / na;
      if (!sameDiff && !sameRatio) {
        say(`the example goes ${na} to ${nb}, but the answer goes ${nc} to ${nk} `
          + `— neither the same step nor the same multiple`);
      }
    }
  }
}
console.log(`analogy / 2x2 items checked: ${checked}   (skipped, multi-shape cells: ${skipped})`);
console.log(`\nKEY DOES NOT FOLLOW THE DEMONSTRATED RULE: ${bad.length}`);
bad.slice(0, 25).forEach((x) => console.log('  x', x));
if (bad.length > 25) console.log(`  ... and ${bad.length - 25} more`);
