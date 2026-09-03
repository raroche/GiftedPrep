#!/usr/bin/env node
/**
 * Keep every copy of the Content-Security-Policy saying the same thing.
 *
 * The policy is what makes a whole class of bug impossible, and it is also the
 * reason for the app's oddest rule: `style="..."` attributes are silently
 * deleted under `style-src 'self'`, so nothing may set one. That rule is only
 * enforced by the browser, and only when the browser is actually sent the
 * policy.
 *
 * It is written down in two places -- netlify.toml for the deployed site and
 * tools/serve.py for local work -- because nothing generates one from the
 * other. That is fine until they drift, and the drift is invisible: the local
 * server keeps working, production keeps working, and the only symptom is that
 * a bug the policy would have caught locally now waits until it is deployed.
 * The map-colouring grid collapsing to nothing in production, while looking
 * perfect on a laptop, is exactly that failure. It is what the local policy
 * was added to prevent, and a drifted copy quietly undoes it.
 *
 * So: compare them directive by directive rather than as strings, since
 * whitespace and ordering are not meaningful and a diff on those is noise
 * somebody would learn to ignore.
 */

import fs from 'node:fs';

const errors = [];
const err = (m) => errors.push(m);

const SOURCES = [
  { file: 'netlify.toml', what: 'the deployed site' },
  { file: 'tools/serve.py', what: 'the local server' }
];

/**
 * Pull the policy out of a file, wherever in it the policy happens to live.
 *
 * One file is TOML with the whole policy on one line; the other is Python
 * relying on implicit concatenation of three adjacent string literals. Reading
 * "up to the closing quote" gets the Python one wrong in the worst way: it
 * returns the first third, which is a valid-looking policy that is missing
 * most of its directives. So walk the quoted chunks instead and join every run
 * of them that is separated by nothing but whitespace.
 */
function readPolicy(file) {
  const text = fs.readFileSync(file, 'utf8');
  /* Start at the policy itself, not at the first quote in the file. Both files
     carry long prose comments, and an apostrophe in "the Parent Guide's" is
     indistinguishable from an opening quote to a regular expression. Anchoring
     on `default-src` and then walking outward avoids the question. */
  const at = text.indexOf('default-src');
  if (at === -1) return null;

  const open = Math.max(text.lastIndexOf('"', at), text.lastIndexOf("'", at));
  if (open === -1) return null;
  const q = text[open];

  let policy = '';
  let from = open;
  for (;;) {
    const close = text.indexOf(q, from + 1);
    if (close === -1) break;
    policy += text.slice(from + 1, close);
    /* Python builds this policy out of three literals side by side. Keep
       going while the only thing between one and the next is whitespace or a
       concatenation operator; stop the moment anything else appears. */
    const next = text.indexOf(q, close + 1);
    if (next === -1 || !/^[\s+]*$/.test(text.slice(close + 1, next))) break;
    from = next;
  }
  return policy.replace(/\s+/g, ' ').trim();
}

/** A policy as a map of directive to its sorted values, order thrown away. */
function directives(policy) {
  const out = new Map();
  for (const part of policy.split(';')) {
    const bits = part.trim().split(/\s+/).filter(Boolean);
    if (!bits.length) continue;
    out.set(bits[0], bits.slice(1).sort().join(' '));
  }
  return out;
}

const found = SOURCES.map((s) => {
  if (!fs.existsSync(s.file)) {
    err(`${s.file} is missing, so ${s.what} has no policy to check`);
    return null;
  }
  const policy = readPolicy(s.file);
  if (!policy) err(`${s.file}: no Content-Security-Policy found — ${s.what} `
    + 'would run with no policy at all, and the style-attribute rule the whole '
    + 'app is written around stops being enforced');
  return policy ? { ...s, policy, map: directives(policy) } : null;
}).filter(Boolean);

if (found.length === SOURCES.length) {
  const [a, b] = found;
  const names = new Set([...a.map.keys(), ...b.map.keys()]);
  for (const name of [...names].sort()) {
    const left = a.map.get(name);
    const right = b.map.get(name);
    if (left === right) continue;
    if (left === undefined) {
      err(`${name} is set for ${b.what} (${b.file}) but not for ${a.what} `
        + `(${a.file}) — the two must match or local work stops predicting production`);
    } else if (right === undefined) {
      err(`${name} is set for ${a.what} (${a.file}) but not for ${b.what} `
        + `(${b.file}) — the two must match or local work stops predicting production`);
    } else {
      err(`${name} differs: ${a.file} says "${name} ${left}" and ${b.file} `
        + `says "${name} ${right}"`);
    }
  }
}

/* ---- the policy has to be strict enough to be worth having ---- */

/* Each of these is load-bearing somewhere in the app, and loosening one turns
   a build failure into a bug that reaches a child. */
const MUST = [
  ["style-src", "'self'",
    'the app has no inline styles anywhere and several checks depend on that'],
  ["script-src", "'self'",
    'no unsafe-eval means new Function is unavailable; the chess bot is written around it'],
  ["default-src", "'self'", 'nothing is loaded from anywhere else'],
  ['base-uri', "'self'", 'a hash router with a rewritable base is a redirect hole'],
  ['form-action', "'none'", 'the app posts nothing anywhere']
];
for (const source of found) {
  for (const [name, want, why] of MUST) {
    const got = source.map.get(name);
    if (got === undefined) {
      err(`${source.file}: ${name} is missing — ${why}`);
    } else if (!got.split(' ').includes(want)) {
      err(`${source.file}: ${name} is "${got}" but must include ${want} — ${why}`);
    } else if (got.includes("'unsafe-inline'") || got.includes("'unsafe-eval'")) {
      err(`${source.file}: ${name} allows ${got} — ${why}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

if (found.length) {
  console.log(`${found.length} copies of the policy, `
    + `${found[0].map.size} directives each`);
}
if (errors.length) {
  console.log(`\nERRORS (${errors.length}):`);
  errors.forEach((m) => console.log(`  x ${m}`));
  process.exit(1);
}
console.log('No errors.');
