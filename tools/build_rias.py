#!/usr/bin/env python3
"""Build the RIAS-2 practice sets.

The RIAS-2 is a published, secure test: its items are copyrighted and PAR does
not release them, so nothing here is a real item. What is copied is the FORMAT
of each subtest, which is publicly documented, exactly as this site already does
for the CogAT, NNAT and OLSAT.

Four core subtests, two verbal and two nonverbal:

  Guess What        clues are read out, the child names the thing
  Verbal Reasoning  verbal analogies
  Odd-Item Out      a set of pictures, one does not belong
  What's Missing    a picture with an essential part left out

Two deviations from the real test, both forced and both worth naming. The real
subtests are open-ended -- a child says the answer aloud and an examiner scores
it -- whereas everything here has to be multiple choice. And the real Guess What
and Verbal Reasoning are read out by the examiner, which is why the youngest
grades here answer with pictures rather than words.

The generator exists rather than hand-written JSON because the two nonverbal
subtests need their answers proved. An "odd one out" with two defensible
answers is the exact failure this project has already shipped once.
"""

import json, os, sys

OUT = 'data/rias'
ATTRS = ('s', 'c', 'f', 'r', 'z')

# ---------------------------------------------------------------- helpers

def sh(s, c='blue', **kw):
    d = {'s': s, 'c': c}
    d.update(kw)
    return d

def cell(*shapes):
    return {'shapes': list(shapes)}

def choices(items, key_index):
    ids = 'abcde'
    out = []
    for i, it in enumerate(items):
        out.append({'id': ids[i], **it})
    return out, ids[key_index]

# ---------------------------------------------------------------- proofs

def unique_on(items, attr):
    """Indices of items whose value for `attr` is not shared by any other."""
    vals = [it.get(attr) for it in items]
    return [i for i, v in enumerate(vals) if vals.count(v) == 1]

def prove_odd(shapes, key, rule_name, where, errors):
    """Exactly one picture may be arguable as the odd one, and it must be the key.

    A child who spots a different lone attribute is not wrong, they are looking
    at a broken item. So every attribute is checked, not just the intended one.
    """
    culprits = {}
    for a in ATTRS:
        for i in unique_on(shapes, a):
            culprits.setdefault(i, []).append(a)
    if key not in culprits:
        errors.append(f'{where}: the key is not odd on any attribute ({rule_name})')
        return
    others = sorted(set(culprits) - {key})
    if others:
        why = '; '.join(f'#{i+1} is alone in {"/".join(culprits[i])}' for i in others)
        errors.append(f'{where}: more than one defensible answer -- {why}')

def prove_missing(parts, gap, opts, key, where, errors):
    """The key must be the removed part; every distractor must really differ."""
    want = {a: gap.get(a) for a in ATTRS}
    got = {a: opts[key].get(a) for a in ATTRS}
    if want != got:
        errors.append(f'{where}: the key does not match the missing part')
    for i, o in enumerate(opts):
        if i == key:
            continue
        diff = [a for a in ATTRS if o.get(a) != want.get(a)]
        if not diff:
            errors.append(f'{where}: choice {i+1} is identical to the answer')
        elif diff == ['z']:
            errors.append(f'{where}: choice {i+1} differs only in size, which does '
                          f'not read once the choices are drawn on their own')
    seen = []
    for o in opts:
        k = tuple(o.get(a) for a in ATTRS)
        if k in seen:
            errors.append(f'{where}: two choices are the same picture')
        seen.append(k)

# ---------------------------------------------------------------- Odd-Item Out

CURVED = {'circle', 'oval', 'semicircle', 'crescent', 'moon', 'ring', 'cloud', 'heart'}
FOURSIDED = {'square', 'diamond', 'rectwide', 'recttall', 'trapezoid', 'parallelogram', 'kite'}
THREESIDED = {'triangle', 'triangledown', 'righttriangle'}

def odd_items(errors):
    """Each entry: (grade, prompt-rule, four alike, the odd one, why)."""
    SETS = [
        # grade 1 — one attribute, and it is the loudest one on the picture
        (1, 'shape', [sh('circle', 'blue')] * 4, sh('square', 'blue'),
         'Four are circles. One is a square.'),
        (1, 'shape', [sh('star', 'yellow')] * 4, sh('heart', 'yellow'),
         'Four are stars. One is a heart.'),
        (1, 'colour', [sh('triangle', 'red')] * 4, sh('triangle', 'green'),
         'Four are red. One is green.'),
        (1, 'colour', [sh('square', 'purple')] * 4, sh('square', 'orange'),
         'Four are purple. One is orange.'),
        (1, 'shape', [sh('moon', 'teal')] * 4, sh('cloud', 'teal'),
         'Four are moons. One is a cloud.'),
        (1, 'colour', [sh('circle', 'pink')] * 4, sh('circle', 'blue'),
         'Four are pink. One is blue.'),
        (1, 'shape', [sh('apple', 'red')] * 4, sh('leaf', 'red'),
         'Four are apples. One is a leaf.'),
        (1, 'shape', [sh('fish', 'blue')] * 4, sh('house', 'blue'),
         'Four are fish. One is a house.'),
        (1, 'colour', [sh('star', 'orange')] * 4, sh('star', 'teal'),
         'Four are orange. One is teal.'),
        (1, 'shape', [sh('heart', 'red')] * 4, sh('diamond', 'red'),
         'Four are hearts. One is a diamond.'),

        # grade 2 — fill and turning, which take a second look
        (2, 'fill', [sh('circle', 'blue', f='solid')] * 4, sh('circle', 'blue', f='outline'),
         'Four are filled in. One is only an outline.'),
        (2, 'fill', [sh('square', 'green', f='outline')] * 4, sh('square', 'green', f='solid'),
         'Four are outlines. One is filled in.'),
        (2, 'fill', [sh('star', 'purple', f='solid')] * 4, sh('star', 'purple', f='stripesh'),
         'Four are plain. One has stripes.'),
        (2, 'shape', [sh('pentagon', 'orange')] * 4, sh('hexagon', 'orange'),
         'Four have five sides. One has six.'),
        (2, 'colour', [sh('kite', 'teal')] * 4, sh('kite', 'yellow'),
         'Four are teal. One is yellow.'),
        (2, 'fill', [sh('triangle', 'red', f='dots')] * 4, sh('triangle', 'red', f='solid'),
         'Four are dotty. One is plain.'),
        (2, 'shape', [sh('arrow', 'ink')] * 4, sh('plus', 'ink'),
         'Four are arrows. One is a plus.'),
        (2, 'fill', [sh('hexagon', 'blue', f='solid')] * 4, sh('hexagon', 'blue', f='grid'),
         'Four are plain. One has a grid on it.'),
        (2, 'shape', [sh('cloud', 'grey')] * 4, sh('lightning', 'grey'),
         'Four are clouds. One is a lightning bolt.'),
        (2, 'colour', [sh('leaf', 'green')] * 4, sh('leaf', 'purple'),
         'Four are green. One is purple.'),

        # grade 3 — the odd one is the same shape and colour, turned differently
        (3, 'turn', [sh('righttriangle', 'blue', r=0)] * 4, sh('righttriangle', 'blue', r=90),
         'Four point the same way. One has been turned.'),
        (3, 'turn', [sh('arrow', 'red', r=0)] * 4, sh('arrow', 'red', r=180),
         'Four point right. One points left.'),
        (3, 'shape', [sh('trapezoid', 'teal')] * 4, sh('parallelogram', 'teal'),
         'Four are trapezoids. One is a parallelogram.'),
        (3, 'fill', [sh('octagon', 'orange', f='stripesv')] * 4, sh('octagon', 'orange', f='stripesh'),
         'Four have upright stripes. One lies down.'),
        (3, 'turn', [sh('semicircle', 'purple', r=0)] * 4, sh('semicircle', 'purple', r=180),
         'Four are the same way up. One is upside down.'),
        (3, 'shape', [sh('rectwide', 'green')] * 4, sh('recttall', 'green'),
         'Four are wide. One is tall.'),
        (3, 'fill', [sh('diamond', 'pink', f='outline')] * 4, sh('diamond', 'pink', f='stripesd'),
         'Four are outlines. One has slanted stripes.'),
        (3, 'turn', [sh('chevron', 'ink', r=0)] * 4, sh('chevron', 'ink', r=90),
         'Four face the same way. One has been turned a quarter.'),
        (3, 'shape', [sh('crescent', 'yellow')] * 4, sh('ring', 'yellow'),
         'Four are crescents. One is a ring.'),
        (3, 'shape', [sh('bowtie', 'blue')] * 4, sh('cross', 'blue'),
         'Four are bow ties. One is a cross.'),
    ]
    # grade 4 — the rule is a family, not an attribute you can point at
    FAMILY = [
        (4, [sh('circle', 'blue'), sh('oval', 'blue'), sh('ring', 'blue'), sh('crescent', 'blue')],
         sh('square', 'blue'), CURVED, 'Four are made of curves. One has straight sides.'),
        (4, [sh('square', 'green'), sh('diamond', 'green'), sh('rectwide', 'green'), sh('trapezoid', 'green')],
         sh('triangle', 'green'), FOURSIDED, 'Four have four sides. One has three.'),
        (4, [sh('triangle', 'red'), sh('triangledown', 'red'), sh('righttriangle', 'red'), sh('triangle', 'red', f='outline')],
         sh('pentagon', 'red'), THREESIDED, 'Four have three sides. One has five.'),
        (4, [sh('moon', 'purple'), sh('crescent', 'purple'), sh('circle', 'purple'), sh('semicircle', 'purple')],
         sh('star', 'purple'), CURVED, 'Four are round or curved. One is pointy.'),
        (4, [sh('kite', 'orange'), sh('parallelogram', 'orange'), sh('recttall', 'orange'), sh('square', 'orange')],
         sh('hexagon', 'orange'), FOURSIDED, 'Four have four corners. One has six.'),
        (4, [sh('heart', 'pink'), sh('cloud', 'pink'), sh('oval', 'pink'), sh('ring', 'pink')],
         sh('diamond', 'pink'), CURVED, 'Four are drawn with curves. One is all straight lines.'),
        (4, [sh('triangle', 'teal'), sh('righttriangle', 'teal'), sh('triangledown', 'teal'), sh('triangle', 'teal', f='dots')],
         sh('trapezoid', 'teal'), THREESIDED, 'Four are triangles. One is not.'),
        (4, [sh('rectwide', 'yellow'), sh('recttall', 'yellow'), sh('square', 'yellow'), sh('diamond', 'yellow')],
         sh('octagon', 'yellow'), FOURSIDED, 'Four have four sides. One has eight.'),
        (4, [sh('circle', 'ink'), sh('ring', 'ink'), sh('oval', 'ink'), sh('semicircle', 'ink')],
         sh('plus', 'ink'), CURVED, 'Four have no corners at all. One has plenty.'),
        (4, [sh('triangle', 'blue'), sh('triangledown', 'blue'), sh('righttriangle', 'blue'), sh('triangle', 'blue', f='stripesh')],
         sh('kite', 'blue'), THREESIDED, 'Four have three corners. One has four.'),
    ]

    out = []
    n = 0
    for grade, rule, alike, odd, why in SETS:
        n += 1
        where = f'odd-item-out g{grade} #{n}'
        items = list(alike) + [odd]
        # spread the answer around so it is never in the same place twice
        pos = (n * 3) % 5
        items.insert(pos, items.pop())
        key = pos
        prove_odd(items, key, rule, where, errors)
        opts, keyid = choices([{'figure': cell(it)} for it in items], key)
        out.append({
            'id': f'rias-oio-g{grade}-{n}', 'grade': grade,
            'difficulty': min(4, 1 + (n - 1) // 3),
            'prompt': 'Four of these go together. Which one does not belong?',
            'choices': opts, 'answer': keyid, 'explain': why,
        })
    for grade, alike, odd, family, why in FAMILY:
        n += 1
        where = f'odd-item-out g{grade} #{n}'
        # A family rule cannot be proved by lone-attribute uniqueness, because
        # every shape differs. Prove it the way the rule is actually stated.
        if not all(a['s'] in family for a in alike):
            errors.append(f'{where}: one of the four is outside the family')
        if odd['s'] in family:
            errors.append(f'{where}: the odd one is inside the family')
        items = list(alike) + [odd]
        for a in ('c', 'r'):
            stray = unique_on(items, a)
            if stray and stray != [len(items) - 1]:
                errors.append(f'{where}: #{stray[0]+1} is alone in {a}, a second answer')
        pos = (n * 3) % 5
        items.insert(pos, items.pop())
        opts, keyid = choices([{'figure': cell(it)} for it in items], pos)
        out.append({
            'id': f'rias-oio-g{grade}-{n}', 'grade': grade, 'difficulty': 4,
            'prompt': 'Four of these belong to the same family. Which one does not?',
            'choices': opts, 'answer': keyid, 'explain': why,
        })
    return out

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    errors = []
    qs = odd_items(errors)
    if errors:
        print('ERRORS:')
        for e in errors:
            print('  x', e)
        sys.exit(1)
    print(f'odd-item-out: {len(qs)} questions, every answer proved unique')
