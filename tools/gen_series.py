#!/usr/bin/env python3
"""Generate step-by-step series and 3x3 grid items.

Series: a row of figures where one attribute advances by a constant step, then
a blank. Grid: a 3x3 where the column sets one attribute and the row sets
another, so the answer has to satisfy both.
"""
import sys, json, random
sys.path.insert(0, 'tools')
from _figural import *
from _authoring import write

CHOICES = {('cogat', 1): 4, ('cogat', 2): 4, ('cogat', 3): 5, ('cogat', 4): 5,
           ('nnat', 1): 5, ('nnat', 2): 5, ('nnat', 3): 5, ('nnat', 4): 5,
           ('olsat', 1): 4, ('olsat', 2): 4, ('olsat', 3): 5, ('olsat', 4): 5}


# ------------------------------------------------------------------ series

def series_item(cat_id, test, grade, rng, colors, shapes, num, difficulty):
    """One attribute advances by a constant step across four boxes."""
    shape = rng.choice(shapes)
    color = rng.choice(colors)
    n_choices = CHOICES[(test, grade)]

    modes = ['count', 'size', 'rotate']
    if grade >= 2:
        modes.append('fill')
    mode = rng.choice(modes)
    dual = difficulty >= 4 and grade >= 2

    steps = []
    if mode == 'count':
        start = rng.choice([1, 2])
        step = rng.choice([1, 2])
        vals = [start + step * i for i in range(5)]
        if vals[-1] > 9:
            step, vals = 1, [start + i for i in range(5)]
        steps = [{'s': shape, 'c': color, 'n': v} for v in vals]
        rule_words = f"the number goes up by {'one' if step == 1 else 'two'} each step"
        wrongs = [dict(steps[3], n=max(1, vals[3])), dict(steps[3], n=min(9, vals[4] + step))]
    elif mode == 'size':
        vals = [0.4, 0.6, 0.85, 1.1, 1.35]
        steps = [{'s': shape, 'c': color, 'z': v} for v in vals]
        rule_words = "the shape gets a little bigger each step"
        wrongs = [dict(steps[3]), {'s': shape, 'c': color, 'z': 0.4}]
    elif mode == 'rotate':
        deg = 90
        vals = [(deg * i) % 360 for i in range(5)]
        steps = [{'s': shape, 'c': color, 'r': v} if v else {'s': shape, 'c': color} for v in vals]
        rule_words = "the shape turns a quarter turn clockwise each step"
        wrongs = [dict(steps[3]), {'s': shape, 'c': color, 'r': 180}]
    else:
        order = ['outline', None, 'dots', 'outline', None]
        steps = []
        for f in order:
            cell = {'s': shape, 'c': color}
            if f:
                cell['f'] = f
            steps.append(cell)
        rule_words = "the inside goes empty, solid, dotted, and then starts again"
        wrongs = [dict(steps[3]), {'s': shape, 'c': color, 'f': 'dots'}]

    if dual:
        # A second attribute moves in the opposite direction, which is the
        # documented hard version of this item type.
        for i, cell in enumerate(steps):
            cell['z'] = round(1.3 - 0.2 * i, 2)
        rule_words += ", and at the same time the shape gets smaller"

    key = steps[4]
    items = [('key', key, None)]
    for w in wrongs:
        if w != key and all(w != it[1] for it in items):
            items.append(('near', w, None))
    # Keep trying perturbations until the slate is full. Giving up early is how
    # an item ends up with three choices where the grade needs five.
    guard = 0
    while len(items) < n_choices and guard < 200:
        guard += 1
        cand = dict(key)
        for knob in rng.sample(['c', 's', 'z', 'n', 'r'], rng.randint(1, 2)):
            if knob == 'c':
                cand['c'] = rng.choice([c for c in colors if c != cand.get('c')])
            elif knob == 's':
                cand['s'] = rng.choice([s for s in shapes if s != cand.get('s')])
            elif knob == 'z':
                cand['z'] = round(min(1.5, max(0.3, cand.get('z', 1) * rng.choice([0.55, 1.6]))), 2)
            elif knob == 'n':
                cand['n'] = max(1, min(9, cand.get('n', 1) + rng.choice([-2, -1, 1, 2])))
            elif knob == 'r':
                cand['r'] = rng.choice([90, 180, 270])
        if all(cand != it[1] for it in items):
            items.append(('near', cand, None))

    tagged = letter_ids(items[:n_choices])
    alt = "A row of shapes that change step by step, then an empty box."
    return {
        "id": f"{cat_id}-g{grade}-{num}",
        "grade": grade, "difficulty": difficulty,
        "prompt": "What comes next?" if grade <= 2 else "What comes next in the series?",
        "figure": {"kind": "series", "alt": alt,
                   "cells": [{"shapes": [s]} for s in steps[:4]] + [{"missing": True}]},
        "choices": [{"id": cid, "figure": {"shapes": [sh]}} for cid, _, sh, _ in tagged],
        "answer": "a",
        "explanation": (f"Look along the row: {rule_words}. Carry that on one more step and you get "
                        f"{describe(key)}. Choice b stopped one step early."),
        "strategy": ("Work out what changes between the first two boxes, then check the same change "
                     "happens again to the third."),
    }


# ------------------------------------------------------------------ 3x3 grid

def grid_item(cat_id, test, grade, rng, colors, shapes, num, difficulty):
    """Column sets the shape, row sets a second attribute. Answer obeys both."""
    n_choices = CHOICES[(test, grade)]
    cols = rng.sample(shapes, 3)

    row_mode = rng.choice(['color', 'size'] + (['count', 'fill'] if grade >= 2 else []))
    if row_mode == 'color':
        rows = rng.sample(colors, 3)
        cell = lambda r, c: {'s': cols[c], 'c': rows[r]}
        row_words = "each row has its own color"
    elif row_mode == 'size':
        sizes = [0.5, 0.8, 1.15]
        base_c = rng.choice(colors)
        cell = lambda r, c: {'s': cols[c], 'c': base_c, 'z': sizes[r]}
        row_words = "the shapes get bigger as you go down"
    elif row_mode == 'count':
        counts = [1, 2, 3]
        base_c = rng.choice(colors)
        cell = lambda r, c: {'s': cols[c], 'c': base_c, 'n': counts[r]}
        row_words = "each row down has one more shape"
    else:
        fills = ['outline', None, 'dots']
        base_c = rng.choice(colors)
        def cell(r, c):
            out = {'s': cols[c], 'c': base_c}
            if fills[r]:
                out['f'] = fills[r]
            return out
        row_words = "each row has its own inside pattern: empty, solid, then dotted"

    cells = [cell(r, c) for r in range(3) for c in range(3)]
    key = cells[8]
    grid = [{"shapes": [s]} for s in cells[:8]] + [{"missing": True}]

    items = [('key', key, None)]
    for cand in (cell(0, 2), cell(2, 0), cell(1, 2), cell(2, 1)):
        if cand != key and all(cand != it[1] for it in items) and len(items) < n_choices:
            items.append(('near', cand, None))
    guard = 0
    while len(items) < n_choices and guard < 200:
        guard += 1
        cand = dict(key, c=rng.choice(colors), s=rng.choice(shapes))
        if rng.random() < 0.4:
            cand['z'] = round(rng.uniform(0.4, 1.3), 2)
        if all(cand != it[1] for it in items):
            items.append(('near', cand, None))

    tagged = letter_ids(items[:n_choices])
    return {
        "id": f"{cat_id}-g{grade}-{num}",
        "grade": grade, "difficulty": difficulty,
        "prompt": "What belongs in the empty box?" if grade <= 2 else "Which figure completes the matrix?",
        "figure": {"kind": "matrix", "rows": 3, "cols": 3,
                   "alt": "A three by three grid of shapes with the bottom right box empty.",
                   "cells": grid},
        "choices": [{"id": cid, "figure": {"shapes": [sh]}} for cid, _, sh, _ in tagged],
        "answer": "a",
        "explanation": (f"Two things decide the answer. Each column keeps the same shape, and "
                        f"{row_words}. The empty box is in the last column and the bottom row, so it "
                        f"is {describe(key)}. Choice b takes its look from the wrong row."),
        "strategy": "Point along the row and say what changes. Then point down the column and do the same.",
    }


# ------------------------------------------------------------------ driver

PLAN = [1, 2, 3, 3, 4, 4, 5, 2, 3, 4, 5, 1]


def extend(path, cat_id, test, maker, per_grade, colors, shapes, seed):
    d = json.load(open(path))
    rng = random.Random(seed)
    have = {}
    for q in d['questions']:
        have[q['grade']] = have.get(q['grade'], 0) + 1
    added = 0
    for grade in sorted(have):
        seen = {json.dumps(q.get('figure'), sort_keys=True) for q in d['questions']}
        start = have[grade] + 1
        made, tries = 0, 0
        while made < per_grade and tries < per_grade * 40:
            tries += 1
            q = maker(cat_id, test, grade, rng, colors, shapes,
                      start + made, PLAN[made % len(PLAN)])
            sig = json.dumps(q['figure'], sort_keys=True)
            if sig in seen:
                continue
            seen.add(sig)
            d['questions'].append(q)
            made += 1
            added += 1
    d['questions'].sort(key=lambda q: (q['grade'], q['difficulty']))
    write(d, path)
    return added


if __name__ == '__main__':
    t = 0
    t += extend('data/olsat/figural-series.json', 'olsat-fse', 'olsat', series_item,
                12, FULL_COLORS, SHAPES_WIDE, 11)
    t += extend('data/olsat/pattern-matrix.json', 'olsat-pm', 'olsat', grid_item,
                12, FULL_COLORS, SHAPES_WIDE, 22)
    t += extend('data/nnat/serial-reasoning.json', 'nnat-sr', 'nnat', grid_item,
                12, NNAT_COLORS, SHAPES_ABSTRACT, 33)
    print('added', t)
