/**
 * icons.js — Inline SVG icon set.
 *
 * Inline rather than a sprite sheet or an icon font so the app works from
 * file:// with no extra requests, and so icons inherit currentColor.
 * Every icon is drawn on a 24x24 grid with a 2px stroke.
 */

const stroke = (d, extra = '') =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra} />`;

const ICONS = {
  /* Navigation and chrome */
  back:    stroke('M15 5 L8 12 L15 19'),
  close:   stroke('M6 6 L18 18 M18 6 L6 18'),
  home:    stroke('M4 11 L12 4 L20 11 V20 H4 Z'),
  settings: stroke('M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z')
    + stroke('M12 2.5v2.2M12 19.3v2.2M4.2 7l1.9 1.1M17.9 15.9l1.9 1.1M4.2 17l1.9-1.1M17.9 8.1l1.9-1.1'),
  speaker: stroke('M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z') + stroke('M15.5 9a4.5 4.5 0 0 1 0 6'),
  speakerOff: stroke('M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z') + stroke('M16 10l4 4M20 10l-4 4'),
  sun:     stroke('M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z') + stroke('M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4'),
  moon:    stroke('M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z'),
  check:   stroke('M4.5 12.5 L9.5 17.5 L19.5 6.5'),
  cross:   stroke('M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5'),
  arrowRight: stroke('M4 12h15M13 6l6 6-6 6'),
  refresh: stroke('M20 12a8 8 0 1 1-2.6-5.9') + stroke('M20 4v5h-5'),
  parent:  stroke('M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z') + stroke('M4.5 20a7.5 7.5 0 0 1 15 0'),
  sparkle: stroke('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z') + stroke('M18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z'),
  trophy:  stroke('M7 4h10v5a5 5 0 0 1-10 0Z') + stroke('M7 5.5H4.5V8a3 3 0 0 0 3 3M17 5.5h2.5V8a3 3 0 0 1-3 3M9.5 20h5M12 14v6'),
  shuffle: stroke('M4 6h3.5l9 12H20M4 18h3.5l2.3-3M14.5 7.5l2-1.5H20') + stroke('M17.5 3.5 20 6l-2.5 2.5M17.5 15.5 20 18l-2.5 2.5'),
  clock:   stroke('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z') + stroke('M12 7.5V12l3 2'),

  /* Category icons */
  grid:      stroke('M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4Z') + stroke('M13 13h7v7h-7Z', 'stroke-dasharray="3 3"'),
  series:    stroke('M3.5 12h3M9.5 12h3M15.5 12h3') + stroke('M4 8h2v8H4ZM10 8h2v8h-2Z') + stroke('M16 8h2v8h-2Z', 'stroke-dasharray="3 2"'),
  analogy:   stroke('M5.5 9a3 3 0 1 0 0-5 3 3 0 0 0 0 5Z') + stroke('M18.5 9a3 3 0 1 0 0-5 3 3 0 0 0 0 5Z') + stroke('M3 20h5l-2.5-5ZM16 20h5l-2.5-5Z') + stroke('M9.5 6.5h5M9.5 17.5h5'),
  sort:      stroke('M4 5h7v7H4Z') + stroke('M15 8.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z') + stroke('M4 15h16v6H4Z', 'stroke-dasharray="3 3"'),
  words:     stroke('M4 6h16M4 12h11M4 18h7'),
  book:      stroke('M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z') + stroke('M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5'),
  numbers:   stroke('M6 4v16M14 4v16') + stroke('M3 9h18M3 15h18'),
  calc:      stroke('M5 3h14v18H5Z') + stroke('M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01'),
  fold:      stroke('M4 4h16v16H4Z') + stroke('M12 4v16', 'stroke-dasharray="3 3"') + stroke('M9 12a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 9 12Z'),
  shapes:    stroke('M7.5 3.5 12 11H3Z') + stroke('M14 13h7v7h-7Z') + stroke('M6.5 20a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z'),
  puzzle:    stroke('M4 4h6a2 2 0 1 1 4 0h6v6a2 2 0 1 0 0 4v6h-6a2 2 0 1 0-4 0H4v-6a2 2 0 1 0 0-4Z'),
  ear:       stroke('M8 20a3 3 0 0 0 3-3c0-2.5 2-2.5 3.5-4A5.5 5.5 0 1 0 6.5 9'),
  chart:     stroke('M4 20V4') + stroke('M4 20h16') + stroke('M8 17v-5M12.5 17V7M17 17v-8'),
  listOrder: stroke('M9 6h11M9 12h11M9 18h11') + stroke('M4 5.5h1.5v4M4 13h2v1.5H4.5V16H6M4 19h2'),
  target:    stroke('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z') + stroke('M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z') + stroke('M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z'),
  rotate:    stroke('M4 12a8 8 0 1 1 3 6.2') + stroke('M3 14.5 4 19l4.5-1') + stroke('M9.5 9.5h5v5h-5Z')
};

/**
 * @param {string} name  key from ICONS
 * @param {{size?: number, className?: string, title?: string}} [opts]
 * @returns {string} inline SVG markup, or '' when the name is unknown
 */
export function icon(name, opts = {}) {
  const body = ICONS[name];
  if (!body) return '';
  const size = opts.size || 24;
  const cls = opts.className ? ` class="${opts.className}"` : '';
  const label = opts.title
    ? ` role="img" aria-label="${opts.title}"`
    : ' aria-hidden="true"';
  return `<svg${cls} width="${size}" height="${size}" viewBox="0 0 24 24"${label} focusable="false">${body}</svg>`;
}

export const ICON_NAMES = Object.keys(ICONS);
export default { icon, ICON_NAMES };
