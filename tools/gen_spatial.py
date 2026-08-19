#!/usr/bin/env python3
"""Generate NNAT Spatial Visualization items.

Imagined movement rather than a static rule, so every item is a rotation, a
reflection, a combination or a split. The distractor set always contains a
wrong-direction turn, because reflection-instead-of-rotation and
anticlockwise-instead-of-clockwise are the two errors this item type exists to
catch.

Rotation angles follow the measured difficulty order in
docs/research/difficulty-model.md: 90 clockwise easiest, then 180, then 270.
"""
import sys, json, random
sys.path.insert(0, 'tools')
from _figural import *
from _authoring import write

ASYMMETRIC = ['righttriangle', 'trapezoid', 'parallelogram', 'kite', 'chevron',
              'arrow', 'semicircle', 'flag', 'triangledown', 'star4', 'plus', 'cross']
PLAN = [2, 2, 3, 3, 4, 4, 5, 2, 3, 4, 5, 3]


def item(grade, rng, num, difficulty):
    colors = NNAT_COLORS
    n = 5
    mode = rng.choice(['rotate', 'rotate', 'combine', 'split'] if grade >= 3 else ['rotate', 'combine'])
    s1, s2 = rng.sample(ASYMMETRIC, 2)
    color = rng.choice(colors)

    if mode == 'rotate':
        deg = rng.choice(rot_choices(grade))
        a = {'s': s1, 'c': color}
        b = {'s': s1, 'c': color, 'r': deg}
        c = {'s': s2, 'c': color}
        key = {'s': s2, 'c': color, 'r': deg}
        wrong = [{'s': s2, 'c': color, 'r': d} for d in (90, 180, 270) if d != deg]
        wrong.append({'s': s2, 'c': color})
        words = {90: 'a quarter turn clockwise', 180: 'half a turn, so it ends up upside down',
                 270: 'three quarters of a turn clockwise'}[deg]
        why = (f"The first shape turns {words}. Do exactly the same to the third shape. "
               f"The wrong answers turn the wrong way or the wrong amount.")
        strat = "Decide which way and how far before you look at the answers."

    elif mode == 'combine':
        small = rng.choice([s for s in SHAPES_ABSTRACT if s not in (s1, s2)])
        a = {'s': s1, 'c': color, 'f': 'outline', 'z': 1.1}
        b = None
        c = {'s': s2, 'c': color, 'f': 'outline', 'z': 1.1}
        inner = rng.choice([x for x in colors if x != color])
        why = ("A small shape is added in the middle, and nothing else changes. "
               "The wrong answers add the wrong shape, or change the outer one.")
        strat = "Ask exactly what was added, then check nothing else moved."
        a_cell = [a]
        b_cell = [a, {'s': small, 'c': inner, 'z': 0.45}]
        c_cell = [c]
        key_cell = [c, {'s': small, 'c': inner, 'z': 0.45}]
        wrongs = [
            [c, {'s': rng.choice([x for x in SHAPES_ABSTRACT if x != small]), 'c': inner, 'z': 0.45}],
            [c],
            [dict(c, f=None), {'s': small, 'c': inner, 'z': 0.45}],
            [c, {'s': small, 'c': color, 'z': 0.45}],
        ]
        return _build(grade, num, difficulty, a_cell, b_cell, c_cell, key_cell, wrongs, why, strat, n)

    else:
        k = rng.choice([3, 4])
        a = {'s': s1, 'c': color, 'z': 1.1}
        b = {'s': s1, 'c': color, 'n': k, 'z': 0.45}
        c = {'s': s2, 'c': color, 'z': 1.1}
        key = {'s': s2, 'c': color, 'n': k, 'z': 0.45}
        wrong = [{'s': s2, 'c': color, 'n': k, 'z': 1.1},
                 {'s': s2, 'c': color, 'n': max(2, k - 1), 'z': 0.45},
                 {'s': s2, 'c': color, 'z': 0.45},
                 {'s': s1, 'c': color, 'n': k, 'z': 0.45}]
        why = (f"One big shape splits into {COUNT_WORDS[k]} small ones of the same kind and color. "
               f"The wrong answers keep them big, or make the wrong number.")
        strat = "When a shape splits, check both the new number and the new size."

    return _build(grade, num, difficulty, [a], [b], [c], [key],
                  [[w] for w in wrong], why, strat, n)


def _build(grade, num, difficulty, a, b, c, key, wrongs, why, strat, n):
    items = [('key', key, None)]
    for w in wrongs:
        if w != key and all(w != it[1] for it in items) and len(items) < n:
            items.append(('near', w, None))
    tagged = letter_ids(items[:n])
    if len(tagged) < n:
        return None
    alt = (f"{describe(a[0], capital=True)} becomes {describe(b[-1])}. "
           f"Now do the same to {describe(c[0])}.")
    return {
        "id": f"nnat-sv-g{grade}-{num}",
        "grade": grade, "difficulty": difficulty,
        "prompt": "Make the same change to the last shape." if grade <= 2
                  else "Which figure completes the second pair?",
        "figure": {"kind": "analogy", "alt": alt,
                   "a": {"shapes": a}, "b": {"shapes": b}, "c": {"shapes": c}},
        "choices": [{"id": cid, "figure": {"shapes": sh if isinstance(sh, list) else [sh]}}
                    for cid, _, sh, _ in tagged],
        "answer": "a",
        "explanation": why,
        "strategy": strat,
    }


if __name__ == '__main__':
    path = 'data/nnat/spatial-visualization.json'
    d = json.load(open(path))
    rng = random.Random(66)
    have = {}
    for q in d['questions']:
        have[q['grade']] = have.get(q['grade'], 0) + 1
    added = 0
    for grade in sorted(have):
        sigs = {json.dumps(q.get('figure'), sort_keys=True) for q in d['questions']}
        start = have[grade] + 1
        made, tries = 0, 0
        while made < 12 and tries < 500:
            tries += 1
            q = item(grade, rng, start + made, PLAN[made % len(PLAN)])
            if not q:
                continue
            sig = json.dumps(q['figure'], sort_keys=True)
            if sig in sigs:
                continue
            sigs.add(sig)
            d['questions'].append(q)
            made += 1
            added += 1
    d['questions'].sort(key=lambda q: (q['grade'], q['difficulty']))
    write(d, path)
    print('added', added)
