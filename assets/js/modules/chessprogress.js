/**
 * chessprogress.js — what the Chess Club remembers about a child.
 *
 * Stars, the badge they have reached, which pieces they have freed, which days
 * they practised, where they are on the bot ladder and how strong their puzzle
 * solving is. It all lives in one object under `settings.chess`, in the same
 * localStorage record the rest of the site uses. There is no account and
 * nothing leaves the device.
 *
 * Two rules from the research decide the shape of this file
 * (docs/research/chess/02-gamification.md):
 *
 *   Stars only ever go up. ChessKid's are "never lost or deducted", and the
 *   reason is not kindness — a score that can fall turns practice into
 *   something with a downside, and a child who has had one bad day stops
 *   opening it. setStars() takes the better of the two numbers, always.
 *
 *   Days practised, not a streak. Duolingo's own figures say streaks work, and
 *   they work through loss aversion: you keep going so as not to lose
 *   something. A five-year-old does not control when the iPad comes out, so a
 *   broken streak punishes a child for a decision their parent made. This
 *   counts the days in the last week and never mentions the ones missed.
 *
 * Everything here is pure: a progress object goes in and a new one comes out.
 * Nothing mutates its argument, so a caller can work out what a change would
 * do before saving it, and every rule can be tested without a browser.
 */

import * as storage from './storage.js';

/* ------------------------------------------------------------------ */
/* The record                                                          */
/* ------------------------------------------------------------------ */

/** Board themes, and the star total that opens each. Cosmetic, earned only. */
export const THEMES = [
  { id: 'wood', name: 'Wood', stars: 0 },
  { id: 'forest', name: 'Forest', stars: 10 },
  { id: 'ocean', name: 'Ocean', stars: 25 },
  { id: 'sunset', name: 'Sunset', stars: 50 },
  { id: 'night', name: 'Night', stars: 100 }
];

/** The six ranks a child climbs, in order. Every one is a chess piece. */
export const BADGES = [
  { id: 'pawn', name: 'Pawn', code: 'wP' },
  { id: 'knight', name: 'Knight', code: 'wN' },
  { id: 'bishop', name: 'Bishop', code: 'wB' },
  { id: 'rook', name: 'Rook', code: 'wR' },
  { id: 'queen', name: 'Queen', code: 'wQ' },
  { id: 'king', name: 'King', code: 'wK' }
];

export const MAX_STARS = 3;

/**
 * How many solved puzzles are remembered.
 *
 * It has to exceed the whole shipped library or a child starts meeting old
 * puzzles again long before they have run out of new ones — which was the
 * case at 500 against a library of over three thousand. Each id is five
 * characters, so even a full list is about twenty kilobytes of the five
 * megabytes localStorage allows. tools/chesscheck.mjs fails the build if the
 * library ever outgrows this.
 */
export const MAX_SEEN = 4000;

const blank = () => ({
  v: 1,
  /** lessonId -> best stars, 0 to 3 */
  stars: {},
  /** the sum of the bests, kept alongside so the hub need not add it up */
  starTotal: 0,
  /** pieces whose lesson is done, so their cage on the level page opens */
  unlocked: [],
  themes: ['wood'],
  theme: 'wood',
  /** ISO dates, oldest first, bounded */
  days: [],
  bot: { level: 0, recent: [] },
  puzzles: { r: 800, rd: 350, vol: 0.06, seen: [] },
  games: { played: 0, won: 0 },
  seenIntro: false
});

export const BLANK = blank;

const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const list = (v) => (Array.isArray(v) ? v : []);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** An ISO date with no time, which is what a "day practised" is. */
export const isoDay = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Any shape in, a valid progress object out.
 *
 * Saved data outlives the code that wrote it. A field that was a number last
 * month may be a string today, and a half-valid object is worse than none: it
 * throws somewhere far from here, on a screen a child is looking at. Every
 * field is rebuilt from scratch and anything unrecognisable falls back.
 */
export function normalise(raw) {
  const out = blank();
  if (!raw || typeof raw !== 'object') return out;

  if (raw.stars && typeof raw.stars === 'object') {
    for (const [id, n] of Object.entries(raw.stars)) {
      const stars = clamp(Math.round(num(n)), 0, MAX_STARS);
      if (stars > 0) out.stars[id] = stars;
    }
  }
  /* Recomputed rather than trusted: the total and the parts must agree, and
     the only way to be sure is to add them up. */
  out.starTotal = Object.values(out.stars).reduce((a, b) => a + b, 0);

  out.unlocked = [...new Set(list(raw.unlocked).filter((x) => typeof x === 'string'))];
  out.themes = [...new Set(['wood', ...list(raw.themes).filter((x) => THEMES.some((t) => t.id === x))])];
  out.theme = out.themes.includes(raw.theme) ? raw.theme : 'wood';

  out.days = [...new Set(list(raw.days).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))]
    .sort()
    .slice(-400);

  if (raw.bot && typeof raw.bot === 'object') {
    out.bot.level = clamp(Math.round(num(raw.bot.level)), 0, 4);
    out.bot.recent = list(raw.bot.recent).filter((x) => x === 0 || x === 1).slice(-10);
  }
  if (raw.puzzles && typeof raw.puzzles === 'object') {
    out.puzzles.r = clamp(num(raw.puzzles.r, 800), 100, 3000);
    out.puzzles.rd = clamp(num(raw.puzzles.rd, 350), 30, 350);
    out.puzzles.vol = clamp(num(raw.puzzles.vol, 0.06), 0.01, 0.2);
    out.puzzles.seen = list(raw.puzzles.seen)
      .filter((x) => typeof x === 'string').slice(-MAX_SEEN);
  }
  if (raw.games && typeof raw.games === 'object') {
    out.games.played = Math.max(0, Math.round(num(raw.games.played)));
    out.games.won = clamp(Math.round(num(raw.games.won)), 0, out.games.played);
  }
  out.seenIntro = raw.seenIntro === true;
  return out;
}

/* ------------------------------------------------------------------ */
/* Reading and writing                                                 */
/* ------------------------------------------------------------------ */

export function load() {
  return normalise(storage.getSettings().chess);
}

export function save(progress) {
  const clean = normalise(progress);
  storage.setSetting('chess', clean);
  return clean;
}

/** Load, apply one change, save. What every screen actually calls. */
export function update(fn) {
  return save(fn(load()));
}

/* ------------------------------------------------------------------ */
/* Changing it                                                         */
/* ------------------------------------------------------------------ */

/**
 * Record a lesson result.
 *
 * The better of the old and new score wins, so replaying a lesson to enjoy it
 * again can never cost a child anything. That is the whole rule.
 */
export function setStars(progress, lessonId, stars) {
  const next = { ...progress, stars: { ...progress.stars } };
  const had = next.stars[lessonId] || 0;
  const got = clamp(Math.round(num(stars)), 0, MAX_STARS);
  if (got <= had) return next;
  next.stars[lessonId] = got;
  next.starTotal = progress.starTotal + (got - had);
  return next;
}

/** Free a piece from its cage on the level page. */
export function unlock(progress, piece) {
  if (!piece || progress.unlocked.includes(piece)) return progress;
  return { ...progress, unlocked: [...progress.unlocked, piece] };
}

/** Mark today as practised. Twice in one day is once. */
export function touchDay(progress, today = isoDay()) {
  if (progress.days.includes(today)) return progress;
  return { ...progress, days: [...progress.days, today].sort().slice(-400) };
}

/** How many of the last seven days were practised, today included. */
export function weekCount(days, today = isoDay()) {
  const week = new Set();
  const end = new Date(`${today}T00:00:00`);
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    week.add(isoDay(d));
  }
  return list(days).filter((d) => week.has(d)).length;
}

/** The seven days as flags, oldest first, for the row of dots on the hub. */
export function weekDots(days, today = isoDay()) {
  const set = new Set(list(days));
  const end = new Date(`${today}T00:00:00`);
  const out = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    out.push({ day: isoDay(d), done: set.has(isoDay(d)), today: i === 0 });
  }
  return out;
}

/** Board themes earned so far, and the next one with what it costs. */
export function themesFor(starTotal) {
  return THEMES.filter((t) => starTotal >= t.stars);
}

export function nextTheme(starTotal) {
  return THEMES.find((t) => starTotal < t.stars) || null;
}

/* ------------------------------------------------------------------ */
/* Where a child has got to                                            */
/* ------------------------------------------------------------------ */

/** Lessons in a level with at least one star. */
export function startedIn(level, progress) {
  if (!level || !Array.isArray(level.lessons)) return 0;
  return level.lessons.filter((l) => (progress.stars[l.id] || 0) > 0).length;
}

const allDone = (level, progress) =>
  Boolean(level) && Array.isArray(level.lessons) && level.lessons.length > 0
  && startedIn(level, progress) === level.lessons.length;

const halfDone = (level, progress) =>
  Boolean(level) && Array.isArray(level.lessons) && level.lessons.length > 0
  && startedIn(level, progress) >= Math.ceil(level.lessons.length / 2);

/**
 * The badge on the hub: Pawn to King.
 *
 * It is a rank, not a score. A child says "I am a Rook now", which is a
 * sentence about themselves, where "I have 47 stars" is a sentence about a
 * number. ChessKid names its levels after pieces for the same reason.
 */
export function badge(progress, levels = []) {
  const [one, two, three] = levels;
  if (allDone(three, progress)) return BADGES[5];
  if (halfDone(three, progress)) return BADGES[4];
  if (allDone(two, progress)) return BADGES[3];
  if (halfDone(two, progress)) return BADGES[2];
  if (allDone(one, progress)) return BADGES[1];
  return BADGES[0];
}

/** What the child has to do to reach the next badge, in words. */
export function badgeGoal(progress, levels = []) {
  const now = badge(progress, levels);
  const at = BADGES.indexOf(now);
  if (at === BADGES.length - 1) return null;
  const [one, two, three] = levels;
  const left = (level) => (level ? level.lessons.length - startedIn(level, progress) : 0);
  const goals = [
    () => `Finish ${left(one)} more in ${one ? one.name : 'the first level'} to become a Knight.`,
    () => `Get halfway through ${two ? two.name : 'the next level'} to become a Bishop.`,
    () => `Finish ${left(two)} more in ${two ? two.name : 'the next level'} to become a Rook.`,
    () => `Get halfway through ${three ? three.name : 'the last level'} to become a Queen.`,
    () => `Finish ${left(three)} more in ${three ? three.name : 'the last level'} to become a King.`
  ];
  return goals[at] ? goals[at]() : null;
}

/**
 * May this lesson be opened yet?
 *
 * The first lesson of a level is always open, and after that each one needs a
 * star on the one before it. A whole level opens when the level before it is
 * finished.
 *
 * Takes ALL the levels rather than one, because the gate on a level is about
 * the level before it, and a function that cannot see it would have to be
 * told the answer by its caller — which is where that rule would then really
 * live, in whichever caller remembered.
 */
export function isUnlocked(lessonId, levels, progress) {
  /* Anything already done stays open, whatever the gates say. A lesson
     finished with three stars showed a padlock the moment a child reached it
     out of order, and taking back something already earned is the one thing
     this whole file exists to prevent. Access only goes up, like stars. */
  if ((progress.stars[lessonId] || 0) > 0) return true;

  const at = levels.findIndex((lv) => lv.lessons.some((l) => l.id === lessonId));
  if (at === -1) return false;
  const level = levels[at];
  if (at > 0 && !allDone(levels[at - 1], progress)) return false;
  const i = level.lessons.findIndex((l) => l.id === lessonId);
  if (i === 0) return true;
  return (progress.stars[level.lessons[i - 1].id] || 0) > 0;
}

/** Whether a whole level may be entered, and if not, what opens it. */
export function levelGate(levels, index, progress) {
  if (index === 0) return { open: true, why: '' };
  const before = levels[index - 1];
  if (allDone(before, progress)) return { open: true, why: '' };
  const left = before.lessons.length - startedIn(before, progress);
  return {
    open: false,
    why: `Finish ${left} more lesson${left === 1 ? '' : 's'} in ${before.name} to open this.`
  };
}

/** The lesson a child should be offered next: the first one not yet starred. */
export function nextLesson(levels, progress) {
  for (const level of levels) {
    for (const lesson of level.lessons) {
      if ((progress.stars[lesson.id] || 0) === 0 && isUnlocked(lesson.id, levels, progress)) {
        return { level, lesson };
      }
    }
  }
  return null;
}

export default {
  BADGES, THEMES, MAX_STARS, MAX_SEEN, BLANK, isoDay, normalise, load, save, update,
  setStars, unlock, touchDay, weekCount, weekDots, themesFor, nextTheme,
  startedIn, badge, badgeGoal, isUnlocked, levelGate, nextLesson
};
