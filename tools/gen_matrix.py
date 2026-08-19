#!/usr/bin/env python3
"""Generate 2x2 matrix and analogy items from the rule factory.

Covers the three categories that share the "A becomes B, so C becomes what"
structure: CogAT Figure Matrices, NNAT Reasoning by Analogy and OLSAT Figural
Analogies. The row rules transform A into B; the column swaps the shape; the
answer is C with the row rules applied.
"""
import sys, json, random
sys.path.insert(0, 'tools')
from _figural import *
from _authoring import write

CHOICES = {('cogat', 1): 4, ('cogat', 2): 4, ('cogat', 3): 5, ('cogat', 4): 5,
           ('nnat', 1): 5, ('nnat', 2): 5, ('nnat', 3): 5, ('nnat', 4): 5,
           ('olsat', 1): 4, ('olsat', 2): 4, ('olsat', 3): 5, ('olsat', 4): 5}

# Two rules is the grade 1-2 ceiling, so difficulty there also comes from how
# close the distractors sit to the key. Three rules is the grade 3-4 ceiling.
PLAN = {1: [(1, 1), (1, 2), (2, 3), (2, 4), (2, 5)],
        2: [(1, 1), (1, 2), (2, 3), (2, 4), (2, 5)],
        3: [(1, 1), (2, 2), (2, 3), (3, 4), (3, 5)],
        4: [(1, 1), (2, 2), (3, 3), (3, 4), (3, 5)]}


def make(cat_id, test, grade, index, rng, kind, colors, shapes, start_num):
    n_rules, difficulty = PLAN[grade][index % len(PLAN[grade])]
    n_rules = min(n_rules, max_rules(grade))

    s1, s2 = rng.sample(shapes, 2)
    base = {'s': s1, 'c': rng.choice(colors)}
    if rng.random() < 0.45:
        base['f'] = 'outline'
    if rng.random() < 0.3:
        base['z'] = 0.6

    rules = pick_rules(grade, n_rules, base, rng, colors)
    if not rules:
        return None

    cbase = dict(base, s=s2)
    items = build_choices(cbase, rules, lambda k: dict(k, s=s1),
                          CHOICES[(test, grade)], rng, colors)
    tagged = letter_ids(items)

    a, b = base, apply_all(base, rules)
    c = cbase
    alt = (f"Top row: {describe(a)}, then {describe(b)}. "
           f"Bottom row: {describe(c)}, then an empty box.")

    if kind == 'matrix':
        figure = {"kind": "matrix", "rows": 2, "cols": 2, "alt": alt,
                  "cells": [{"shapes": [a]}, {"shapes": [b]}, {"shapes": [c]}, {"missing": True}]}
        prompt = ("Finish the bottom row the same way." if grade <= 2
                  else "Which figure completes the matrix?")
    else:
        figure = {"kind": "analogy", "alt": alt,
                  "a": {"shapes": [a]}, "b": {"shapes": [b]}, "c": {"shapes": [c]}}
        prompt = ("Make the same change to the last shape." if grade <= 2
                  else "Which figure completes the second pair?")

    strategy = {
        1: "Say the change out loud, then do exactly that to the shape below.",
        2: "Check what changed AND what stayed the same. Both are clues.",
        3: "Two changes means two checks. Go through them one at a time.",
        4: "Each wrong answer follows all the rules but one. Find the one that breaks none.",
        5: "List every change on your fingers, then test the answer against every finger.",
    }[difficulty]

    return {
        "id": f"{cat_id}-g{grade}-{start_num + index}",
        "grade": grade, "difficulty": difficulty, "prompt": prompt, "figure": figure,
        "choices": [{"id": cid, "figure": {"shapes": [shape]}} for cid, _, shape, _ in tagged],
        "answer": "a",
        "explanation": explain(rules, tagged),
        "strategy": strategy,
    }


def extend(path, cat_id, test, kind, per_grade, colors, shapes, seed):
    d = json.load(open(path))
    rng = random.Random(seed)
    have = {}
    for q in d['questions']:
        have.setdefault(q['grade'], 0)
        have[q['grade']] += 1
    grades = sorted(have)
    added = 0
    for grade in grades:
        start = have[grade] + 1
        made, tries, i = 0, 0, 0
        seen = {json.dumps(q.get('figure'), sort_keys=True) for q in d['questions']}
        while made < per_grade and tries < per_grade * 30:
            tries += 1
            q = make(cat_id, test, grade, i, rng, kind, colors, shapes, start)
            i += 1
            if not q:
                continue
            sig = json.dumps(q['figure'], sort_keys=True)
            if sig in seen:
                continue
            seen.add(sig)
            q['id'] = f"{cat_id}-g{grade}-{start + made}"
            d['questions'].append(q)
            made += 1
            added += 1
    d['questions'].sort(key=lambda q: (q['grade'], q['difficulty']))
    write(d, path)
    return added


if __name__ == '__main__':
    total = 0
    total += extend('data/cogat/figure-matrices.json', 'cogat-fm', 'cogat', 'matrix',
                    12, FULL_COLORS, SHAPES_WIDE, 101)
    total += extend('data/nnat/reasoning-by-analogy.json', 'nnat-rba', 'nnat', 'matrix',
                    12, NNAT_COLORS, SHAPES_ABSTRACT, 202)
    total += extend('data/olsat/figural-analogies.json', 'olsat-fan', 'olsat', 'analogy',
                    12, FULL_COLORS, SHAPES_WIDE, 303)
    print('added', total)
