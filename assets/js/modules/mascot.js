/**
 * mascot.js — the CurioZoo mascot, alive.
 *
 * The logo is a creature peeking over the wall of its enclosure. Static, that
 * is a mark. Given a blink and a glance it becomes something a six year old
 * says hello to, which is the whole point of putting an animal on a site about
 * sitting a test.
 *
 * WHY THIS EXISTS ALONGSIDE assets/img/logo/anim/*.svg
 * Those files are SMIL, self-contained, and right for a splash screen, a README
 * or a native launch image. They cannot read prefers-reduced-motion and they
 * cannot be told that a child just got a question right. This module is the
 * other half: one inline SVG whose mood is a data attribute, animated by
 * keyframes in design-system.css, which the reduced-motion block already
 * switches off for anyone who asked for less movement.
 *
 * The geometry is imported from sections.js rather than copied, so the animated
 * mascot and the eight static room creatures can never drift apart.
 *
 * MOODS
 *   idle     breathing, blinking, glancing about. The resting state, and not
 *            a still one: three loops of different lengths run at once so the
 *            combination takes almost a minute to repeat.
 *   curious  looks around, twitches its ears, tilts its head. The signature.
 *   happy    hops, eyes turn to arcs, mouth opens wide, three sparkles.
 *   oops     ducks behind the bar, looks down, mouth turns down a little.
 *   think    eyes up, ears down, mouth flat, three dots. Instead of a spinner.
 *   sleep    eyes shut, slow breath, drifting z.
 *   wink     one eye shut and a wide smile. For a small reward.
 *   wow      eyes wide, ears up, a round open mouth. For a surprise.
 *
 * THE MOUTH
 * The bar under the eyes carries a seam along its centre. Every expression is
 * that one path scaled vertically about its own end points, so the corners
 * never move and the curve deepens, flattens or inverts. One path, eight
 * faces, and the logo's silhouette never changes.
 */

import { EYE, MOUTH_LINE, MOUTH_SEAM, earPair } from './sections.js';

export const MOODS = ['idle', 'curious', 'happy', 'oops', 'think', 'sleep', 'wink', 'wow'];

const c = (o, fill, extra = '') =>
  `<circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="${fill}"${extra}/>`;

/* A four-pointed star, drawn around its own origin so a translate places it. */
const SPARK = 'M0 -4.4 Q0.8 -0.8 4.4 0 Q0.8 0.8 0 4.4 Q-0.8 0.8 -4.4 0 Q-0.8 -0.8 0 -4.4 Z';

/**
 * The mascot, as inline SVG.
 *
 * @param {object}  [o]
 * @param {string}  [o.mood='idle']   one of MOODS
 * @param {string}  [o.kind='logo']   which ears; any creature from sections.js
 * @param {string}  [o.tone]          CSS colour for ears and wall
 * @param {string}  [o.inner]         CSS colour for the inner ear
 * @param {string}  [o.paper]         CSS colour for the rails on the wall
 * @param {string}  [o.className='']  extra classes on the <svg>
 * @param {string}  [o.label='']      an accessible name; without one it is
 *                                    hidden, which is right beside a wordmark
 *                                    that already says CurioZoo
 * @returns {string} SVG markup
 */
export function mascot({
  mood = 'idle',
  kind = 'logo',
  /* One level of indirection on purpose. The CSP drops style attributes, so a
     caller cannot recolour a mascot at the point of use; a container CAN set
     --cz-mascot-tone in the stylesheet. That is how the mascot on the dark
     welcome panel gets a colour that is legible there, given the brand orange
     is not allowed to sit on Deep. */
  tone = 'var(--cz-mascot-tone, var(--gp-accent, #BA5828))',
  inner = 'var(--cz-mascot-inner, var(--gp-accent-soft, #FBEDE4))',
  paper = 'var(--cz-mascot-paper, var(--gp-bg, #FDFBF7))',
  className = '',
  label = ''
} = {}) {
  const [earL, earR] = earPair(kind, tone, inner);
  const a11y = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  const cls = `cz-mascot${className ? ` ${className}` : ''}`;

  /* Eyes are built three ways and cross-faded, never bent from one into
     another: a circle squashed upwards reads as a wince, not a smile.

     All three keep the white disc. Only what sits inside it changes. The first
     attempt replaced the whole eye with a bold dark arc, which was far more
     readable at 32px and completely invisible in dark mode and on the Deep
     welcome panel, because #2B2926 on #1E222A is nothing. The white disc is
     the one part of this mascot that is white in every theme, so it is also
     the only safe thing to draw dark ink on. */
  const open = `<g class="cz-mascot__eyes cz-mascot__eyes--open">`
    + `<g class="cz-mascot__eye cz-mascot__eye--l">`
    + c(EYE.disc[0], '#FFFFFF', ' stroke="#2B2926" stroke-width="2.6" vector-effect="non-scaling-stroke"')
    + `</g>`
    + `<g class="cz-mascot__eye cz-mascot__eye--r">`
    + c(EYE.disc[1], '#FFFFFF', ' stroke="#2B2926" stroke-width="2.6" vector-effect="non-scaling-stroke"')
    + `</g>`
    /* Both pupils in one group, so the two eyes can never look different
       ways. Cross-eyed is the failure this prevents. */
    + `<g class="cz-mascot__pupils">`
    + `<g class="cz-mascot__eye cz-mascot__eye--l">`
    + c(EYE.pupil[0], '#2B2926') + c(EYE.glint[0], '#FFFFFF') + `</g>`
    + `<g class="cz-mascot__eye cz-mascot__eye--r">`
    + c(EYE.pupil[1], '#2B2926') + c(EYE.glint[1], '#FFFFFF') + `</g>`
    + `</g></g>`;

  const arcs = (cls2, d1, d2) =>
    `<g class="cz-mascot__eyes cz-mascot__eyes--${cls2}" fill="none" stroke="#2B2926"`
    + ` stroke-width="3.2" stroke-linecap="round"><path d="${d1}"/><path d="${d2}"/></g>`;

  return `<svg class="${cls}" data-mood="${mood}" data-home="${mood}"`
    + ` viewBox="0 0 64 64"${a11y} focusable="false">`
    + `<g class="cz-mascot__head">`
    + `<g class="cz-mascot__ear cz-mascot__ear--l">${earL}</g>`
    + `<g class="cz-mascot__ear cz-mascot__ear--r">${earR}</g>`
    + open
    + arcs('happy', 'M15 29.5 Q21.5 21 28 29.5', 'M36 29.5 Q42.5 21 49 29.5')
    + arcs('sleep', 'M15 25 Q21.5 31.5 28 25', 'M36 25 Q42.5 31.5 49 25')
    + `</g>`
    /* Drawn after the head, so ducking hides it rather than sliding it out.
       The bar and the seam are separate elements here, unlike sections.js's
       wall(), because the seam has to be animatable on its own. */
    + `<path class="cz-mascot__bar" d="${MOUTH_LINE}" fill="none" stroke="${tone}"`
    + ` stroke-width="22" stroke-linecap="round"/>`
    + `<path class="cz-mascot__mouth" d="${MOUTH_SEAM}" fill="none" stroke="${paper}"`
    + ` stroke-width="2.6" stroke-linecap="round" opacity=".6"`
    /* Without this a deepened smile is also a thicker one, because a CSS
       scale takes the stroke with it. */
    + ` vector-effect="non-scaling-stroke"/>`
    /* The one expression the seam cannot make: a round open mouth. */
    + `<ellipse class="cz-mascot__oh" cx="32" cy="51" rx="4.4" ry="5.4" fill="#2B2926"/>`
    /* Sparkles, thinking dots and sleeping z. All three are always in the
       markup at zero opacity; the mood decides which one runs. Twelve extra
       nodes is cheaper than rebuilding the SVG on every answer. */
    + `<g class="cz-mascot__fx" fill="${tone}">`
    + `<g class="cz-mascot__spark cz-mascot__spark--1"><path d="${SPARK}"/></g>`
    + `<g class="cz-mascot__spark cz-mascot__spark--2"><path d="${SPARK}"/></g>`
    + `<g class="cz-mascot__spark cz-mascot__spark--3"><path d="${SPARK}"/></g>`
    + `<circle class="cz-mascot__dot cz-mascot__dot--1" cx="26" cy="4" r="2.4"/>`
    + `<circle class="cz-mascot__dot cz-mascot__dot--2" cx="32" cy="4" r="2.4"/>`
    + `<circle class="cz-mascot__dot cz-mascot__dot--3" cx="38" cy="4" r="2.4"/>`
    + `<g class="cz-mascot__z" fill="none" stroke="${tone}" stroke-width="2.2"`
    + ` stroke-linecap="round" stroke-linejoin="round">`
    + `<path class="cz-mascot__z1" d="M46 26 h5.5 l-5.5 6.5 h5.5"/>`
    + `<path class="cz-mascot__z2" d="M46 26 h5.5 l-5.5 6.5 h5.5"/>`
    + `<path class="cz-mascot__z3" d="M46 26 h5.5 l-5.5 6.5 h5.5"/>`
    + `</g></g>`
    + `</svg>`;
}

/* ------------------------------------------------------------------ */
/* Driving it                                                          */
/* ------------------------------------------------------------------ */

/* One pending revert per mascot. A WeakMap so a mascot removed from the page
   takes its timer's only reference with it. */
const timers = new WeakMap();

/** The <svg> itself, whether given the svg or the slot that holds it. */
const svgOf = (el) => (!el ? null
  : el.classList?.contains('cz-mascot') ? el
    : el.querySelector?.('.cz-mascot') || null);

/**
 * Put a mascot in a mood, optionally for a while.
 *
 * @param {Element|null} el         the mascot, or any element containing one
 * @param {string} mood             one of MOODS
 * @param {number} [revertMs=0]     go back to the resting mood after this long
 */
export function setMood(el, mood, revertMs = 0) {
  const svg = svgOf(el);
  if (!svg || !MOODS.includes(mood)) return;
  clearTimeout(timers.get(svg));
  timers.delete(svg);
  svg.dataset.mood = mood;
  if (revertMs > 0) {
    timers.set(svg, setTimeout(() => {
      svg.dataset.mood = svg.dataset.home || 'idle';
      timers.delete(svg);
    }, revertMs));
  }
}

/** Change what a mascot goes back to, and go there now if nothing is pending. */
export function setHome(el, mood) {
  const svg = svgOf(el);
  if (!svg || !MOODS.includes(mood)) return;
  svg.dataset.home = mood;
  if (!timers.has(svg)) svg.dataset.mood = mood;
}

/**
 * Fill every <span data-mascot> in `root`, the way shell.js fills data-icon.
 *
 * The slot carries its own settings, so index.html can place a mascot without
 * any matching line of JavaScript:
 *   <span data-mascot="curious" data-mascot-kind="fox"></span>
 */
export function hydrateMascots(root = document) {
  root.querySelectorAll('[data-mascot]').forEach((el) => {
    if (el.dataset.mascotDone === '1') return;
    el.innerHTML = mascot({
      mood: MOODS.includes(el.dataset.mascot) ? el.dataset.mascot : 'idle',
      kind: el.dataset.mascotKind || 'logo',
      label: el.dataset.mascotLabel || ''
    });
    el.dataset.mascotDone = '1';
  });
}

export default { mascot, setMood, setHome, hydrateMascots, MOODS };
