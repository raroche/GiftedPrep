#!/usr/bin/env node
/**
 * Cut the Lichess puzzle database down to a few thousand a child can attempt.
 *
 * The full database is six million puzzles and about 300MB compressed. It is
 * CC0, it is not in this repository, and it never should be: what ships is the
 * handful per theme that a beginner can actually solve. This is run by hand
 * when the puzzles need refreshing, NOT as part of `npm run verify`.
 *
 *     curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
 *     zstd -dc lichess_db_puzzle.csv.zst | node tools/build_puzzles.mjs
 *
 * or, if you already have the CSV lying around:
 *
 *     node tools/build_puzzles.mjs lichess_db_puzzle.csv
 *
 * It reads a stream rather than a file on purpose. Decompressed the database
 * is over a gigabyte, and there is no reason for it to touch the disk.
 *
 * Columns, in order:
 *   PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
 *   Themes, GameUrl, OpeningTags
 *
 * The FEN is the position BEFORE the opponent's move, and the first move in
 * `Moves` is theirs. That is carried through unchanged; modules/chesspuzzles.js
 * is where it gets played.
 */

import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { THEMES } from '../assets/js/modules/chesspuzzles.js';

/* Where the repository is, worked out from this file rather than from the
   shell's current directory. Piping the database in usually means running
   from wherever the download happens to live, and a relative output path
   silently wrote a whole set of puzzle files into that folder instead --
   leaving the real ones untouched and looking, from the console output,
   exactly like a successful build. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ */
/* What counts as suitable                                             */
/* ------------------------------------------------------------------ */

/* A beginner's whole range. Below 400 the database is thin; above 1400 the
   puzzles need calculation a child at this stage has not been taught. */
const MIN_RATING = 400;
const MAX_RATING = 1400;

/* A puzzle whose own rating is still uncertain would push the child's rating
   around for no reason. */
const MAX_RD = 90;

/* Popularity runs -100 to 100 and is the players' own verdict. An unpopular
   puzzle is usually one with a second solution the database does not accept,
   which for a child is indistinguishable from being told they are wrong when
   they are right -- the worst thing this app could do. */
const MIN_POPULARITY = 80;
const MIN_PLAYS = 500;

/* Enough that a child does not meet the same puzzle twice in a term, few
   enough that a theme file stays a few tens of kilobytes. */
const PER_THEME = 250;

/* The opponent's setup move plus at most three of the child's and their
   replies. The database happily hands out sixteen-move puzzles, and a
   beginner who has found the right idea should not then have to hold it
   together for eight more moves to be told they were right. */
const MAX_PLIES = 7;

const WANTED = THEMES.map((t) => t.id);

const OUT_DIR = path.join(ROOT, 'data/chess/puzzles');

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

const source = process.argv[2];
if (source && !fs.existsSync(source)) {
  console.error(`No such file: ${source}`);
  process.exit(1);
}
if (!source && process.stdin.isTTY) {
  console.error('Nothing on stdin. Try:\n'
    + '  zstd -dc lichess_db_puzzle.csv.zst | node tools/build_puzzles.mjs');
  process.exit(1);
}

const input = source ? fs.createReadStream(source) : process.stdin;
const lines = readline.createInterface({ input, crlfDelay: Infinity });

/** Keep the best of each theme by popularity, then spread across ratings. */
const kept = new Map(WANTED.map((id) => [id, []]));
let read = 0;
let usable = 0;

const isUci = (m) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m);

for await (const line of lines) {
  read += 1;
  if (read === 1 && line.startsWith('PuzzleId')) continue;   /* header */
  if (!line) continue;

  const cols = line.split(',');
  if (cols.length < 8) continue;
  const [id, fen, moves, rating, rd, popularity, plays, themes] = cols;

  const r = Number(rating);
  if (!(r >= MIN_RATING && r <= MAX_RATING)) continue;
  if (!(Number(rd) < MAX_RD)) continue;
  if (!(Number(popularity) >= MIN_POPULARITY)) continue;
  if (!(Number(plays) >= MIN_PLAYS)) continue;

  const uci = moves.trim().split(/\s+/);
  /* One move is the opponent's setup and there must be at least one for the
     child, or there is nothing to solve. */
  if (uci.length < 2 || uci.length > MAX_PLIES || !uci.every(isUci)) continue;

  const tags = themes.trim().split(/\s+/);
  usable += 1;
  for (const theme of tags) {
    if (!kept.has(theme)) continue;
    kept.get(theme).push({ id, fen, moves: uci, r, pop: Number(popularity) });
  }
}

/* ------------------------------------------------------------------ */
/* Choosing                                                            */
/* ------------------------------------------------------------------ */

/**
 * Spread the picks evenly across the rating range rather than taking the most
 * popular.
 *
 * Popularity alone bunches everything around one difficulty, and a theme
 * where every puzzle is rated 900 cannot follow a child up. Ten bands, the
 * most popular from each, round and round until the file is full.
 */
function spread(list, want) {
  if (list.length <= want) return list;
  const bands = 10;
  const width = (MAX_RATING - MIN_RATING) / bands;
  const buckets = Array.from({ length: bands }, () => []);
  for (const p of list) {
    const at = Math.min(bands - 1, Math.floor((p.r - MIN_RATING) / width));
    buckets[at].push(p);
  }
  buckets.forEach((b) => b.sort((a, c) => c.pop - a.pop));

  const out = [];
  for (let round = 0; out.length < want; round += 1) {
    let added = 0;
    for (const bucket of buckets) {
      if (out.length >= want) break;
      if (bucket[round]) { out.push(bucket[round]); added += 1; }
    }
    if (!added) break;
  }
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const report = [];
for (const theme of WANTED) {
  const all = kept.get(theme);
  const chosen = spread(all, PER_THEME)
    .sort((a, b) => a.r - b.r)
    .map(({ id, fen, moves, r }) => ({ id, fen, moves, r }));

  const file = path.join(OUT_DIR, `${theme}.json`);
  fs.writeFileSync(file, `${JSON.stringify(chosen)}\n`);
  const size = fs.statSync(file).size;
  report.push({ theme, found: all.length, kept: chosen.length, kb: (size / 1024).toFixed(1) });
}

/* ------------------------------------------------------------------ */
/* Say what happened                                                   */
/* ------------------------------------------------------------------ */

console.log(`read ${read.toLocaleString()} rows, ${usable.toLocaleString()} suitable\n`);
const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('theme', 20)}${pad('found', 10)}${pad('kept', 8)}size`);
for (const row of report) {
  console.log(`${pad(row.theme, 20)}${pad(row.found.toLocaleString(), 10)}${pad(row.kept, 8)}${row.kb}KB`);
}
console.log(`\nwritten to ${OUT_DIR}`);
const thin = report.filter((r) => r.kept < 40);
if (thin.length) {
  console.log(`\nThin: ${thin.map((r) => `${r.theme} (${r.kept})`).join(', ')}`);
  console.log('Loosen MIN_POPULARITY or widen the rating range if that is too few.');
}
console.log('\nRemember to note the database date in docs/research/chess/CREDITS.md.');
