/**
 * chesspuzzles.js — one position, one right move, and a number that follows
 * the child.
 *
 * The puzzles are real ones from the Lichess database, which is CC0 and made
 * of positions from actual games that actual people got wrong. Their ratings
 * are earned the same way: a puzzle is hard because people found it hard, not
 * because somebody decided it was. `tools/build_puzzles.mjs` filters the six
 * million of them down to a few thousand a child can attempt.
 *
 * One detail about that data is easy to get wrong and impossible to notice:
 * the FEN stored with a puzzle is the position BEFORE the opponent's move.
 * The first move in the list is theirs, and it has to be played before the
 * child sees anything. Skip it and every puzzle is off by one — still a legal
 * position, still a solvable-looking board, and the answer never works.
 *
 * The rating is Glicko-2, the same system Lichess uses, so the numbers mean
 * the same thing on both sides of the comparison. Only the child's rating
 * moves: the puzzle's is a fixed property of the puzzle.
 *
 * Everything here is pure. The screen owns the board and the clock.
 */

/* ------------------------------------------------------------------ */
/* Themes                                                              */
/* ------------------------------------------------------------------ */

/**
 * The kinds of puzzle, in the order a child meets them.
 *
 * `opens` names the lesson that introduces the idea. A theme whose lesson has
 * not been done yet is shown but shut, with the lesson named — a locked door
 * with a sign on it teaches something; one without does not.
 */
export const THEMES = [
  { id: 'mateIn1', name: 'Checkmate in one', blurb: 'One move ends it.', opens: 'l1-mate' },
  { id: 'hangingPiece', name: 'Free pieces', blurb: 'Somebody left something out.', opens: 'l2-hanging' },
  { id: 'fork', name: 'Forks', blurb: 'One piece, two victims.', opens: 'l2-fork' },
  { id: 'pin', name: 'Pins', blurb: 'It cannot move out of the way.', opens: 'l2-pin' },
  { id: 'skewer', name: 'Skewers', blurb: 'Shove the big one and take what is behind.', opens: 'l2-skewer' },
  { id: 'discoveredAttack', name: 'Discovered attacks', blurb: 'Move one piece, another one strikes.', opens: 'l2-discovered' },
  { id: 'backRankMate', name: 'Back rank', blurb: 'Trapped behind their own pawns.', opens: 'l2-backrank' },
  { id: 'capturingDefender', name: 'Remove the guard', blurb: 'Take the piece that was protecting it.', opens: 'l2-defender' },
  { id: 'mateIn2', name: 'Checkmate in two', blurb: 'Two moves, and they cannot stop it.', opens: 'l2-game' },
  { id: 'deflection', name: 'Deflection', blurb: 'Drag a defender off its job.', opens: 'l3-deflection' },
  { id: 'attraction', name: 'Decoys', blurb: 'Lure a piece somewhere terrible.', opens: 'l3-decoy' },
  { id: 'promotion', name: 'Promotion', blurb: 'Get the pawn home.', opens: 'l1-special' },
  { id: 'endgame', name: 'Endgames', blurb: 'Few pieces, one right answer.', opens: 'l2-kingfight' }
];

export const themeById = (id) => THEMES.find((t) => t.id === id) || null;

/** How many puzzles are in one sitting. Short on purpose. */
export const SESSION = 5;

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

const cache = new Map();

/** One theme's puzzles, fetched once. */
export async function load(theme, fetcher = fetch) {
  if (cache.has(theme)) return cache.get(theme);
  const res = await fetcher(`data/chess/puzzles/${theme}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No puzzles for ${theme}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.puzzles || [];
  cache.set(theme, list);
  return list;
}

/** Forget everything loaded. Tests use it; the app never needs to. */
export const forget = () => cache.clear();

/* ------------------------------------------------------------------ */
/* Choosing what to show                                               */
/* ------------------------------------------------------------------ */

/**
 * `count` puzzles a child has not seen, as near their own rating as possible.
 *
 * Near, not below. A set that is always slightly easy teaches a child that the
 * number on the screen is a lie.
 *
 * Every unseen puzzle is used before any repeat. That sounds obvious and the
 * first version did not do it: with three unseen left and five wanted it gave
 * up on freshness entirely and served five a child had already done. Repeats
 * now only ever fill the slots that are left over.
 */
export function pick(list, progress, count = SESSION, within = 150) {
  if (!Array.isArray(list) || !list.length) return [];
  const seen = new Set((progress && progress.puzzles && progress.puzzles.seen) || []);
  const target = (progress && progress.puzzles && progress.puzzles.r) || 800;

  const fresh = list.filter((p) => !seen.has(p.id));
  const chosen = takeNear(fresh, target, count, within);
  if (chosen.length >= count) return chosen;

  /* Not enough new ones. Top up from the rest rather than ending the theme --
     a child who has worked through every fork puzzle should still be able to
     do fork puzzles. */
  const taken = new Set(chosen.map((p) => p.id));
  const rest = list.filter((p) => !taken.has(p.id));
  return chosen.concat(takeNear(rest, target, count - chosen.length, within));
}

/** The `count` puzzles closest to `target`, preferring a spread inside `within`. */
function takeNear(list, target, count, within) {
  if (count <= 0 || !list.length) return [];
  const byCloseness = [...list].sort((a, b) =>
    Math.abs(a.r - target) - Math.abs(b.r - target));

  const inRange = byCloseness.filter((p) => Math.abs(p.r - target) <= within);

  /* Nothing suitable: take the nearest there is, in order. Shuffling here
     would hand a child who is far outside the range a puzzle that is not even
     the closest available, for no gain. */
  if (inRange.length < count) return byCloseness.slice(0, count);

  /* Plenty in range, so shuffle a wider slice of them: the same five must not
     come up in the same order every time. */
  return shuffle(inRange.slice(0, Math.max(count * 3, count))).slice(0, count);
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Playing one                                                         */
/* ------------------------------------------------------------------ */

/**
 * What a puzzle looks like once it is ready to be shown.
 *
 * `setupMove` is the opponent's move that has to be played first. `solution`
 * is what is left: the child's moves at the even positions and the
 * opponent's replies at the odd ones.
 */
export function prepare(puzzle) {
  if (!puzzle || !Array.isArray(puzzle.moves) || puzzle.moves.length < 2) return null;
  const [setupMove, ...solution] = puzzle.moves;
  return {
    id: puzzle.id,
    fen: puzzle.fen,
    rating: puzzle.r,
    /* Carried through to the rating, which is Glicko-2 and wants how sure the
       database is about this puzzle, not just how hard it says it is. */
    rd: puzzle.rd,
    setupMove,
    solution
  };
}

/**
 * Is this the move the puzzle recorded, at this point in the solution?
 *
 * The promotion piece has to match exactly. It once did not, on the reasoning
 * that "the tactic is the same either way", which is simply untrue: a queen
 * and a knight are different pieces and lead to different positions. In eight
 * of the shipped puzzles, accepting the wrong one makes the opponent's next
 * recorded reply illegal — so the board and the solution quietly part company
 * and the screen carries on as though the child had solved it.
 *
 * A child who underpromotes and delivers checkmate is still right, of course.
 * That is not this function's business: see `isMate` in the screen, which ends
 * any puzzle the moment the opponent's king is mated, whatever the record says.
 */
export function isRight(prepared, at, uci) {
  if (!prepared || !uci) return false;
  const want = prepared.solution[at];
  if (!want) return false;
  return want === uci;
}

/** The opponent's reply after a correct move, or null if the puzzle is done. */
export const replyAfter = (prepared, at) => prepared.solution[at + 1] || null;

/** Has the child played every move of the solution? */
export const isFinished = (prepared, at) => at >= prepared.solution.length;

/* ------------------------------------------------------------------ */
/* Which themes are open                                               */
/* ------------------------------------------------------------------ */

/**
 * May this theme be started, and if not, which lesson opens it?
 *
 * One function, used by the card that draws the lock AND by the route that
 * opens a theme. The gate lived only in the card renderer at first, so typing
 * the address of a locked theme walked straight past it — and a child dropped
 * into skewer puzzles before the skewer lesson does not learn about skewers,
 * they learn that puzzles are impossible.
 */
export function themeGate(theme, progress) {
  const spec = typeof theme === 'string' ? themeById(theme) : theme;
  if (!spec) return { open: false, opens: null };
  if (!spec.opens) return { open: true, opens: null };
  const stars = (progress && progress.stars && progress.stars[spec.opens]) || 0;
  /* Or the lesson has sent them here. A lesson that teaches forks ends with
     fork puzzles, and gating those behind that same lesson would lock a child
     out of the very thing they were just told to go and do. */
  const met = Boolean(progress && progress.metThemes
    && progress.metThemes.includes(spec.id));
  return { open: stars > 0 || met, opens: spec.opens };
}

/* ------------------------------------------------------------------ */
/* The rating                                                          */
/* ------------------------------------------------------------------ */

/* Glicko-2, from Mark Glickman's own description of the system. The constants
   are his: ratings live on a scale where one "step" is 173.7178 points, and
   1500 is the middle of it. Children start at 800 with a wide deviation,
   because we know nothing about them yet and the number should move fast. */
const SCALE = 173.7178;
const CENTRE = 1500;
/** How much the volatility itself is allowed to wander. Glickman suggests
    0.3 to 1.2; smaller is steadier, which suits a rating a child watches. */
export const TAU = 0.5;
/** A floor, so the number keeps moving even for a child who has done hundreds. */
export const MIN_RD = 45;
export const MAX_RD = 350;

const toGlicko = (r, rd) => ({ mu: (r - CENTRE) / SCALE, phi: rd / SCALE });
const fromGlicko = (mu, phi) => ({ r: mu * SCALE + CENTRE, rd: phi * SCALE });

const g = (phi) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const expected = (mu, muJ, phiJ) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

/**
 * One rating period's worth of results.
 *
 * `results` is a list of { r, rd, score } — the opponent's rating and
 * deviation, and 1 for a win or 0 for a loss. In this app each puzzle is one
 * opponent and each sitting is one period, which is how Lichess does it too.
 *
 * A period with nothing in it still widens the deviation: a child who has not
 * played for a while is less well known than one who has.
 */
export function rate(player, results) {
  const { mu, phi } = toGlicko(player.r, player.rd);
  const sigma = player.vol || 0.06;

  if (!results || !results.length) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    const back = fromGlicko(mu, phiStar);
    return { r: back.r, rd: Math.min(MAX_RD, back.rd), vol: sigma };
  }

  const opponents = results.map((res) => {
    const o = toGlicko(res.r, res.rd === undefined ? 60 : res.rd);
    return { ...o, score: res.score, gPhi: g(o.phi), e: expected(mu, o.mu, o.phi) };
  });

  const vInv = opponents.reduce((sum, o) => sum + o.gPhi * o.gPhi * o.e * (1 - o.e), 0);
  const v = 1 / vInv;
  const sum = opponents.reduce((acc, o) => acc + o.gPhi * (o.score - o.e), 0);
  const delta = v * sum;

  /* The new volatility, by Glickman's own iteration. It is the fiddliest part
     of the system and the part nobody can check by eye, which is exactly why
     the test reproduces his worked example to two decimal places. */
  const a = Math.log(sigma * sigma);
  const f = (x) => {
    const ex = Math.exp(x);
    const d2 = delta * delta;
    const sub = phi * phi + v + ex;
    return (ex * (d2 - sub)) / (2 * sub * sub) - (x - a) / (TAU * TAU);
  };

  let A = a;
  let B;
  const d2 = delta * delta;
  if (d2 > phi * phi + v) {
    B = Math.log(d2 - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0 && k < 100) k += 1;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  let guard = 0;
  while (Math.abs(B - A) > 0.000001 && guard < 200) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else { fA /= 2; }
    B = C;
    fB = fC;
    guard += 1;
  }
  const sigmaNext = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + sigmaNext * sigmaNext);
  const phiNext = 1 / Math.sqrt(1 / (phiStar * phiStar) + vInv);
  const muNext = mu + phiNext * phiNext * sum;

  const back = fromGlicko(muNext, phiNext);
  return {
    r: back.r,
    rd: Math.min(MAX_RD, Math.max(MIN_RD, back.rd)),
    vol: sigmaNext
  };
}

/**
 * Apply a sitting's results to the child's record.
 *
 * The rating is rounded to whole points before it is shown or stored: "Puzzle
 * power: 812" is a number a child can hold, and 811.6047 is not.
 */
export function afterSession(progress, solved) {
  const before = progress.puzzles || { r: 800, rd: 350, vol: 0.06, seen: [] };
  const next = rate(
    { r: before.r, rd: before.rd, vol: before.vol },
    /* Each puzzle's own deviation, shipped with it. The fallback is only for a
       puzzle file built before the builder started exporting it. */
    solved.map((s) => ({ r: s.rating, rd: s.rd === undefined ? 60 : s.rd, score: s.right ? 1 : 0 }))
  );
  /* Everything ever solved, newest last. The cap belongs to the record, not to
     this function -- see MAX_SEEN in chessprogress.js -- and normalise() is
     what applies it. */
  const seen = [...new Set([...(before.seen || []), ...solved.map((s) => s.id)])];
  return {
    ...progress,
    puzzles: {
      r: Math.round(next.r),
      rd: Math.round(next.rd),
      vol: next.vol,
      seen
    }
  };
}

/** Stars for a sitting: right first time is what counts. */
export function starsFor(firstTry, total = SESSION) {
  if (!total) return 1;
  const share = firstTry / total;
  if (share >= 0.9) return 3;
  if (share >= 0.6) return 2;
  return 1;
}

export default {
  THEMES, themeById, themeGate, SESSION, load, forget, pick, prepare, isRight,
  replyAfter, isFinished, rate, afterSession, starsFor, TAU, MIN_RD, MAX_RD
};
