/**
 * Guess the Angle.
 *
 * The game exists to undo one specific mistake: children judge an angle by how
 * long its arms are drawn rather than by how far it opens, which the literature
 * calls the principal obstacle to learning angles at all. Undoing it depends
 * entirely on arm length being useless as a clue, so that is what most of these
 * tests are about. If arm length ever starts predicting the answer, the game
 * silently becomes the thing it was built to fix.
 *
 * The random ones use a seeded generator. An earlier statistical test in this
 * suite was written against Math.random and failed roughly one run in twenty,
 * which trains everybody to re-run a red build instead of reading it.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../../assets/js/modules/angles.js';
import { SCENES, armsOf, sceneSvg } from '../../assets/js/modules/angleart.js';

/* A small linear congruential generator, so every run sees the same numbers. */
function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const scenes = SCENES.map((s) => ({ ...s, svg: sceneSvg(s.id) }));

describe('reading a clock as a protractor', () => {
  test('the hours are 30 degrees apart', () => {
    assert.equal(A.clockAngle(3, 0), 90);
    assert.equal(A.clockAngle(6, 0), 180);
    assert.equal(A.clockAngle(9, 0), 90, 'measured the short way round');
    assert.equal(A.clockAngle(1, 0), 30);
    assert.equal(A.clockAngle(12, 0), 0);
  });

  test('the hour hand creeps as the minutes pass', () => {
    /* At half past four the hour hand is halfway between 4 and 5, not on the
       4. Drawing it on the 4 would make this 60 degrees and the picture would
       disagree with the answer. */
    assert.equal(A.clockAngle(4, 30), 45);
    assert.equal(A.clockAngle(3, 30), 75);
  });

  test('the angle is never more than half a turn', () => {
    for (let h = 0; h < 12; h += 1) {
      for (const m of [0, 30]) {
        const d = A.clockAngle(h, m);
        assert.ok(d >= 0 && d <= 180, `${h}:${m} gave ${d}`);
      }
    }
  });
});

describe('sorting angles into families', () => {
  test('the boundaries land on the right side', () => {
    assert.equal(A.familyOf(89), 'acute');
    assert.equal(A.familyOf(90), 'right');
    assert.equal(A.familyOf(91), 'obtuse');
    assert.equal(A.familyOf(179), 'obtuse');
    assert.equal(A.familyOf(180), 'straight');
    assert.equal(A.familyOf(181), 'reflex');
  });
});

describe('the choices offered', () => {
  test('there are always four, all different, and one is right', () => {
    const random = seeded(7);
    for (const step of [45, 30, 10]) {
      for (let deg = 5; deg <= 355; deg += 5) {
        const c = A.numberChoices(deg, step, 4, random);
        assert.equal(c.length, 4, `${deg} by ${step}`);
        assert.equal(new Set(c).size, 4, `repeats at ${deg} by ${step}`);
        assert.ok(c.includes(deg), `${deg} is not among its own choices`);
        assert.ok(c.every((v) => v >= 5 && v <= 355), `silly value at ${deg}`);
      }
    }
  });
});

describe('arm length must never be a clue', () => {
  test('the arms are always a useful size and always visibly different', () => {
    /* If the arms match, the question does not put the mistake to the child at
       all -- it just happens not to catch them out that time. */
    const random = seeded(3);
    let longerIsA = 0;
    for (let i = 0; i < 3000; i += 1) {
      const d = A.dressing(random);
      assert.ok(d.armA >= 0.62 && d.armA <= 1, 'an arm too short to read');
      assert.ok(d.armB >= 0.62 && d.armB <= 1, 'an arm too short to read');
      assert.ok(d.rotate >= 0 && d.rotate < 360);
      assert.ok(Math.abs(d.armA - d.armB) >= 0.05, 'the arms are the same length');
      if (d.armA > d.armB) longerIsA += 1;
    }
    /* And which arm is longer is a fair coin, so it says nothing either. */
    const share = longerIsA / 3000;
    assert.ok(share > 0.45 && share < 0.55, `the first arm is longer ${share} of the time`);
  });

  test('the wider angle is not the one with the longer arms', () => {
    /* This is the whole point of the game. If a child could win "which is
       bigger" by picking the picture with the longer lines, the game would be
       rewarding the exact mistake it was built to correct. Over 4000 questions
       that shortcut should score no better than a coin. */
    const random = seeded(11);
    let shortcutWins = 0;
    let asked = 0;
    for (let i = 0; i < 4000; i += 1) {
      const q = A.buildQuestion('bigger', 'steps', scenes, random);
      /* Both arms together, because "the picture with the longer lines" is the
         shortcut a child would actually reach for. Comparing only the longer
         arm of each ties too often to measure anything. */
      const inkOf = (html) => [...html.matchAll(/x2="([\d.]+)" y2="([\d.]+)"/g)]
        .reduce((sum, m) => sum + Math.hypot(Number(m[1]) - 95, Number(m[2]) - 95), 0);
      const left = inkOf(q.choices[0].html);
      const right = inkOf(q.choices[1].html);
      if (Math.abs(left - right) < 1) continue;
      asked += 1;
      const longer = left > right ? q.choices[0].id : q.choices[1].id;
      if (longer === q.answer) shortcutWins += 1;
    }
    const rate = shortcutWins / asked;
    assert.ok(asked > 3000, `only ${asked} usable questions`);
    assert.ok(rate > 0.42 && rate < 0.58,
      `picking the longer arms wins ${Math.round(rate * 100)}% of the time`);
  });
});

describe('the bouncing ball', () => {
  test('a 45 degree throw travels out as far as it goes up', () => {
    assert.ok(Math.abs(A.bounceRun(45, 120) - 120) < 1e-9);
    assert.ok(A.bounceRun(70, 120) < A.bounceRun(45, 120), 'steeper means a shorter run');
  });

  test('the right cup is not always the same letter', () => {
    /* Three cups in a row with the answer always in the middle would teach
       "press the middle one" instead of teaching reflection. */
    const random = seeded(5);
    const tally = { A: 0, B: 0, C: 0 };
    for (let i = 0; i < 3000; i += 1) {
      const q = A.buildQuestion('bounce', 'steps', scenes, random);
      assert.equal(q.choices.length, 3, 'a cup went missing off the edge');
      tally[q.answer] += 1;
    }
    for (const id of ['A', 'B', 'C']) {
      const share = tally[id] / 3000;
      assert.ok(share > 0.25 && share < 0.42,
        `cup ${id} is the answer ${Math.round(share * 100)}% of the time`);
    }
  });
});

describe('the drawings', () => {
  test('every scene is drawn at exactly the angle it claims', () => {
    /* Five of the nine were wrong when they were placed by hand. They are
       computed from their own degrees now, and this is what keeps it that way. */
    for (const s of SCENES) {
      const [a, b] = armsOf(s);
      assert.ok(Math.abs(Math.abs(b - a) - s.deg) < 1e-9,
        `${s.id} claims ${s.deg} but is drawn at ${Math.abs(b - a)}`);
      assert.ok(sceneSvg(s.id).length > 100, `${s.id} has no drawing`);
    }
  });

  test('no two scenes share an angle', () => {
    const degs = SCENES.map((s) => s.deg);
    assert.equal(new Set(degs).size, degs.length, 'two scenes would both be right');
  });

  test('a right angle gets a square, and a reflex angle goes the long way', () => {
    /* The large-arc flag is the fourth number in an SVG arc command. Getting it
       wrong draws a 250 degree angle as a 110 degree one, which looks perfectly
       reasonable and is completely wrong. */
    const arcFlags = (svg) => (svg.match(/A [\d.]+ [\d.]+ 0 (\d) (\d)/) || [])[1];
    assert.equal(arcFlags(A.angleSvg(90, {})), undefined, 'a right angle drew an arc');
    assert.ok(/L /.test(A.angleSvg(90, {})), 'a right angle has no square marker');
    assert.equal(arcFlags(A.angleSvg(250, {})), '1', 'a reflex angle took the short way round');
    assert.equal(arcFlags(A.angleSvg(70, {})), '0', 'a small angle took the long way round');
  });

  test('the figure is grown to fill its frame, never shrunk', () => {
    for (const deg of [5, 45, 90, 180, 270, 359]) {
      const m = A.angleSvg(deg, { armA: 0.7, armB: 1, rotate: 200 }).match(/scale\(([\d.]+)\)/);
      assert.ok(m, `${deg} has no fitting transform`);
      assert.ok(Number(m[1]) >= 1, `${deg} was shrunk to ${m[1]}`);
    }
  });
});

describe('a whole round', () => {
  test('every question can be answered and says why', () => {
    const random = seeded(23);
    const round = A.buildRound(scenes, { set: 'sharp', ask: 'mix', count: 40, random });
    assert.equal(round.length, 40);
    for (const q of round) {
      const ids = q.choices.map((c) => c.id);
      assert.ok(ids.includes(q.answer), `${q.kind} has no right answer`);
      assert.equal(new Set(ids).size, ids.length, `${q.kind} repeats a choice`);
      assert.ok(q.prompt.length > 5, `${q.kind} has no question`);
      assert.ok(q.explain.length > 5, `${q.kind} explains nothing`);
    }
  });
});
