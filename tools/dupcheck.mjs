#!/usr/bin/env node
/**
 * Find questions where two answer choices are the same picture.
 *
 * Two kinds of sameness matter and only one is obvious. The obvious one is an
 * identical spec. The subtle one is a rotation that the shape's own symmetry
 * makes invisible: a plus turned 90 degrees looks exactly like a plus.
 */
import { readFileSync } from 'node:fs';
import { canonicalFigure } from './_symmetry.mjs';

const man = JSON.parse(readFileSync(new URL('../data/manifest.json', import.meta.url)));
const sig = (fig) => JSON.stringify(canonicalFigure(fig));

let dupKey = [], dupOther = [], total = 0;
for (const cat of man.categories) {
  const d = JSON.parse(readFileSync(new URL('../data/' + cat.file, import.meta.url)));
  for (const q of d.questions) {
    total++;
    const seen = new Map();
    for (const c of q.choices) {
      const s = c.figure ? sig(c.figure) : 'TEXT:' + c.text;
      if (seen.has(s)) {
        const other = seen.get(s);
        const involvesKey = other === q.answer || c.id === q.answer;
        const line = `${cat.file}  ${q.id}: choices ${other} and ${c.id} are the same picture`;
        (involvesKey ? dupKey : dupOther).push(line);
      } else seen.set(s, c.id);
    }
  }
}
console.log('questions scanned:', total);
console.log('\nTWO CORRECT ANSWERS (key duplicated):', dupKey.length);
dupKey.forEach(x => console.log('  x', x));
console.log('\nduplicate distractors:', dupOther.length);
dupOther.slice(0, 25).forEach(x => console.log('  !', x));
if (dupOther.length > 25) console.log(`  ... and ${dupOther.length - 25} more`);
