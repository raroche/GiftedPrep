/**
 * fuzzy.js — forgive a typo without forgiving a wrong answer.
 *
 * Shared by the two games where a child types a name: the country outlines and
 * the capital cities. Both ask the same question — is this the right answer,
 * badly spelled, or a different right answer to a different question? — so both
 * ask it here.
 *
 * Tolerance was asked for as "90% similar". Measured against the real data,
 * that is the wrong rule in both directions. It is safe: no two different
 * countries have capitals 90% alike, Kingston and Kingstown being closest at
 * 88.9%. But it is nearly useless, because 90% of a word only buys a whole
 * letter once the word is ten letters long, and most names are shorter. A flat
 * 90% forgives nothing at all on Lima, Oslo, Bern, Roma, Chad or Peru.
 *
 * So tolerance is counted in typos and scaled to length. And the threshold
 * matters far less than the safety rule beside it: some real answers are one
 * typo from a different real answer — Kingston and Kingstown, Viena and Vilna,
 * Praga and Praia, Iran and Iraq, Niger and Nigeria — so a near miss is refused
 * whenever the typing is at least as close to something else. Being generous
 * must never mean marking a child right for naming a different country.
 */

/**
 * Edit distance, counting a swap of two neighbouring letters as ONE mistake.
 *
 * Plain Levenshtein charges a transposition two edits, because it substitutes
 * twice. That is wrong for typing: swapping two letters is the commonest slip
 * there is, and it left "Madird" rejected while "Madrd" and "Madriid" were both
 * accepted. This is the Damerau variant. Abandoned early once the whole row is
 * past `cap`, which keeps the all-pairs scan cheap.
 */
export function editDistance(a, b, cap = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const rows = [Array.from({ length: b.length + 1 }, (_, i) => i)];
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let best = i;
    const prev = rows[i - 1];
    const prev2 = rows[i - 2];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > cap) return cap + 1;
    rows.push(cur);
  }
  return rows[a.length][b.length];
}

/**
 * How many typos to forgive in a word of `n` letters.
 *
 * Four letters or fewer gets nothing. On Lima or Oslo one wrong letter is a
 * quarter of the word, and at that length real answers sit a single edit apart:
 * Iran and Iraq, Mali and Bali, Lome and Rome, Chad and Chad's neighbours.
 */
export function allowedEdits(n) {
  if (n <= 4) return 0;
  if (n <= 9) return 1;
  return 2;
}

/** Similarity as a fraction. For reporting to a human, not for deciding. */
export const similarity = (a, b) =>
  (a === b ? 1 : 1 - editDistance(a, b) / Math.max(a.length, b.length));

/**
 * Judge a typed answer.
 *
 * @param {object}   o
 * @param {string}   o.typed      what the child wrote, raw
 * @param {function} o.normalise  the folding this data set wants — country
 *                                names drop a leading article, city names must
 *                                not, since "La Paz" is the name
 * @param {object}   o.target     the item being asked about: { id, names }
 * @param {object[]} o.all        every item, for the safety rule
 *
 * @returns {{verdict: string, shown?: string, other?: object}}
 *   'right'  spelled correctly
 *   'close'  accepted; `shown` is how it is really spelled
 *   'other'  a real answer, but to a different question; `other` is whose
 *   'wrong'  no
 */
export function judgeTyped({ typed, normalise, target, all }) {
  const got = normalise(typed);
  if (!got) return { verdict: 'wrong' };

  const namesOf = (it) => it.names || [];
  const normsOf = (it) => namesOf(it).map(normalise);

  if (normsOf(target).includes(got)) return { verdict: 'right' };

  /* A correctly spelled answer belonging to someone else is not a typo, and
     calling it "close enough" would teach the wrong thing. */
  const owner = all.find((it) => it.id !== target.id && normsOf(it).includes(got));
  if (owner) return { verdict: 'other', other: owner };

  /* Nearest spelling of the right answer. */
  let best = Infinity;
  let shown = namesOf(target)[0] || '';
  for (const n of namesOf(target)) {
    const d = editDistance(got, normalise(n), 3);
    if (d < best) { best = d; shown = n; }
  }
  if (best > allowedEdits(Math.max(got.length, normalise(shown).length))) {
    return { verdict: 'wrong' };
  }

  /* The safety rule. If the same typing is at least as close to some other
     answer, what was meant is not clear, so it is not accepted. */
  for (const it of all) {
    if (it.id === target.id) continue;
    for (const n of normsOf(it)) {
      if (editDistance(got, normalise(n), best) <= best) return { verdict: 'wrong' };
    }
  }
  return { verdict: 'close', shown };
}

export default { editDistance, allowedEdits, similarity, judgeTyped };
