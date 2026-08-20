#!/usr/bin/env python3
"""Hand corrections applied on top of the generated question files.

Nine categories are produced by generators. Re-running a generator rewrites the
file from its hand-written baseline, which silently discarded manual fixes twice
before this script existed. Everything corrected by hand in a generated file
lives here instead, and the build order is:

    gen_*.py   ->   handfixes.py   ->   validate.mjs

Idempotent: safe to run repeatedly.
"""
import json

def patch(path, qid, fn):
    d = json.load(open(path))
    hit = False
    for q in d['questions']:
        if q['id'] == qid:
            fn(q)
            hit = True
    if not hit:
        print(f'  ! {qid} not found in {path}')
        return
    json.dump(d, open(path, 'w'), indent=2, ensure_ascii=False)
    open(path, 'a').write('\n')


def swap_shape(q, old, new, alt, expl=None):
    """Replace a symmetric shape whose 180 degree turn reads as a small turn.

    A triangle turned upside down looks like a 60 degree turn, because a
    triangle repeats every 120. Demonstrating that and then asking for the same
    turn on a house shows the child two different amounts of rotation.
    """
    fig = q['figure']
    cells = fig.get('cells') or [fig.get('a'), fig.get('b'), fig.get('c')]
    for cell in cells:
        for sh in (cell or {}).get('shapes', []):
            if sh.get('s') == old:
                sh['s'] = new
    # The answer choices carry the shape too, and forgetting them leaves the
    # key drawn with the old symmetric shape.
    for choice in q.get('choices', []):
        for sh in (choice.get('figure') or {}).get('shapes', []):
            if sh.get('s') == old:
                sh['s'] = new
    fig['alt'] = alt
    if expl:
        q['explanation'] = expl


FM = 'data/cogat/figure-matrices.json'
RBA = 'data/nnat/reasoning-by-analogy.json'
SV = 'data/nnat/spatial-visualization.json'
FAN = 'data/olsat/figural-analogies.json'
NA = 'data/cogat/number-analogies.json'

# --- rotations that looked like different amounts on the two shapes ---------

patch(FM, 'cogat-fm-g2-1', lambda q: swap_shape(
    q, 'triangle', 'flag',
    "Top row: a purple flag, then the same flag upside down. "
    "Bottom row: a purple house shape, then an empty box."))

patch(FM, 'cogat-fm-g2-4', lambda q: swap_shape(
    q, 'star', 'leaf',
    "Top row: an empty leaf, then a blue leaf turned upside down. "
    "Bottom row: an empty heart, then an empty box.",
    "Two things change across the top: the shape fills in with blue, and it flips upside down. "
    "Choice b filled in but did not flip. Choice c flipped but did not fill in."))

patch(RBA, 'nnat-rba-g1-4', lambda q: swap_shape(
    q, 'triangle', 'trapezoid',
    "Top row: an empty trapezoid, then a filled green trapezoid turned upside down. "
    "Bottom row: an empty arrow, then an empty box."))

patch(RBA, 'nnat-rba-g2-1', lambda q: swap_shape(
    q, 'pentagon', 'trapezoid',
    "Top row: a green trapezoid, then the same trapezoid upside down. "
    "Bottom row: a green house shape, then an empty box."))

patch(FAN, 'olsat-fan-g1-3', lambda q: swap_shape(
    q, 'triangle', 'flag',
    "A green flag turns upside down. An orange house shape turns how?"))

ALT_SV35 = ("Two blue trapezoids become four smaller ones turned upside down. "
            "Two green kites must do the same.")
def fix_sv35(q):
    swap_shape(q, 'triangle', 'trapezoid', ALT_SV35)
    swap_shape(q, 'pentagon', 'kite', ALT_SV35)
patch(SV, 'nnat-sv-g3-5', fix_sv35)

# --- a ring cannot show a turn at all --------------------------------------

def fix_fm45(q):
    for cell in q['figure']['cells']:
        for sh in cell.get('shapes', []):
            sh.pop('r', None)
    q['figure']['alt'] = ("Top row: three small pink rings, then one big pink ring with dots "
                          "inside. Bottom row: three small teal cloud shapes, then an empty box.")
    q['choices'] = [
        {"id": "a", "figure": {"shapes": [{"s": "cloud", "c": "teal", "f": "dots", "z": 1.25}]}},
        {"id": "b", "figure": {"shapes": [{"s": "cloud", "c": "teal", "z": 1.25}]}},
        {"id": "c", "figure": {"shapes": [{"s": "cloud", "c": "teal", "f": "dots"}]}},
        {"id": "d", "figure": {"shapes": [{"s": "cloud", "c": "teal", "f": "dots", "n": 3}]}},
        {"id": "e", "figure": {"shapes": [{"s": "ring", "c": "teal", "f": "dots", "z": 1.25}]}}]
    q['answer'] = "a"
    q['explanation'] = ("Three things change across the top row: three become one, the shape grows, "
                        "and it gains dots. Choice b lost the dots, choice c did not grow, and "
                        "choice d kept all three shapes.")
    q['strategy'] = "List every change before you look, then check the answer against each one."
patch(FM, 'cogat-fm-g4-5', fix_fm45)

# --- a hexagon cannot show a turn either -----------------------------------

def fix_rba35(q):
    q['figure'] = {"kind": "matrix", "rows": 2, "cols": 2,
        "alt": ("Top row: one small empty green trapezoid, then three smaller filled green "
                "trapezoids turned upside down. Bottom row: one small empty blue kite, then "
                "an empty box."),
        "cells": [{"shapes": [{"s": "trapezoid", "c": "green", "f": "outline", "z": 0.6}]},
                  {"shapes": [{"s": "trapezoid", "c": "green", "n": 3, "z": 0.45, "r": 180}]},
                  {"shapes": [{"s": "kite", "c": "blue", "f": "outline", "z": 0.6}]},
                  {"missing": True}]}
    q['choices'] = [
        {"id": "a", "figure": {"shapes": [{"s": "kite", "c": "blue", "n": 3, "z": 0.45, "r": 180}]}},
        {"id": "b", "figure": {"shapes": [{"s": "kite", "c": "blue", "n": 3, "z": 0.45}]}},
        {"id": "c", "figure": {"shapes": [{"s": "kite", "c": "blue", "f": "outline", "n": 3, "z": 0.45, "r": 180}]}},
        {"id": "d", "figure": {"shapes": [{"s": "kite", "c": "blue", "n": 2, "z": 0.45, "r": 180}]}},
        {"id": "e", "figure": {"shapes": [{"s": "trapezoid", "c": "blue", "n": 3, "z": 0.45, "r": 180}]}}]
    q['answer'] = "a"
    q['explanation'] = ("Three rules at once: one becomes three, the shape fills in, and it turns "
                        "upside down. Choice b did not turn, choice c never filled in, and choice d "
                        "made only two.")
    q['strategy'] = "With three rules, list them on your fingers and check every finger."
patch(RBA, 'nnat-rba-g3-5', fix_rba35)

# --- "added a turn" is not a distractor on a hexagon: the turn is invisible --

def fix_split(colour, z):
    def f(q):
        for c in q['choices']:
            if c['id'] == 'd':
                c['figure'] = {"shapes": [{"s": "hexagon", "c": colour, "n": 6, "z": z}]}
        q['explanation'] = ("One large shape splits into four small ones of the same kind and color. "
                            "Choice b kept them large, choice c made only two, and choice d made six "
                            "instead of four.")
        q['strategy'] = "When a shape splits, check the new number AND the new size."
    return f
patch(SV, 'nnat-sv-g4-4', fix_split('green', 0.4))
patch(FAN, 'olsat-fan-g3-4', fix_split('blue', 0.45))

# --- a square turned upside down inside a swap is invisible ----------------

def fix_sv5(q):
    q['figure'] = {"kind": "analogy",
        "alt": ("An empty triangle holding a yellow circle becomes an empty yellow circle holding "
                "an upside down green triangle. Now do the same to a house shape holding a star."),
        "a": {"shapes": [{"s": "triangle", "c": "green", "f": "outline", "z": 1.15},
                         {"s": "circle", "c": "yellow", "z": 0.35, "x": 50, "y": 65}]},
        "b": {"shapes": [{"s": "circle", "c": "yellow", "f": "outline", "z": 1.15},
                         {"s": "triangle", "c": "green", "z": 0.35, "x": 50, "y": 65, "r": 180}]},
        "c": {"shapes": [{"s": "house", "c": "blue", "f": "outline", "z": 1.15},
                         {"s": "star", "c": "yellow", "z": 0.35, "x": 50, "y": 65}]}}
    q['choices'] = [
        {"id": "a", "figure": {"shapes": [{"s": "star", "c": "yellow", "f": "outline", "z": 1.15},
                                          {"s": "house", "c": "blue", "z": 0.35, "x": 50, "y": 65, "r": 180}]}},
        {"id": "b", "figure": {"shapes": [{"s": "star", "c": "yellow", "f": "outline", "z": 1.15},
                                          {"s": "house", "c": "blue", "z": 0.35, "x": 50, "y": 65}]}},
        {"id": "c", "figure": {"shapes": [{"s": "house", "c": "blue", "f": "outline", "z": 1.15},
                                          {"s": "star", "c": "yellow", "z": 0.35, "x": 50, "y": 65, "r": 180}]}},
        {"id": "d", "figure": {"shapes": [{"s": "star", "c": "blue", "f": "outline", "z": 1.15},
                                          {"s": "house", "c": "blue", "z": 0.35, "x": 50, "y": 65, "r": 180}]}},
        {"id": "e", "figure": {"shapes": [{"s": "star", "c": "yellow", "z": 1.15},
                                          {"s": "house", "c": "blue", "z": 0.35, "x": 50, "y": 65, "r": 180}]}}]
    q['answer'] = "a"
    q['explanation'] = ("The two shapes swap places, each keeps its own color, the outer one is empty "
                        "and the inner one is filled, and the inner one is turned upside down. "
                        "Choice b forgot the turn and choice c forgot the swap.")
    q['strategy'] = "Break a busy question into a list. Swap, colors, fills, turn. Then tick each off."
patch(SV, 'nnat-sv-g4-5', fix_sv5)

# --- arithmetic slip: 3 to 7 is plus four, so 2 must go to 6, not 5 --------

def fix_na24(q):
    q['choices'] = [
        {"id": "a", "figure": {"shapes": [{"s": "triangle", "c": "blue", "n": 6}]}},
        {"id": "b", "figure": {"shapes": [{"s": "triangle", "c": "blue", "n": 5}]}},
        {"id": "c", "figure": {"shapes": [{"s": "triangle", "c": "blue", "n": 4}]}},
        {"id": "d", "figure": {"shapes": [{"s": "triangle", "c": "blue", "n": 8}]}}]
    q['answer'] = "a"
    q['explanation'] = ("Three becomes seven, so four were added. Two plus four is six. Choice c "
                        "comes from doubling, but doubling three gives six, not seven.")
    q['strategy'] = "Test your rule on the pair you were given before you use it."
patch(NA, 'cogat-na-g2-4', fix_na24)

# --- size differences too small for a child to see ------------------------
#
# A "wrong size" distractor only works if the size is visibly wrong. The filler
# branch in build_choices picked a random scale without checking it differed
# from the key, so it sometimes produced a twin: nnat-rba-g3-6 offered the key
# at scale 1.0 and the same picture at 1.01. A child who picks the twin is
# marked wrong on a one percent difference nobody can see.
#
# The same applies to the rule being demonstrated. Growing a shape by 15% and
# then saying a choice "stayed small" asks the child to see something the page
# does not really show, so those two items now grow by half again.
#
# _figural.py refuses to build either shape now. These five already shipped.

def fix_rba_g2_3(q):
    """Demonstrated growth was 1.0 -> 1.15, too small to read as growth.

    Grow the gap by starting small rather than ending big: above 1.2 a shape
    runs outside its tile and gets clipped, so the small end moves down to 0.6
    and the big end stays at the normal size.
    """
    q['figure']['cells'][0]['shapes'][0]['z'] = 0.6
    q['figure']['cells'][1]['shapes'][0].pop('z', None)
    q['figure']['cells'][2]['shapes'][0]['z'] = 0.6
    q['figure']['alt'] = ('Top row: a small filled blue square, then a much bigger empty blue '
                          'square. Bottom row: a small filled green star, then an empty box.')
    q['choices'] = [
        {"id": "a", "figure": {"shapes": [{"s": "star", "c": "green", "f": "outline"}]}},
        {"id": "b", "figure": {"shapes": [{"s": "star", "c": "green", "f": "outline", "z": 0.6}]}},
        {"id": "c", "figure": {"shapes": [{"s": "star", "c": "green"}]}},
        {"id": "d", "figure": {"shapes": [{"s": "square", "c": "green", "f": "outline"}]}},
        {"id": "e", "figure": {"shapes": [{"s": "star", "c": "yellow", "f": "outline"}]}}]
    q['answer'] = "a"
patch(RBA, 'nnat-rba-g2-3', fix_rba_g2_3)


def fix_rba_g2_11(q):
    """Choice e was the key at 1.05: the same picture, five percent bigger."""
    for c in q['choices']:
        if c['id'] == 'e':
            c['figure'] = {"shapes": [{"s": "square", "c": "grey", "z": 0.6}]}
patch(RBA, 'nnat-rba-g2-11', fix_rba_g2_11)


def fix_rba_g2_12(q):
    """Growth was 1.0 -> 1.2, and choice e sat at 1.32, a tenth off the key."""
    q['figure']['cells'][0]['shapes'][0]['z'] = 0.6
    q['figure']['cells'][1]['shapes'][0].pop('z', None)
    q['figure']['cells'][2]['shapes'][0]['z'] = 0.6
    q['figure']['alt'] = ('Top row: a small empty green slanted rectangle, then a much bigger one. '
                          'Bottom row: a small empty green bow tie, then an empty box.')
    q['choices'] = [
        {"id": "a", "figure": {"shapes": [{"s": "bowtie", "c": "green", "f": "outline"}]}},
        {"id": "b", "figure": {"shapes": [{"s": "bowtie", "c": "green", "f": "outline", "z": 0.6}]}},
        {"id": "c", "figure": {"shapes": [{"s": "parallelogram", "c": "green", "f": "outline"}]}},
        {"id": "d", "figure": {"shapes": [{"s": "bowtie", "c": "green", "f": "outline", "z": 0.4}]}},
        {"id": "e", "figure": {"shapes": [{"s": "bowtie", "c": "blue", "f": "outline"}]}}]
    q['answer'] = "a"
    q['explanation'] = ("Going across, the shape gets bigger. Choice b did not get bigger, and "
                        "choice e changed colour when nothing else did.")
patch(RBA, 'nnat-rba-g2-12', fix_rba_g2_12)


def fix_rba_g3_6(q):
    """Choice d was the key at 1.01. Anything above 1.2 clips, so go smaller."""
    for c in q['choices']:
        if c['id'] == 'd':
            c['figure'] = {"shapes": [{"s": "semicircle", "c": "green", "f": "dots", "z": 0.5}]}
patch(RBA, 'nnat-rba-g3-6', fix_rba_g3_6)


def fix_rba_g3_16(q):
    """Choice d was the key at 0.99."""
    for c in q['choices']:
        if c['id'] == 'd':
            c['figure'] = {"shapes": [{"s": "cross", "c": "grey", "f": "outline", "z": 0.6}]}
patch(RBA, 'nnat-rba-g3-16', fix_rba_g3_16)

print('hand fixes applied')
