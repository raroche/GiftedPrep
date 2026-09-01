#!/usr/bin/env node
/**
 * Check the mascot animations.
 *
 * Animation is the one asset in this repository that fails silently. A shape
 * with a bad path draws wrong and you see it; a question with a missing answer
 * throws. An animation with one value too many in its keyTimes list is simply
 * dropped by the browser, with no console message and no visual difference
 * from an animation that has not started yet. Both bugs found while building
 * these were of that kind:
 *
 *   - an XML comment containing "----", which is not well formed, so the whole
 *     file rendered as nothing at all;
 *   - dark ink drawn straight onto the page instead of onto the white eye
 *     disc, which is invisible in dark mode and on the Deep welcome panel.
 *
 * So this checks three things: the standalone SMIL files are well formed and
 * internally consistent, no shape paints dark ink on anything but the eye, and
 * the live mascot's markup and stylesheet still agree about class names.
 */

import fs from 'node:fs';
import path from 'node:path';

const ANIM = 'assets/img/logo/anim';
const CSS = 'assets/css/design-system.css';
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const files = fs.readdirSync(ANIM).filter((f) => f.endsWith('.svg'));
if (!files.length) err(`no animations in ${ANIM}`);

/* ---- the standalone SMIL files ---- */

const nums = (s) => s.split(';').map((x) => x.trim()).filter((x) => x !== '');

for (const f of files) {
  const where = path.join(ANIM, f);
  const src = fs.readFileSync(where, 'utf8');

  /* XML comments cannot contain a double hyphen. A separator line of dashes is
     the natural thing to type and it makes the file unparseable. */
  for (const c of src.match(/<!--[\s\S]*?-->/g) || []) {
    if (c.slice(4, -3).includes('--')) {
      err(`${where}: a comment contains "--", which is not well-formed XML`);
    }
  }

  /* Nothing may open that is never closed. A crude stack, but it catches the
     hand-edit that drops a </g>. Comments come out first: these files talk
     about <style> blocks and a scanner that reads prose finds tags in it. */
  const bare = src.replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  for (const m of bare.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClose] = m;
    if (selfClose || attrs.endsWith('/')) continue;
    if (closing) {
      if (stack.pop() !== tag) err(`${where}: </${tag}> does not close what is open`);
    } else stack.push(tag);
  }
  if (stack.length) err(`${where}: ${stack.join(', ')} never closed`);

  /* Every timeline has to be internally consistent, or it is discarded. */
  const tags = src.match(/<animate(?:Transform)?\b[^>]*\/>/g) || [];
  if (!tags.length) err(`${where}: no animation in a file that is meant to be one`);

  for (const [i, tag] of tags.entries()) {
    const at = (name) => (tag.match(new RegExp(`${name}="([^"]*)"`)) || [])[1];
    const at_ = `${where}: animation ${i + 1} (${at('attributeName') || '?'})`;

    const values = at('values');
    const keyTimes = at('keyTimes');
    const keySplines = at('keySplines');

    if (!values) { err(`${at_} has no values`); continue; }
    const nv = nums(values).length;

    if (keyTimes) {
      const kt = nums(keyTimes).map(Number);
      /* The failure this whole file exists for: a values list and a keyTimes
         list of different lengths is an error, and an error is dropped. */
      if (kt.length !== nv) {
        err(`${at_} has ${nv} values but ${kt.length} keyTimes; the browser drops it`);
      }
      if (kt.some(Number.isNaN)) err(`${at_} has a keyTime that is not a number`);
      if (kt[0] !== 0) err(`${at_} keyTimes must start at 0, not ${kt[0]}`);
      if (kt[kt.length - 1] !== 1) err(`${at_} keyTimes must end at 1, not ${kt[kt.length - 1]}`);
      for (let j = 1; j < kt.length; j++) {
        if (kt[j] < kt[j - 1]) err(`${at_} keyTimes go backwards at position ${j + 1}`);
      }
    }

    if (at('calcMode') === 'spline') {
      /* keySplines describes the interval BETWEEN each pair of values, so
         there is always exactly one fewer of them. */
      if (!keySplines) err(`${at_} is calcMode="spline" with no keySplines`);
      else if (nums(keySplines).length !== nv - 1) {
        err(`${at_} has ${nv} values but ${nums(keySplines).length} keySplines; it needs ${nv - 1}`);
      }
      if (!keyTimes) {
        warn(`${at_} is calcMode="spline" with no keyTimes; a spline is defined `
          + 'in terms of keyTimes, so this is under-specified');
      }
    }

    if (!at('dur')) err(`${at_} has no dur`);
  }

  /* Dark ink is only legible on the white eye disc. Everywhere else it
     disappears in dark mode, on the Deep panel, or on whatever page the file
     is dropped onto as an <img>. */
  const hasDisc = /r="11"[^>]*fill="#FFFFFF"|fill="#FFFFFF"[^>]*r="11"/.test(src)
    || /rx="11"[^>]*fill="#FFFFFF"|fill="#FFFFFF"[^>]*rx="11"/.test(src);
  if (/#2B2926/.test(src) && !hasDisc) {
    err(`${where}: draws in #2B2926 but has no white eye disc to draw it on, so `
      + 'it is invisible on a dark background');
  }
}

/* ---- the live mascot: markup and stylesheet must still agree ---- */

const css = fs.readFileSync(CSS, 'utf8');
const { mascot, MOODS } = await import('../assets/js/modules/mascot.js');
const { CREATURES } = await import('../assets/js/modules/sections.js');

for (const mood of MOODS) {
  if (!css.includes(`[data-mood="${mood}"]`)) {
    err(`${CSS} has no rule for the "${mood}" mood, so setMood does nothing there`);
  }
}

/* The two sides have to keep agreeing about class names. A rename on one side
   and not the other leaves a mascot that renders perfectly and never moves,
   which no other check in this repository would notice.

   A stylesheet rule for a class nobody renders is the loud direction: it is
   always either dead code or half a rename, so it is an error. A class the
   module renders and the stylesheet ignores is only a warning, because a
   marker class with no rule of its own is a reasonable thing to emit. */
const emitted = new Set();
for (const kind of CREATURES) {
  for (const m of mascot({ kind }).matchAll(/class="([^"]+)"/g)) {
    m[1].split(/\s+/).forEach((c) => emitted.add(c));
  }
}
const styled = new Set([...css.matchAll(/\.(cz-mascot[\w-]*)/g)].map((m) => m[1]));

for (const c of styled) {
  if (!emitted.has(c)) err(`${CSS} styles .${c}, which mascot.js never renders`);
}
for (const c of emitted) {
  if (!styled.has(c)) warn(`mascot.js renders .${c}, which ${CSS} never styles`);
}

/* Both ears, always. One ear means earPair returned a single string and the
   twitch has nothing to move in the opposite direction. */
for (const kind of CREATURES) {
  const svg = mascot({ kind });
  for (const side of ['l', 'r']) {
    if (!svg.includes(`cz-mascot__ear--${side}`)) err(`"${kind}" is missing its ${side} ear`);
  }
}

/* ---- report ---- */

console.log(`${files.length} standalone animations, ${MOODS.length} moods, `
  + `${emitted.size} classes, ${CREATURES.length} creatures`);

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
