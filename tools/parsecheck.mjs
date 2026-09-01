#!/usr/bin/env node
/**
 * Parse every shipped JavaScript file as an ES module.
 *
 * This exists because a duplicate `const` declaration in app.js once made the
 * whole site render a blank page while the browser console stayed completely
 * silent. Nothing else in the toolchain would have caught it: the file is only
 * parsed by the browser, and a module that fails to parse fails quietly.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const roots = ['assets/js'];
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
};
roots.forEach(walk);

const bad = [];
for (const f of files) {
  try {
    // eslint-disable-next-line no-new
    new vm.SourceTextModule(fs.readFileSync(f, 'utf8'), { identifier: f });
  } catch (e) {
    bad.push(`${f}: ${e.message}`);
  }
}

/* Every JSON file the site loads at runtime must parse too. */
const jsonFiles = [];
const walkJson = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJson(full);
    else if (entry.name.endsWith('.json')) jsonFiles.push(full);
  }
};
walkJson('data');
for (const f of jsonFiles) {
  try { JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { bad.push(`${f}: ${e.message}`); }
}

console.log(`${files.length} JS modules and ${jsonFiles.length} JSON files parsed`);
if (bad.length) {
  console.log(`\nPARSE ERRORS (${bad.length}):`);
  bad.forEach((m) => console.log(`  x ${m}`));
  process.exit(1);
}
console.log('\nNo errors.');
