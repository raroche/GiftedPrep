/**
 * Storage migration.
 *
 * A version bump used to replace everything with defaults, so a child lost
 * their grade, their theme and every recorded answer the moment the shape of
 * the saved object changed. These check that a v1 record survives.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/* storage.js reads localStorage as it loads, so give it one. */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
globalThis.window = { localStorage: globalThis.localStorage };

const { _migrate } = await import('../../assets/js/modules/storage.js');

describe('storage migration', () => {
  const old = {
    version: 1,
    settings: { grade: 3, theme: 'dark', readAloud: false, questionCount: 20 },
    stats: { 'cogat-number-series': { seen: 9, correct: 7 } },
    seenQuestionIds: ['cogat-ns-g1-1', 'cogat-ns-g1-2'],
    totals: { answered: 40, correct: 31, sessions: 5 }
  };

  test('keeps the settings a child chose', () => {
    const next = _migrate(old);
    assert.equal(next.settings.grade, 3);
    assert.equal(next.settings.theme, 'dark');
    assert.equal(next.settings.readAloud, false);
    assert.equal(next.settings.questionCount, 20);
  });

  test('keeps progress and totals', () => {
    const next = _migrate(old);
    assert.deepEqual(next.stats, old.stats);
    assert.deepEqual(next.seenQuestionIds, old.seenQuestionIds);
    assert.equal(next.totals.answered, 40);
    assert.equal(next.totals.correct, 31);
    assert.equal(next.totals.sessions, 5);
  });

  test('stamps whatever the current version is, not the old one', () => {
    /* Migrating an ancient record must not leave the old version behind, or it
       would be migrated again on every single load. */
    const ancient = _migrate({ ...old, version: 0 });
    assert.notEqual(ancient.version, 0);
    /* And migrating twice is stable. */
    assert.equal(_migrate(ancient).version, ancient.version);
  });

  test('a setting that no longer exists is dropped, not carried through', () => {
    const next = _migrate({ ...old, settings: { ...old.settings, ancientOption: 'x' } });
    assert.equal(next.settings.ancientOption, undefined);
  });

  test('junk in the saved record cannot produce a half-valid state', () => {
    const next = _migrate({ version: 1, settings: 'not an object', totals: 42, stats: null });
    assert.equal(typeof next.settings, 'object');
    assert.equal(typeof next.totals.answered, 'number');
    assert.equal(typeof next.stats, 'object');
  });

  test('nothing at all still gives a usable default', () => {
    const next = _migrate(undefined);
    assert.ok(next.settings.grade >= 1);
    assert.equal(next.totals.answered, 0);
  });
});
