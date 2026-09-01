/**
 * elemart.js — a drawn picture for each everyday use of an element.
 *
 * Photographs of element samples were the obvious idea and are the wrong one
 * here. The site ships `img-src 'self'`, so all 118 would have to be bundled;
 * they carry a spread of licences; and a jar of grey powder is not what makes
 * an element memorable to a child. What does is meeting it somewhere real,
 * which is why every picture here is the USE rather than the substance: a
 * pencil for carbon, a balloon for helium, a banana for potassium.
 *
 * Flat shapes on the same 64 grid as the rest of the site's art, taking the
 * palette so they re-theme with the page.
 */

const T = 'var(--room, var(--gp-accent, #BA5828))';   /* the element's colour */
const P = 'var(--room-soft, var(--gp-accent-soft))';  /* its pale tint        */
const K = 'var(--gp-ink)';                            /* outline / detail     */

/* Each entry returns the innards of a 0 0 64 64 svg. */
const ART = {
  sun: () => `<circle cx="32" cy="32" r="13" fill="${T}"/>`
    + `<path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.5 13.5l5 5M45.5 45.5l5 5`
    + `M50.5 13.5l-5 5M18.5 45.5l-5 5" stroke="${T}" stroke-width="4"`
    + ` stroke-linecap="round" fill="none"/>`,

  balloon: () => `<path d="M32 8c9 0 15 7 15 15 0 10-10 17-15 20-5-3-15-10-15-20 0-8 6-15 15-15Z" fill="${T}"/>`
    + `<path d="M32 43c2 4-3 6-1 10s3 5 3 8" stroke="${K}" stroke-width="2.4"`
    + ` fill="none" stroke-linecap="round"/>`,

  battery: () => `<rect x="12" y="18" width="34" height="28" rx="5" fill="none" stroke="${T}" stroke-width="4"/>`
    + `<rect x="46" y="27" width="7" height="10" rx="2" fill="${T}"/>`
    + `<rect x="17" y="23" width="12" height="18" rx="2" fill="${T}"/>`,

  pencil: () => `<path d="M14 50l4-11 24-24 7 7-24 24Z" fill="${T}"/>`
    + `<path d="M42 15l4-4a3.5 3.5 0 0 1 5 5l-4 4Z" fill="${K}"/>`
    + `<path d="M14 50l7-3-4-4Z" fill="${K}"/>`,

  cloud: () => `<path d="M20 42a9 9 0 0 1 1-18 13 13 0 0 1 24 3 8 8 0 0 1-2 15Z" fill="${T}"/>`
    + `<path d="M16 50h20M42 50h8" stroke="${T}" stroke-width="3.4"`
    + ` stroke-linecap="round" fill="none" opacity=".5"/>`,

  bubble: () => `<circle cx="27" cy="30" r="13" fill="none" stroke="${T}" stroke-width="4"/>`
    + `<circle cx="45" cy="44" r="7" fill="none" stroke="${T}" stroke-width="3.4"/>`
    + `<circle cx="22" cy="25" r="3.2" fill="${T}" opacity=".55"/>`,

  toothbrush: () => `<rect x="10" y="26" width="30" height="9" rx="4" fill="${T}"/>`
    + `<path d="M40 30h13" stroke="${T}" stroke-width="7" stroke-linecap="round"/>`
    + `<path d="M14 26v-7M20 26v-7M26 26v-7M32 26v-7" stroke="${K}"`
    + ` stroke-width="3" stroke-linecap="round"/>`,

  sign: () => `<rect x="12" y="14" width="40" height="26" rx="6" fill="none" stroke="${T}" stroke-width="4"/>`
    + `<path d="M22 33V21l8 12V21" stroke="${T}" stroke-width="3.6" fill="none"`
    + ` stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="M38 21h6M38 27h5M38 33h6" stroke="${T}" stroke-width="3.4" stroke-linecap="round"/>`
    + `<path d="M32 40v10M24 50h16" stroke="${T}" stroke-width="3.4" stroke-linecap="round"/>`,

  salt: () => `<path d="M22 24h20l4 26a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4Z" fill="${T}"/>`
    + `<path d="M22 24c0-6 4-10 10-10s10 4 10 10Z" fill="${K}"/>`
    + `<circle cx="28" cy="10" r="1.9" fill="${T}"/><circle cx="36" cy="7" r="1.9" fill="${T}"/>`
    + `<circle cx="32" cy="4" r="1.6" fill="${T}"/>`,

  spark: () => `<path d="M32 6l5 15 15 5-15 5-5 15-5-15-15-5 15-5Z" fill="${T}"/>`
    + `<path d="M50 44l2.4 6.6 6.6 2.4-6.6 2.4L50 62l-2.4-6.6L41 53l6.6-2.4Z" fill="${T}"/>`,

  can: () => `<rect x="20" y="12" width="24" height="40" rx="5" fill="${T}"/>`
    + `<ellipse cx="32" cy="13" rx="12" ry="4.4" fill="${P}" stroke="${T}" stroke-width="2.6"/>`
    + `<path d="M24 26h16M24 33h16" stroke="${P}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,

  chip: () => `<rect x="18" y="18" width="28" height="28" rx="4" fill="${T}"/>`
    + `<rect x="26" y="26" width="12" height="12" rx="2" fill="${P}"/>`
    + `<path d="M24 18v-7M32 18v-7M40 18v-7M24 46v7M32 46v7M40 46v7`
    + `M18 24h-7M18 32h-7M18 40h-7M46 24h7M46 32h7M46 40h7"`
    + ` stroke="${T}" stroke-width="3" stroke-linecap="round"/>`,

  match: () => `<path d="M26 54L38 18" stroke="${T}" stroke-width="5.5" stroke-linecap="round"/>`
    + `<path d="M40 16c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7Z" fill="${K}"/>`
    + `<path d="M40 6c3 4 2 7 0 10-2-3-3-6 0-10Z" fill="${T}"/>`,

  volcano: () => `<path d="M8 52h48L38 18h-12Z" fill="${T}"/>`
    + `<path d="M26 18h12l-3 8h-6Z" fill="${K}"/>`
    + `<path d="M32 12c2-4 6-4 6-8 3 5-1 8-2 11Z" fill="${T}"/>`,

  drop: () => `<path d="M32 8c8 12 14 18 14 26a14 14 0 0 1-28 0c0-8 6-14 14-26Z" fill="${T}"/>`
    + `<circle cx="26" cy="36" r="3.4" fill="${P}"/>`,

  banana: () => `<path d="M14 20c0 18 12 30 30 30 6 0 8-4 6-6-14 0-24-10-24-24 0-3-4-4-6-4-3 0-6 1-6 4Z"`
    + ` fill="${T}"/><path d="M44 50c4 0 6-2 6-4" stroke="${K}" stroke-width="2.6" fill="none"/>`,

  bone: () => `<path d="M18 26a7 7 0 1 1 6 10l16 6a7 7 0 1 1 4 10 7 7 0 0 1-10-4l-16-6a7 7 0 1 1 0-16Z"`
    + ` fill="${T}"/>`,

  plane: () => `<path d="M32 6c3 0 5 5 5 12v8l18 11v6l-18-5v10l6 5v5l-11-3-11 3v-5l6-5V38L9 43v-6l18-11v-8c0-7 2-12 5-12Z"`
    + ` fill="${T}"/>`,

  magnet: () => `<path d="M16 44V28a16 16 0 0 1 32 0v16h-11V28a5 5 0 0 0-10 0v16Z" fill="${T}"/>`
    + `<rect x="16" y="44" width="11" height="10" fill="${K}"/>`
    + `<rect x="37" y="44" width="11" height="10" fill="${K}"/>`,

  wire: () => `<path d="M6 32h10M48 32h10" stroke="${T}" stroke-width="5" stroke-linecap="round"/>`
    + `<path d="M16 32c0-8 5-8 5 0s5 8 5 0 5-8 5 0 5 8 5 0 5-8 5 0 5 8 5 0"`
    + ` stroke="${T}" stroke-width="4.4" fill="none" stroke-linecap="round"/>`,

  sunblock: () => `<rect x="22" y="22" width="20" height="32" rx="5" fill="${T}"/>`
    + `<rect x="27" y="12" width="10" height="10" rx="2.5" fill="${K}"/>`
    + `<path d="M27 34h10" stroke="${P}" stroke-width="3.4" stroke-linecap="round"/>`
    + `<circle cx="50" cy="16" r="6" fill="${T}" opacity=".55"/>`,

  mirror: () => `<ellipse cx="32" cy="26" rx="15" ry="18" fill="none" stroke="${T}" stroke-width="4.5"/>`
    + `<path d="M26 18a9 9 0 0 1 8-4" stroke="${T}" stroke-width="3" stroke-linecap="round" fill="none"/>`
    + `<path d="M32 44v12M26 56h12" stroke="${T}" stroke-width="4.5" stroke-linecap="round"/>`,

  bottle: () => `<path d="M27 8h10v8l6 8v26a4 4 0 0 1-4 4H25a4 4 0 0 1-4-4V24l6-8Z" fill="${T}"/>`
    + `<rect x="25" y="4" width="14" height="6" rx="2" fill="${K}"/>`
    + `<path d="M25 34h14" stroke="${P}" stroke-width="3.4" stroke-linecap="round"/>`,

  bulb: () => `<path d="M32 8a15 15 0 0 1 9 27v5H23v-5a15 15 0 0 1 9-27Z" fill="none"`
    + ` stroke="${T}" stroke-width="4"/>`
    + `<path d="M27 30l4-7 3 6 3-6 4 7" stroke="${T}" stroke-width="2.8" fill="none"`
    + ` stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="M23 45h18M25 51h14" stroke="${K}" stroke-width="3.4" stroke-linecap="round"/>`,

  ring: () => `<circle cx="32" cy="38" r="14" fill="none" stroke="${T}" stroke-width="5"/>`
    + `<path d="M32 8l6 9-6 7-6-7Z" fill="${T}"/>`,

  thermometer: () => `<path d="M32 8a5 5 0 0 1 5 5v22a9 9 0 1 1-10 0V13a5 5 0 0 1 5-5Z"`
    + ` fill="none" stroke="${T}" stroke-width="4"/>`
    + `<circle cx="32" cy="44" r="6" fill="${T}"/><path d="M32 26v14" stroke="${T}" stroke-width="4.5"`
    + ` stroke-linecap="round"/>`,

  weight: () => `<path d="M20 24h24l6 28H14Z" fill="${T}"/>`
    + `<path d="M26 24c0-6 2-10 6-10s6 4 6 10" stroke="${K}" stroke-width="4" fill="none"/>`,

  atom: () => `<circle cx="32" cy="32" r="5" fill="${T}"/>`
    + `<ellipse cx="32" cy="32" rx="22" ry="9" fill="none" stroke="${T}" stroke-width="3.2"/>`
    + `<ellipse cx="32" cy="32" rx="22" ry="9" fill="none" stroke="${T}" stroke-width="3.2"`
    + ` transform="rotate(60 32 32)"/>`
    + `<ellipse cx="32" cy="32" rx="22" ry="9" fill="none" stroke="${T}" stroke-width="3.2"`
    + ` transform="rotate(120 32 32)"/>`
};

export const ART_KEYS = Object.keys(ART);

export function elementArt(kind, label = '') {
  const body = ART[kind];
  if (!body) return '';
  const a11y = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  return `<svg class="cz-elemart" viewBox="0 0 64 64"${a11y} focusable="false">${body()}</svg>`;
}

export default { elementArt, ART_KEYS };
