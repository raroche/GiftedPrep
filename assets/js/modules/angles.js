/**
 * angles.js — Guess the Angle.
 *
 * The research on how children learn angles is unusually blunt about what goes
 * wrong, and it is always the same thing: they judge an angle by the length of
 * its arms rather than by how far it opens. One survey calls arm length "the
 * principal obstacle". It is a taught mistake — textbook angles are drawn with
 * two equal arms sitting flat on the page, so a child quite reasonably learns
 * that the picture, not the opening, is the thing.
 *
 * Every angle-guessing game we could find draws exactly those neat equal arms.
 * So this one does the opposite, everywhere, as a rule of the module:
 *
 *   Arm lengths are random and independent of the answer.
 *   The whole angle is rotated at random, so it rarely sits flat.
 *
 * A child who beats this game cannot be reading arm length or orientation,
 * because neither carries any information. There is a test for that.
 *
 * Six kinds of question, none of which need a child to draw anything:
 *
 *   estimate   an angle is shown, pick the number
 *   bigger     two angles, arms chosen to mislead; pick the bigger opening
 *   sort       acute, right, obtuse, straight or reflex
 *   clock      the hands say a time, what angle is between them
 *   world      a roof, a ladder, open scissors
 *   bounce     angle in equals angle out; which cup does the ball land in
 *
 * "bigger" is the one that matters. It is the misconception put directly to the
 * child, and it is the reason to build this rather than link to Alien Angles.
 */

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

const DEG = '°';

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** A point on a circle. SVG counts y downwards, so the sine is subtracted. */
export function pointAt(cx, cy, r, deg) {
  const t = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(t), cy - r * Math.sin(t)];
}

const n = (x) => Math.round(x * 100) / 100;

/**
 * One angle, drawn.
 *
 * `armA` and `armB` are fractions of the full radius and are meant to differ.
 * `rotate` turns the whole figure. Both exist to carry no information, which is
 * the point: see the note at the top of the file.
 */
export function angleSvg(deg, {
  armA = 1, armB = 1, rotate = 0, size = 200, tint = 'var(--room, var(--gp-accent))',
  label = '', showValue = false, showArc = true, dot = true, fit = true
} = {}) {
  const c = size / 2;
  const r = size * 0.46;
  const [ax, ay] = pointAt(c, c, r * armA, rotate);
  const [bx, by] = pointAt(c, c, r * armB, rotate + deg);

  /* The arc has to clear the shorter arm or it reads as a pie slice rather
     than a measurement of the opening. It also has a floor: scaled purely off
     the shorter arm it vanished whenever the arms happened to be short, and an
     angle you cannot see the opening of is not a question. */
  const ar = Math.max(size * 0.15, Math.min(r * armA, r * armB) * 0.42);
  const [p1x, p1y] = pointAt(c, c, ar, rotate);
  const [p2x, p2y] = pointAt(c, c, ar, rotate + deg);
  /* sweep-flag 0 because the y axis is flipped: maths turns anticlockwise. */
  const arc = deg >= 359.9
    ? `<circle cx="${n(c)}" cy="${n(c)}" r="${n(ar)}" fill="none" stroke="${tint}"
         opacity=".55"/>`
    : `<path d="M ${n(p1x)} ${n(p1y)} A ${n(ar)} ${n(ar)} 0 ${deg > 180 ? 1 : 0} 0
         ${n(p2x)} ${n(p2y)}" fill="none" stroke="${tint}" opacity=".75"/>`;

  /* Teachers mark a right angle with a square, never an arc, and a child who
     has seen that once recognises 90 forever. It is worth honouring. */
  const square = (() => {
    if (Math.round(deg) !== 90) return '';
    const s = ar * 0.86;
    const [q1x, q1y] = pointAt(c, c, s, rotate);
    const [q2x, q2y] = pointAt(c, c, s * Math.SQRT2, rotate + 45);
    const [q3x, q3y] = pointAt(c, c, s, rotate + 90);
    return `<path d="M ${n(q1x)} ${n(q1y)} L ${n(q2x)} ${n(q2y)} L ${n(q3x)} ${n(q3y)}"
      fill="none" stroke="${tint}" opacity=".75"/>`;
  })();

  const value = showValue
    ? `<text x="${n(c)}" y="${n(size - 6)}" text-anchor="middle" font-size="${n(size * 0.13)}"
        font-weight="700" fill="var(--gp-ink)">${Math.round(deg * 10) / 10}${DEG}</text>`
    : '';

  /* An angle drawn from the middle of a square box only ever fills half of it,
     and at a random rotation the empty half moves about. So the figure is
     measured and then nudged and grown to sit in the middle of its frame. The
     angle is the thing being judged; it should be as large as the space allows.
     The growth is capped, or a narrow angle would blow up into a thick wedge
     and look like a different question. */
  const pts = [[c, c], [ax, ay], [bx, by]];
  for (let k = 0; k <= 12; k += 1) pts.push(pointAt(c, c, ar, rotate + (deg * k) / 12));
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const pad = 9;
  const w = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const h = Math.max(1, Math.max(...ys) - Math.min(...ys));
  /* Fitting is switched off wherever two angles are shown together. A narrow
     angle has a small bounding box, so it grows more -- which drew its arms
     LONGER on the screen than a wide angle's, and handed the child back exactly
     the false clue this game exists to remove, pointing the other way. The unit
     test for that shortcut is what caught it. */
  const k = fit
    ? Math.min(1.75, Math.max(1, Math.min((size - pad * 2) / w, (size - pad * 2) / h)))
    : 1;
  const bcx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const bcy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const frame = `translate(${n(size / 2 - k * bcx)} ${n(size / 2 - k * bcy)}) scale(${n(k)})`;

  return `<svg class="cz-ang" viewBox="0 0 ${size} ${size}" role="img"
    aria-label="${esc(label || `An angle of ${Math.round(deg)} degrees`)}">
    <g transform="${frame}" stroke-width="${n(5 / k)}">
      <line x1="${n(c)}" y1="${n(c)}" x2="${n(ax)}" y2="${n(ay)}" stroke="var(--gp-ink)"
            stroke-linecap="round"/>
      <line x1="${n(c)}" y1="${n(c)}" x2="${n(bx)}" y2="${n(by)}" stroke="var(--gp-ink)"
            stroke-linecap="round"/>
      ${showArc ? (square || arc) : ''}
      ${dot ? `<circle cx="${n(c)}" cy="${n(c)}" r="${n(4.5 / k)}" fill="${tint}"/>` : ''}
    </g>
    ${value}
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* Families                                                            */
/* ------------------------------------------------------------------ */

export const FAMILIES = [
  { id: 'acute', name: 'Acute', hint: 'Smaller than a corner', es: 'agudo' },
  { id: 'right', name: 'Right', hint: 'Exactly a corner', es: 'recto' },
  { id: 'obtuse', name: 'Obtuse', hint: 'Past a corner, not yet flat', es: 'obtuso' },
  { id: 'straight', name: 'Straight', hint: 'Flat. Half a turn.', es: 'llano' },
  { id: 'reflex', name: 'Reflex', hint: 'More than flat', es: 'reflejo' }
];

export function familyOf(deg) {
  if (deg === 90) return 'right';
  if (deg === 180) return 'straight';
  if (deg < 90) return 'acute';
  if (deg < 180) return 'obtuse';
  return 'reflex';
}


/* ------------------------------------------------------------------ */
/* Sets and modes                                                      */
/* ------------------------------------------------------------------ */

/**
 * How hard, expressed as how close the wrong answers sit.
 *
 * `step` is the gap between the choices. Wide gaps ask only "roughly where is
 * this", which is the first thing to learn; narrow gaps ask for a real
 * estimate. `pool` is what the answer can be.
 */
export const SETS = [
  { id: 'corners', name: 'Corners and turns', step: 45,
    blurb: 'Only quarter turns: 45, 90, 135, 180. The place to start.' },
  { id: 'steps', name: 'Clock steps', step: 30,
    blurb: 'Every 15 degrees — the positions of a clock hand.' },
  { id: 'sharp', name: 'Sharp eyes', step: 10,
    blurb: 'Any angle at all, and the wrong answers sit close.' }
];

export const ASKS = [
  { id: 'estimate', name: 'How big is it?', icon: 'protractor',
    blurb: 'An angle is drawn. Say how many degrees it opens.' },
  { id: 'bigger', name: 'Which is bigger?', icon: 'scales',
    blurb: 'Two angles. The arms are drawn to fool you. Trust the opening.' },
  { id: 'sort', name: 'What kind is it?', icon: 'sort',
    blurb: 'Acute, right, obtuse, straight or reflex.' },
  { id: 'clock', name: 'Clock hands', icon: 'clock',
    blurb: 'The clock shows a time. What angle is between the hands?' },
  { id: 'world', name: 'Out in the world', icon: 'house',
    blurb: 'A roof, a ladder, open scissors. Angles hiding in plain sight.' },
  { id: 'bounce', name: 'Where does it bounce?', icon: 'bounce',
    blurb: 'Angle in equals angle out. Which cup does the ball land in?' },
  { id: 'mix', name: 'A mix of everything', icon: 'shuffle',
    blurb: 'All six, shuffled together.' }
];

export const COUNTS = [10, 20, 30];

const KINDS = ASKS.filter((a) => a.id !== 'mix').map((a) => a.id);

/* ------------------------------------------------------------------ */
/* Small random helpers                                                */
/* ------------------------------------------------------------------ */

export function shuffle(list, random = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = (list, random) => list[Math.floor(random() * list.length)];
const between = (lo, hi, random) => lo + Math.floor(random() * (hi - lo + 1));

/**
 * A pair of arm lengths that differ, and a rotation.
 *
 * This is the heart of the whole module. The lengths are drawn independently of
 * the angle, so no child can win by measuring the lines, and the figure is
 * turned so it does not sit flat on an imaginary baseline. Both are the errors
 * the research says children actually make.
 */
export function dressing(random = Math.random) {
  /* The floor of 0.62 is not decoration. Below it the shorter arm shrank to
     about a fifth of the box, which made the angle hard to read rather than
     hard to judge -- a different and much worse kind of difficulty.

     The arms are also pushed apart rather than merely drawn at random. Two
     independent draws left them near enough the same length a quarter of the
     time, and a question whose arms match is a question that lets the mistake
     through unchallenged. Which arm gets the extra length is a fair coin, so
     the difference is always visible and never means anything. */
  const short = 0.62 + random() * 0.2;
  const long = Math.min(1, short + 0.18 + random() * 0.2);
  const flip = random() < 0.5;
  return {
    armA: flip ? long : short,
    armB: flip ? short : long,
    rotate: Math.floor(random() * 360)
  };
}

/** The angles a set is allowed to ask about. */
export function poolFor(set) {
  if (set === 'corners') return [45, 90, 135, 180];
  if (set === 'steps') {
    return Array.from({ length: 11 }, (_, i) => (i + 1) * 15);
  }
  const out = [];
  for (let d = 10; d <= 170; d += 5) out.push(d);
  return out;
}

/**
 * Four numbers, one of them right.
 *
 * Distractors sit a whole number of `step`s away, so they are plausible without
 * being arbitrary, and they are kept inside 5..355 so nothing silly is offered.
 */
export function numberChoices(answer, step, howMany = 4, random = Math.random) {
  /* A wrong answer past 180 offered against a clearly acute picture is not a
     wrong answer, it is a free elimination. So the choices stay on the same
     side of straight as the truth does. */
  const hi = answer <= 180 ? 180 : 355;
  const ok = (v) => v >= 5 && v <= hi;
  const seen = new Set([answer]);
  const out = [answer];
  let guard = 0;
  while (out.length < howMany && guard < 200) {
    guard += 1;
    const away = (between(1, 3, random)) * step * (random() < 0.5 ? -1 : 1);
    const v = answer + away;
    if (!ok(v) || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  /* A tight step near the ends of the range can run out of room. Reach further
     rather than return three choices, which would make the question easier by
     accident. */
  for (let k = 1; out.length < howMany && k < 24; k += 1) {
    for (const sign of [1, -1]) {
      const v = answer + sign * step * k;
      if (ok(v) && !seen.has(v) && out.length < howMany) { seen.add(v); out.push(v); }
    }
  }
  return shuffle(out, random);
}

/* ------------------------------------------------------------------ */
/* Two more pictures                                                   */
/* ------------------------------------------------------------------ */

/**
 * A clock face, with the angle between the hands marked.
 *
 * The clock is the best angle tool a child already owns. Twelve to one is 30
 * degrees, twelve to two is 60, twelve to three is 90 — so any angle can be
 * estimated by imagining a clock behind it and counting hours. That trick is
 * worth more than a protractor, and it only works if the clock is drawn to
 * scale, which is why the hour hand creeps as the minutes pass.
 */
export function clockSvg(hour, minute, { size = 220 } = {}) {
  const c = size / 2;
  const R = size * 0.40;
  const t = 'var(--room, var(--gp-accent))';
  const hDeg = 90 - (((hour % 12) * 30) + minute * 0.5);
  const mDeg = 90 - minute * 6;
  const hand = (deg, len, w, colour) => {
    const [x, y] = pointAt(c, c, R * len, deg);
    return `<line x1="${n(c)}" y1="${n(c)}" x2="${n(x)}" y2="${n(y)}" stroke="${colour}"
      stroke-width="${w}" stroke-linecap="round"/>`;
  };
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const [x1, y1] = pointAt(c, c, R * 0.88, 90 - i * 30);
    const [x2, y2] = pointAt(c, c, R * 0.98, 90 - i * 30);
    return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"
      stroke="var(--gp-ink)" stroke-width="${i % 3 === 0 ? 4 : 2}" stroke-linecap="round"
      opacity="${i % 3 === 0 ? 0.9 : 0.45}"/>`;
  }).join('');

  /* The arc is drawn the short way round, because that is the angle asked for. */
  const span = ((mDeg - hDeg) % 360 + 360) % 360;
  const short = span > 180;
  const ar = R * 0.34;
  const [s1x, s1y] = pointAt(c, c, ar, hDeg);
  const [s2x, s2y] = pointAt(c, c, ar, mDeg);
  return `<svg class="cz-ang cz-ang--clock" viewBox="0 0 ${size} ${size}" role="img"
    aria-label="A clock showing ${hour}${minute === 30 ? ' thirty' : " o'clock"}">
    <circle cx="${n(c)}" cy="${n(c)}" r="${n(R * 1.12)}" fill="var(--room-soft, var(--gp-accent-soft))"/>
    <circle cx="${n(c)}" cy="${n(c)}" r="${n(R * 1.12)}" fill="none" stroke="var(--gp-ink)"
            stroke-width="4"/>
    ${ticks}
    <path d="M ${n(s1x)} ${n(s1y)} A ${n(ar)} ${n(ar)} 0 ${short ? 1 : 0} ${short ? 1 : 0}
      ${n(s2x)} ${n(s2y)}" fill="none" stroke="${t}" stroke-width="4" opacity=".85"/>
    ${hand(hDeg, 0.55, 7, 'var(--gp-ink)')}
    ${hand(mDeg, 0.86, 5, 'var(--gp-ink)')}
    <circle cx="${n(c)}" cy="${n(c)}" r="5.5" fill="${t}"/>
  </svg>`;
}

/**
 * The bounce, with the outgoing half deliberately missing.
 *
 * Drawing the return leg would answer the question. What is shown is the throw,
 * the angle it makes with the floor, and three cups — so the only way through
 * is to know that the ball comes off the roof at the angle it went in at.
 */
export function bounceSvg({ deg, startX, floorY, roofY, hitX, cups }) {
  const t = 'var(--room, var(--gp-accent))';
  const ar = 30;
  const [a1x, a1y] = pointAt(startX, floorY, ar, 0);
  const [a2x, a2y] = pointAt(startX, floorY, ar, deg);
  const cupArt = cups.map((c) => `
    <path d="M ${n(c.x - 13)} ${n(floorY)} L ${n(c.x - 9)} ${n(floorY + 26)}
             L ${n(c.x + 9)} ${n(floorY + 26)} L ${n(c.x + 13)} ${n(floorY)} Z"
          fill="var(--room-soft, var(--gp-accent-soft))" stroke="var(--gp-ink)" stroke-width="3"
          stroke-linejoin="round"/>
    <text x="${n(c.x)}" y="${n(floorY + 20)}" text-anchor="middle" font-size="15"
          font-weight="700" fill="var(--gp-ink)">${c.id}</text>`).join('');

  return `<svg class="cz-ang cz-ang--bounce" viewBox="0 0 300 200" role="img"
    aria-label="A ball thrown at ${Math.round(deg)} degrees towards a roof">
    <path d="M8 ${roofY} H292" stroke="var(--gp-ink)" stroke-width="6" stroke-linecap="round"/>
    <path d="M8 ${floorY} H292" stroke="var(--gp-ink)" stroke-width="6" stroke-linecap="round"/>
    <path d="M ${n(startX)} ${n(floorY)} L ${n(hitX)} ${n(roofY)}" stroke="${t}"
          stroke-width="4" stroke-linecap="round" stroke-dasharray="9 7"/>
    <path d="M ${n(a1x)} ${n(a1y)} A ${ar} ${ar} 0 0 0 ${n(a2x)} ${n(a2y)}" fill="none"
          stroke="${t}" stroke-width="3"/>
    <text x="${n(startX + 38)}" y="${n(floorY - 8)}" font-size="15" font-weight="700"
          fill="var(--gp-ink)">${Math.round(deg)}${DEG}</text>
    <circle cx="${n(hitX)}" cy="${n(roofY + 7)}" r="5" fill="${t}" opacity=".55"/>
    ${cupArt}
    <circle cx="${n(startX)}" cy="${n(floorY - 8)}" r="8" fill="${t}"
            stroke="var(--gp-ink)" stroke-width="3"/>
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* Building questions                                                  */
/* ------------------------------------------------------------------ */

/*
 * Every kind of question is flattened to the same shape:
 *
 *   { kind, prompt, figure, choices: [{ id, html }], answer, explain }
 *
 * so the screen has one way to draw a question and one way to settle it,
 * whether the child is picking a number, a picture or a letter. Six special
 * cases in the game loop is how the flag game grew a bug that ate its own
 * "next" button.
 */

const degLabel = (d) => `${d}${DEG}`;

function askEstimate(set, random) {
  const deg = pick(poolFor(set), random);
  const d = dressing(random);
  const step = SETS.find((s) => s.id === set).step;
  return {
    kind: 'estimate',
    truth: deg,
    prompt: 'How big is this angle?',
    figure: angleSvg(deg, { ...d, size: 240, label: `An angle of ${deg} degrees` }),
    choices: numberChoices(deg, step, 4, random).map((v) => ({ id: String(v), html: degLabel(v) })),
    answer: String(deg),
    explain: `It is ${degLabel(deg)} — ${FAMILIES.find((f) => f.id === familyOf(deg)).name.toLowerCase()}.`
  };
}

/**
 * Two angles, and the arms are the whole point.
 *
 * The lengths are drawn at random and INDEPENDENTLY of the two angles, so arm
 * length carries exactly no information about which opening is bigger. That is
 * deliberate and it is the reason this game exists: a child who has been
 * reading the lines instead of the opening will score about half, notice, and
 * have to look again. Making the long arms always belong to the smaller angle
 * would be worse, not better — it would just teach the opposite wrong rule.
 */
function askBigger(set, random) {
  const gap = { corners: 45, steps: 25, sharp: 10 }[set] || 25;
  const pool = poolFor(set === 'corners' ? 'steps' : set);
  let a = pick(pool, random);
  let b = pick(pool.filter((v) => Math.abs(v - a) >= gap), random);
  if (b == null) { a = 40; b = a + gap; }

  /* Sort first, THEN toss for which side the wider one goes to. The first
     version worked out the answer from the draw order and separately put the
     larger value on the left every time, so whenever the second draw was the
     larger one the game marked the narrower angle correct. It said so out loud
     in its own feedback -- "the wider one is 165" while ticking the 60 -- and
     the tests did not notice, because none of them asked the only question that
     matters here: is the answer the wider angle? */
  const wide = Math.max(a, b);
  const narrow = Math.min(a, b);
  const wideLeft = random() < 0.5;
  const answer = wideLeft ? 'left' : 'right';

  const side = (deg, id) => ({
    id,
    deg,
    html: angleSvg(deg, {
      ...dressing(random), size: 190, fit: false, label: 'One of two angles'
    })
  });
  return {
    kind: 'bigger',
    truth: wide,
    prompt: 'Which angle opens wider?',
    hint: 'The arms are different lengths on purpose. Length is not the answer.',
    figure: '',
    wide: true,
    choices: [
      side(wideLeft ? wide : narrow, 'left'),
      side(wideLeft ? narrow : wide, 'right')
    ],
    answer,
    explain: `The wider one is ${degLabel(wide)}. The other is ${degLabel(narrow)}.`
  };
}

function askSort(set, random) {
  /* Reflex angles only appear once the easy families are not the whole story,
     because "bigger than flat" needs "flat" to mean something first. */
  const pool = set === 'corners'
    ? [30, 60, 90, 120, 150, 180]
    : poolFor(set).concat(set === 'sharp' ? [200, 225, 250, 280, 310, 340] : [90, 180, 210, 270, 300]);
  const deg = pick(pool, random);
  const fam = familyOf(deg);
  return {
    kind: 'sort',
    truth: deg,
    prompt: 'What kind of angle is this?',
    figure: angleSvg(deg, { ...dressing(random), size: 240,
      label: `An angle of ${deg} degrees` }),
    choices: FAMILIES.map((f) => ({ id: f.id, html: f.name, sub: f.hint })),
    answer: fam,
    explain: `${degLabel(deg)} is ${FAMILIES.find((f) => f.id === fam).name.toLowerCase()} — `
      + `${FAMILIES.find((f) => f.id === fam).hint.toLowerCase()}.`
  };
}

/** Hour hand at 30 degrees an hour plus half a degree a minute; minute hand at 6. */
export function clockAngle(hour, minute) {
  const h = ((hour % 12) * 30) + minute * 0.5;
  const m = minute * 6;
  const d = Math.abs(h - m);
  return d > 180 ? 360 - d : d;
}

function askClock(set, random) {
  const half = set === 'sharp';
  const hour = between(1, 12, random);
  const minute = half && random() < 0.5 ? 30 : 0;
  const deg = clockAngle(hour, minute);
  if (deg === 0) return askClock(set, random);
  const step = half ? 15 : 30;
  return {
    kind: 'clock',
    truth: deg,
    hands: { hour, minute },
    prompt: `The clock says ${hour}${minute === 30 ? ':30' : " o'clock"}. `
      + 'What angle is between the hands?',
    figure: clockSvg(hour, minute),
    choices: numberChoices(deg, step, 4, random).map((v) => ({ id: String(v), html: degLabel(v) })),
    answer: String(deg),
    explain: `${degLabel(deg)}. Every hour on the clock face is ${degLabel(30)}, `
      + `so counting the hours between the hands gets you there.`
  };
}

function askWorld(scenes, set, random) {
  const scene = pick(scenes, random);
  const step = SETS.find((s) => s.id === set).step;
  return {
    kind: 'world',
    truth: scene.deg,
    scene: scene.id,
    prompt: `${scene.name}. What is the angle?`,
    figure: scene.svg,
    choices: numberChoices(scene.deg, Math.max(step, 15), 4, random)
      .map((v) => ({ id: String(v), html: degLabel(v) })),
    answer: String(scene.deg),
    explain: `${degLabel(scene.deg)}. ${scene.fact}`
  };
}

/**
 * Angle in equals angle out.
 *
 * The ball leaves the floor, hits the ceiling and comes back down. Because the
 * bounce is symmetric it travels exactly the same distance sideways after the
 * bounce as before it, so the landing point is twice the run. The wrong cup at
 * the halfway mark is not arbitrary — it is where the ball would land if it
 * simply dropped, which is what a child who has not met reflection expects.
 */
export function bounceRun(deg, rise) { return rise / Math.tan((deg * Math.PI) / 180); }

/*
 * The cups are lettered left to right, so where the right cup sits decides its
 * letter. The first version always put the two wrong cups either side of the
 * right one, which made the answer the middle cup every single time -- a child
 * would have learnt "press B" and never thought about a bounce at all. So the
 * two wrong cups are drawn from three different layouts and the answer lands on
 * A, B or C about equally.
 */
const CUP_WHY = {
  0.5: 'That is short. The ball is still climbing there, not landing.',
  1: 'That is straight below the bounce. The ball is still moving sideways.',
  3: 'That is one whole bounce too many.',
  4: 'That is two bounces too many.'
};
const CUP_LAYOUTS = [[0.5, 1], [1, 3], [3, 4]];

const BOUNCE_X0 = 34;
const BOUNCE_FLOOR = 158;
const BOUNCE_ROOF = 38;
const BOUNCE_EDGE = 286;

/** Does this angle leave room for every cup a layout needs? */
export function layoutFits(deg, layout) {
  const run = bounceRun(deg, BOUNCE_FLOOR - BOUNCE_ROOF);
  return BOUNCE_X0 + run * Math.max(2, ...layout) < BOUNCE_EDGE;
}

function askBounce(set, random) {
  /* The layout is chosen first and the angle second, not the other way round.
     Picking the angle first left the steep layouts unreachable at shallow
     angles, and the right cup came out C half the time -- which is exactly the
     pattern this was meant to remove. */
  const layout = pick(CUP_LAYOUTS, random);
  const degs = (set === 'sharp'
    ? [45, 48, 52, 55, 58, 62, 66, 70, 74, 78]
    : [45, 50, 55, 60, 65, 70, 75]).filter((d) => layoutFits(d, layout));
  const deg = pick(degs.length ? degs : [75], random);
  const startX = BOUNCE_X0;
  const floorY = BOUNCE_FLOOR;
  const roofY = BOUNCE_ROOF;
  const run = bounceRun(deg, floorY - roofY);
  const hitX = startX + run;
  const at = (k) => startX + run * k;

  const spots = layout.map((k) => ({ k, x: at(k), why: CUP_WHY[k] }))
    .concat([{ k: 2, x: at(2), why: '' }])
    .sort((a, b) => a.x - b.x);
  const cups = spots.map((sp, i) => ({ ...sp, id: 'ABC'[i] }));
  const right = cups.find((c) => c.k === 2);

  return {
    kind: 'bounce',
    prompt: `The ball leaves at ${degLabel(deg)} and bounces off the roof. `
      + 'Which cup does it land in?',
    hint: 'The angle it leaves at is the angle it comes back at.',
    figure: bounceSvg({ deg, startX, floorY, roofY, hitX, cups }),
    choices: cups.map((c) => ({ id: c.id, html: c.id })),
    cupWhy: Object.fromEntries(cups.filter((c) => c.why).map((c) => [c.id, c.why])),
    answer: right.id,
    explain: `Cup ${right.id}. It came in at ${degLabel(deg)} and left at ${degLabel(deg)}, `
      + 'so it travelled the same distance sideways again.'
  };
}

export function buildQuestion(ask, set, scenes, random = Math.random) {
  const kind = ask === 'mix' ? pick(KINDS, random) : ask;
  switch (kind) {
    case 'bigger': return askBigger(set, random);
    case 'sort': return askSort(set, random);
    case 'clock': return askClock(set, random);
    case 'world': return askWorld(scenes, set, random);
    case 'bounce': return askBounce(set, random);
    default: return askEstimate(set, random);
  }
}

export function buildRound(scenes, { set = 'steps', ask = 'estimate', count = 10,
  random = Math.random } = {}) {
  const want = Math.max(1, Number(count) || 10);
  return Array.from({ length: want }, () => buildQuestion(ask, set, scenes, random));
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

export function renderSetup(chosen) {
  const card = (attr, list, current) => list.map((m) => `
    <button type="button" class="gp-card gp-card--mode${current === m.id ? ' is-selected' : ''}"
            ${attr}="${m.id}" aria-pressed="${current === m.id}">
      <span class="gp-card__title">${esc(m.name)}</span>
      <span class="gp-card__sub">${esc(m.blurb)}</span>
    </button>`).join('');
  const countBtn = (v) => `
    <button type="button" class="gp-pill${String(chosen.count) === String(v) ? ' is-selected' : ''}"
            role="radio" aria-checked="${String(chosen.count) === String(v)}"
            tabindex="${String(chosen.count) === String(v) ? 0 : -1}"
            data-angcount="${v}">${v}</button>`;

  return `
    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">What kind of question?</legend>
      <div class="gp-grid gp-grid--modes">${card('data-angask', ASKS, chosen.ask)}</div>
    </fieldset>

    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">How hard?</legend>
      <div class="gp-grid gp-grid--modes">${card('data-angset', SETS, chosen.set)}</div>
    </fieldset>

    <fieldset class="gp-fieldset">
      <legend class="gp-fieldset__legend">How many?</legend>
      <div class="gp-row gp-row--wrap" id="gp-ang-counts" role="radiogroup" aria-label="How many">
        ${COUNTS.map(countBtn).join('')}
      </div>
    </fieldset>

    <p class="gp-muted gp-grade-note">
      Every angle is turned and its arms are different lengths, on purpose.
      <strong>Long arms never mean a big angle.</strong>
    </p>

    <button type="button" class="gp-btn gp-btn--primary gp-btn--big"
            data-action="ang-start">Start &rarr;</button>`;
}

export function renderQuestion(q, index, total, streak = 0) {
  const choice = (c) => `
    <button type="button" class="gp-choice gp-choice--flag${q.wide ? ' gp-choice--fig' : ''}"
            data-anganswer="${esc(c.id)}">
      <span class="gp-choice__body">${c.html}${c.sub
        ? `<span class="cz-ang-choice__sub">${esc(c.sub)}</span>` : ''}</span>
      <span class="gp-choice__mark" aria-hidden="true"></span>
    </button>`;

  /* A streak is only shown once it is worth protecting. Announcing "1 in a row"
     turns a normal answer into a thing that can be lost, which is the opposite
     of the point. */
  const flame = streak >= 3
    ? `<p class="cz-ang-streak" aria-live="polite">${streak} in a row</p>` : '';

  return `<div class="gp-flagq cz-angq cz-angq--${q.kind}">
    <p class="gp-ex__count">Question ${index + 1} of ${total}</p>
    ${flame}
    <p class="cz-ang-ask">${esc(q.prompt)}</p>
    ${q.hint ? `<p class="gp-muted cz-ang-hint">${esc(q.hint)}</p>` : ''}
    ${q.figure ? `<div class="cz-ang-fig">${q.figure}</div>` : ''}
    <div class="gp-flagq__choices${q.wide ? ' cz-ang-choices--wide' : ''}${
      q.kind === 'sort' ? ' cz-ang-choices--sort' : ''}">
      ${q.choices.map(choice).join('')}
    </div>
  </div>`;
}

export default {
  SETS, ASKS, COUNTS, FAMILIES, familyOf, poolFor, numberChoices, dressing,
  angleSvg, clockSvg, bounceSvg, clockAngle, bounceRun, buildQuestion, buildRound,
  renderSetup, renderQuestion, shuffle, pointAt
};
