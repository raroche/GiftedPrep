/**
 * quiz.js — The practice session engine.
 *
 * Pure logic, no DOM. Given a pool of questions it decides the order, tracks
 * what was answered, and reports results. Keeping it DOM-free means the whole
 * thing is testable from Node and the UI layer stays thin.
 *
 * Two deliberate choices worth knowing about:
 *
 * 1. Answer choices are shuffled per question. Real test booklets have a fixed
 *    order, but a child practising the same item twice should not be able to
 *    remember "it was the third one". The correct answer is tracked by id, so
 *    shuffling is safe. A question may opt out with `"lockChoiceOrder": true`
 *    when the order itself carries meaning.
 *
 * 2. Questions the child has never seen are offered before repeats, and the
 *    session ramps difficulty gently rather than sorting hardest-last. A run of
 *    hard items early is the fastest way to make a nervous child give up.
 */

/**
 * Deterministic shuffle when a seed is supplied, otherwise Math.random.
 * A seed makes tests reproducible and lets a parent replay the same set.
 */
function makeRandom(seed) {
  if (seed == null) return Math.random;
  let s = seed >>> 0 || 1;
  return function random() {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

export function shuffle(list, random = Math.random) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Order a pool for a session.
 * - unseen questions first, then seen ones
 * - inside each group, shuffle, then sort into gentle difficulty bands
 */
export function orderPool(pool, { seenIds = new Set(), random = Math.random, limit = 12 } = {}) {
  const unseen = pool.filter((q) => !seenIds.has(q.id));
  const seen = pool.filter((q) => seenIds.has(q.id));
  const ordered = shuffle(unseen, random).concat(shuffle(seen, random));
  const picked = ordered.slice(0, limit);
  // Stable sort by difficulty so the session warms up instead of starting hard.
  return picked
    .map((q, i) => ({ q, i }))
    .sort((a, b) => (a.q.difficulty || 3) - (b.q.difficulty || 3) || a.i - b.i)
    .map((x) => x.q);
}

/**
 * Rewrite "Choice b" in authored text to the letter that choice was actually
 * shown as, after shuffling. Leaves the text alone if the id is unknown.
 */
export function relabel(text, letterOf) {
  if (!text || !letterOf) return text;
  return text.replace(/\b([Cc])hoice ([a-f])\b/g,
    (whole, c, id) => (letterOf[id] ? `${c}hoice ${letterOf[id]}` : whole));
}

export class QuizSession {
  /**
   * @param {object[]} pool questions from data.selectQuestions
   * @param {object}  opts
   * @param {number}  [opts.limit=12]     how many questions this run
   * @param {Set}     [opts.seenIds]      ids already answered in past runs
   * @param {number}  [opts.seed]         fixed seed for a repeatable run
   * @param {string}  [opts.mode]         'category' | 'mixed' — labelling only
   */
  constructor(pool, opts = {}) {
    this.random = makeRandom(opts.seed);
    this.mode = opts.mode || 'mixed';
    this.limit = opts.limit || 12;
    this.questions = orderPool(pool, {
      seenIds: opts.seenIds || new Set(),
      random: this.random,
      limit: this.limit
    }).map((q) => this._prepare(q));
    this.index = 0;
    this.answers = [];          // { questionId, categoryId, choiceId, correct, ms }
    this.streak = 0;
    this.bestStreak = 0;
    this.startedAt = Date.now();
    this.questionShownAt = Date.now();
    this.finished = this.questions.length === 0;
  }

  /**
   * Attach a shuffled choice order without mutating the source question.
   *
   * Explanations are authored against the ids in the file ("Choice b is the
   * trap"), but the child sees letters assigned by position AFTER the shuffle.
   * So we also return a map from choice id to the letter it actually landed on,
   * and the UI rewrites the explanation through it. Without this the feedback
   * text points at the wrong tile on almost every question.
   */
  _prepare(q) {
    const choices = q.lockChoiceOrder
      ? (q.choices || []).slice()
      : shuffle(q.choices || [], this.random);
    const letters = 'ABCDEF';
    const letterOf = {};
    choices.forEach((c, i) => { letterOf[c.id] = letters[i]; });
    return { ...q, choices, letterOf };
  }

  get total() { return this.questions.length; }

  get current() { return this.questions[this.index] || null; }

  get answeredCount() { return this.answers.length; }

  get correctCount() { return this.answers.filter((a) => a.correct).length; }

  get progress() {
    return this.total === 0 ? 0 : this.answers.length / this.total;
  }

  /** True once every question has been answered. */
  get isComplete() { return this.answers.length >= this.total; }

  /**
   * Submit an answer for the current question.
   * @returns {{correct: boolean, correctChoiceId: string, explanation: string}}
   */
  answer(choiceId) {
    const q = this.current;
    if (!q) return null;
    const correct = choiceId === q.answer;
    const ms = Date.now() - this.questionShownAt;

    this.streak = correct ? this.streak + 1 : 0;
    this.bestStreak = Math.max(this.bestStreak, this.streak);

    this.answers.push({
      questionId: q.id,
      categoryId: q.categoryId,
      categoryName: q.categoryName,
      choiceId,
      correct,
      ms
    });

    return {
      correct,
      correctChoiceId: q.answer,
      explanation: relabel(q.explanation || '', q.letterOf),
      strategy: relabel(q.strategy || '', q.letterOf),
      streak: this.streak
    };
  }

  /** Move to the next question. Returns the new current question, or null. */
  next() {
    if (this.index < this.total - 1) {
      this.index += 1;
      this.questionShownAt = Date.now();
      return this.current;
    }
    this.finished = true;
    return null;
  }

  /** Per-category tally for the results screen. */
  summary() {
    const byCategory = new Map();
    this.answers.forEach((a) => {
      const row = byCategory.get(a.categoryId)
        || { categoryId: a.categoryId, name: a.categoryName, seen: 0, correct: 0 };
      row.seen += 1;
      if (a.correct) row.correct += 1;
      byCategory.set(a.categoryId, row);
    });
    const seconds = Math.round((Date.now() - this.startedAt) / 1000);
    return {
      total: this.total,
      answered: this.answers.length,
      correct: this.correctCount,
      percent: this.total ? Math.round((this.correctCount / this.total) * 100) : 0,
      bestStreak: this.bestStreak,
      seconds,
      categories: Array.from(byCategory.values()).sort((a, b) => b.seen - a.seen),
      missed: this.answers.filter((a) => !a.correct).map((a) => a.questionId)
    };
  }
}

/**
 * A short, warm line for the results screen. Deliberately praises effort and
 * finishing rather than the score — a child who got 4 of 12 should not read a
 * message that lands as a verdict on how clever they are.
 */
export function encouragement(percent, random = Math.random) {
  const bands = [
    { min: 90, lines: ['You finished strong. Great thinking!', 'Wonderful work. You stuck with every puzzle.'] },
    { min: 70, lines: ['Nice work! You are getting the hang of these.', 'Good thinking. You kept going and it showed.'] },
    { min: 40, lines: ['Good effort. Puzzles like these take practice.', 'You worked hard on those. That is what counts.'] },
    { min: 0,  lines: ['These were tricky ones. Trying is the important part.', 'You finished the whole set. That takes real effort.'] }
  ];
  const band = bands.find((b) => percent >= b.min) || bands[bands.length - 1];
  return band.lines[Math.floor(random() * band.lines.length)];
}

export default { QuizSession, shuffle, orderPool, encouragement };
