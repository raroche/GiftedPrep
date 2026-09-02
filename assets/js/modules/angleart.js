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

/*
 * Two kinds of object live here, and confusing them was a real bug.
 *
 * A slice cut from a pizza into eight is ALWAYS 45 degrees. A ladder has a
 * safety rule that puts it at about 75. Those angles belong to the object.
 *
 * A book is not like that. A book opens anywhere from shut to flat, and a
 * laptop hinge turns freely -- some fold right back to 180, some all the way to
 * 360 to become a tablet. The first version asked "An open book, standing. What
 * is the angle?" and answered "90 -- a right angle, the same corner as this
 * page", which states as a fact about books something that is only true of that
 * one drawing. A child could reasonably come away believing open books are
 * right angles.
 *
 * So each scene now says how strong its claim is, and asks accordingly: "How
 * big is one slice?" against "How far open is THIS book?". The facts say the
 * same thing out loud, and where the angle varies they give the range, which is
 * worth more than the number.
 *
 * There turned out to be three strengths, not two. A pizza slice is 45 by
 * arithmetic and cannot be otherwise. A ladder is a different case again: real
 * ladders lean at all sorts of angles, and 75 is what they are SUPPOSED to lean
 * at. Calling that "always 75" would repeat the same mistake in a quieter
 * voice, so it says "the rule is".
 */
export const SCENES = [
  { id: 'ramp', name: 'A skateboard ramp', deg: 20, from: 0, fixed: false, claim: 'this one',
    ask: 'How steep is this skateboard ramp?',
    fact: 'Ramps are built at every slope there is. This one is gentle — much steeper '
      + 'and you could not roll up it.' },
  { id: 'scissors', name: 'Open scissors', deg: 30, mid: 90, fixed: false, claim: 'this one',
    ask: 'How far open are these scissors?',
    fact: 'Scissors open as wide as you like, right back to the hinge. This is about '
      + 'far enough to cut paper.' },
  { id: 'pizza', name: 'A slice of pizza', deg: 45, from: 8, fixed: true, claim: 'always',
    ask: 'This pizza was cut into eight. How big is one slice?',
    fact: 'This one never changes. A whole pizza is 360, and 360 shared between eight '
      + 'slices is 45 each, every time.' },
  { id: 'arrow', name: 'The point of an arrow', deg: 55, mid: 270, fixed: false, claim: 'this one',
    ask: 'How sharp is the point of this arrow?',
    fact: 'Arrowheads are made at all sorts of points. A sharp one goes in instead of '
      + 'sliding off.' },
  { id: 'ladder', name: 'A leaning ladder', deg: 75, from: 0, fixed: true, claim: 'the rule is',
    ask: 'How far back is this ladder leaning?',
    fact: 'Ladders have a rule: lean at about 75. Any flatter and the bottom slides out '
      + 'from under you.' },
  { id: 'book', name: 'An open book, standing', deg: 90, mid: 90, fixed: false, claim: 'this one',
    ask: 'How far open is this book?',
    fact: 'A book opens anywhere from 0 shut to 180 laid flat. This one is halfway — '
      + 'a right angle.' },
  { id: 'roof', name: 'The peak of a roof', deg: 110, mid: 270, fixed: false, claim: 'this one',
    ask: 'How wide is the peak of this roof?',
    fact: 'Roofs are built at many angles. A steeper peak sheds rain and snow faster.' },
  { id: 'laptop', name: 'An open laptop', deg: 125, from: 0, fixed: false, claim: 'this one',
    ask: 'How far back is this laptop screen pushed?',
    fact: 'The hinge turns freely. Plenty of laptops fold right back to 180, and some go '
      + 'all the way to 360 to become a tablet. This one is at 125.' },
  { id: 'slide', name: 'A playground slide', deg: 35, from: 0, fixed: false, claim: 'this one',
    ask: 'How steep is this slide?',
    fact: 'Slides are built at all sorts of slopes. Too steep and you land too hard.' },
  { id: 'door', name: 'A door, from above', deg: 40, from: 0, fixed: false, claim: 'this one',
    ask: 'How far open is this door?',
    fact: 'A door swings from shut to wide open — 0 all the way round to the wall.' },
  { id: 'cake', name: 'A cake cut into six', deg: 60, from: 12, fixed: true, claim: 'always',
    ask: 'This cake was cut into six. How big is one slice?',
    fact: 'Same trick as the pizza. 360 shared between six is 60 — and between eight it '
      + 'was 45. Fewer slices, bigger angle.' },
  { id: 'hexagon', name: 'The corner of a hexagon tile', deg: 120, mid: 90, fixed: true,
    claim: 'always',
    ask: 'What is the corner angle of this hexagon tile?',
    fact: 'Every corner of a regular hexagon is 120, always. Three of them meet to make '
      + '360, which is why bees tile a honeycomb with them and leave no gaps.' },
  { id: 'stopsign', name: 'The corner of a stop sign', deg: 135, mid: 90, fixed: true,
    claim: 'always',
    ask: 'What is the corner angle of this stop sign?',
    fact: 'A stop sign is a regular octagon, and every corner of one is 135, always.' },
  { id: 'chair', name: 'A deck chair, reclined', deg: 150, from: 8, fixed: false, claim: 'this one',
    ask: 'How far back is this deck chair?',
    fact: 'Deck chairs recline to lots of angles. This one is nearly flat — almost a '
      + 'straight angle.' }
];

/* Where each scene's vertex sits in its 200x200 box. */
const VERTEX = {
  ramp: [30, 162], scissors: [100, 140], pizza: [44, 162], arrow: [100, 32],
  ladder: [52, 168], book: [100, 152], roof: [100, 58], laptop: [56, 152],
  chair: [58, 150], slide: [26, 166], door: [56, 150], cake: [40, 158],
  hexagon: [100, 172], stopsign: [100, 176]
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


/**
 * A regular polygon, walked out from the corner being measured.
 *
 * The interior angle of a regular n-gon is 180 - 360/n: 120 for a hexagon, 135
 * for an octagon. Rather than trust that and draw the shape separately, the
 * shape is BUILT from the angle -- start at the corner, set off along one arm,
 * and turn by the same exterior angle at every step. If the number were wrong
 * the polygon would not close, which is a bug you can see.
 */
function polygon(g, n, side) {
  const pts = [[g.cx, g.cy]];
  let x = g.cx;
  let y = g.cy;
  let head = g.a2;
  for (let i = 0; i < n - 1; i += 1) {
    x += side * Math.cos((head * Math.PI) / 180);
    y -= side * Math.sin((head * Math.PI) / 180);
    pts.push([r1(x), r1(y)]);
    head -= 180 - g.deg;
  }
  const d = `M ${pts.map((q) => q.join(' ')).join(' L ')} Z`;
  return `<path d="${d}" fill="${g.p}" stroke="${g.t}" stroke-width="8"
    stroke-linejoin="round"/>`;
}

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

  /* A slide: the slope, a rail, and the steps that get you up to it. */
  slide: (g) => {
    const [tx, ty] = g.P(g.a2, 156);
    const [fx, fy] = g.P(g.a1, 156);
    return `
      <path d="M ${g.cx - 6} ${g.cy} L ${fx + 12} ${fy}" stroke="${g.INK}"
            stroke-width="5" stroke-linecap="round"/>
      ${g.slab(g.a2, 156, 10, g.t)}
      <path d="M ${g.P(g.a2, 156).join(' ')} L ${tx} ${ty - 40}" stroke="${g.p}"
            stroke-width="10" stroke-linecap="round"/>
      <path d="M ${g.P(g.a2, 40).join(' ')} L ${g.P(g.a2, 40)[0]} ${g.P(g.a2, 40)[1] - 26}
               M ${g.P(g.a2, 100).join(' ')} L ${g.P(g.a2, 100)[0]} ${g.P(g.a2, 100)[1] - 32}"
            stroke="${g.p}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="${g.P(g.a2, 128)[0]}" cy="${r1(g.P(g.a2, 128)[1] - 14)}" r="11" fill="${g.INK}"/>`;
  },

  /* A door seen from above: the wall it is set into, and the door swung open. */
  door: (g) => `
    <path d="M ${g.cx} ${g.cy} L ${g.P(g.a1, 132).join(' ')}" stroke="${g.INK}"
          stroke-width="12" stroke-linecap="round"/>
    <path d="M ${g.cx} ${g.cy} L ${g.P(g.a1 + 180, 44).join(' ')}" stroke="${g.INK}"
          stroke-width="12" stroke-linecap="round"/>
    ${g.slab(g.a2, 128, 14, g.t)}
    <circle cx="${g.P(g.a2, 112)[0]}" cy="${g.P(g.a2, 112)[1]}" r="6" fill="${g.p}"/>
    <circle cx="${g.cx}" cy="${g.cy}" r="6" fill="${g.p}"/>`,

  /* A cake slice: the same wedge as the pizza, iced, with a candle. */
  cake: (g) => {
    const R = 138;
    const [x1, y1] = g.P(g.a1, R);
    const [x2, y2] = g.P(g.a2, R);
    const [cxx, cyy] = g.P(g.a1 + g.deg / 2, R * 0.62);
    return `
      <path d="M ${g.cx} ${g.cy} L ${x1} ${y1} A ${R} ${R} 0 0 0 ${x2} ${y2} Z" fill="${g.p}"/>
      <path d="M ${x1} ${y1} A ${R} ${R} 0 0 0 ${x2} ${y2}" fill="none" stroke="${g.t}"
            stroke-width="15" stroke-linecap="round"/>
      <path d="M ${cxx} ${cyy} L ${cxx} ${r1(cyy - 34)}" stroke="${g.INK}"
            stroke-width="7" stroke-linecap="round"/>
      <circle cx="${cxx}" cy="${r1(cyy - 42)}" r="7" fill="${g.t}"/>`;
  },

  hexagon: (g) => polygon(g, 6, 62),
  stopsign: (g) => polygon(g, 8, 50),

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
