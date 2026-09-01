/**
 * storage.js — Small, forgiving wrapper over localStorage.
 *
 * GiftedPrep has no account and no server. Everything a family does stays in
 * the browser on their own device. Private browsing, a full disk, or a locked
 * down school iPad can all make localStorage throw, so every call here is
 * guarded and falls back to an in-memory store for the session.
 */

const KEY = 'giftedprep.v1';
const memory = new Map();

let backing = null;
try {
  const probe = '__gp_probe__';
  window.localStorage.setItem(probe, '1');
  window.localStorage.removeItem(probe);
  backing = window.localStorage;
} catch {
  backing = null; // private mode or storage disabled — memory only
}

export const isPersistent = () => backing !== null;

function readRaw() {
  if (!backing) return memory.get(KEY) || null;
  try { return backing.getItem(KEY); } catch { return null; }
}

function writeRaw(value) {
  if (!backing) { memory.set(KEY, value); return; }
  try { backing.setItem(KEY, value); } catch { memory.set(KEY, value); }
}

const DEFAULTS = {
  version: 1,
  settings: {
    grade: 1,
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    readAloud: true,
    speechRate: 0.85,
    lastTest: null,
    lastCategory: null,
    /* How many questions a practice set holds. One of QUESTION_COUNTS. */
    questionCount: 10,
    /* Language of the Parent Guide only. The child-facing screens are English. */
    guideLang: 'en',
    /* Math Lab progress: { "1:ten-frames": 4, ... } furthest exercise reached. */
    mathDone: {}
  },
  /* stats[categoryId] = { seen, correct, streakBest, lastSeenIso } */
  stats: {},
  /* answered question ids, so a session prefers fresh questions */
  seenQuestionIds: [],
  totals: { answered: 0, correct: 0, sessions: 0 }
};

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

/**
 * Bring an older saved state forward.
 *
 * Anything recognised is kept and anything unknown is dropped, so a shape
 * change can never leave a half-valid object behind. Unknown-but-harmless
 * settings fall back to their default rather than wiping the lot.
 */
function migrate(old) {
  const next = clone(DEFAULTS);
  if (old && typeof old === 'object') {
    if (old.settings && typeof old.settings === 'object') {
      for (const key of Object.keys(DEFAULTS.settings)) {
        if (old.settings[key] !== undefined) next.settings[key] = old.settings[key];
      }
    }
    if (old.stats && typeof old.stats === 'object') next.stats = old.stats;
    if (Array.isArray(old.seenQuestionIds)) next.seenQuestionIds = old.seenQuestionIds;
    if (old.totals && typeof old.totals === 'object') {
      for (const key of Object.keys(DEFAULTS.totals)) {
        if (typeof old.totals[key] === 'number') next.totals[key] = old.totals[key];
      }
    }
  }
  next.version = DEFAULTS.version;
  return next;
}

let state = load();

function load() {
  const raw = readRaw();
  if (!raw) return clone(DEFAULTS);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed) return clone(DEFAULTS);
    /* A version bump used to throw away every bit of progress. Migrate what is
       still meaningful instead: a new field is not a reason to forget which
       grade a child is in or how many puzzles they have done. */
    if (parsed.version !== DEFAULTS.version) return migrate(parsed);
    return {
      ...clone(DEFAULTS),
      ...parsed,
      settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
      stats: parsed.stats || {},
      totals: { ...DEFAULTS.totals, ...(parsed.totals || {}) },
      seenQuestionIds: Array.isArray(parsed.seenQuestionIds) ? parsed.seenQuestionIds : []
    };
  } catch {
    return clone(DEFAULTS);
  }
}

function persist() {
  try { writeRaw(JSON.stringify(state)); } catch { /* nothing more we can do */ }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export { migrate as _migrate };

export function getSettings() { return { ...state.settings }; }

export function setSetting(key, value) {
  state.settings[key] = value;
  persist();
  return state.settings[key];
}

export function getStats(categoryId) {
  if (categoryId) {
    return state.stats[categoryId] || { seen: 0, correct: 0, streakBest: 0, lastSeenIso: null };
  }
  return clone(state.stats);
}

export function getTotals() { return { ...state.totals }; }

/**
 * Record one answered question.
 * @param {string} categoryId
 * @param {boolean} wasCorrect
 * @param {string} questionId
 * @param {number} currentStreak
 */
export function recordAnswer(categoryId, wasCorrect, questionId, currentStreak = 0) {
  const s = state.stats[categoryId] || { seen: 0, correct: 0, streakBest: 0, lastSeenIso: null };
  s.seen += 1;
  if (wasCorrect) s.correct += 1;
  s.streakBest = Math.max(s.streakBest, currentStreak);
  s.lastSeenIso = new Date().toISOString();
  state.stats[categoryId] = s;

  state.totals.answered += 1;
  if (wasCorrect) state.totals.correct += 1;

  if (questionId && !state.seenQuestionIds.includes(questionId)) {
    state.seenQuestionIds.push(questionId);
    // Keep the list bounded; oldest entries drop out first.
    if (state.seenQuestionIds.length > 4000) {
      state.seenQuestionIds = state.seenQuestionIds.slice(-3000);
    }
  }
  persist();
}

export function markSessionStarted() {
  state.totals.sessions += 1;
  persist();
}

export function getSeenQuestionIds() { return new Set(state.seenQuestionIds); }

/** Wipe everything. Used by the "start fresh" button in the parent area. */
export function resetAll() {
  state = clone(DEFAULTS);
  persist();
  return getSettings();
}

/** Clear only the practice history, keeping settings such as grade and theme. */
export function resetProgress() {
  state.stats = {};
  state.seenQuestionIds = [];
  state.totals = { ...DEFAULTS.totals };
  persist();
}

export default {
  isPersistent, getSettings, setSetting, getStats, getTotals,
  recordAnswer, markSessionStarted, getSeenQuestionIds, resetAll, resetProgress
};
