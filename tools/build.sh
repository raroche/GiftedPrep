#!/usr/bin/env bash
# Rebuild the generated question files, re-apply the hand corrections, and check
# everything. Run this after touching a generator or _figural.py.
#
# Order matters: the generators rewrite whole files from their hand-written
# baseline, so the hand fixes must be replayed afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."

# This script REWRITES tracked question files from a baseline commit before
# regenerating them. Run it with uncommitted work in those files and that work
# is gone, so refuse to start unless the tree is clean.
if [ -n "$(git status --porcelain -- data/ tools/)" ]; then
  echo "Refusing to run: you have uncommitted changes under data/ or tools/." >&2
  echo "This script overwrites generated question files. Commit or stash first." >&2
  git status --short -- data/ tools/ >&2
  exit 1
fi

for f in cogat/figure-matrices cogat/figure-classification \
         nnat/reasoning-by-analogy nnat/serial-reasoning nnat/spatial-visualization \
         olsat/figural-analogies olsat/figural-series olsat/pattern-matrix \
         olsat/figural-classification; do
  git show 64b6565:"data/$f.json" > "data/$f.json"
done

for g in gen_matrix gen_series gen_odd gen_spatial; do python3 "tools/$g.py"; done
python3 tools/handfixes.py

node tools/validate.mjs
node tools/dupcheck.mjs | tail -5
node tools/rulecheck.mjs | tail -3

# Everything, not just the question checkers: a generator change can break the
# Math Lab or the flag data too.
npm run verify
