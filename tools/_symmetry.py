"""Rotational symmetry of each shape in the figure DSL.

`n` means turning the shape by 360/n degrees leaves it looking identical. A plus
is 4, so rotating it 90 degrees is invisible on screen; a cloud is 1, so every
turn shows. `None` means no rotation is ever visible.

This governs two things that both went wrong before it existed:

  * a rotation rule must never be applied to a shape it cannot visibly move,
    or the "answer" is indistinguishable from "nothing happened";
  * two answer choices must not collapse to the same picture once symmetry is
    taken into account.
"""

SYMMETRY = {
    'circle': None, 'dot': None, 'ring': None,
    'oval': 2, 'rectwide': 2, 'recttall': 2, 'parallelogram': 2,
    'bowtie': 2, 'line': 2,
    'triangle': 3, 'triangledown': 3,
    'square': 4, 'diamond': 4, 'plus': 4, 'cross': 4, 'star4': 4,
    'star': 5, 'pentagon': 5,
    'star6': 6, 'hexagon': 6,
    'octagon': 8,
    # Anything absent has no rotational symmetry: every turn is visible.
}


def symmetry_of(shape):
    return SYMMETRY.get(shape, 1)


def rotation_is_invisible(shape, deg):
    """True when turning this shape by `deg` changes nothing on screen."""
    n = symmetry_of(shape)
    if n is None:
        return True
    return deg % (360 // n) == 0


def rotation_is_faithful(shape, deg):
    """True when turning this shape by `deg` LOOKS like a turn of exactly `deg`.

    A hexagon turned 90 degrees looks like it turned 30, because a hexagon
    repeats every 60. Demonstrating a quarter turn on a cloud and then asking
    for one on a hexagon shows the child two different amounts of turn. So a
    rotation rule is only safe on a shape with no rotational symmetry at all.
    """
    return symmetry_of(shape) == 1


def visible_rotations(shape, candidates):
    """Filter a list of angles down to the ones this shape can actually show."""
    return [d for d in candidates if not rotation_is_invisible(shape, d)]


def canonical(shape):
    """Collapse a shape spec to what it actually looks like."""
    if not isinstance(shape, dict):
        return shape
    out = dict(shape)
    if 'r' in out:
        n = symmetry_of(out.get('s'))
        if n is None:
            out.pop('r')
        else:
            step = 360 // n
            r = out['r'] % step
            if r == 0:
                out.pop('r')
            else:
                out['r'] = r
    if out.get('z') == 1:
        out.pop('z')
    if out.get('n') == 1:
        out.pop('n')
    if out.get('f') == 'solid':
        out.pop('f')
    return out


def canonical_figure(node):
    if isinstance(node, list):
        return [canonical_figure(v) for v in node]
    if isinstance(node, dict):
        if 's' in node:
            return canonical(node)
        return {k: canonical_figure(v) for k, v in node.items()
                if k not in ('alt', 'label')}
    return node


def same_picture(a, b):
    import json
    return json.dumps(canonical_figure(a), sort_keys=True) == \
           json.dumps(canonical_figure(b), sort_keys=True)
