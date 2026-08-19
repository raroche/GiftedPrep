#!/usr/bin/env python3
"""Generate odd-one-out (classification) items.

Four figures share a property and one breaks it. The rule is chosen first and
the figures are built to fit, so there is never a second reading that would pick
a different answer -- which is the usual failure mode when these are written by
hand.
"""
import sys, json, random
sys.path.insert(0, 'tools')
from _figural import *
from _authoring import write

CHOICES = {('cogat', 1): 4, ('cogat', 2): 4, ('cogat', 3): 5, ('cogat', 4): 5,
           ('olsat', 1): 4, ('olsat', 2): 4, ('olsat', 3): 5, ('olsat', 4): 5}

CURVED = ['circle', 'oval', 'ring', 'semicircle', 'crescent', 'moon', 'cloud', 'leaf', 'heart']
STRAIGHT = ['triangle', 'square', 'diamond', 'pentagon', 'hexagon', 'octagon',
            'trapezoid', 'parallelogram', 'kite', 'righttriangle', 'rectwide',
            'recttall', 'chevron', 'bowtie', 'cross', 'plus', 'star', 'star4', 'star6',
            'triangledown']
CORNERS = {'triangle': 3, 'righttriangle': 3, 'triangledown': 3,
           'square': 4, 'diamond': 4, 'rectwide': 4, 'recttall': 4, 'trapezoid': 4,
           'parallelogram': 4, 'kite': 4, 'bowtie': 4,
           'pentagon': 5, 'hexagon': 6, 'chevron': 6, 'octagon': 8,
           'star4': 8, 'star': 10, 'star6': 12, 'cross': 12, 'plus': 12}
EVEN = [s for s, n in CORNERS.items() if n % 2 == 0]
ODD_C = [s for s, n in CORNERS.items() if n % 2 == 1]
FILLS = ['outline', 'dots', 'stripesd', 'grid']


def item(cat_id, test, grade, rng, colors, num, difficulty):
    n = CHOICES[(test, grade)]
    mode = rng.choice(['shape', 'count', 'fill', 'curve', 'corners'][:3 if grade == 1 else 5])

    if mode == 'shape':
        keep = rng.choice(STRAIGHT + CURVED)
        odd = rng.choice([s for s in STRAIGHT + CURVED if s != keep])
        others = [{'s': keep, 'c': rng.choice(colors)} for _ in range(n - 1)]
        key = {'s': odd, 'c': rng.choice(colors)}
        why = (f"Four of them are the same shape. Only one is not.")
        strat = "Look at the outline shape first. It is usually the simplest rule."

    elif mode == 'count':
        k = rng.choice([2, 3, 4])
        odd_n = rng.choice([x for x in (1, 2, 3, 4, 5) if x != k])
        shapes = rng.sample(STRAIGHT + CURVED, n)
        others = [{'s': shapes[i], 'c': rng.choice(colors), 'n': k} for i in range(n - 1)]
        key = {'s': shapes[-1], 'c': rng.choice(colors), 'n': odd_n}
        why = f"Count them. Four boxes hold the same number of shapes and one holds a different number."
        strat = "Count every box before you look at the shapes."

    elif mode == 'fill':
        f = rng.choice(FILLS)
        odd_f = rng.choice([x for x in FILLS + [None] if x != f])
        shapes = rng.sample(STRAIGHT + CURVED, n)
        def mk(s, fill):
            out = {'s': s, 'c': rng.choice(colors)}
            if fill:
                out['f'] = fill
            return out
        others = [mk(shapes[i], f) for i in range(n - 1)]
        key = mk(shapes[-1], odd_f)
        why = "Four of them have the same thing inside. One is different."
        strat = "Look inside the shape, not only at its outline."

    elif mode == 'curve':
        straights = rng.sample(STRAIGHT, n - 1)
        others = [{'s': s, 'c': rng.choice(colors)} for s in straights]
        key = {'s': rng.choice(CURVED), 'c': rng.choice(colors)}
        why = "Four of them are made only of straight edges and corners. One has a curve."
        strat = "Trace the outline with your finger. If it bends, it is curved."

    else:
        evens = rng.sample(EVEN, n - 1)
        others = [{'s': s, 'c': rng.choice(colors)} for s in evens]
        key = {'s': rng.choice(ODD_C), 'c': rng.choice(colors)}
        why = ("Count the corners on each one. Four of them have an even number of corners. "
               "One has an odd number.")
        strat = "Counting corners turns a shape puzzle into a number puzzle."

    cells = [key] + others
    tagged = letter_ids([('key', c, None) for c in cells])
    return {
        "id": f"{cat_id}-g{grade}-{num}",
        "grade": grade, "difficulty": difficulty,
        "prompt": "Which one does not belong?" if grade <= 2 else "Which figure does not belong?",
        "choices": [{"id": cid, "figure": {"shapes": [sh]}, "label": describe(sh)}
                    for cid, _, sh, _ in tagged],
        "answer": "a",
        "explanation": why + f" The odd one out is {describe(key)}.",
        "strategy": strat,
    }


PLAN = [1, 2, 2, 3, 3, 4, 4, 5, 2, 3, 4, 5]


def extend(path, cat_id, test, per_grade, colors, seed):
    d = json.load(open(path))
    rng = random.Random(seed)
    have = {}
    for q in d['questions']:
        have[q['grade']] = have.get(q['grade'], 0) + 1
    added = 0
    for grade in sorted(have):
        seen = {json.dumps(sorted((c.get('figure') or {}).get('shapes', [{}])[0].items()
                                 if c.get('figure') else []), sort_keys=True)
                for q in d['questions'] for c in q['choices']}
        start = have[grade] + 1
        made, tries = 0, 0
        sigs = {json.dumps([c.get('figure') for c in q['choices']], sort_keys=True)
                for q in d['questions']}
        while made < per_grade and tries < per_grade * 40:
            tries += 1
            q = item(cat_id, test, grade, rng, colors, start + made, PLAN[made % len(PLAN)])
            ok, why = item_is_sound(q)
            if not ok:
                continue
            sig = json.dumps([c.get('figure') for c in q['choices']], sort_keys=True)
            if sig in sigs:
                continue
            sigs.add(sig)
            d['questions'].append(q)
            made += 1
            added += 1
    d['questions'].sort(key=lambda q: (q['grade'], q['difficulty']))
    write(d, path)
    return added


if __name__ == '__main__':
    t = 0
    t += extend('data/cogat/figure-classification.json', 'cogat-fc', 'cogat', 12, FULL_COLORS, 44)
    t += extend('data/olsat/figural-classification.json', 'olsat-fcl', 'olsat', 12, FULL_COLORS, 55)
    print('added', t)
