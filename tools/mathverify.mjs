#!/usr/bin/env node
/**
 * Independently recompute the answers the Math Lab claims.
 *
 * mathcheck.mjs checks shape: does every exercise have an answer of the right
 * type, is every map solvable. This checks TRUTH: it works the mathematics out
 * from first principles and compares. Where a topic rests on a known result,
 * the result is computed here rather than trusted from the data file.
 *
 * The point is that a wrong answer in a maths lesson is worse than no lesson,
 * and reading them over is not a check. Anything a formula can settle is
 * settled by the formula.
 */

import fs from 'node:fs';

const problems = [];
const checked = [];
const bad = (id, m) => problems.push(`${id}: ${m}`);
const ok = (id, m) => checked.push(`${id}: ${m}`);

const data = JSON.parse(fs.readFileSync('data/math/grade1.json', 'utf8'));
const topic = (id) => data.topics.find((t) => t.id === id);
const ex = (id, i) => topic(id).exercises[i];
const asked = (id, needle) =>
  topic(id).exercises.find((e) => e.ask.toLowerCase().includes(needle.toLowerCase()));

/* ---- known results, computed ---------------------------------------- */

const hanoiMoves = (n) => 2 ** n - 1;
const handshakes = (n) => (n * (n - 1)) / 2;
/** Pigeonhole: with k kinds you need k+1 draws to force a repeat. */
const toForceAPair = (kinds) => kinds + 1;
/** A regular n-gon tiles the plane iff its interior angle divides 360. */
const tilesAlone = (n) => (360 % (((n - 2) * 180) / n)) === 0;
/** A regular n-gon has n mirror lines. */
const mirrorLines = (n) => n;
/** Degrees of a graph spec, and how many are odd. */
function oddCorners(fig) {
  const deg = new Map();
  (fig.edges || []).forEach(([a, b]) => {
    deg.set(a, (deg.get(a) || 0) + 1);
    deg.set(b, (deg.get(b) || 0) + 1);
  });
  return [...deg.values()].filter((d) => d % 2 === 1).length;
}
/** An Eulerian path exists iff the odd-degree count is 0 or 2. */
const drawableInOneLine = (fig) => [0, 2].includes(oddCorners(fig));

/* ---- Tower ----------------------------------------------------------- */

topic('tower').exercises.forEach((e, i) => {
  const id = `tower[${i + 1}]`;
  if (e.type === 'hanoi') {
    const want = hanoiMoves(e.discs);
    if (e.answer !== want) bad(id, `${e.discs} discs is ${want} moves, data says ${e.answer}`);
    else ok(id, `${e.discs} discs = ${want} moves`);
  }
  const m = e.ask.match(/^(\d+) discs?\?$/);
  if (m) {
    const want = hanoiMoves(Number(m[1]));
    if (e.answer !== want) bad(id, `${m[1]} discs is ${want}, data says ${e.answer}`);
    else ok(id, `${m[1]} discs = ${want}`);
  }
});
{
  const e = asked('tower', '3 coins');
  const want = hanoiMoves(3);
  if (e.answer !== want) bad('tower[coins]', `should be ${want}, data says ${e.answer}`);
  else ok('tower[coins]', `3 coins = ${want} moves`);
}

/* ---- Handshakes ------------------------------------------------------ */

topic('handshakes').exercises.forEach((e, i) => {
  const id = `handshakes[${i + 1}]`;
  const m = e.ask.match(/(\d+) people/) || e.ask.match(/^(\d+)\?$/) || e.ask.match(/(\d+) dots/);
  if (!m || e.type !== 'number' && e.type !== 'paper') return;
  const want = handshakes(Number(m[1]));
  if (e.answer !== want) bad(id, `${m[1]} people is ${want} handshakes, data says ${e.answer}`);
  else ok(id, `${m[1]} people = ${want}`);
});
{
  const c = asked('handshakes', 'handshake number');
  const want = [2, 3, 4, 5, 6, 7, 8].map(handshakes);
  const missing = want.filter((v) => !c.valid.includes(v));
  const extra = c.valid.filter((v) => !want.includes(v));
  if (missing.length || extra.length) {
    bad('handshakes[collect]', `valid list wrong. missing ${missing}, unexpected ${extra}`);
  } else ok('handshakes[collect]', `valid = ${want.join(', ')}`);
}

/* ---- Socks ----------------------------------------------------------- */

topic('socks').exercises.forEach((e, i) => {
  const id = `socks[${i + 1}]`;
  const m = e.ask.match(/(\d+) sock colours/);
  if (!m) return;
  const want = toForceAPair(Number(m[1]));
  if (e.answer !== want) bad(id, `${m[1]} colours needs ${want} draws, data says ${e.answer}`);
  else ok(id, `${m[1]} colours = ${want} draws`);
});
{
  const e = asked('socks', 'birth month');
  if (e.answer !== 2) bad('socks[months]', 'pigeonhole guarantees a shared month, so 2');
  else ok('socks[months]', '13 people over 12 months forces 2');
  const p = asked('socks', '4 red, 4 blue');
  /* Worst case: every red first, then the two blue you wanted. */
  const want = 4 + 2;
  if (p.answer !== want) bad('socks[worst]', `worst case is ${want}, data says ${p.answer}`);
  else ok('socks[worst]', `2 blue for certain = ${want} draws`);
}

/* ---- Bees: which regular shapes tile --------------------------------- */

{
  const c = asked('bees-hexagons', 'tiles with no gaps');
  const want = [3, 4, 5, 6, 7, 8, 9, 10, 12].filter(tilesAlone);
  const missing = want.filter((v) => !c.valid.includes(v));
  const extra = c.valid.filter((v) => !want.includes(v));
  if (missing.length || extra.length) {
    bad('bees[collect]', `should be exactly ${want}, data has ${c.valid}`);
  } else ok('bees[collect]', `regular shapes that tile = ${want.join(', ')}`);
  const meet = asked('bees-hexagons', 'meet at one point');
  const want3 = 360 / (((6 - 2) * 180) / 6);
  if (meet.answer !== want3) bad('bees[meet]', `${want3} hexagons meet, data says ${meet.answer}`);
  else ok('bees[meet]', `${want3} hexagons meet at a point`);
}

/* ---- Snowflakes: mirror lines ---------------------------------------- */

{
  const sq = asked('snowflakes', 'square have');
  if (sq.answer !== mirrorLines(4)) bad('snowflakes[square]', `a square has ${mirrorLines(4)}`);
  else ok('snowflakes[square]', 'square = 4 mirror lines');
  const tri = asked('snowflakes', 'equal sides');
  if (tri.answer !== mirrorLines(3)) bad('snowflakes[triangle]', `it has ${mirrorLines(3)}`);
  else ok('snowflakes[triangle]', 'equilateral triangle = 3');
  const c = asked('snowflakes', 'mirror lines a shape can have');
  /* Any whole number from 1 up is achievable: an isosceles triangle has 1, a
     rectangle has 2, a regular n-gon has n. Rejecting 1 or 2 marks a correct
     answer wrong. */
  [1, 2].forEach((v) => {
    if (!c.valid.includes(v)) bad('snowflakes[collect]', `${v} is a real answer but is rejected`);
  });
  if (c.valid.includes(1) && c.valid.includes(2)) ok('snowflakes[collect]', 'accepts 1 and 2');
}

/* ---- One line, no lifting -------------------------------------------- */

topic('one-line').exercises.forEach((e, i) => {
  const id = `one-line[${i + 1}]`;
  if (e.figure && e.figure.kind === 'graph' && /odd corners/i.test(e.ask)) {
    const want = oddCorners(e.figure);
    if (e.answer !== want) bad(id, `figure has ${want} odd corners, data says ${e.answer}`);
    else ok(id, `${want} odd corners`);
  }
  if (e.type === 'choice' && /NOT be drawn/i.test(e.ask)) {
    const cannot = e.choices.filter((c) => c.figure && !drawableInOneLine(c.figure));
    if (cannot.length !== 1) bad(id, `${cannot.length} choices cannot be drawn; must be exactly 1`);
    else if (cannot[0].id !== e.answer) bad(id, `the undrawable one is "${cannot[0].id}", data says "${e.answer}"`);
    else ok(id, `only choice "${e.answer}" is undrawable`);
  }
});
{
  /* Konigsberg: four land masses of degree 3, 3, 3 and 5, seven bridges. */
  const k = asked('one-line', 'Königsberg');
  const degrees = [3, 3, 5, 3];
  const bridges = degrees.reduce((a, b) => a + b, 0) / 2;
  const odd = degrees.filter((d) => d % 2 === 1).length;
  if (bridges !== 7) bad('one-line[konigsberg]', `those degrees give ${bridges} bridges, not 7`);
  if (k.answer !== odd) bad('one-line[konigsberg]', `${odd} odd, data says ${k.answer}`);
  else ok('one-line[konigsberg]', `${odd} odd corners, ${bridges} bridges, so no walk exists`);

  /* The envelope: rectangle, roof, both diagonals. Two odd corners, so yes. */
  const env = asked('one-line', 'envelope');
  const envelope = { edges: [['bl', 'br'], ['bl', 'tl'], ['br', 'tr'], ['tl', 'tr'],
    ['tl', 'a'], ['tr', 'a'], ['bl', 'tr'], ['br', 'tl']] };
  const envOdd = oddCorners(envelope);
  const yes = drawableInOneLine(envelope) ? 1 : 0;
  if (env.answer !== yes) bad('one-line[envelope]', `envelope has ${envOdd} odd corners, so answer is ${yes}`);
  else ok('one-line[envelope]', `${envOdd} odd corners, drawable`);
}

/* ---- Number skills: anything arithmetic settles ---------------------- */

/** Work out the answer from the question text, or null if not parseable. */
function arithmetic(ask) {
  const t = ask.trim().replace(/\?$/, '').trim();
  let m;
  if ((m = t.match(/^(\d+)\s*\+\s*\?\s*=\s*(\d+)$/))) return +m[2] - +m[1];
  if ((m = t.match(/^\?\s*\+\s*(\d+)\s*=\s*(\d+)$/))) return +m[2] - +m[1];
  if ((m = t.match(/^(\d+)\s*-\s*\?\s*=\s*(\d+)$/))) return +m[1] - +m[2];
  if ((m = t.match(/^\?\s*-\s*(\d+)\s*=\s*(\d+)$/))) return +m[1] + +m[2];
  if ((m = t.match(/^(\d+)\s*\+\s*(\d+)\s*=\s*\?\s*\+\s*(\d+)$/))) return +m[1] + +m[2] - +m[3];
  if ((m = t.match(/^(\d+)\s*\+\s*(\d+)\s*\+\s*\?$/))) return null;
  if ((m = t.match(/^Double (\d+)$/i))) return 2 * +m[1];
  if ((m = t.match(/^(\d+) more than (\d+)/i))) return +m[2] + +m[1];
  if ((m = t.match(/^(\d+) less than (\d+)/i))) return +m[2] - +m[1];
  if ((m = t.match(/^(\d+) tens? and (\d+) ones?/i))) return 10 * +m[1] + +m[2];
  /* An arithmetic run like "2, 4, 6, 8, ?" */
  if ((m = t.match(/^([\d,\s]+),\s*\?$/))) {
    const seq = m[1].split(',').map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x));
    if (seq.length < 3) return null;
    const steps = seq.slice(1).map((v, i) => v - seq[i]);
    if (steps.every((d) => d === steps[0])) return seq[seq.length - 1] + steps[0];
    return null;                       // a growing pattern; not settled by a constant step
  }
  return null;
}

data.topics.filter((t) => t.track === 'skills').forEach((t) => {
  t.exercises.forEach((e, i) => {
    if (e.type !== 'number' && e.type !== 'paper') return;
    const want = arithmetic(e.ask);
    if (want === null) return;
    const id = `${t.id}[${i + 1}]`;
    if (e.answer !== want) bad(id, `"${e.ask}" works out to ${want}, data says ${e.answer}`);
    else ok(id, `"${e.ask}" = ${want}`);
  });
});

/* Number bonds: the parts must add to the whole, EXCEPT where the question
   asks the child to spot the broken one, in which case the key must be the
   broken one and every other choice must be sound. */
const bondSound = (f) => {
  const parts = f.parts || [];
  if (parts.some((v) => v == null) || f.whole == null) return null;   // it IS the question
  return parts.reduce((a, b) => a + b, 0) === f.whole;
};

data.topics.forEach((t) => {
  t.exercises.forEach((e, i) => {
    const id = `${t.id}[${i + 1}]`;
    const findBroken = /broken|wrong|does not work|not right/i.test(e.ask);
    const bonds = (e.choices || [])
      .filter((c) => c.figure && c.figure.kind === 'numberbond')
      .map((c) => ({ id: c.id, sound: bondSound(c.figure), fig: c.figure }));

    if (bonds.length) {
      const broken = bonds.filter((b) => b.sound === false);
      if (findBroken) {
        if (broken.length !== 1) bad(id, `asks for the broken bond but ${broken.length} are broken`);
        else if (broken[0].id !== e.answer) bad(id, `the broken bond is "${broken[0].id}", data says "${e.answer}"`);
        else ok(id, `exactly one broken bond, and it is the key "${e.answer}"`);
      } else if (broken.length) {
        bad(id, `choice "${broken[0].id}" does not add up and the question does not ask for that`);
      }
    }

    /* A bond used as the question's own picture must always add up. */
    if (e.figure && e.figure.kind === 'numberbond' && bondSound(e.figure) === false) {
      bad(id, 'the question picture shows a bond that does not add up');
    }
  });
});

/* ---- Report ---------------------------------------------------------- */

console.log(`${checked.length} mathematical claims recomputed and confirmed`);
if (problems.length) {
  console.log(`\nWRONG (${problems.length}):`);
  problems.forEach((p) => console.log(`  x ${p}`));
  process.exit(1);
}
console.log('\nNo wrong answers.');
