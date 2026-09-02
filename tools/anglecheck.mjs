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

/* ---- the answer is the RIGHT answer ---- */

/*
 * This section exists because it did not, and a shipped question marked a 60
 * degree angle wider than a 165 degree one -- while printing "the wider one is
 * 165" underneath it. Every check up to here passed: the answer was among the
 * choices, they did not repeat, arm length told you nothing. Not one of them
 * asked whether the answer was correct.
 *
 * So each kind is now checked against the number its own picture shows, and
 * where that number can be recomputed from something else -- a clock face, a
 * named scene, the second angle in a comparison -- it is recomputed rather
 * than trusted.
 */
let judged = 0;
for (const set of A.SETS.map((x) => x.id)) {
  for (let i = 0; i < 2000; i += 1) {
    const q = A.buildQuestion('mix', set, scenes);
    judged += 1;
    const chosen = q.choices.find((c) => c.id === q.answer);

    if (q.kind === 'bigger') {
      const other = q.choices.find((c) => c.id !== q.answer);
      if (!(chosen.deg > other.deg)) {
        err(`bigger: marked ${chosen.deg} wider than ${other.deg}`);
        break;
      }
      if (chosen.deg !== q.truth) { err(`bigger: says the wider one is ${q.truth}`); break; }
    } else if (q.kind === 'estimate' || q.kind === 'world') {
      if (Number(q.answer) !== q.truth) {
        err(`${q.kind}: the picture is ${q.truth} but the answer is ${q.answer}`);
        break;
      }
    } else if (q.kind === 'sort') {
      if (q.answer !== A.familyOf(q.truth)) {
        err(`sort: ${q.truth} degrees marked ${q.answer}`);
        break;
      }
    } else if (q.kind === 'clock') {
      const again = A.clockAngle(q.hands.hour, q.hands.minute);
      if (again !== Number(q.answer)) {
        err(`clock: ${q.hands.hour}:${q.hands.minute} is ${again}, not ${q.answer}`);
        break;
      }
      if (!q.figure.includes(`${q.hands.hour}`)) warn('the clock drawing may not match the time');
    }

    /* And the explanation must not contradict the tick. That is what would have
       caught the comparison bug from the outside: the sentence under the answer
       was right while the answer was wrong. */
    if (q.truth != null && !q.explain.includes(String(q.truth))) {
      err(`${q.kind}: the explanation never mentions ${q.truth}`);
      break;
    }
  }
}

/* ---- the game must not give itself away, or claim what is not true ---- */

/*
 * Three more failures that every earlier check passed straight over.
 *
 * The picture's aria-label read "An angle of 30 degrees" while the question
 * asked how big the angle was, so anybody using a screen reader was told the
 * answer before being asked. It looked fine because you cannot see a label.
 *
 * The clock explanation said "counting the hours between the hands gets you
 * there" whatever the time, which is only true on the hour. At 3:30 it told a
 * child the answer was 90 while the picture showed 75.
 *
 * And a scene's angle was stated as though it belonged to the object: "an open
 * book, standing -- 90 degrees, a right angle". A book opens to anything
 * between shut and flat. Only the pizza slice and the ladder have an angle that
 * is really theirs.
 */
for (const s of art.SCENES) {
  if (typeof s.fixed !== 'boolean') err(`${s.id} does not say whether its angle can vary`);
  if (!s.ask) err(`${s.id} has no question of its own`);
  if (!['always', 'the rule is', 'this one'].includes(s.claim)) {
    err(`${s.id} makes an unrecognised claim: "${s.claim}"`);
  }
  /* "always" is arithmetic. A safety rule is not arithmetic, and saying so in
     the same words would be the reported bug again, only quieter. */
  if (s.claim === 'always' && !s.fixed) err(`${s.id} says "always" about a varying angle`);
  if (!s.fixed && s.claim !== 'this one') err(`${s.id} overclaims its varying angle`);
  /* A question about an object whose angle varies has to ask about the picture
     in front of the child, not about the object in general. */
  if (!s.fixed && !/\bthis\b|\bthese\b/i.test(s.ask)) {
    err(`${s.id} can be any angle, but asks "${s.ask}" as if it were fixed`);
  }
}

let leaks = 0;
for (const set of A.SETS.map((x) => x.id)) {
  for (let i = 0; i < 1200; i += 1) {
    const q = A.buildQuestion('mix', set, scenes);
    const shown = q.figure + q.choices.map((c) => c.html).join('');
    const labels = [...shown.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]);
    for (const l of labels) {
      if (q.truth != null && new RegExp(`\\b${q.truth}\\b`).test(l)) {
        err(`${q.kind}: the picture is labelled "${l}" and the answer is ${q.truth}`);
        leaks += 1;
      }
    }
    if (leaks) break;

    if (q.kind === 'clock' && q.hands.minute !== 0
        && /counting the hours/.test(q.explain)) {
      err(`clock: ${q.hands.hour}:${q.hands.minute} is explained by counting whole hours`);
      break;
    }
  }
}

/* One round should not show the same object twice when there are nine of them. */
for (let r = 0; r < 300; r += 1) {
  const round = A.buildRound(scenes, { ask: 'world', set: 'steps', count: scenes.length });
  const ids = round.map((q) => q.scene);
  if (new Set(ids).size !== ids.length) {
    err('a round of world questions repeated a scene before using them all');
    break;
  }
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
console.log(`${judged} of them re-marked against the number their own picture shows`);
console.log(`${art.SCENES.filter((s) => s.fixed).length} scenes have an angle that is really `
  + `theirs; the other ${art.SCENES.filter((s) => !s.fixed).length} ask about the picture`);

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
