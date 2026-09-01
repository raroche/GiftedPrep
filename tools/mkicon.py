#!/usr/bin/env python3
"""Rasterise the CurioZoo app icon to PNG, using only the standard library.

qlmanage was the obvious tool and it is not trustworthy for this: it renders an
SVG at its intrinsic size, anchored top-left, on a square canvas of its own
choosing, and clips whatever does not fit. Every attempt to coax it produced a
differently-wrong crop.

The icon is only rounded rectangles and circles, so it is drawn here directly
from signed distance fields with 4x4 supersampling. Deterministic, no
dependencies, and the output size is exactly what was asked for.
"""
import struct, zlib, sys

def rr_sdf(x, y, x0, y0, w, h, r):
    """Signed distance to a rounded rectangle; negative inside."""
    cx, cy = x0 + w / 2, y0 + h / 2
    dx = abs(x - cx) - (w / 2 - r)
    dy = abs(y - cy) - (h / 2 - r)
    ox, oy = max(dx, 0.0), max(dy, 0.0)
    return (ox * ox + oy * oy) ** 0.5 + min(max(dx, dy), 0.0) - r

def circ_sdf(x, y, cx, cy, r):
    return ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 - r

def quad_points(p0, p1, p2, n=18):
    """A quadratic Bezier walked as n+1 points."""
    pts = []
    for i in range(n + 1):
        t, u = i / n, 1 - i / n
        pts.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    return pts

def poly_sdf(x, y, pts, r):
    """Signed distance to a round-capped stroke of radius r along a polyline.

    The bar under the eyes is a curve now, and there is no closed form for the
    distance to a Bezier. Walking it as a polyline and taking the nearest
    segment is exact enough: at eighteen segments over a curve this shallow the
    error is well under a tenth of a unit, and one unit here is under three
    pixels even on the 180px icon. The point list is built once per render, not
    once per subsample, or this would take minutes.
    """
    best = 1e9
    for i in range(len(pts) - 1):
        ax, ay = pts[i]
        bx, by = pts[i + 1]
        px, py = x - ax, y - ay
        dx, dy = bx - ax, by - ay
        t = (px * dx + py * dy) / (dx * dx + dy * dy)
        t = 0.0 if t < 0.0 else (1.0 if t > 1.0 else t)
        d = ((px - t * dx) ** 2 + (py - t * dy) ** 2) ** 0.5
        if d < best:
            best = d
    return best - r

HEX = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))

MANGO, WALL, INK, WHITE = HEX('#BA5828'), HEX('#8E3F17'), HEX('#2B2926'), (255, 255, 255)

def shapes(radius=14):
    """Painter's order. Each entry: (sdf, fill) — later entries paint on top.

    radius=0 gives a full-bleed square. iOS applies its own squircle mask to a
    home-screen icon and composites anything transparent onto black, so rounded
    corners baked into the file come back as black notches on an iPad.
    """
    ring = 2.6 / 2
    # The bar is a smile, so it is a curve of half-width 7.5 rather than a
    # rounded rect. Ends at x 13.5 and 50.5 put its outer edges at 6 and 58,
    # exactly where the rect's were. No seam: at 16px a 2.6 line is mud.
    mouth = quad_points((13.5, 51), (32, 58), (50.5, 51))
    return [
        (lambda x, y: rr_sdf(x, y, 0, 0, 64, 64, radius), MANGO),
        (lambda x, y: poly_sdf(x, y, mouth, 7.5), WALL),
        (lambda x, y: circ_sdf(x, y, 21, 29, 12 + ring), INK),
        (lambda x, y: circ_sdf(x, y, 43, 29, 12 + ring), INK),
        (lambda x, y: circ_sdf(x, y, 21, 29, 12 - ring), WHITE),
        (lambda x, y: circ_sdf(x, y, 43, 29, 12 - ring), WHITE),
        (lambda x, y: circ_sdf(x, y, 24, 27.5, 5.4), INK),
        (lambda x, y: circ_sdf(x, y, 46, 27.5, 5.4), INK),
        (lambda x, y: circ_sdf(x, y, 26.2, 25.3, 1.9), WHITE),
        (lambda x, y: circ_sdf(x, y, 48.2, 25.3, 1.9), WHITE),
    ]

def render(size, ss=4, radius=14):
    layers = shapes(radius)
    scale = 64.0 / size
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            acc_r = acc_g = acc_b = acc_a = 0.0
            for sy in range(ss):
                for sx in range(ss):
                    x = (px + (sx + 0.5) / ss) * scale
                    y = (py + (sy + 0.5) / ss) * scale
                    r = g = b = 0.0
                    a = 0.0
                    for sdf, col in layers:
                        if sdf(x, y) <= 0.0:
                            r, g, b = col
                            a = 1.0
                    acc_r += r; acc_g += g; acc_b += b; acc_a += a
            n = ss * ss
            if acc_a > 0:
                row += bytes((round(acc_r / acc_a), round(acc_g / acc_a),
                              round(acc_b / acc_a), round(255 * acc_a / n)))
            else:
                row += bytes((0, 0, 0, 0))
        rows.append(bytes(row))
    return rows

def write_png(path, size, rows):
    raw = b''.join(b'\x00' + r for r in rows)
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    open(path, 'wb').write(png)

if __name__ == '__main__':
    out, size = sys.argv[1], int(sys.argv[2])
    radius = int(sys.argv[3]) if len(sys.argv) > 3 else 14
    write_png(out, size, render(size, radius=radius))
    print(f'{out}  {size}x{size}')
