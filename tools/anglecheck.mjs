#!/usr/bin/env node
/**
 * Check Guess the Angle.
 *
 * The one thing this game must never do is disagree with itself. It is a game
 * about measuring, so a picture that does not match the number beside it does
 * not merely look wrong -- it teaches the wrong measurement, confidently, to a
 * child who has no way to check. The first draft of the drawings did exactly
 * that: five of the nine real-world scenes were labelled with one angle and
 * drawn at another, the deck chair by forty degrees.
 *
 * So the first check here is that every scene's two arms are separated by
 * precisely the degrees the scene claims. The rest checks that the questions
 * are answerable, that no kind of question quietly falls through to another,
 * and that every family of angle can actually turn up.
 */

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const art = await import('../assets/js/modules/angleart.js');
const A = await import('../assets/js/modules/angles.js');

const scenes = art.SCENES.map((s) => ({ ...s, svg: art.sceneSvg(s.id) }));

/* ---- the drawings agree with their own numbers ---- */

for (const s of art.SCENES) {
  const [a, b] = art.armsOf(s);
  const gap = Math.abs(b - a);
  if (Math.abs(gap - s.deg) > 1e-9) {
    err(`${s.id} is labelled ${s.deg} but its arms are ${gap.toFixed(2)} apart`);
  }
  if (!art.sceneSvg(s.id)) err(`${s.id} has no drawing`);
  if (!s.fact) err(`${s.id} has no fact to show after the answer`);
  if (!s.name) err(`${s.id} has no name`);
  if (s.deg <= 0 || s.deg >= 360) err(`${s.id} has an impossible angle: ${s.deg}`);
}

/* A scene's angle is its answer, so two scenes sharing one would make a
   question with two right answers that only accepts one. */
const byDeg = new Map();
for (const s of art.SCENES) {
  if (byDeg.has(s.deg)) err(`${s.id} and ${byDeg.get(s.deg)} are both ${s.deg} degrees`);
  byDeg.set(s.deg, s.id);
}

/* ---- families ---- */

for (const [deg, want] of [[1, 'acute'], [89, 'acute'], [90, 'right'], [91, 'obtuse'],
  [179, 'obtuse'], [180, 'straight'], [181, 'reflex'], [359, 'reflex']]) {
  if (A.familyOf(deg) !== want) err(`${deg} degrees is sorted as ${A.familyOf(deg)}, not ${want}`);
}
if (A.FAMILIES.length !== 5) err(`${A.FAMILIES.length} families, expected 5`);
for (const f of A.FAMILIES) {
  if (!f.name || !f.hint || !f.es) err(`family "${f.id}" is missing a name, hint or Spanish word`);
}

/* ---- every mode is really implemented ---- */

const KINDS = A.ASKS.filter((a) => a.id !== 'mix').map((a) => a.id);
for (const ask of KINDS) {
  const q = A.buildQuestion(ask, 'steps', scenes);
  if (q.kind !== ask) err(`asking for "${ask}" produced a "${q.kind}" question`);
}

/* "mix" has to reach all of them, or a mode is unreachable for anyone who
   leaves the default alone -- which is most people. */
const seen = new Set();
for (let i = 0; i < 4000; i += 1) seen.add(A.buildQuestion('mix', 'steps', scenes).kind);
for (const k of KINDS) if (!seen.has(k)) err(`"mix" never produces a "${k}" question`);

/* ---- questions are answerable ---- */

let asked = 0;
const famSeen = new Set();
for (const set of A.SETS.map((s) => s.id)) {
  if (!A.poolFor(set).length) err(`set "${set}" has no angles to ask about`);
  for (const ask of A.ASKS.map((a) => a.id)) {
    for (let i = 0; i < 500; i += 1) {
      const q = A.buildQuestion(ask, set, scenes);
      asked += 1;
      const ids = q.choices.map((c) => c.id);
      if (!ids.includes(q.answer)) {
        err(`${set}/${ask}: the answer ${q.answer} is not among ${ids.join(',')}`);
        break;
      }
      if (new Set(ids).size !== ids.length) {
        err(`${set}/${ask}: repeated choices ${ids.join(',')}`);
        break;
      }
      if (ids.length < 2) { err(`${set}/${ask}: only ${ids.length} choice`); break; }
      if (!q.prompt || !q.explain) { err(`${set}/${ask}: no prompt or no explanation`); break; }
      if (q.choices.some((c) => !c.html)) { err(`${set}/${ask}: an empty choice`); break; }
      if (q.kind === 'sort') famSeen.add(q.answer);
    }
  }
}
for (const f of A.FAMILIES) {
  if (!famSeen.has(f.id)) warn(`no "sort" question ever asked about ${f.name} angles`);
}

/* ---- the setup screen offers what the code accepts ---- */

const setup = A.renderSetup({ set: 'steps', ask: 'mix', count: 10 });
for (const a of A.ASKS) {
  if (!setup.includes(`data-angask="${a.id}"`)) err(`the setup screen cannot choose "${a.id}"`);
}
for (const s of A.SETS) {
  if (!setup.includes(`data-angset="${s.id}"`)) err(`the setup screen cannot choose "${s.id}"`);
}

/* ---- report ---- */

console.log(`${art.SCENES.length} real-world scenes, all drawn from their own degrees`);
console.log(`${KINDS.length} kinds of question, ${A.SETS.length} difficulties, `
  + `${asked} questions generated and checked`);

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
