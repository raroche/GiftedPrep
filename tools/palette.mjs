#!/usr/bin/env node
/**
 * Build and prove the CurioZoo palette.
 *
 * Colours are not eyeballed here. Each hue is stated once, then its lightness
 * is searched until it actually clears WCAG AA against the surface it will sit
 * on -- cream in the light theme, near-black in the dark one. A colour that
 * cannot clear the bar is reported rather than shipped.
 */

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (r) => '#' + r.map((v) => Math.round(v).toString(16).padStart(2, '0'))
  .join('').toUpperCase();

const lum = (h) => {
  const [r, g, b] = hex2rgb(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/* HSL so a hue can be held fixed while lightness is searched. */
const hsl2hex = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const t = [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h / 60) % 6];
  return rgb2hex(t.map((v) => (v + m) * 255));
};

/** Lowest-contrast (most colourful) shade that still clears `target` on `bg`. */
function tune(hue, sat, bg, target, { darker = true } = {}) {
  let lo = 0.02, hi = 0.98, best = null;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    const hex = hsl2hex(hue, sat, mid);
    const ok = ratio(hex, bg) >= target;
    if (ok) { best = hex; if (darker) lo = mid; else hi = mid; }
    else if (darker) hi = mid; else lo = mid;
  }
  return best;
}

/* Surfaces the palette must work against. */
export const BG = {
  lightPage: '#FDFBF7', lightCard: '#FFFFFF',
  darkPage:  '#15181E', darkCard:  '#1E222A'
};

/* Eight hues, evenly spread so no two sections can be confused. Orange is the
   brand; Lagoon sits opposite it on the wheel and is the contrast colour. */
export const HUES = [
  { key: 'mango',    name: 'Mango',    h:  20, s: 0.65, role: 'brand / primary' },
  { key: 'honey',    name: 'Honey',    h:  42, s: 0.68, role: 'section' },
  { key: 'leaf',     name: 'Leaf',     h: 132, s: 0.45, role: 'section' },
  { key: 'jade',     name: 'Jade',     h: 165, s: 0.52, role: 'section' },
  { key: 'lagoon',   name: 'Lagoon',   h: 195, s: 0.58, role: 'contrast to orange' },
  { key: 'sky',      name: 'Sky',      h: 218, s: 0.55, role: 'section' },
  { key: 'orchid',   name: 'Orchid',   h: 280, s: 0.40, role: 'section' },
  { key: 'flamingo', name: 'Flamingo', h: 338, s: 0.55, role: 'section' }
];

/** Deepest shade of `hue` that still clears `target` against Mango. */
export function tuneAgainst(hue, sat, other, target) {
  let best = null;
  for (let i = 0; i < 300; i += 1) {
    const l = 0.06 + (i / 300) * 0.5;
    const hex = hsl2hex(hue, sat, l);
    if (ratio(hex, other) >= target && ratio('#FFFFFF', hex) >= 4.5) best = hex;
  }
  return best;
}

export function build() {
  return HUES.map((c) => {
    const light = tune(c.h, c.s, BG.lightPage, 4.5);              // cream is the harder surface
    const dark  = tune(c.h, Math.min(c.s + 0.08, 1), BG.darkCard, 4.5, { darker: false });
    const softL = hsl2hex(c.h, Math.min(c.s + 0.25, 1), 0.945);   // tinted panel
    const softD = hsl2hex(c.h, 0.30, 0.135);
    const lineL = hsl2hex(c.h, Math.min(c.s + 0.05, 1), 0.80);
    const lineD = hsl2hex(c.h, 0.28, 0.30);
    return { ...c, light, dark, softL, softD, lineL, lineD };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pal = build();
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('name', 11) + pad('light', 9) + pad('on card', 9) + pad('on page', 9)
    + pad('dark', 9) + pad('on card', 9) + pad('on page', 9) + 'role');
  console.log('-'.repeat(88));
  let bad = 0;
  for (const c of pal) {
    const r = [ratio(c.light, BG.lightCard), ratio(c.light, BG.lightPage),
               ratio(c.dark, BG.darkCard),  ratio(c.dark, BG.darkPage)];
    if (r[0] < 4.5 || r[1] < 4.5 || r[2] < 4.5 || r[3] < 4.5) bad += 1;
    console.log(pad(c.name, 11) + pad(c.light, 9) + pad(r[0].toFixed(2), 9)
      + pad(r[1].toFixed(2), 9) + pad(c.dark, 9) + pad(r[2].toFixed(2), 9)
      + pad(r[3].toFixed(2), 9) + c.role);
  }
  console.log('-'.repeat(88));
  console.log(`Mango vs Lagoon, light: ${ratio(pal[0].light, pal[4].light).toFixed(2)}:1`
    + `   dark: ${ratio(pal[0].dark, pal[4].dark).toFixed(2)}:1`);
  console.log(bad ? `\n${bad} colour(s) BELOW AA` : '\nEvery colour clears AA 4.5:1 on all four surfaces.');
}
