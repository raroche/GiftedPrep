/**
 * Rotational symmetry order for each shape in the figure DSL.
 *
 * `n` means turning the shape by 360/n degrees leaves it looking identical.
 * A plus is 4, so rotating it 90 degrees is invisible; a cloud is 1, so every
 * rotation shows. `Infinity` means no rotation is ever visible.
 *
 * This is what decides whether a rotation rule is worth applying to a shape at
 * all, and whether two answer choices are secretly the same picture.
 */
export const SYMMETRY = {
  circle: Infinity, dot: Infinity, ring: Infinity,
  oval: 2, rectwide: 2, recttall: 2, parallelogram: 2, bowtie: 2, line: 2,
  triangle: 3, triangledown: 3,
  square: 4, diamond: 4, plus: 4, cross: 4, star4: 4,
  star: 5, pentagon: 5,
  star6: 6, hexagon: 6,
  octagon: 8,
  // Everything else has no rotational symmetry: every turn is visible.
};

export const symmetryOf = (shape) => SYMMETRY[shape] ?? 1;

/** The smallest rotation of this shape that is actually visible, in degrees. */
export const visibleStep = (shape) => {
  const n = symmetryOf(shape);
  return n === Infinity ? null : 360 / n;
};

/** True when rotating this shape by `deg` changes nothing on screen. */
export const rotationIsInvisible = (shape, deg) => {
  const n = symmetryOf(shape);
  if (n === Infinity) return true;
  return ((deg % (360 / n)) + 360 / n) % (360 / n) === 0;
};

/** Collapse a shape spec to what it actually looks like. */
export function canonical(shape) {
  if (!shape || typeof shape !== 'object') return shape;
  const out = { ...shape };
  if ('r' in out) {
    const n = symmetryOf(out.s);
    if (n === Infinity) delete out.r;
    else {
      const step = 360 / n;
      const r = ((out.r % step) + step) % step;
      if (r === 0) delete out.r; else out.r = r;
    }
  }
  if (out.z === 1) delete out.z;
  if (out.n === 1) delete out.n;
  if (out.f === 'solid') delete out.f;
  return out;
}

export function canonicalFigure(node) {
  if (Array.isArray(node)) return node.map(canonicalFigure);
  if (node && typeof node === 'object') {
    if (node.s) return canonical(node);
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'alt' || k === 'label') continue;   // wording, not picture
      out[k] = canonicalFigure(v);
    }
    return out;
  }
  return node;
}
