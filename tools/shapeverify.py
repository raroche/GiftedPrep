#!/usr/bin/env python3
"""Prove every bundled country outline is actually that country.

Rwanda shipped showing Saudi Arabia. The mistake was upstream -- mapsicon's own
rw folder contains the Saudi outline -- which means trusting the file name was
never enough, and a duplicate check alone would not be either: a country can be
given the wrong shape without that shape happening to duplicate another one in
the set.

So each outline is checked against independent geometry. Natural Earth's
public-domain country polygons are rasterised to a small grid, the bundled SVG
is rasterised the same way, and the two are compared by intersection over union.
A country drawn as itself scores high whatever projection either source used; a
country drawn as somewhere else does not.

The reference lives in tools/reference/countries.json: Natural Earth 1:110m,
stripped to ISO code and geometry and rounded, so the check runs on every build
without carrying an 800KB GeoJSON around.

Usage:  python3 tools/shapeverify.py
"""

import json, re, sys, os, glob, math

GRID = 56          # raster size; big enough to tell countries apart, small enough to be quick
FLAT = 6           # segments per cubic curve

# ---------------------------------------------------------------- svg paths

NUM = re.compile(r'-?\d*\.?\d+(?:[eE][-+]?\d+)?')

def parse_path(d):
    """Flatten an SVG path to a list of closed rings of (x, y).

    Only what mapsicon actually emits: M/m, L/l, c, z. Cubics are flattened to
    straight segments, which is plenty at this raster size.
    """
    toks = re.findall(r'[A-Za-z]|' + NUM.pattern, d)
    rings, ring = [], []
    x = y = 0.0
    sx = sy = 0.0
    i, cmd = 0, None
    def num():
        nonlocal i
        v = float(toks[i]); i += 1; return v
    while i < len(toks):
        t = toks[i]
        if re.fullmatch(r'[A-Za-z]', t):
            cmd = t; i += 1
            if cmd in 'zZ':
                if len(ring) > 2: rings.append(ring)
                ring = []; x, y = sx, sy
                continue
        if cmd is None:
            i += 1; continue
        if cmd in 'Mm':
            if len(ring) > 2: rings.append(ring)
            ring = []
            dx, dy = num(), num()
            x, y = (dx, dy) if cmd == 'M' else (x + dx, y + dy)
            sx, sy = x, y
            ring.append((x, y))
            cmd = 'L' if cmd == 'M' else 'l'
        elif cmd in 'Ll':
            dx, dy = num(), num()
            x, y = (dx, dy) if cmd == 'L' else (x + dx, y + dy)
            ring.append((x, y))
        elif cmd in 'Cc':
            p = [num() for _ in range(6)]
            if cmd == 'c':
                x1, y1, x2, y2, x3, y3 = (x+p[0], y+p[1], x+p[2], y+p[3], x+p[4], y+p[5])
            else:
                x1, y1, x2, y2, x3, y3 = p
            for k in range(1, FLAT + 1):
                t0 = k / FLAT; u = 1 - t0
                bx = u*u*u*x + 3*u*u*t0*x1 + 3*u*t0*t0*x2 + t0**3*x3
                by = u*u*u*y + 3*u*u*t0*y1 + 3*u*t0*t0*y2 + t0**3*y3
                ring.append((bx, by))
            x, y = x3, y3
        elif cmd in 'Hh':
            dx = num(); x = dx if cmd == 'H' else x + dx; ring.append((x, y))
        elif cmd in 'Vv':
            dy = num(); y = dy if cmd == 'V' else y + dy; ring.append((x, y))
        else:
            i += 1
    if len(ring) > 2: rings.append(ring)
    return rings

def svg_rings(path):
    """Rings from the file, with the group transform applied.

    Every mapsicon file wraps its paths in
    transform="translate(0,1024) scale(0.1,-0.1)". Ignoring it mirrors the
    country vertically, which is why the first run of this tool reported that
    Italy looked less like Italy than 168 other countries did. Normalisation
    absorbs the translate and the scale; the minus sign is the part that
    matters.
    """
    src = open(path, encoding='utf-8').read()
    tx = ty = 0.0
    sx = sy = 1.0
    m = re.search(r'transform="([^"]+)"', src)
    if m:
        t = re.search(r'translate\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)', m.group(1))
        if t:
            tx, ty = float(t.group(1)), float(t.group(2))
        c = re.search(r'scale\(\s*(-?[\d.]+)\s*(?:,\s*(-?[\d.]+)\s*)?\)', m.group(1))
        if c:
            sx = float(c.group(1))
            sy = float(c.group(2)) if c.group(2) is not None else sx
    rings = []
    for d in re.findall(r'\sd="([^"]+)"', src):
        for ring in parse_path(d):
            rings.append([(tx + sx * px, ty + sy * py) for px, py in ring])
    return rings

# ---------------------------------------------------------------- rasterise

def area(ring):
    a = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]; x2, y2 = ring[(i + 1) % len(ring)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2

def biggest(rings):
    """Only the largest landmass.

    Comparing whole countries did not work. France carries its overseas
    departments, Russia is split across the date line, and Japan, the
    Philippines and New Zealand are scattered islands -- so the bounding box
    that everything is normalised into is set by the far-flung pieces rather
    than the country, and the two sources disagree about which pieces to
    include. France ranked 174th for itself. Comparing mainland to mainland
    removes the disagreement without weakening the test: no two countries have
    the same mainland.
    """
    return [max(rings, key=area)] if rings else []

def raster(rings, n=GRID):
    """Normalise to fill an n x n box, keeping aspect, then scanline fill."""
    rings = biggest(rings)
    pts = [p for r in rings for p in r]
    if len(pts) < 3:
        return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    w = max(xs) - min(xs); h = max(ys) - min(ys)
    if w <= 0 or h <= 0:
        return None
    k = (n - 2) / max(w, h)
    ox = (n - w * k) / 2 - min(xs) * k
    oy = (n - h * k) / 2 - min(ys) * k
    scaled = [[((px * k) + ox, (py * k) + oy) for px, py in r] for r in rings]

    grid = bytearray(n * n)
    for row in range(n):
        yc = row + 0.5
        xs_hit = []
        for r in scaled:
            m = len(r)
            for j in range(m):
                x1, y1 = r[j]; x2, y2 = r[(j + 1) % m]
                if (y1 <= yc < y2) or (y2 <= yc < y1):
                    xs_hit.append(x1 + (yc - y1) * (x2 - x1) / (y2 - y1))
        xs_hit.sort()
        for j in range(0, len(xs_hit) - 1, 2):
            a = max(0, int(math.ceil(xs_hit[j] - 0.5)))
            b = min(n - 1, int(math.floor(xs_hit[j + 1] - 0.5)))
            for c in range(a, b + 1):
                grid[row * n + c] = 1
    return grid

def bits(grid):
    """Pack a raster into one integer, so overlap is two machine ops."""
    v = 0
    for i, on in enumerate(grid):
        if on:
            v |= 1 << i
    return v

def iou(a, b):
    u = (a | b).bit_count()
    return (a & b).bit_count() / u if u else 0.0

# ---------------------------------------------------------------- reference

def geo_rings(entry):
    """Lon/lat rings, y flipped so north is up on a screen."""
    return [[(p[0], -p[1]) for p in ring] for poly in entry['rings'] for ring in poly]

"""Countries the two sources genuinely disagree about, checked by eye and
allowed through. Each is a place where "which landmass is the country" is not a
question the two datasets answer the same way, not a wrong outline. Every one of
these was rendered from both sources and compared before being listed here."""
KNOWN = {
    'aq': 'Antarctica: circumpolar, so the reference collapses to a line',
    'my': 'Malaysia: peninsula and Borneo, and the sources pick different mainlands',
    'gl': 'Greenland: near the pole, where the reference projection flattens it',
    'eh': 'Western Sahara: disputed, and the two datasets draw different borders',
    'ru': 'Russia: crosses the date line, which splits the reference in two',
}

def main():
    ref_path = os.path.join(os.path.dirname(__file__), 'reference', 'countries.json')
    if not os.path.exists(ref_path):
        sys.exit(f'reference geometry not found: {ref_path}')
    ref = json.load(open(ref_path, encoding='utf-8'))
    by_iso = {c['iso']: c for c in ref['countries']}

    data = json.load(open('data/fun/shapes.json', encoding='utf-8'))
    names = {c['code']: c['name'] for c in data['countries']}

    """An absolute similarity threshold is the wrong test: mapsicon and Natural
    Earth do not share a projection, so a correct country can score modestly and
    a threshold either misses real errors or drowns in false ones. What does
    hold across projections is RANK. A country drawn as itself resembles itself
    more than it resembles any of the other 176. So each outline is scored
    against every reference and the question is simply whether its own country
    comes first."""
    refs = []
    for code, feat in by_iso.items():
        g = raster(geo_rings(feat))
        if g:
            refs.append((code, bits(g)))

    misses, unchecked, checked = [], [], 0
    for c in data['countries']:
        code = c['code']
        svg = f'assets/img/shapes/{code}.svg'
        if not os.path.exists(svg) or code not in by_iso:
            if os.path.exists(svg):
                unchecked.append(code)
            continue
        g = raster(svg_rings(svg))
        if not g:
            unchecked.append(code)
            continue
        mine = bits(g)
        scored = sorted(((iou(mine, r), rc) for rc, r in refs), reverse=True)
        checked += 1
        best = scored[0]
        rank = next(i for i, (_, rc) in enumerate(scored) if rc == code) + 1
        own = next(sc for sc, rc in scored if rc == code)
        """Rank alone is too blunt. Small compact countries genuinely resemble
        one another, and Norway, Russia, Canada, Greenland and Antarctica are
        fragmented or polar enough that the two sources disagree about their
        mainland no matter what. What separates a wrong shape from a merely
        ambiguous one is the GAP: how much better some other country fits than
        your own does. Rwanda scored 0.48 for itself and 0.89 for Saudi Arabia,
        a gap of 0.41, while nothing correct came close to that."""
        if rank != 1:
            misses.append((round(best[0] - own, 3), rank, code, names.get(code, '?'),
                           best[1], names.get(best[1], best[1]), best[0], own))

    print(f'{checked} outlines matched against {len(refs)} reference countries')
    print(f'{len(unchecked)} had no reference to compare with\n')

    GAP = 0.30
    wrong = [m for m in misses if m[0] >= GAP and m[2] not in KNOWN]
    allowed = [m for m in misses if m[0] >= GAP and m[2] in KNOWN]
    misses.sort(reverse=True)

    if misses:
        print('Widest gaps between how well an outline fits another country and its own:')
        for gap, rank, code, name, bcode, bname, bscore, own in misses[:10]:
            flag = 'WRONG' if gap >= GAP else '     '
            print(f'  {flag} +{gap:.2f}  {code} ({name}) fits itself {own:.2f}, '
                  f'but {bcode} ({bname}) {bscore:.2f}')

    if allowed:
        print('\nAllowed through, checked by eye:')
        for m in allowed:
            print(f'  ok  {m[2]} — {KNOWN[m[2]]}')

    if wrong:
        print(f'\n{len(wrong)} outline(s) are drawn as the wrong country:')
        for gap, rank, code, name, bcode, bname, bscore, own in wrong:
            print(f'  x {code} ({name}) is drawn as {bcode} ({bname})')
    else:
        print(f'\nNo outline fits another country more than {GAP} better than its own. '
              'None is drawn as the wrong country.')
    return wrong

if __name__ == '__main__':
    bad = main()
    sys.exit(1 if bad else 0)
