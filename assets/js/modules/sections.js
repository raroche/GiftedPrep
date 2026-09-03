/**
 * sections.js — the rooms of the zoo, and the creatures that live in them.
 *
 * This file exists so that adding a section is one entry in one list rather
 * than a new screen in index.html, a new branch in the router, a new render
 * function in app.js and a new colour somewhere in the stylesheet. The home
 * page, the navigation and the checker all read from ROOMS.
 *
 * Every creature is the logo with different ears. That is deliberate: eight
 * unrelated animal drawings would look like clip art, whereas one shape wearing
 * eight hats reads as a family, and a child recognises the eyes from the top
 * bar. Colours come from the palette tokens, so every room re-themes itself.
 */

/* ------------------------------------------------------------------ */
/* Creatures                                                           */
/* ------------------------------------------------------------------ */

/* Drawn on the same 64 grid as the logo, and constrained by it. The eye disc
   occupies x 10.5-53.5 and y 16-38, and the wall takes y 36-58, so the only
   space a distinguishing feature can live in is above the eyes. The first
   attempt put an owl's beak between the eyes and an elephant's ears beside
   them; both were completely hidden, and all three rooms showed the same
   animal. Ears are now large, high, and the sole difference. */
const EARS = {
  bear: (c, soft) => [
    `<circle cx="15.5" cy="10.5" r="8.5" fill="${c}"/>`
    + `<circle cx="15.5" cy="10.5" r="3.9" fill="${soft}"/>`,
    `<circle cx="48.5" cy="10.5" r="8.5" fill="${c}"/>`
    + `<circle cx="48.5" cy="10.5" r="3.9" fill="${soft}"/>`
  ],

  rabbit: (c, soft) => [
    `<ellipse cx="19" cy="12" rx="5.6" ry="13" fill="${c}"/>`
    + `<ellipse cx="19" cy="12.5" rx="2.3" ry="8" fill="${soft}"/>`,
    `<ellipse cx="45" cy="12" rx="5.6" ry="13" fill="${c}"/>`
    + `<ellipse cx="45" cy="12.5" rx="2.3" ry="8" fill="${soft}"/>`
  ],

  owl: (c) => [
    `<path d="M8.5 19 L13 0.5 L25 13.5 Z" fill="${c}"/>`,
    `<path d="M55.5 19 L51 0.5 L39 13.5 Z" fill="${c}"/>`
  ],

  fox: (c, soft) => [
    `<path d="M6 21 L13.5 0 L26.5 14 Z" fill="${c}"/>`
    + `<path d="M11.5 17.5 L14.5 6 L21.5 14 Z" fill="${soft}"/>`,
    `<path d="M58 21 L50.5 0 L37.5 14 Z" fill="${c}"/>`
    + `<path d="M52.5 17.5 L49.5 6 L42.5 14 Z" fill="${soft}"/>`
  ],

  cat: (c, soft) => [
    `<path d="M10.5 18 L15.5 2 L25 14 Z" fill="${c}"/>`
    + `<path d="M14.5 15 L16.5 7 L21 13 Z" fill="${soft}"/>`,
    `<path d="M53.5 18 L48.5 2 L39 14 Z" fill="${c}"/>`
    + `<path d="M49.5 15 L47.5 7 L43 13 Z" fill="${soft}"/>`
  ],

  mouse: (c, soft) => [
    `<circle cx="13" cy="12" r="10.5" fill="${c}"/>`
    + `<circle cx="13" cy="12" r="5.2" fill="${soft}"/>`,
    `<circle cx="51" cy="12" r="10.5" fill="${c}"/>`
    + `<circle cx="51" cy="12" r="5.2" fill="${soft}"/>`
  ],

  giraffe: (c) => [
    `<path d="M20.5 16 L17.5 4.5" stroke="${c}" stroke-width="3.6" stroke-linecap="round" fill="none"/>`
    + `<circle cx="17.1" cy="3.6" r="3.6" fill="${c}"/>`,
    `<path d="M43.5 16 L46.5 4.5" stroke="${c}" stroke-width="3.6" stroke-linecap="round" fill="none"/>`
    + `<circle cx="46.9" cy="3.6" r="3.6" fill="${c}"/>`
  ],

  frog: (c) => [
    `<circle cx="17" cy="9" r="6.5" fill="${c}"/>`,
    `<circle cx="47" cy="9" r="6.5" fill="${c}"/>`
  ],

  /* The one on the sign. Plain round ears, because the mark has to survive a
     16px favicon where anything shaped turns to mush. */
  logo: (c) => [
    `<circle cx="19" cy="14" r="5.4" fill="${c}"/>`,
    `<circle cx="45" cy="14" r="5.4" fill="${c}"/>`
  ]
};

export const CREATURES = Object.keys(EARS);

/**
 * The two ears of a creature, left first, as separate strings.
 *
 * They come back as a pair rather than one blob so that modules/mascot.js can
 * put each ear in its own group and twitch them in opposite directions. Both
 * ears rotating together is a head tilt; one up and one down is an animal.
 */
export function earPair(kind, tone, inner) {
  return (EARS[kind] || EARS.bear)(tone, inner);
}

/* The face, the eyes and the wall: everything every creature shares. Exported
   so the animated mascot draws from exactly the same geometry as the static
   one and the two can never drift apart. */
export const EYE = {
  disc:  [{ cx: 21.5, cy: 27, r: 11 }, { cx: 42.5, cy: 27, r: 11 }],
  pupil: [{ cx: 24.5, cy: 25.5, r: 4.6 }, { cx: 45.5, cy: 25.5, r: 4.6 }],
  glint: [{ cx: 26.3, cy: 23.6, r: 1.6 }, { cx: 47.3, cy: 23.6, r: 1.6 }]
};

/* The bar under the eyes. It used to be a straight <rect> with three fence
   rails on it, which is what an enclosure wall looks like and also what a
   frown looks like, sitting as it does directly beneath two eyes.

   It is now one thick round-capped stroke, because a rect cannot bend. The
   centre line dips 5 in the middle, so the bar reads as a mouth, and the three
   rails are replaced by a single soft seam that follows the same curve: a
   closed, content smile. The stroke still spans exactly x 4..60, so every
   creature keeps the silhouette it had. */

/** The curve the bar and the seam both follow. Dips 5 at x=32. */
export const MOUTH_LINE = 'M 15 46 Q 32 56 49 46';
/** The seam, on the same curve, pulled in 6 at each end to stay inside. */
export const MOUTH_SEAM = 'M 21 48.9 Q 32 53.1 43 48.9';
/** Where the seam's ends sit. Scaling about this point deepens the smile
    without moving its corners, which is how every expression is made. */
export const MOUTH_PIVOT = { x: 32, y: 48.9 };

/** The bar the creature rests its chin on. `paper` is the seam colour. */
export const wall = (tone, paper) =>
  `<path d="${MOUTH_LINE}" fill="none" stroke="${tone}"`
  + ` stroke-width="22" stroke-linecap="round"/>`
  + `<path d="${MOUTH_SEAM}" fill="none" stroke="${paper}"`
  + ` stroke-width="2.6" stroke-linecap="round" opacity=".6"/>`;

/**
 * One creature, as inline SVG.
 *
 * `tone` and `paper` are CSS values, so a caller can hand in palette tokens and
 * let the browser resolve them per theme. The eyes are hard-coded white with a
 * dark pupil in every theme: tying them to the page colour made them vanish in
 * dark mode, which is the bug the logo hit first.
 */
export function creature(kind, {
  tone = 'var(--room, var(--gp-accent, #BA5828))',
  paper = 'var(--gp-bg, #FDFBF7)',
  /* Inner ear. Not `paper`: the creature sits on a white tile, so a page-
     coloured inner ear all but disappears. The room's own tint shows. */
  inner = 'var(--room-soft, var(--gp-accent-soft, #FBEDE4))',
  label = ''
} = {}) {
  const a11y = label
    ? ` role="img" aria-label="${label}"`
    : ' aria-hidden="true"';
  return `<svg class="cz-creature" viewBox="0 0 64 64"${a11y} focusable="false">`
    + earPair(kind, tone, inner).join('')
    + `<circle cx="21.5" cy="27" r="11" fill="#FFFFFF" stroke="#2B2926" stroke-width="2.6"/>`
    + `<circle cx="42.5" cy="27" r="11" fill="#FFFFFF" stroke="#2B2926" stroke-width="2.6"/>`
    + `<circle cx="24.5" cy="25.5" r="4.6" fill="#2B2926"/>`
    + `<circle cx="45.5" cy="25.5" r="4.6" fill="#2B2926"/>`
    + `<circle cx="26.3" cy="23.6" r="1.6" fill="#FFFFFF"/>`
    + `<circle cx="47.3" cy="23.6" r="1.6" fill="#FFFFFF"/>`
    + wall(tone, paper)
    + `</svg>`;
}

/* ------------------------------------------------------------------ */
/* The rooms                                                           */
/* ------------------------------------------------------------------ */

/**
 * Order is the order a child sees them, so the most inviting room comes first
 * and the test practice comes last. `hue` is a palette key; `status` is 'live'
 * or 'soon'. Anything marked 'soon' is shown greyed and is not a link.
 */
export const ROOMS = [
  {
    id: 'math',
    name: 'Math Lab',
    hue: 'sky',
    creature: 'owl',
    href: '#/math',
    status: 'live',
    blurb: 'Primes, infinity, secret codes and puzzles nobody has solved yet.',
    meta: '86 topics · grades 1 to 6'
  },
  {
    id: 'fun',
    name: 'Fun and Games',
    hue: 'flamingo',
    /* Owl tufts and fox ears are both triangles and read alike at 46px. The
       three live rooms take the three most unlike silhouettes there are:
       sharp tufts, tall ears, round ears. */
    creature: 'rabbit',
    href: '#/fun',
    status: 'live',
    blurb: 'Name every flag in the world. Name a country from its shape alone.',
    meta: '2 games · 492 things to learn'
  },
  {
    id: 'chess',
    name: 'Chess Club',
    hue: 'leaf',
    creature: 'fox',
    href: '#/chess',
    status: 'live',
    blurb: 'Meet the six pieces, win your first game, then learn the tricks.',
    meta: '15 lessons \u00b7 8 games \u00b7 3,250 puzzles'
  },
  {
    id: 'gifted',
    name: 'GiftedPrep',
    hue: 'orchid',
    creature: 'bear',
    href: '#/gifted',
    status: 'live',
    blurb: 'The kinds of puzzles used on gifted tests, so test day is not a surprise.',
    meta: '1,576 puzzles · grades 1 to 4'
  }
];

export const LIVE_ROOMS = ROOMS.filter((r) => r.status === 'live');
export const roomById = (id) => ROOMS.find((r) => r.id === id) || null;

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

/** One room, as a card. A 'soon' room is a div, so it cannot be clicked. */
export function roomCard(room) {
  const soon = room.status !== 'live';
  const tag = soon ? 'div' : 'a';
  const attrs = soon ? '' : ` href="${room.href}"`;
  return `<${tag} class="cz-tile cz-tile--${room.hue}${soon ? ' is-soon' : ''}"${attrs}>
      <span class="cz-tile__pic">${creature(room.creature)}</span>
      <span class="cz-tile__text">
        <span class="cz-tile__name">${esc(room.name)}</span>
        <span class="cz-tile__blurb">${esc(room.blurb)}</span>
        <span class="cz-tile__meta">${soon ? 'Being built' : esc(room.meta)}</span>
      </span>
      ${soon ? '' : '<span class="cz-tile__go" aria-hidden="true">&rarr;</span>'}
    </${tag}>`;
}

export function roomGrid(rooms = ROOMS) {
  return `<div class="cz-tiles">${rooms.map(roomCard).join('')}</div>`;
}

export default { ROOMS, LIVE_ROOMS, roomById, roomCard, roomGrid, creature, CREATURES };
