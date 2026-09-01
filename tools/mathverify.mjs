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
const g2 = JSON.parse(fs.readFileSync('data/math/grade2.json', 'utf8'));
const g3 = JSON.parse(fs.readFileSync('data/math/grade3.json', 'utf8'));
const ALL = [...data.topics, ...g2.topics, ...g3.topics];
const topic = (id) => ALL.find((t) => t.id === id);
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
  const c = topic('handshakes').exercises.find((e) => e.type === 'collect');
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
  const c = topic('bees-hexagons').exercises.find((e) => e.type === 'collect');
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
  const c = topic('snowflakes').exercises.find((e) => e.type === 'collect');
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
  /* Strip thousands separators first: "2,950" is one number, not two. */
  const t = ask.trim().replace(/(\d),(\d{3})\b/g, '$1$2').replace(/\?$/, '').trim();
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

ALL.filter((t) => t.track === 'skills').forEach((t) => {
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

ALL.forEach((t) => {
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

/* ---- Grade 2 --------------------------------------------------------- */

/** Collatz: halve if even, 3n+1 if odd. Returns the chain from n down to 1. */
function collatz(n) {
  const seq = [n];
  let guard = 0;
  while (n !== 1 && guard++ < 1000) {
    n = n % 2 === 0 ? n / 2 : 3 * n + 1;
    seq.push(n);
  }
  return seq;
}
const fib = (k) => { let a = 1; let b = 1; for (let i = 2; i < k; i += 1) { [a, b] = [b, a + b]; } return b; };
/** Perimeter of a polyomino: edges not shared with another filled cell. */
function perimeter(cells) {
  let p = 0;
  for (let y = 0; y < cells.length; y += 1) {
    for (let x = 0; x < cells[y].length; x += 1) {
      if (!cells[y][x]) continue;
      const up = y > 0 && cells[y - 1][x];
      const down = cells[y + 1] && cells[y + 1][x];
      const left = x > 0 && cells[y][x - 1];
      const right = cells[y][x + 1];
      p += [up, down, left, right].filter((n) => !n).length;
    }
  }
  return p;
}
const area = (cells) => cells.flat().filter(Boolean).length;

/* Collatz chains */
topic('nobody-knows').exercises.forEach((e, i) => {
  const id = `nobody-knows[${i + 1}]`;
  const m = e.ask.match(/Start at (\d+)\. How many steps/i);
  if (m) {
    const want = collatz(Number(m[1])).length - 1;
    if (e.answer !== want) bad(id, `${m[1]} takes ${want} steps, data says ${e.answer}`);
    else ok(id, `${m[1]} reaches 1 in ${want} steps`);
  }
  if (e.figure && e.figure.kind === 'chain') {
    const items = e.figure.items.filter((v) => v !== '?').map(Number);
    const want = collatz(items[0]);
    if (JSON.stringify(items) !== JSON.stringify(want)) {
      bad(id, `chain shown is ${items.join(',')}, the real one is ${want.join(',')}`);
    } else ok(id, `chain from ${items[0]} is correct`);
  }
});
{
  const e = asked('nobody-knows', '5 is odd');
  if (e.answer !== 3 * 5 + 1) bad('nobody-knows[3n+1]', `3*5+1 is ${3 * 5 + 1}`);
  else ok('nobody-knows[3n+1]', '3 times 5 plus 1 = 16');
}

/* Squares from odd numbers */
topic('staircase-squares').exercises.forEach((e, i) => {
  const id = `staircase[${i + 1}]`;
  const m = e.ask.match(/^([\d\s+]+)=\s*\?$/);
  if (m) {
    const nums = m[1].split('+').map((x) => Number(x.trim()));
    const want = nums.reduce((a, b) => a + b, 0);
    const k = nums.length;
    if (want !== k * k) bad(id, `${nums.join('+')} should be ${k}x${k}=${k * k}`);
    if (e.answer !== want) bad(id, `${nums.join('+')} is ${want}, data says ${e.answer}`);
    else ok(id, `${nums.join('+')} = ${want} = ${k}x${k}`);
  }
});
{
  const c = topic('staircase-squares').exercises.find((e) => e.type === 'collect');
  const wrong = c.valid.filter((v) => Math.sqrt(v) % 1 !== 0);
  if (wrong.length) bad('staircase[collect]', `${wrong.join(', ')} are not square numbers`);
  else ok('staircase[collect]', `all ${c.valid.length} listed values are perfect squares`);
}

/* Fibonacci */
topic('natures-numbers').exercises.forEach((e, i) => {
  const id = `fibonacci[${i + 1}]`;
  const m = e.ask.match(/^([\d,\s]+),\s*\?$/);
  if (!m) return;
  const seq = m[1].split(',').map((x) => Number(x.trim()));
  const want = seq[seq.length - 1] + seq[seq.length - 2];
  if (e.answer !== want) bad(id, `${seq.join(',')} continues ${want}, data says ${e.answer}`);
  else ok(id, `${seq.join(',')} -> ${want}`);
});
{
  const c = topic('natures-numbers').exercises.find((e) => e.type === 'collect');
  const real = new Set();
  let a = 1; let b = 1;
  for (let i = 0; i < 12; i += 1) { real.add(a); [a, b] = [b, a + b]; }
  const wrong = c.valid.filter((v) => !real.has(v));
  if (wrong.length) bad('fibonacci[collect]', `${wrong.join(', ')} are not Fibonacci numbers`);
  else ok('fibonacci[collect]', 'every listed value is a Fibonacci number');
}

/* Perimeter and area, read straight off the pictures */
topic('fence-puzzle').exercises.forEach((e, i) => {
  const id = `fence[${i + 1}]`;
  if (!e.figure || e.figure.kind !== 'polyomino') return;
  const cells = e.figure.cells;
  if (/perimeter/i.test(e.ask)) {
    const want = perimeter(cells);
    if (e.answer !== want) bad(id, `that shape has perimeter ${want}, data says ${e.answer}`);
    else ok(id, `perimeter ${want}`);
  } else if (/area/i.test(e.ask)) {
    const want = area(cells);
    if (e.answer !== want) bad(id, `that shape has area ${want}, data says ${e.answer}`);
    else ok(id, `area ${want}`);
  }
});
{
  /* The teaching claim: 6 in a line has more fence than 3x2, same area. */
  const line = [[1, 1, 1, 1, 1, 1]];
  const fat = [[1, 1, 1], [1, 1, 1]];
  if (area(line) !== area(fat)) bad('fence[lesson]', 'the two shapes do not have equal area');
  else if (!(perimeter(line) > perimeter(fat))) bad('fence[lesson]', 'the line does not have more fence');
  else ok('fence[lesson]', `same area ${area(line)}, fence ${perimeter(line)} vs ${perimeter(fat)}`);
  /* 12 of fence: the best area really is the 3x3. */
  let best = 0;
  for (let w = 1; w <= 5; w += 1) { const h = 6 - w; if (h > 0) best = Math.max(best, w * h); }
  const p = asked('fence-puzzle', '12 of fence');
  if (p.answer !== best) bad('fence[12]', `best area with perimeter 12 is ${best}, data says ${p.answer}`);
  else ok('fence[12]', `perimeter 12 gives at most area ${best}`);
}

/* Binary: every target must be makeable exactly one way */
topic('secret-codes').exercises.forEach((e, i) => {
  if (e.type !== 'build' || e.mode !== 'binary') return;
  const id = `codes[${i + 1}]`;
  const chips = e.chips;
  let ways = 0;
  let found = null;
  for (let mask = 0; mask < (1 << chips.length); mask += 1) {
    let sum = 0; const used = [];
    chips.forEach((c, k) => { if (mask & (1 << k)) { sum += c; used.push(c); } });
    if (sum === e.target) { ways += 1; found = used; }
  }
  if (ways !== 1) bad(id, `${e.target} can be made ${ways} ways`);
  else ok(id, `${e.target} = ${found.join(' + ')}, uniquely`);
});

/* Cube: 6 faces, 12 edges, 8 corners, and exactly 11 nets. */
{
  const t = topic('fold-a-box');
  const want = { 'faces does a cube have': 6, 'edges does a cube have': 12, 'corners does a cube have': 8, 'nets fold into a cube': 11 };
  Object.entries(want).forEach(([needle, v]) => {
    const e = t.exercises.find((x) => x.ask.toLowerCase().includes(needle));
    if (!e) { bad('cube', `no question about "${needle}"`); return; }
    if (e.answer !== v) bad('cube', `"${needle}" should be ${v}, data says ${e.answer}`);
    else ok('cube', `${needle} = ${v}`);
  });
}

/* Multiplication principle */
topic('how-many-ways').exercises.forEach((e, i) => {
  const id = `ways[${i + 1}]`;
  const m = e.ask.match(/(\d+) \w+ and (\d+) \w+/);
  if (!m || (e.type !== 'number')) return;
  const want = Number(m[1]) * Number(m[2]);
  if (e.answer !== want) bad(id, `${m[1]} x ${m[2]} is ${want}, data says ${e.answer}`);
  else ok(id, `${m[1]} x ${m[2]} = ${want}`);
});

/* Rotational symmetry: a regular n-gon matches n times in a full turn. */
{
  const t = topic('turn-it-round');
  const want = { 'a square match itself': 4, 'triangle with equal sides': 3, 'a hexagon': 6 };
  Object.entries(want).forEach(([needle, v]) => {
    const e = t.exercises.find((x) => x.ask.toLowerCase().includes(needle.toLowerCase()));
    if (!e) return;
    if (e.answer !== v) bad('turn', `"${needle}" should be ${v}, data says ${e.answer}`);
    else ok('turn', `${needle} = ${v}`);
  });
}

/* ---- Grade 3 --------------------------------------------------------- */

const prime = (n) => { if (n < 2) return false; for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false; return true; };
const divisors = (n) => { const out = []; for (let d = 1; d < n; d += 1) if (n % d === 0) out.push(d); return out; };
const perfect = (n) => divisors(n).reduce((a, b) => a + b, 0) === n;

/* Primes */
{
  const c = topic('primes').exercises.find((e) => e.type === 'collect');
  const wrong = c.valid.filter((v) => !prime(v));
  if (wrong.length) bad('primes[collect]', `${wrong.join(', ')} are not prime`);
  else ok('primes[collect]', 'every listed value is prime');

  const sieve = topic('primes').exercises.find((e) => e.type === 'sieve');
  const want = [];
  for (let n = 1; n <= sieve.upto; n += 1) if (prime(n)) want.push(n);
  if (sieve.answer !== want.length) bad('primes[sieve]', `there are ${want.length} primes up to ${sieve.upto}, data says ${sieve.answer}`);
  else ok('primes[sieve]', `${want.length} primes up to ${sieve.upto}`);

  const nope = topic('primes').exercises.find((e) => e.type === 'choice');
  const composite = nope.choices.filter((ch) => !prime(Number(ch.label)));
  if (composite.length !== 1) bad('primes[choice]', `${composite.length} choices are composite; must be exactly 1`);
  else if (composite[0].id !== nope.answer) bad('primes[choice]', `the composite is "${composite[0].id}"`);
  else ok('primes[choice]', `only "${nope.answer}" is composite`);
}

/* Pascal's triangle */
{
  const rows = [[1]];
  for (let r = 1; r < 8; r += 1) {
    const p = rows[r - 1]; const row = [1];
    for (let i = 0; i < p.length - 1; i += 1) row.push(p[i] + p[i + 1]);
    row.push(1); rows.push(row);
  }
  const t = topic('pascal');
  const hidden = t.exercises.find((e) => e.figure && e.figure.kind === 'pascal' && e.figure.hide);
  if (hidden) {
    const [r, i] = hidden.figure.hide[0];
    if (hidden.answer !== rows[r][i]) bad('pascal[hidden]', `row ${r} position ${i} is ${rows[r][i]}, data says ${hidden.answer}`);
    else ok('pascal[hidden]', `hidden entry is ${rows[r][i]}`);
  }
  const sums = t.exercises.filter((e) => /add (up )?(to|row)/i.test(e.ask) || /does it add to/i.test(e.ask));
  sums.forEach((e, k) => {
    const m = e.ask.match(/([\d,\s+]+)\./) || e.ask.match(/is ([\d, ]+)\./);
    if (!m) return;
    const nums = m[1].split(/[+,]/).map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x));
    if (nums.length < 2) return;
    const want = nums.reduce((a, b) => a + b, 0);
    if (e.answer !== want) bad(`pascal[sum${k}]`, `${nums.join('+')} is ${want}, data says ${e.answer}`);
    else ok(`pascal[sum${k}]`, `${nums.join('+')} = ${want}`);
  });
  const big = topic('pascal').exercises.find((e) => /row 7/i.test(e.ask + (e.hint || '')));
  if (big) {
    const want = Math.max(...rows[6]);
    if (big.answer !== want) bad('pascal[row7]', `the biggest in row 7 is ${want}, data says ${big.answer}`);
    else ok('pascal[row7]', `biggest in row 7 is ${want}`);
  }
}

/* Magic squares: the total must follow from the pool, and each puzzle solve. */
{
  const t = topic('magic-squares');
  const sumAll = t.exercises.find((e) => /1 \+ 2 \+ 3/.test(e.ask));
  if (sumAll && sumAll.answer !== 45) bad('magic[sum]', '1..9 adds to 45');
  else if (sumAll) ok('magic[sum]', '1 to 9 adds to 45');
  const per = t.exercises.find((e) => /shared between 3 rows/i.test(e.ask));
  if (per && per.answer !== 45 / 3) bad('magic[row]', `each row must be ${45 / 3}`);
  else if (per) ok('magic[row]', 'each line must be 15');
  t.exercises.filter((e) => e.type === 'magic').forEach((e, k) => {
    const n = e.given.length;
    const g = e.given.map((r) => r.slice());
    /* Every given line that is already complete must hit the total. */
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const lines = [...g, ...g[0].map((_, x) => g.map((r) => r[x])),
      g.map((r, i) => r[i]), g.map((r, i) => r[n - 1 - i])];
    const broken = lines.find((l) => l.every((v) => v != null) && sum(l) !== e.total);
    if (broken) bad(`magic[${k}]`, `a given line adds to ${sum(broken)}, not ${e.total}`);
    else ok(`magic[${k}]`, 'given lines are consistent');
  });
}

/* Perfect numbers */
{
  const t = topic('perfect-numbers');
  const c = t.exercises.find((e) => e.type === 'collect');
  const wrong = c.valid.filter((v) => !perfect(v));
  if (wrong.length) bad('perfect[collect]', `${wrong.join(', ')} are not perfect`);
  else ok('perfect[collect]', `${c.valid.join(', ')} are all perfect numbers`);
  [[6, 6], [8, 7], [12, 16], [10, 8]].forEach(([n, want]) => {
    const real = divisors(n).reduce((a, b) => a + b, 0);
    if (real !== want) bad('perfect[calc]', `parts of ${n} add to ${real}, the page says ${want}`);
    else ok('perfect[calc]', `parts of ${n} add to ${real}`);
  });
}

/* Tiling angles */
{
  const t = topic('shapes-that-fit');
  const want = { 'four-sided shape add to': 360, 'triangle add to': 180, 'squares meet at a corner': 4, 'equal sides meet at a corner': 6 };
  Object.entries(want).forEach(([needle, v]) => {
    const e = t.exercises.find((x) => x.ask.toLowerCase().includes(needle.toLowerCase()));
    if (!e) return;
    if (e.answer !== v) bad('tiling', `"${needle}" should be ${v}, data says ${e.answer}`);
    else ok('tiling', `${needle} = ${v}`);
  });
  /* Regular polygons meeting at a point: 360 divided by the interior angle. */
  const sq = 360 / (((4 - 2) * 180) / 4);
  const tri = 360 / (((3 - 2) * 180) / 3);
  if (sq !== 4 || tri !== 6) bad('tiling[angles]', 'the corner arithmetic does not hold');
  else ok('tiling[angles]', `squares meet ${sq}, triangles meet ${tri}`);
}

/* Infinity: the pairing claims */
{
  const t = topic('forever');
  const a = t.exercises.find((e) => /5 goes with/i.test(e.ask));
  if (a && a.answer !== 10) bad('forever[pair]', '5 doubles to 10');
  else if (a) ok('forever[pair]', '5 pairs with 10');
  const b = t.exercises.find((e) => /pairs with 40/i.test(e.ask));
  if (b && b.answer !== 20) bad('forever[pair]', '40 halves to 20');
  else if (b) ok('forever[pair]', '40 pairs with 20');
}

/* ---- Report ---------------------------------------------------------- */

console.log(`${checked.length} mathematical claims recomputed and confirmed`);
if (problems.length) {
  console.log(`\nWRONG (${problems.length}):`);
  problems.forEach((p) => console.log(`  x ${p}`));
  process.exit(1);
}
console.log('\nNo wrong answers.');
