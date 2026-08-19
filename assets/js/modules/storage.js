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
    lastCategory: null
  },
  /* stats[categoryId] = { seen, correct, streakBest, lastSeenIso } */
  stats: {},
  /* answered question ids, so a session prefers fresh questions */
  seenQuestionIds: [],
  totals: { answered: 0, correct: 0, sessions: 0 }
};

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

let state = load();

function load() {
  const raw = readRaw();
  if (!raw) return clone(DEFAULTS);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== DEFAULTS.version) return clone(DEFAULTS);
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
