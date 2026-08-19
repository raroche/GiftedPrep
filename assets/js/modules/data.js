/**
 * data.js — Loads the question bank.
 *
 * The bank is plain JSON split one file per category, listed in
 * data/manifest.json. Splitting it this way means a child who only wants
 * "Figure Matrices" downloads one small file instead of the whole bank, and it
 * keeps each file small enough for a human to read and edit by hand.
 *
 * Files are fetched once and cached in memory for the life of the page.
 */

const BASE = 'data/';
const cache = new Map();      // categoryId -> category object
let manifestPromise = null;

async function getJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load ${path} (HTTP ${res.status})`);
  return res.json();
}

/** Load and cache data/manifest.json. */
export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = getJSON(`${BASE}manifest.json`).catch((err) => {
      manifestPromise = null;               // let a later attempt retry
      throw err;
    });
  }
  return manifestPromise;
}

/** Load one category file, e.g. 'cogat/figure-matrices'. */
export async function loadCategory(categoryId) {
  if (cache.has(categoryId)) return cache.get(categoryId);
  const manifest = await loadManifest();
  const meta = manifest.categories.find((c) => c.id === categoryId);
  if (!meta) throw new Error(`Unknown category "${categoryId}"`);
  const data = await getJSON(BASE + meta.file);
  const merged = { ...meta, ...data };
  cache.set(categoryId, merged);
  return merged;
}

/**
 * Load several categories at once. A category that fails to load is skipped
 * with a console warning rather than taking the whole session down — one bad
 * file should never leave a child staring at a blank screen.
 */
export async function loadCategories(categoryIds) {
  const results = await Promise.allSettled(categoryIds.map(loadCategory));
  const ok = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') ok.push(r.value);
    else console.warn(`[data] skipping ${categoryIds[i]}:`, r.reason);
  });
  return ok;
}

/** Every category belonging to a test id, in manifest order. */
export async function categoriesForTest(testId) {
  const manifest = await loadManifest();
  return manifest.categories.filter((c) => !testId || c.test === testId);
}

/** Test metadata (name, publisher, blurb, batteries). */
export async function getTest(testId) {
  const manifest = await loadManifest();
  return manifest.tests.find((t) => t.id === testId) || null;
}

export async function getTests() {
  const manifest = await loadManifest();
  return manifest.tests;
}

/**
 * Pull questions matching a filter out of already-loaded categories.
 * @param {object[]} categories loaded category objects
 * @param {{grade?: number, maxDifficulty?: number}} filter
 */
export function selectQuestions(categories, filter = {}) {
  const out = [];
  categories.forEach((cat) => {
    (cat.questions || []).forEach((q) => {
      if (filter.grade && q.grade !== filter.grade) return;
      if (filter.maxDifficulty && q.difficulty > filter.maxDifficulty) return;
      out.push({
        ...q,
        categoryId: cat.id,
        categoryName: cat.name,
        testId: cat.test,
        battery: cat.battery
      });
    });
  });
  return out;
}

/** Clear the in-memory cache. Only used by the dev preview page. */
export function _clearCache() { cache.clear(); manifestPromise = null; }

export default {
  loadManifest, loadCategory, loadCategories, categoriesForTest,
  getTest, getTests, selectQuestions
};
