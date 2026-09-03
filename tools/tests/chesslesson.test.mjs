/**
 * The lesson runner.
 *
 * These are the rules that decide how a child is treated when they get
 * something wrong, and every one of them fails quietly: a lesson that scores
 * unfairly, or one that never offers help, still works perfectly. It is just
 * discouraging, and nobody finds out why.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as L from '../../assets/js/modules/chesslesson.js';

const lesson = (...steps) => ({ id: 'l1-test', name: 'Test', steps });
const DONE = { t: 'done', text: 'Well done.' };

describe('checking a lesson before a child sees it', () => {
  test('an unwritten lesson is allowed, not an error', () => {
    assert.deepEqual(L.checkLesson({ steps: [] }), []);
  });

  test('a lesson must end with its done card, and have only one', () => {
    const noEnd = L.checkLesson(lesson({ t: 'quiz', ask: 'a', choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: 'a', why: 'because' }));
    assert.ok(noEnd.some((m) => /must be a "done" card/.test(m)));
    const twice = L.checkLesson(lesson(DONE, { t: 'say', text: 'hi' }, DONE));
    assert.ok(twice.some((m) => /more than one "done"/.test(m)));
  });

  test('a lesson that never asks the child anything is refused', () => {
    const bad = L.checkLesson(lesson({ t: 'say', text: 'Rooks go in straight lines.' }, DONE));
    assert.ok(bad.some((m) => /nothing to do/.test(m)), bad.join('; '));
  });

  test('a step of an unknown kind is named', () => {
    assert.ok(L.checkStep({ t: 'dance' })[0].includes('not a kind of step'));
  });

  test('a missing field is named, with the step that needs it', () => {
    const bad = L.checkStep({ t: 'try', fen: '8/8/8/8/8/8/8/8 w - - 0 1' }, 'step 3');
    assert.ok(bad.some((m) => m.includes('step 3') && m.includes('"ask"')));
    assert.ok(bad.some((m) => m.includes('"accept"')));
  });

  test('a move that is not a move is caught', () => {
    const bad = L.checkStep({ t: 'try', fen: 'x', ask: 'go', accept: ['e2e4', 'rook to d7'] });
    assert.ok(bad.some((m) => /is not a move like/.test(m)));
    assert.equal(L.checkStep({ t: 'try', fen: 'x', ask: 'go', accept: ['e7e8q'] })
      .filter((m) => /not a move/.test(m)).length, 0, 'a promotion is a move');
  });

  test('a star hunt that cannot be finished is caught', () => {
    const impossible = L.checkStep({
      t: 'starhunt', fen: 'x', piece: 'a1', stars: ['a6', 'f6', 'f1'], par: 2
    });
    assert.ok(impossible.some((m) => /par of 2 cannot collect 3 stars/.test(m)));
  });

  test('a star on the square the piece starts on is caught', () => {
    const bad = L.checkStep({ t: 'starhunt', fen: 'x', piece: 'a1', stars: ['a1'], par: 1 });
    assert.ok(bad.some((m) => /star on the square the piece starts on/.test(m)));
  });

  test('a question whose answer is not one of the choices is caught', () => {
    const bad = L.checkStep({
      t: 'quiz', ask: 'Which?', why: 'because',
      choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: 'c'
    });
    assert.ok(bad.some((m) => /not one of the choices/.test(m)));
  });

  test('a question with one answer is not a question', () => {
    const bad = L.checkStep({
      t: 'quiz', ask: 'Which?', why: 'because', choices: [{ id: 'a', text: 'A' }], answer: 'a'
    });
    assert.ok(bad.some((m) => /at least two answers/.test(m)));
  });

  test('a sound lesson has nothing wrong with it', () => {
    const good = lesson(
      { t: 'say', text: 'The rook runs in straight lines.' },
      { t: 'try', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', ask: 'Move it to d7.', accept: ['d4d7'] },
      DONE
    );
    assert.deepEqual(L.checkLesson(good), []);
  });
});

describe('making a move', () => {
  const step = {
    t: 'try', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1',
    ask: 'Put the rook on d7.', accept: ['d4d7'], hint: 'Straight up.'
  };

  test('the right move first time is worth three stars', () => {
    const out = L.judge(step, L.start({}), { from: 'd4', to: 'd7' });
    assert.equal(out.ok, true);
    assert.equal(out.stars, 3);
    assert.match(out.say, /first try/i);
  });

  test('a wrong move costs a try and nothing else', () => {
    const run = L.start({});
    const out = L.judge(step, run, { from: 'd4', to: 'd5' });
    assert.equal(out.ok, false);
    assert.equal(out.stars, 0);
    assert.equal(out.done, false);
    const after = L.record(run, out, step);
    assert.equal(after.tries, 1);
    assert.deepEqual(after.stars, [], 'nothing is taken away for being wrong');
  });

  test('each wrong try costs one star, and it never reaches zero', () => {
    let run = L.start({});
    for (const expected of [3, 2, 1, 1, 1]) {
      const out = L.judge(step, run, { from: 'd4', to: 'd7' });
      assert.equal(out.stars, expected, `after ${run.tries} wrong tries`);
      run = { ...run, tries: run.tries + 1 };
    }
  });

  test('help arrives on its own after two wrong tries', () => {
    let run = L.start({});
    assert.equal(L.wantsHelp(run), false);
    run = L.record(run, L.judge(step, run, { from: 'd4', to: 'd5' }), step);
    assert.equal(L.wantsHelp(run), false);
    run = L.record(run, L.judge(step, run, { from: 'd4', to: 'd6' }), step);
    assert.equal(L.wantsHelp(run), true, 'a stuck child does not go looking for a hint button');
  });

  test('a promotion counts whether or not the lesson named the piece', () => {
    const promo = { t: 'try', fen: 'x', ask: 'Promote.', accept: ['b7b8'] };
    assert.equal(L.judge(promo, L.start({}), { from: 'b7', to: 'b8', promotion: 'q' }).ok, true);
    assert.equal(L.judge(promo, L.start({}), { from: 'b7', to: 'b8', promotion: 'n' }).ok, true);
  });

  test('the lesson can say its own thing when the move is wrong', () => {
    const withSay = { ...step, wrongSay: 'The rook cannot go slanted.' };
    assert.equal(L.judge(withSay, L.start({}), { from: 'd4', to: 'e5' }).say,
      'The rook cannot go slanted.');
  });
});

describe('tapping squares', () => {
  const step = {
    t: 'tap', fen: 'x', ask: 'Tap every square the knight can reach.',
    answer: ['c6', 'e6', 'b5'], why: 'It always lands on the other colour.'
  };

  test('all of them and nothing else is right', () => {
    const out = L.judge(step, L.start({}), { squares: ['e6', 'b5', 'c6'] });
    assert.equal(out.ok, true, 'order must not matter');
    assert.equal(out.stars, 3);
    assert.equal(out.say, step.why);
  });

  test('missing one says there are more to find', () => {
    const out = L.judge(step, L.start({}), { squares: ['c6', 'e6'] });
    assert.equal(out.ok, false);
    assert.match(out.say, /more to find/);
  });

  test('one too many says so, rather than "wrong"', () => {
    const out = L.judge(step, L.start({}), { squares: ['c6', 'e6', 'b5', 'h8'] });
    assert.equal(out.ok, false);
    assert.match(out.say, /not right/);
  });

  test('tapping a square twice takes it back off', () => {
    const many = { t: 'tap', answer: ['c6', 'e6', 'b5'] };
    let run = L.start({});
    run = L.togglePick(run, 'c6', many);
    run = L.togglePick(run, 'e6', many);
    assert.deepEqual(run.picked, ['c6', 'e6']);
    run = L.togglePick(run, 'c6', many);
    assert.deepEqual(run.picked, ['e6']);
  });

  /* A step that wants one square used to let a child ring two of them and
     then told them "one of those is not right" for an answer they had already
     changed their mind about. */
  test('a step that wants one square moves the choice instead of adding to it', () => {
    const one = { t: 'tap', answer: ['d5'] };
    let run = L.start({});
    run = L.togglePick(run, 'a1', one);
    assert.deepEqual(run.picked, ['a1']);
    run = L.togglePick(run, 'd5', one);
    assert.deepEqual(run.picked, ['d5'], 'the first square must let go');
    run = L.togglePick(run, 'd5', one);
    assert.deepEqual(run.picked, [], 'tapping it again still clears it');
  });

  test('a many-answer step wants one square too', () => {
    const any = { t: 'tap', anyOf: ['a2', 'b3', 'c6'] };
    assert.equal(L.picksWanted(any), 1);
    let run = L.start({});
    run = L.togglePick(run, 'a2', any);
    run = L.togglePick(run, 'c6', any);
    assert.deepEqual(run.picked, ['c6']);
  });

  test('picksWanted counts what the step actually asks for', () => {
    assert.equal(L.picksWanted({ t: 'tap', answer: ['d1', 'f1'] }), 2);
    assert.equal(L.picksWanted({ t: 'tap', answer: ['d5'] }), 1);
    assert.equal(L.picksWanted(null), 0);
  });
});

describe('a question with many right answers', () => {
  /* "Tap a square the queen can NOT reach" has thirty-six right answers.
     Listing one of them told thirty-five correct children they were wrong. */
  const step = {
    t: 'tap', fen: 'k7/8/8/8/3Q4/8/8/7K w - - 0 1',
    ask: 'Tap a square the queen can NOT reach in one move.',
    anyOf: ['b3', 'c6', 'h7'],
    why: 'Off her lines.'
  };

  test('any one of them is right', () => {
    for (const sq of step.anyOf) {
      const out = L.judge(step, L.start({}), { squares: [sq] });
      assert.equal(out.ok, true, `${sq} should be accepted`);
      assert.equal(out.say, step.why);
    }
  });

  test('a square that is not on the list is not', () => {
    const out = L.judge(step, L.start({}), { squares: ['d8'] });
    assert.equal(out.ok, false);
  });

  test('two squares at once is not an answer to "tap a square"', () => {
    const out = L.judge(step, L.start({}), { squares: ['b3', 'c6'] });
    assert.equal(out.ok, false);
  });

  test('tapping nothing is not an answer either', () => {
    assert.equal(L.judge(step, L.start({}), { squares: [] }).ok, false);
  });

  test('a step may not carry both kinds of answer', () => {
    const both = { ...step, answer: ['b3'] };
    const bad = L.checkStep(both, 'x');
    assert.ok(bad.some((m) => m.includes('exactly one')), bad.join(' | '));
  });

  test('a one-square anyOf is an answer written the long way', () => {
    const thin = { ...step, anyOf: ['b3'] };
    const bad = L.checkStep(thin, 'x');
    assert.ok(bad.some((m) => m.includes('use "answer"')), bad.join(' | '));
  });
});

describe('answering a question', () => {
  const step = {
    t: 'quiz', ask: 'Which is worth more?',
    choices: [{ id: 'a', text: 'Rook' }, { id: 'b', text: 'Bishop' }],
    answer: 'a', why: 'A rook is five, a bishop is three.'
  };

  test('the right choice explains why', () => {
    const out = L.judge(step, L.start({}), { choice: 'a' });
    assert.equal(out.ok, true);
    assert.equal(out.say, step.why);
  });

  test('the wrong choice is not the end of it', () => {
    const out = L.judge(step, L.start({}), { choice: 'b' });
    assert.equal(out.ok, false);
    assert.equal(out.done, false);
  });
});

describe('the star hunt', () => {
  const step = { t: 'starhunt', fen: 'x', piece: 'a1', stars: ['a6', 'f6', 'f1'], par: 3 };

  test('par is three stars, two over is two, more is one', () => {
    assert.equal(L.judge(step, L.start({}), { moves: 3 }).stars, 3);
    assert.equal(L.judge(step, L.start({}), { moves: 4 }).stars, 2);
    assert.equal(L.judge(step, L.start({}), { moves: 5 }).stars, 2);
    assert.equal(L.judge(step, L.start({}), { moves: 6 }).stars, 1);
    assert.equal(L.judge(step, L.start({}), { moves: 40 }).stars, 1);
  });

  test('beating par is still three, not four', () => {
    assert.equal(L.judge(step, L.start({}), { moves: 1 }).stars, 3);
  });

  test('it always counts as done, however long it took', () => {
    assert.equal(L.judge(step, L.start({}), { moves: 99 }).ok, true);
    assert.match(L.judge(step, L.start({}), { moves: 99 }).say, /every star/i);
  });
});

describe('steps that hand the child to another screen', () => {
  const playStep = { t: 'play', game: 'pawnwars', bot: 0, goal: 'Get a pawn to the end.' };
  const puzzleStep = { t: 'puzzle', theme: 'fork', count: 5 };

  /* These used to be scored, and the score was never collected: the screen
     sends the child to the play or puzzle screen and cannot see what happens
     there. A step that grades work it did not watch is a step that lies. */
  test('they earn no stars, because nothing here can see the result', () => {
    assert.equal(L.STEPS.play.scores, false);
    assert.equal(L.STEPS.puzzle.scores, false);
  });

  test('they are never wrong and always finish', () => {
    for (const step of [playStep, puzzleStep]) {
      const out = L.judge(step, L.start({}), null);
      assert.equal(out.ok, true, step.t);
      assert.equal(out.done, true, step.t);
    }
  });

  test('recording one adds nothing to the score', () => {
    const run = L.record(L.start({}), L.judge(playStep, L.start({}), null), playStep);
    assert.deepEqual(run.stars, []);
  });

  test('a play step still has to name the opponent it wants', () => {
    /* The level goes into the link, so a lesson asking for the gentlest bot
       gets it rather than whichever rung the ladder has the child on. */
    assert.deepEqual(L.checkStep(playStep), []);
    const noBot = L.checkStep({ t: 'play', game: 'pawnwars', goal: 'go' });
    assert.ok(noBot.some((m) => /"bot" must be a level/.test(m)));
  });

  test('a lesson cannot lean on one for its only interaction', () => {
    const lazy = lesson({ t: 'say', text: 'Watch this.' }, playStep, DONE);
    assert.ok(L.checkLesson(lazy).some((m) => /nothing to do/.test(m)),
      'a lesson whose only activity is somewhere else is not a lesson');
  });
});

describe('reading and watching steps', () => {
  test('they are never wrong and never score', () => {
    for (const t of ['say', 'show', 'game', 'done']) {
      const out = L.judge({ t }, L.start({}), null);
      assert.equal(out.ok, true, t);
      assert.equal(out.stars, 0, t);
      assert.equal(out.done, true, t);
    }
  });

  test('they add nothing to the score when recorded', () => {
    const run = L.record(L.start({}), L.judge({ t: 'say' }, L.start({}), null), { t: 'say' });
    assert.deepEqual(run.stars, []);
  });
});

describe('what the lesson was worth', () => {
  test('finishing always earns at least one star', () => {
    assert.equal(L.lessonStars(L.start({})), 1);
    assert.equal(L.lessonStars({ ...L.start({}), stars: [1, 1, 1] }), 1);
  });

  test('it is the average, so a long lesson is not worth more', () => {
    assert.equal(L.lessonStars({ ...L.start({}), stars: [3, 3, 3] }), 3);
    assert.equal(L.lessonStars({ ...L.start({}), stars: [3, 3] }), 3);
    assert.equal(L.lessonStars({ ...L.start({}), stars: [3, 1] }), 2);
    assert.equal(L.lessonStars({ ...L.start({}), stars: [3, 2, 1] }), 2);
  });

  test('it never goes above three', () => {
    assert.equal(L.lessonStars({ ...L.start({}), stars: [3, 3, 3, 3, 3] }), 3);
  });
});

describe('walking through a lesson', () => {
  const three = lesson(
    { t: 'say', text: 'Hello.' },
    { t: 'try', fen: 'x', ask: 'Go.', accept: ['d4d7'] },
    DONE
  );

  test('it starts at the first step with a clean slate', () => {
    const run = L.start(three);
    assert.equal(run.index, 0);
    assert.equal(run.tries, 0);
    assert.equal(L.currentStep(three, run).t, 'say');
  });

  test('moving on clears the tries and the taps', () => {
    let run = L.start(three);
    run = { ...run, tries: 2, picked: ['e4'] };
    run = L.advance(run);
    assert.equal(run.index, 1);
    assert.equal(run.tries, 0);
    assert.deepEqual(run.picked, []);
  });

  test('it knows when it is on the last step', () => {
    let run = L.start(three);
    assert.equal(L.isLastStep(three, run), false);
    run = L.advance(L.advance(run));
    assert.equal(L.isLastStep(three, run), true);
  });

  test('a lesson with no steps does not blow up', () => {
    const empty = lesson();
    const run = L.start(empty);
    assert.equal(L.currentStep(empty, run), null);
    assert.equal(L.judge(null, run, {}).ok, false);
    assert.deepEqual(L.progressOf(empty, run), { at: 0, total: 0 });
  });

  test('the dots know how far along we are', () => {
    const run = L.advance(L.start(three));
    assert.deepEqual(L.progressOf(three, run), { at: 1, total: 3 });
  });
});

describe('what is said out loud', () => {
  test('praise is about what the child did, never what they are', () => {
    for (const [stars, tries] of [[3, 0], [2, 1], [1, 3]]) {
      const said = L.praise(stars, tries);
      assert.doesNotMatch(said, /\b(smart|clever|genius|brilliant)\b/i,
        `"${said}" praises the child rather than the work`);
      assert.ok(said.length > 0);
    }
  });
});
