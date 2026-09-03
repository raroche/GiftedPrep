/**
 * chesslesson.js — a lesson is a list of small steps, and this runs them.
 *
 * A step is one idea: read a line, watch a move, make a move, tap a square,
 * answer a question. The whole of a lesson's content is JSON in
 * data/chess/levelN.json, so writing a new lesson is writing data, not code.
 *
 * Everything here is pure. A step and a run go in, an outcome comes out, and
 * nothing is mutated — which means every rule about scoring and second
 * chances can be tested in node, and a screen can ask "what would happen if"
 * before it happens. It deliberately knows no chess: the screen owns the
 * board and the rules library, and hands this the answer. That keeps the
 * scoring rules readable and means a broken FEN cannot take the runner down
 * with it.
 *
 * Three decisions here come straight from the research
 * (docs/research/chess/01-pedagogy.md, 02-gamification.md):
 *
 *   A wrong answer costs nothing but a star. There is no failing a step and
 *   no way to be thrown out of a lesson. Duolingo removed its Hearts after
 *   finding beginners ran out twice as often as anyone else and that it hurt
 *   their learning; a child who is stuck gets help, not a door.
 *
 *   Help arrives on its own. After two tries the answer starts showing
 *   itself, because a five-year-old who is stuck does not go looking for a
 *   hint button — they put the iPad down.
 *
 *   Praise names what the child did, never what they are. Dweck's
 *   replications found children praised for being clever became risk-averse
 *   and gave up sooner on hard problems. So: "You found it first try", never
 *   "You are so clever".
 */

/* ------------------------------------------------------------------ */
/* The shapes a step can take                                          */
/* ------------------------------------------------------------------ */

/**
 * Every kind of step, and what each one needs.
 *
 * `scores` says whether the step earns stars; the rest are read-and-tap
 * steps that carry the teaching. `needs` is checked by tools/chesscheck.mjs,
 * so a lesson with a missing field fails the build rather than rendering a
 * blank card in front of a child.
 */
export const STEPS = {
  /* Read a line, look at the board. */
  say: { scores: false, needs: ['text'] },
  /* A position with marks on it, and optionally moves that play through. */
  show: { scores: false, needs: ['fen', 'cap'] },
  /* Make one of these moves. */
  try: { scores: true, needs: ['fen', 'ask', 'accept'] },
  /* Move one piece around collecting stars, in as few moves as you can. */
  starhunt: { scores: true, needs: ['fen', 'piece', 'stars', 'par'] },
  /* Tap the squares that answer the question. `answer` lists the squares that
     must ALL be tapped; a step with many right answers uses `anyOf` instead
     and takes any single one of them. */
  tap: { scores: true, needs: ['fen', 'ask', 'why'], oneOf: ['answer', 'anyOf'] },
  /* Pick one of a few written answers. */
  quiz: { scores: true, needs: ['ask', 'choices', 'answer', 'why'] },
  /* Replay a real game, one move at a time, with a note on the moves that
     matter. Nothing to get wrong: it is a story. */
  game: { scores: false, needs: ['moves'] },
  /* Play a mini-game or a whole game against a bot, on the play screen.
     Deliberately UNSCORED. The game deserves the whole board rather than a
     corner of a lesson, so the step hands the child over with a link -- and a
     step that sends you somewhere else cannot honestly grade you on what you
     did when you got there. A lesson that scored it would either have to be a
     smaller copy of the game screen or lie about having watched. Every lesson
     that uses one also has real scored steps of its own. */
  play: { scores: false, needs: ['game', 'goal'] },
  /* Solve some puzzles from one theme, on the puzzle screen. Unscored, for
     the same reason: the puzzle screen keeps its own score and its own
     rating, and grading it twice would mean two numbers that can disagree. */
  puzzle: { scores: false, needs: ['theme', 'count'] },
  /* The end card. */
  done: { scores: false, needs: ['text'] }
};

export const STEP_TYPES = Object.keys(STEPS);

export const MAX_STARS = 3;
/** After this many wrong tries the answer starts showing itself. */
export const HELP_AFTER = 2;

/* ------------------------------------------------------------------ */
/* Checking a lesson before a child ever sees it                       */
/* ------------------------------------------------------------------ */

const isSquare = (s) => typeof s === 'string' && /^[a-h][1-8]$/.test(s);
const isUci = (s) => typeof s === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(s);

/**
 * Everything wrong with one step, as sentences.
 *
 * Returns an empty array when the step is sound. tools/chesscheck.mjs runs
 * this over every step of every lesson, so the shape of the content is a
 * build failure rather than a surprise on screen.
 */
export function checkStep(step, at = 'step') {
  const bad = [];
  if (!step || typeof step !== 'object') return [`${at}: not an object`];
  const spec = STEPS[step.t];
  if (!spec) return [`${at}: "${step.t}" is not a kind of step (have: ${STEP_TYPES.join(', ')})`];

  const missing = (key) => {
    const v = step[key];
    return v === undefined || v === null || v === ''
      || (Array.isArray(v) && v.length === 0);
  };

  for (const key of spec.needs) {
    if (missing(key)) bad.push(`${at}: a "${step.t}" step needs "${key}"`);
  }

  /* Some steps answer to one field OR another, never both. A tap step with
     both `answer` and `anyOf` is not a harmless duplicate: one of them is
     being ignored, and which one is a detail of the judge that nobody reading
     the lesson can see. */
  if (spec.oneOf) {
    const given = spec.oneOf.filter((key) => !missing(key));
    if (given.length === 0) {
      bad.push(`${at}: a "${step.t}" step needs one of ${spec.oneOf.join(' or ')}`);
    } else if (given.length > 1) {
      bad.push(`${at}: a "${step.t}" step has both ${given.join(' and ')}; `
        + 'it must have exactly one');
    }
  }

  if (step.t === 'try') {
    for (const m of step.accept || []) {
      if (!isUci(m)) bad.push(`${at}: "${m}" is not a move like "e2e4"`);
    }
  }
  if (step.t === 'starhunt') {
    if (!isSquare(step.piece)) bad.push(`${at}: "piece" must be a square like "a1"`);
    for (const sq of step.stars || []) {
      if (!isSquare(sq)) bad.push(`${at}: "${sq}" is not a square`);
    }
    if (step.stars && step.stars.includes(step.piece)) {
      bad.push(`${at}: there is a star on the square the piece starts on`);
    }
    if (!(step.par > 0)) bad.push(`${at}: "par" must be a number of moves above zero`);
    if (step.par && step.stars && step.par < step.stars.length) {
      bad.push(`${at}: par of ${step.par} cannot collect ${step.stars.length} stars`);
    }
  }
  if (step.t === 'tap') {
    for (const sq of [...(step.answer || []), ...(step.anyOf || [])]) {
      if (!isSquare(sq)) bad.push(`${at}: "${sq}" is not a square`);
    }
    /* An `anyOf` with one square is an `answer` written the long way, and the
       two behave differently when a child taps twice. Say which you mean. */
    if (step.anyOf && step.anyOf.length < 2) {
      bad.push(`${at}: "anyOf" lists ${step.anyOf.length}; with one right `
        + 'answer use "answer" instead');
    }
  }
  if (step.t === 'quiz') {
    const ids = (step.choices || []).map((c) => c && c.id);
    if (ids.length < 2) bad.push(`${at}: a question needs at least two answers`);
    if (new Set(ids).size !== ids.length) bad.push(`${at}: two choices share an id`);
    if (!ids.includes(step.answer)) {
      bad.push(`${at}: the answer "${step.answer}" is not one of the choices`);
    }
    for (const c of step.choices || []) {
      if (!c || !c.text) bad.push(`${at}: a choice has no text`);
    }
  }
  if (step.t === 'game' && !Array.isArray(step.moves)) {
    bad.push(`${at}: "moves" must be a list of moves in chess notation`);
  }
  if (step.t === 'play' && (step.bot === undefined || step.bot < 0 || step.bot > 4)) {
    bad.push(`${at}: "bot" must be a level from 0 to 4`);
  }
  return bad;
}

/** Everything wrong with a whole lesson. Empty means it is ready. */
export function checkLesson(lesson, at = 'lesson') {
  const bad = [];
  const steps = lesson && lesson.steps;
  if (!Array.isArray(steps)) return [`${at}: "steps" must be an array`];
  if (steps.length === 0) return bad;   /* not written yet, which is allowed */

  steps.forEach((s, i) => bad.push(...checkStep(s, `${at} step ${i + 1}`)));

  /* A lesson that only reads at a child is a video with extra taps. Every one
     has to ask them to do something, which is the single strongest finding in
     the teaching research: talk less, play more. */
  if (!steps.some((s) => STEPS[s.t] && STEPS[s.t].scores)) {
    bad.push(`${at}: nothing to do — every lesson needs at least one step a child answers`);
  }
  if (steps.at(-1).t !== 'done') bad.push(`${at}: the last step must be a "done" card`);
  if (steps.filter((s) => s.t === 'done').length > 1) {
    bad.push(`${at}: more than one "done" card`);
  }
  return bad;
}

/* ------------------------------------------------------------------ */
/* Running one                                                         */
/* ------------------------------------------------------------------ */

/** A fresh run of a lesson. */
export function start(lesson) {
  return {
    lessonId: lesson ? lesson.id : null,
    index: 0,
    tries: 0,
    /** one entry per scoring step, in the order they were answered */
    stars: [],
    /** squares a `tap` step has collected so far */
    picked: [],
    startedAt: Date.now()
  };
}

export const stepAt = (lesson, i) =>
  (lesson && Array.isArray(lesson.steps) ? lesson.steps[i] : undefined) || null;

export const currentStep = (lesson, run) => stepAt(lesson, run.index);

export const isLastStep = (lesson, run) =>
  Boolean(lesson) && Array.isArray(lesson.steps) && run.index >= lesson.steps.length - 1;

/** Whether the answer should start showing itself. */
export const wantsHelp = (run) => run.tries >= HELP_AFTER;

/* Stars for a step answered after `tries` wrong goes: right first time is
   three, then two, then one. It never reaches zero, because a child who got
   there in the end got there. */
const starsForTries = (tries) => Math.max(1, MAX_STARS - tries);

/**
 * Praise that names what the child did, never what they are.
 *
 * Dweck's replications: children praised for being clever became risk-averse,
 * lost confidence when the work got harder, and around forty per cent later
 * lied about how they had done. Children praised for what they did stayed in
 * the game and said the hard problems were their favourites.
 */
export function praise(stars, tries) {
  if (tries === 0) return 'Straight there, first try.';
  if (stars >= 2) return 'You spotted it. Nice looking.';
  return 'You kept going until you found it. That is the bit that matters.';
}

/**
 * Was that right, and what does it cost?
 *
 * Pure: it neither reads nor writes the run beyond `tries`. The caller folds
 * the outcome in with record().
 *
 * `input` depends on the step:
 *   try       { from, to, promotion? }
 *   tap       { squares: [...] }
 *   quiz      { choice: 'a' }
 *   starhunt  { moves: 7 }        — called once every star is collected
 *   play      { result: 'win' | 'draw' | 'loss' }
 *   puzzle    { right: 4, total: 5 }
 */
export function judge(step, run, input) {
  const miss = (say) => ({ ok: false, say, stars: 0, done: false, help: run.tries + 1 >= HELP_AFTER });
  if (!step) return miss('');

  switch (step.t) {
    case 'try': {
      const uci = input && input.from && input.to
        ? `${input.from}${input.to}${input.promotion || ''}`
        : '';
      /* A promotion is accepted whether or not the lesson bothered to say
         which piece, because "push the pawn to the end" is the point. */
      const ok = (step.accept || []).some((m) => m === uci || m === uci.slice(0, 4));
      if (!ok) return miss(step.wrongSay || 'Not that one. Have another go.');
      const stars = starsForTries(run.tries);
      return { ok: true, say: praise(stars, run.tries), stars, done: true, help: false };
    }

    case 'tap': {
      const got = new Set((input && input.squares) || []);

      /* Some questions have many right answers. "Tap a square the queen can
         NOT reach" has thirty-six of them, and listing one turned thirty-five
         correct answers into "not quite" -- a child who understood the idea
         perfectly was told they were wrong, over and over, which is the worst
         thing this app can do. `anyOf` says: one square, and it must be in
         this list. */
      if (step.anyOf) {
        const ok = got.size === 1 && [...got].every((sq) => step.anyOf.includes(sq));
        if (!ok) {
          return miss(step.wrongSay
            || (got.size > 1 ? 'Just one square this time.'
              : 'Not that one. Have another look.'));
        }
        const stars = starsForTries(run.tries);
        return { ok: true, say: step.why, stars, done: true, help: false };
      }

      const want = new Set(step.answer || []);
      const same = want.size === got.size && [...want].every((sq) => got.has(sq));
      if (!same) {
        const extra = [...got].filter((sq) => !want.has(sq)).length;
        const short = [...want].filter((sq) => !got.has(sq)).length;
        return miss(step.wrongSay
          || (extra && !short ? 'One of those is not right. Take another look.'
            : short && !extra ? 'There are more to find.'
              : 'Not quite. Have another look.'));
      }
      const stars = starsForTries(run.tries);
      return { ok: true, say: step.why, stars, done: true, help: false };
    }

    case 'quiz': {
      const ok = input && input.choice === step.answer;
      if (!ok) return miss(step.wrongSay || 'Not that one. Try again.');
      const stars = starsForTries(run.tries);
      return { ok: true, say: step.why, stars, done: true, help: false };
    }

    case 'starhunt': {
      const moves = (input && input.moves) || 0;
      /* Par is what a good route costs. Two moves over still earns two stars,
         because wandering and then working it out is how it is learned. */
      const stars = moves <= step.par ? 3 : moves <= step.par + 2 ? 2 : 1;
      const say = stars === 3 ? 'The shortest way round. Every star in ' + moves + ' moves.'
        : stars === 2 ? 'All of them, in ' + moves + ' moves. A shorter way exists.'
          : 'You got every star. Try it again and see how few moves you need.';
      return { ok: true, say, stars, done: true, help: false };
    }

    /* Reading, watching and handing-over steps are never wrong. */
    default:
      return { ok: true, say: '', stars: 0, done: true, help: false };
  }
}

/** Fold an outcome into the run. Wrong answers only cost a try. */
export function record(run, outcome, step) {
  if (!outcome.ok) return { ...run, tries: run.tries + 1 };
  const scores = step && STEPS[step.t] && STEPS[step.t].scores;
  return {
    ...run,
    tries: run.tries,
    stars: scores ? [...run.stars, outcome.stars] : run.stars
  };
}

/** Move to the next step, with a clean slate for it. */
export function advance(run) {
  return { ...run, index: run.index + 1, tries: 0, picked: [] };
}

/** How many squares this step is asking for. */
export function picksWanted(step) {
  if (!step) return 0;
  if (step.anyOf) return 1;
  return (step.answer || []).length;
}

/**
 * Add or remove a square in a tap step.
 *
 * When the step wants exactly one square, a second tap MOVES the choice
 * rather than adding to it. Letting it pile up meant a child who changed
 * their mind sat there with two squares ringed and no way to tell which one
 * counted, and then got "one of those is not right" for an answer they had
 * already thought better of. Tapping the same square again still clears it,
 * so there is always a way back to nothing chosen.
 */
export function togglePick(run, square, step) {
  const has = run.picked.includes(square);
  if (has) return { ...run, picked: run.picked.filter((s) => s !== square) };
  const wanted = picksWanted(step);
  return { ...run, picked: wanted === 1 ? [square] : [...run.picked, square] };
}

/**
 * What the whole lesson was worth: the average of the steps that scored.
 *
 * Averaged rather than summed so a long lesson is not automatically worth
 * more than a short one, and floored at one so finishing always counts for
 * something. A lesson with nothing scored still gives one for reaching the
 * end.
 */
export function lessonStars(run) {
  if (!run.stars.length) return 1;
  const mean = run.stars.reduce((a, b) => a + b, 0) / run.stars.length;
  return Math.min(MAX_STARS, Math.max(1, Math.round(mean)));
}

/** How far through, for the row of dots. */
export function progressOf(lesson, run) {
  const total = lesson && Array.isArray(lesson.steps) ? lesson.steps.length : 0;
  return { at: Math.min(run.index, Math.max(0, total - 1)), total };
}

export default {
  STEPS, STEP_TYPES, MAX_STARS, HELP_AFTER,
  checkStep, checkLesson, start, stepAt, currentStep, isLastStep, wantsHelp,
  praise, judge, record, advance, togglePick, picksWanted, lessonStars, progressOf
};
