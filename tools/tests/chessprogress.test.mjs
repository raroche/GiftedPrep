/**
 * What the Chess Club remembers.
 *
 * The rules here decide whether a child feels they are getting somewhere, and
 * every one of them fails silently if it is wrong: a star total that drifts, a
 * badge that arrives too early, a lesson that will not open. Nothing throws;
 * the room is simply discouraging.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/* chessprogress imports storage, which reads localStorage as it loads. */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
globalThis.window = { localStorage: globalThis.localStorage };

const P = await import('../../assets/js/modules/chessprogress.js');

/* Three levels shaped like the real ones, small enough to reason about. */
const lessons = (prefix, n) =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i + 1}`, name: `Lesson ${i + 1}` }));
const LEVELS = [
  { id: 'l1', name: 'Pawn Camp', lessons: lessons('l1', 4) },
  { id: 'l2', name: 'Knight School', lessons: lessons('l2', 4) },
  { id: 'l3', name: "Queen's Guild", lessons: lessons('l3', 4) }
];

/** Give every lesson of a level one star. */
const finish = (progress, level) =>
  level.lessons.reduce((p, l) => P.setStars(p, l.id, 1), progress);

describe('stars', () => {
  test('a first result is recorded and counted', () => {
    const p = P.setStars(P.BLANK(), 'l1-1', 2);
    assert.equal(p.stars['l1-1'], 2);
    assert.equal(p.starTotal, 2);
  });

  test('a better result replaces the old one', () => {
    let p = P.setStars(P.BLANK(), 'l1-1', 1);
    p = P.setStars(p, 'l1-1', 3);
    assert.equal(p.stars['l1-1'], 3);
    assert.equal(p.starTotal, 3, 'the total must follow the best, not add to it');
  });

  test('a worse result changes nothing at all', () => {
    let p = P.setStars(P.BLANK(), 'l1-1', 3);
    p = P.setStars(p, 'l1-1', 1);
    p = P.setStars(p, 'l1-1', 0);
    assert.equal(p.stars['l1-1'], 3);
    assert.equal(p.starTotal, 3);
  });

  test('the total is the sum of the bests across lessons', () => {
    let p = P.BLANK();
    p = P.setStars(p, 'l1-1', 3);
    p = P.setStars(p, 'l1-2', 2);
    p = P.setStars(p, 'l1-1', 1);
    assert.equal(p.starTotal, 5);
  });

  test('more than three stars is not a thing', () => {
    const p = P.setStars(P.BLANK(), 'l1-1', 99);
    assert.equal(p.stars['l1-1'], 3);
    assert.equal(p.starTotal, 3);
  });

  test('the old object is not touched, so a caller can compare', () => {
    const before = P.setStars(P.BLANK(), 'l1-1', 1);
    const after = P.setStars(before, 'l1-1', 3);
    assert.equal(before.stars['l1-1'], 1);
    assert.equal(after.stars['l1-1'], 3);
  });
});

describe('freeing a piece', () => {
  test('a piece is freed once and stays freed', () => {
    let p = P.unlock(P.BLANK(), 'rook');
    p = P.unlock(p, 'rook');
    p = P.unlock(p, 'bishop');
    assert.deepEqual(p.unlocked, ['rook', 'bishop']);
  });

  test('nothing is not a piece', () => {
    assert.deepEqual(P.unlock(P.BLANK(), '').unlocked, []);
  });
});

describe('days practised', () => {
  test('a day counts once however many lessons are done', () => {
    let p = P.touchDay(P.BLANK(), '2026-09-03');
    p = P.touchDay(p, '2026-09-03');
    assert.deepEqual(p.days, ['2026-09-03']);
  });

  test('the week counts only the last seven days', () => {
    const days = ['2026-09-03', '2026-09-02', '2026-08-28', '2026-08-01'];
    assert.equal(P.weekCount(days, '2026-09-03'), 3, 'the 28th is six days back');
    assert.equal(P.weekCount(days, '2026-09-10'), 0);
  });

  test('missing yesterday costs nothing; there is no streak to break', () => {
    const patchy = ['2026-08-30', '2026-09-01', '2026-09-03'];
    assert.equal(P.weekCount(patchy, '2026-09-03'), 3);
  });

  test('the row of dots is seven long, oldest first, today last', () => {
    const dots = P.weekDots(['2026-09-01', '2026-09-03'], '2026-09-03');
    assert.equal(dots.length, 7);
    assert.equal(dots[6].today, true);
    assert.equal(dots[6].day, '2026-09-03');
    assert.equal(dots[6].done, true);
    assert.equal(dots.filter((d) => d.done).length, 2);
  });

  test('a month boundary does not confuse it', () => {
    assert.equal(P.weekCount(['2026-08-31', '2026-09-01'], '2026-09-01'), 2);
  });
});

describe('board colours', () => {
  test('wood is free and the rest are earned', () => {
    assert.deepEqual(P.themesFor(0).map((t) => t.id), ['wood']);
    assert.deepEqual(P.themesFor(10).map((t) => t.id), ['wood', 'forest']);
    assert.equal(P.themesFor(1000).length, P.THEMES.length);
  });

  test('the next one says what it costs, until there are none left', () => {
    assert.equal(P.nextTheme(0).id, 'forest');
    assert.equal(P.nextTheme(25).id, 'sunset');
    assert.equal(P.nextTheme(1000), null);
  });

  /* These go through the real path -- earn stars the way a child earns them,
     then look at the record. The tests above pass a number to a helper and
     prove nothing about whether a colour ever actually arrives, which is how
     a version shipped where a child with a hundred and twenty stars still had
     only the wooden board and always would. */
  test('earning stars really does hand over the colours', () => {
    const earn = (lessons) => {
      let p = P.BLANK();
      for (let i = 0; i < lessons; i += 1) p = P.setStars(p, `lesson-${i}`, 3);
      return P.save(p);
    };
    assert.deepEqual(earn(3).themes, ['wood'], '9 stars is not enough for Forest');
    assert.deepEqual(earn(4).themes, ['wood', 'forest'], '12 stars earns Forest');
    assert.deepEqual(earn(9).themes, ['wood', 'forest', 'ocean']);
    assert.deepEqual(earn(17).themes, ['wood', 'forest', 'ocean', 'sunset']);
    assert.deepEqual(earn(34).themes, P.THEMES.map((t) => t.id));
  });

  test('a colour survives being saved and read back', () => {
    let p = P.BLANK();
    for (let i = 0; i < 10; i += 1) p = P.setStars(p, `l${i}`, 3);
    p.theme = 'forest';
    P.save(p);
    const back = P.load();
    assert.equal(back.theme, 'forest');
    assert.ok(back.themes.includes('forest'));
  });

  test('a colour nobody has earned cannot be selected', () => {
    const p = P.normalise({ stars: {}, theme: 'night' });
    assert.equal(p.theme, 'wood', 'an unearned colour falls back rather than sticking');
  });

  test('ownership is worked out, never taken from the record', () => {
    /* A saved record claiming every colour with no stars behind it gets
       exactly one. Storing the list is what let it drift in the first place. */
    const p = P.normalise({ stars: {}, themes: ['wood', 'forest', 'ocean', 'sunset', 'night'] });
    assert.deepEqual(p.themes, ['wood']);
  });
});

describe('the badge', () => {
  test('everyone starts a Pawn', () => {
    assert.equal(P.badge(P.BLANK(), LEVELS).id, 'pawn');
  });

  test('finishing the first level makes a Knight', () => {
    const p = finish(P.BLANK(), LEVELS[0]);
    assert.equal(P.badge(p, LEVELS).id, 'knight');
  });

  test('nearly finishing the first level is still a Pawn', () => {
    let p = P.setStars(P.BLANK(), 'l1-1', 3);
    p = P.setStars(p, 'l1-2', 3);
    p = P.setStars(p, 'l1-3', 3);
    assert.equal(P.badge(p, LEVELS).id, 'pawn');
  });

  test('halfway through the second level is a Bishop, all of it a Rook', () => {
    let p = finish(P.BLANK(), LEVELS[0]);
    p = P.setStars(p, 'l2-1', 1);
    p = P.setStars(p, 'l2-2', 1);
    assert.equal(P.badge(p, LEVELS).id, 'bishop');
    p = finish(p, LEVELS[1]);
    assert.equal(P.badge(p, LEVELS).id, 'rook');
  });

  test('the last level gives Queen then King', () => {
    let p = finish(finish(P.BLANK(), LEVELS[0]), LEVELS[1]);
    p = P.setStars(p, 'l3-1', 1);
    p = P.setStars(p, 'l3-2', 1);
    assert.equal(P.badge(p, LEVELS).id, 'queen');
    p = finish(p, LEVELS[2]);
    assert.equal(P.badge(p, LEVELS).id, 'king');
  });

  test('the goal line says what is left, and stops at King', () => {
    assert.match(P.badgeGoal(P.BLANK(), LEVELS), /4 more in Pawn Camp/);
    const king = finish(finish(finish(P.BLANK(), LEVELS[0]), LEVELS[1]), LEVELS[2]);
    assert.equal(P.badgeGoal(king, LEVELS), null);
  });
});

describe('what is open', () => {
  test('the first lesson of the first level is always open', () => {
    assert.equal(P.isUnlocked('l1-1', LEVELS, P.BLANK()), true);
  });

  /* Nothing is gated. A child who already plays can go straight to the
     endgames, and a five-year-old still meets the lessons in order because
     that is the order they are listed in and where nextLesson points. */
  test('every lesson is open to a child who has done nothing', () => {
    const blank = P.BLANK();
    for (const level of LEVELS) {
      for (const lesson of level.lessons) {
        assert.equal(P.isUnlocked(lesson.id, LEVELS, blank), true,
          `${lesson.id} must be open`);
      }
    }
  });

  test('a lesson nobody has heard of is still not open', () => {
    assert.equal(P.isUnlocked('nonsense', LEVELS, P.BLANK()), false);
  });

  test('every level is open, and none of them explains itself away', () => {
    for (const [i] of LEVELS.entries()) {
      const gate = P.levelGate(LEVELS, i, P.BLANK());
      assert.equal(gate.open, true, `level ${i + 1} must be open`);
      assert.equal(gate.why, '');
    }
  });
});

describe('where to go next', () => {
  test('a new child is sent to the very first lesson', () => {
    assert.equal(P.nextLesson(LEVELS, P.BLANK()).lesson.id, 'l1-1');
  });

  test('it skips what is done and never suggests something shut', () => {
    const p = P.setStars(P.BLANK(), 'l1-1', 3);
    assert.equal(P.nextLesson(LEVELS, p).lesson.id, 'l1-2');
  });

  test('a child who has finished everything is not sent anywhere', () => {
    const all = LEVELS.reduce((p, lv) => finish(p, lv), P.BLANK());
    assert.equal(P.nextLesson(LEVELS, all), null);
  });
});

describe('reading back what was saved', () => {
  test('nothing at all gives a usable record', () => {
    for (const junk of [null, undefined, 'nope', 42, []]) {
      const p = P.normalise(junk);
      assert.equal(p.starTotal, 0);
      assert.deepEqual(p.themes, ['wood']);
      assert.equal(p.bot.level, 0);
    }
  });

  test('a total that disagrees with the stars is recomputed, not trusted', () => {
    const p = P.normalise({ stars: { a: 3, b: 2 }, starTotal: 900 });
    assert.equal(p.starTotal, 5);
  });

  test('rubbish in a field falls back instead of poisoning the record', () => {
    const p = P.normalise({
      stars: { a: 'three', b: -4, c: 2 },
      unlocked: 'rook',
      days: ['2026-09-03', 'sometime', 7],
      bot: { level: 99, recent: [1, 'x', 0] },
      puzzles: { r: 'high', seen: 'nope' },
      games: { played: 2, won: 50 }
    });
    assert.deepEqual(p.stars, { c: 2 });
    assert.deepEqual(p.unlocked, []);
    assert.deepEqual(p.days, ['2026-09-03']);
    assert.equal(p.bot.level, 4);
    assert.deepEqual(p.bot.recent, [1, 0]);
    assert.equal(p.puzzles.r, 800);
    assert.deepEqual(p.puzzles.seen, []);
    assert.equal(p.games.won, 2, 'you cannot win more games than you played');
  });

  test('a stored list of colours counts for nothing without the stars', () => {
    /* This used to assert that a saved list was honoured. It is not any more:
       ownership is worked out from the star total every time, because a stored
       copy of the same fact drifted and nobody noticed. */
    const p = P.normalise({ themes: ['night', 'made-up'], theme: 'made-up' });
    assert.deepEqual(p.themes, ['wood']);
    assert.equal(p.theme, 'wood');
  });

  test('a full record survives a round trip through storage', () => {
    let p = P.setStars(P.BLANK(), 'l1-rook', 3);
    p = P.unlock(p, 'rook');
    p = P.touchDay(p, '2026-09-03');
    p.seenIntro = true;
    const saved = P.save(p);
    const back = P.load();
    assert.equal(back.stars['l1-rook'], 3);
    assert.equal(back.starTotal, 3);
    assert.deepEqual(back.unlocked, ['rook']);
    assert.deepEqual(back.days, ['2026-09-03']);
    assert.equal(back.seenIntro, true);
    assert.deepEqual(back, saved);
  });

  test('update() loads, changes and saves in one go', () => {
    P.save(P.BLANK());
    P.update((p) => P.setStars(p, 'l1-king', 2));
    assert.equal(P.load().stars['l1-king'], 2);
  });
});

describe('nothing already earned is taken back', () => {
  /* This used to be about padlocks reappearing on finished lessons. Nothing
     is locked any more, so the promise is simpler and stronger: whatever a
     child has done stays done and stays reachable, and the stars behind it
     never fall. */
  test('a lesson done out of order keeps its stars and stays open', () => {
    const p = P.setStars(P.BLANK(), 'l3-2', 3);
    assert.equal(P.isUnlocked('l3-2', LEVELS, p), true);
    assert.equal(p.stars['l3-2'], 3);
    const worse = P.setStars(p, 'l3-2', 1);
    assert.equal(worse.stars['l3-2'], 3, 'a worse replay must not lower it');
  });
});
