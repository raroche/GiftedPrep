/**
 * slots.js — stop the right answer sitting in the same place too many times.
 *
 * The shuffle behind the four games is a correct Fisher-Yates, and measuring it
 * over 40,000 questions per game puts the answer in each of the four positions
 * 24.7% to 25.3% of the time, with chi-square values of 0.07 to 3.22 against a
 * 7.81 threshold. It is not biased.
 *
 * It is still worth changing, for a reason the statistics do not cover. True
 * randomness produces runs: the answer lands first four times in a row roughly
 * once every 256 questions, which a child will meet in an ordinary sitting. And
 * a child who meets it does not think "unlikely" — they think "it is always the
 * first one" and start tapping the first one. That is a false pattern the game
 * taught them, and it costs them the question they would otherwise have
 * thought about.
 *
 * So a run is capped. After the answer has been in the same position twice, the
 * third is moved somewhere else. Every position remains close to a quarter
 * overall; what disappears is the streak long enough to look like a rule.
 */

/**
 * Move the answer out of `slot` if it has just been there `maxRun` times.
 *
 * @param {any[]}    choices  the four options, already shuffled
 * @param {function} isAnswer tells the right one from the others
 * @param {number[]} recent   the positions the answer took, most recent last
 * @param {number}   maxRun   how many times running is allowed
 * @returns {any[]} the choices, possibly with two of them swapped
 */
export function spreadAnswer(choices, isAnswer, recent = [], maxRun = 2,
  random = Math.random) {
  const at = choices.findIndex(isAnswer);
  if (at === -1 || choices.length < 2) return choices;

  const tail = recent.slice(-maxRun);
  const stuck = tail.length === maxRun && tail.every((s) => s === at);
  if (!stuck) return choices;

  /* Anywhere but here, chosen evenly among the rest. */
  const others = choices.map((_, i) => i).filter((i) => i !== at);
  const to = others[Math.floor(random() * others.length)];
  const out = choices.slice();
  [out[at], out[to]] = [out[to], out[at]];
  return out;
}

/** Remember where the answer went, keeping only what the cap needs. */
export function noteSlot(recent, slot, keep = 4) {
  recent.push(slot);
  if (recent.length > keep) recent.shift();
  return recent;
}

export default { spreadAnswer, noteSlot };
