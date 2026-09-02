/**
 * angleart.js — the angles a child has already seen, drawn.
 *
 * Reading how angles are taught, the single most repeated advice is to stop
 * drawing abstract V shapes and point at the room instead: the slope of a roof,
 * an open pair of scissors, a leaning ladder. The angle stops being a school
 * exercise and becomes a thing that was always there.
 *
 * Everything is drawn rather than photographed. The page ships img-src 'self',
 * so there are no stock photos to load, and a drawing is better anyway — it can
 * put the arms and the arc directly on the object, which a photograph cannot.
 *
 * Each scene carries a real number. A ladder is 75 degrees because that is the
 * angle a ladder is meant to lean at, and a slice of pizza is 45 because a
 * pizza is cut into eight.
 *
 * The important part is HOW they are drawn. The first version placed every path
 * by hand and then declared an angle beside it, and five of the nine drawings
 * disagreed with their own number — the deck chair was labelled 150 and drawn
 * at 110. In a game about measuring, that is not a cosmetic bug; it teaches the
 * wrong thing. So nothing is placed by hand any more. Every limb is computed
 * from the scene's own degrees, which makes the drawing and the answer the same
 * fact rather than two facts that have to be kept in step.
 */

const INK = 'var(--gp-ink)';
const r1 = (x) => Math.round(x * 10) / 10;

export const SCENES = [
  { id: 'ramp', name: 'A skateboard ramp', deg: 20, from: 0,
    fact: 'A gentle slope. Much steeper and you could not roll up it.' },
  { id: 'scissors', name: 'Open scissors', deg: 30, mid: 90,
    fact: 'Just far enough open to cut paper.' },
  { id: 'pizza', name: 'A slice of pizza', deg: 45, from: 8,
    fact: 'A whole pizza is 360. Cut it into eight and each slice is 45.' },
  { id: 'arrow', name: 'The point of an arrow', deg: 60, mid: 270,
    fact: 'Sharp, so it goes in instead of sliding off.' },
  { id: 'ladder', name: 'A leaning ladder', deg: 75, from: 0,
    fact: 'The angle a ladder is supposed to lean at. Flatter and it slides.' },
  { id: 'book', name: 'An open book, standing', deg: 90, mid: 90,
    fact: 'A right angle. The same corner as this page.' },
  { id: 'roof', name: 'The peak of a roof', deg: 110, mid: 270,
    fact: 'Steep enough that rain and snow slide off.' },
  { id: 'laptop', name: 'An open laptop', deg: 120, from: 0,
    fact: 'Where most people stop pushing the screen back.' },
  { id: 'chair', name: 'A deck chair, reclined', deg: 150, from: 8,
    fact: 'Nearly flat. Almost a straight angle.' }
];

/* Where each scene's vertex sits in its 200x200 box. */
const VERTEX = {
  ramp: [30, 162], scissors: [100, 140], pizza: [44, 162], arrow: [100, 32],
  ladder: [52, 168], book: [100, 152], roof: [100, 58], laptop: [56, 152],
  chair: [58, 150]
};

/**
 * The two directions a scene's arms point.
 *
 * `mid` means the shape is symmetric about that direction — scissors open
 * evenly either side of straight up. `from` means the first arm is pinned and
 * the second opens away from it, which is what a ladder against the ground
 * does. Either way the gap between them IS the scene's degrees, by
 * construction.
 */
export function armsOf(scene) {
  const a = scene.mid != null ? scene.mid - scene.deg / 2 : scene.from;
  return [a, a + scene.deg];
}

export const sceneById = (id) => SCENES.find((s) => s.id === id);

/** One scene, with the angle marked on it. */
export function sceneSvg(id, { marked = true, size = 200 } = {}) {
  const scene = sceneById(id);
  if (!scene || !DRAW[id]) return '';
  const t = 'var(--room, var(--gp-accent))';
  const p = 'var(--room-soft, var(--gp-accent-soft))';
  const [cx, cy] = VERTEX[id];
  const [a1, a2] = armsOf(scene);

  /* A point `r` away from the vertex in direction `deg`. SVG counts y
     downwards, so the sine is subtracted and the maths stays familiar. */
  const P = (deg, r) => {
    const rad = (deg * Math.PI) / 180;
    return [r1(cx + r * Math.cos(rad)), r1(cy - r * Math.sin(rad))];
  };
  /* A thick limb along `deg`, as a four-cornered slab of the given width. */
  const slab = (deg, len, w, fill, from = 0) => {
    const [x1, y1] = P(deg, from);
    const [x2, y2] = P(deg, len);
    const [ox, oy] = [Math.cos(((deg + 90) * Math.PI) / 180) * w / 2,
      -Math.sin(((deg + 90) * Math.PI) / 180) * w / 2];
    return `<path d="M ${r1(x1 + ox)} ${r1(y1 + oy)} L ${r1(x2 + ox)} ${r1(y2 + oy)}
      L ${r1(x2 - ox)} ${r1(y2 - oy)} L ${r1(x1 - ox)} ${r1(y1 - oy)} Z" fill="${fill}"/>`;
  };
  const g = { cx, cy, a1, a2, deg: scene.deg, P, slab, t, p, INK };

  const R = 44;
  const [q1x, q1y] = P(a1, R);
  const [q2x, q2y] = P(a2, R);
  const mark = marked ? `
    <path d="M ${q1x} ${q1y} A ${R} ${R} 0 ${scene.deg > 180 ? 1 : 0} 0 ${q2x} ${q2y}"
          fill="none" stroke="${t}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="5" fill="${t}"/>` : '';

  return `<svg class="cz-ang cz-ang--scene" viewBox="0 0 ${size} ${size}" role="img"
    aria-label="${scene.name}">${DRAW[id](g)}${mark}</svg>`;
}

/* ------------------------------------------------------------------ */
/* The scenes                                                          */
/* ------------------------------------------------------------------ */

const DRAW = {
  /* Ground along the first arm, slope along the second, filled between. */
  ramp: (g) => {
    const [tx, ty] = g.P(g.a2, 148);
    const [fx, fy] = g.P(g.a1, 148);
    /* The board rides ON the slope, so it is placed along the second arm and
       lifted clear of it, not bolted to the vertex. */
    const lift = (deg, along, up) => {
      const [x, y] = g.P(deg, along);
      const rad = ((deg + 90) * Math.PI) / 180;
      return [r1(x + Math.cos(rad) * up), r1(y - Math.sin(rad) * up)];
    };
    const deck = `<path d="M ${lift(g.a2, 86, 13).join(' ')} L ${lift(g.a2, 130, 13).join(' ')}"
      stroke="${g.INK}" stroke-width="7" stroke-linecap="round"/>`;
    const wheels = [92, 124].map((d) =>
      `<circle cx="${lift(g.a2, d, 6)[0]}" cy="${lift(g.a2, d, 6)[1]}" r="5"
        fill="${g.INK}"/>`).join('');
    const board = deck + wheels;
    return `
      <path d="M ${g.cx} ${g.cy} L ${tx} ${ty} L ${fx} ${fy} Z" fill="${g.p}"/>
      <path d="M ${g.cx - 8} ${g.cy} L ${fx + 14} ${fy}" stroke="${g.INK}"
            stroke-width="5" stroke-linecap="round"/>
      ${g.slab(g.a2, 148, 9, g.t)}
      ${board}`;
  },

  /* Blades up, handles down: each handle is its own blade turned round. */
  scissors: (g) => `
    ${g.slab(g.a1, 104, 13, g.p)}
    ${g.slab(g.a2, 104, 13, g.t)}
    <path d="M ${g.cx} ${g.cy} L ${g.P(g.a1, 104).join(' ')}" stroke="${g.INK}"
          stroke-width="3" stroke-linecap="round"/>
    <path d="M ${g.cx} ${g.cy} L ${g.P(g.a2, 104).join(' ')}" stroke="${g.INK}"
          stroke-width="3" stroke-linecap="round"/>
    <path d="M ${g.cx} ${g.cy} L ${g.P(g.a1 + 180, 30).join(' ')}" stroke="${g.INK}"
          stroke-width="5" stroke-linecap="round"/>
    <path d="M ${g.cx} ${g.cy} L ${g.P(g.a2 + 180, 30).join(' ')}" stroke="${g.INK}"
          stroke-width="5" stroke-linecap="round"/>
    <circle cx="${g.P(g.a1 + 180, 42)[0]}" cy="${g.P(g.a1 + 180, 42)[1]}" r="12"
            fill="none" stroke="${g.INK}" stroke-width="4"/>
    <circle cx="${g.P(g.a2 + 180, 42)[0]}" cy="${g.P(g.a2 + 180, 42)[1]}" r="12"
            fill="none" stroke="${g.INK}" stroke-width="4"/>
    <circle cx="${g.cx}" cy="${g.cy}" r="6" fill="${g.INK}"/>`,

  /* A wedge, with the crust as the arc that closes it. */
  pizza: (g) => {
    const R = 142;
    const [x1, y1] = g.P(g.a1, R);
    const [x2, y2] = g.P(g.a2, R);
    const [m1x, m1y] = g.P(g.a1 + g.deg * 0.3, R * 0.6);
    const [m2x, m2y] = g.P(g.a1 + g.deg * 0.7, R * 0.78);
    return `
      <path d="M ${g.cx} ${g.cy} L ${x1} ${y1} A ${R} ${R} 0 0 0 ${x2} ${y2} Z" fill="${g.p}"/>
      <path d="M ${x1} ${y1} A ${R} ${R} 0 0 0 ${x2} ${y2}" fill="none" stroke="${g.t}"
            stroke-width="14" stroke-linecap="round"/>
      <circle cx="${m1x}" cy="${m1y}" r="8" fill="${g.t}"/>
      <circle cx="${m2x}" cy="${m2y}" r="6" fill="${g.t}"/>`;
  },

  /* Tip at the top, barbs opening downwards, shaft through the middle. */
  arrow: (g) => {
    const [b1x, b1y] = g.P(g.a1, 128);
    const [b2x, b2y] = g.P(g.a2, 128);
    const [nx, ny] = g.P((g.a1 + g.a2) / 2, 96);
    return `
      <path d="M ${g.cx} ${g.cy} L ${b1x} ${b1y} L ${nx} ${ny} L ${b2x} ${b2y} Z"
            fill="${g.p}" stroke="${g.INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M ${nx} ${ny} L ${g.P((g.a1 + g.a2) / 2, 150).join(' ')}" stroke="${g.t}"
            stroke-width="7" stroke-linecap="round"/>`;
  },

  /* Ground along the first arm, two rails and rungs along the second. */
  ladder: (g) => {
    const L = 150;
    const rungs = [0.18, 0.38, 0.58, 0.78].map((f) => {
      const [ax, ay] = g.P(g.a2, L * f);
      const dx = Math.cos(((g.a2 + 90) * Math.PI) / 180) * 9;
      const dy = -Math.sin(((g.a2 + 90) * Math.PI) / 180) * 9;
      return `<path d="M ${r1(ax + dx)} ${r1(ay + dy)} L ${r1(ax - dx)} ${r1(ay - dy)}"
        stroke="${g.t}" stroke-width="5" stroke-linecap="round"/>`;
    }).join('');
    return `
      <path d="M ${g.cx - 24} ${g.cy} L ${g.P(g.a1, 132).join(' ')}" stroke="${g.INK}"
            stroke-width="5" stroke-linecap="round"/>
      <path d="M ${g.P(g.a1, 122).join(' ')} L ${g.P(g.a1, 122)[0]} 24" stroke="${g.p}"
            stroke-width="14" stroke-linecap="round"/>
      ${g.slab(g.a2, L, 22, 'none')}
      <path d="M ${g.cx + 9} ${g.cy} L ${r1(g.P(g.a2, L)[0] + 9)} ${g.P(g.a2, L)[1]}"
            stroke="${g.t}" stroke-width="6" stroke-linecap="round"/>
      <path d="M ${g.cx - 9} ${g.cy} L ${r1(g.P(g.a2, L)[0] - 9)} ${g.P(g.a2, L)[1]}"
            stroke="${g.t}" stroke-width="6" stroke-linecap="round"/>
      ${rungs}`;
  },

  /* Two covers hinged at the spine, opening evenly either side of upright. */
  book: (g) => `
    ${g.slab(g.a1, 100, 30, g.p)}
    ${g.slab(g.a2, 100, 30, g.t)}
    <path d="M ${g.cx} ${g.cy} L ${g.P(g.a1, 100).join(' ')}" stroke="${g.INK}"
          stroke-width="4" stroke-linecap="round"/>
    <path d="M ${g.cx} ${g.cy} L ${g.P(g.a2, 100).join(' ')}" stroke="${g.INK}"
          stroke-width="4" stroke-linecap="round"/>
    ${[0.4, 0.62, 0.84].map((f) => `
      <path d="M ${g.P(g.a1, 100 * f).join(' ')} L ${g.P(g.a1 + 6, 100 * f + 4).join(' ')}"
            stroke="${g.INK}" stroke-width="0"/>`).join('')}
    <circle cx="${g.cx}" cy="${g.cy}" r="5" fill="${g.INK}"/>`,

  /* Peak at the top, eaves opening downwards, walls underneath. */
  roof: (g) => {
    const [e1x, e1y] = g.P(g.a1, 96);
    const [e2x, e2y] = g.P(g.a2, 96);
    const left = Math.min(e1x, e2x);
    const right = Math.max(e1x, e2x);
    const top = Math.max(e1y, e2y);
    return `
      <rect x="${r1(left + 14)}" y="${r1(top - 4)}" width="${r1(right - left - 28)}"
            height="${r1(178 - top)}" rx="5" fill="${g.p}"/>
      ${g.slab(g.a1, 96, 12, g.t)}
      ${g.slab(g.a2, 96, 12, g.t)}
      <rect x="${r1((left + right) / 2 - 16)}" y="${r1(top + 22)}" width="32"
            height="${r1(156 - top)}" rx="4" fill="${g.t}"/>`;
  },

  /* Base along the first arm, screen opening back along the second. */
  /* Seen from the side, which is the only view where the hinge angle IS the
     angle. Face-on the screen foreshortens and the drawing would lie. */
  laptop: (g) => `
    ${g.slab(g.a1, 116, 14, g.INK)}
    ${g.slab(g.a1, 96, 6, g.p, 16)}
    ${g.slab(g.a2, 110, 14, g.INK)}
    ${g.slab(g.a2, 96, 7, g.t, 12)}
    <circle cx="${g.cx}" cy="${g.cy}" r="6" fill="${g.INK}"/>`,

  /* Seat along the first arm, back reclining along the second. */
  chair: (g) => `
    <path d="M ${g.cx - 30} ${g.cy + 14} L 178 ${g.cy + 14}" stroke="${g.INK}"
          stroke-width="5" stroke-linecap="round"/>
    ${g.slab(g.a1, 96, 12, g.t)}
    ${g.slab(g.a2, 84, 12, g.t)}
    <path d="M ${g.cx} ${g.cy} L ${g.cx + 12} ${g.cy + 24}" stroke="${g.INK}"
          stroke-width="5" stroke-linecap="round"/>
    <path d="M ${g.P(g.a1, 84).join(' ')} L ${r1(g.P(g.a1, 84)[0] + 10)}
             ${r1(g.P(g.a1, 84)[1] + 26)}" stroke="${g.INK}" stroke-width="5"
          stroke-linecap="round"/>
    <circle cx="${g.P(g.a2, 96)[0]}" cy="${g.P(g.a2, 96)[1]}" r="13" fill="${g.p}"/>`
};

export default { SCENES, VERTEX, armsOf, sceneSvg, sceneById };
