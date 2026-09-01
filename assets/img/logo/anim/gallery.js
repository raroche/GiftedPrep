/**
 * The gallery page. Not part of the app: nothing in index.html links here, and
 * the page carries robots noindex. It exists so a change to the mascot can be
 * looked at in every mood and at every size in one screen, which is the only
 * way to catch the ones that break at 32px.
 */
import { mascot, hydrateMascots, setMood, MOODS } from '../../../js/modules/mascot.js';
import { CREATURES } from '../../../js/modules/sections.js';

const NOTES = {
  idle:    'Top bar. Breath and blink.',
  curious: 'The signature. Looks around.',
  happy:   'After a right answer.',
  oops:    'After a wrong one. Ducks, never sulks.',
  think:   'Instead of a spinner.',
  sleep:   'App left open.'
};

const FILES = [
  ['mascot-blink.svg',        'The quiet default'],
  ['mascot-curious.svg',      'Looks around'],
  ['mascot-peek.svg',         'Rises and ducks'],
  ['mascot-cheer.svg',        'Hops, sparkles'],
  ['mascot-think.svg',        'Loading'],
  ['mascot-sleep.svg',        'Idle']
];

hydrateMascots();

/* The driveable one. */
const live = document.getElementById('an-live');
const bar = document.getElementById('an-moods');
bar.innerHTML = MOODS.map((m) =>
  `<button type="button" class="gp-btn gp-btn--quiet" data-mood="${m}">${m}</button>`).join('');
bar.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-mood]');
  if (b) setMood(live, b.dataset.mood);
});

/* Every mood, at the three sizes it actually ships at. */
document.getElementById('an-grid').innerHTML = MOODS.map((m) => `
  <div class="an-cell">
    <div class="an-cell__sizes">
      <span class="an-cell__s32">${mascot({ mood: m })}</span>
      <span class="an-cell__s64">${mascot({ mood: m })}</span>
    </div>
    <span class="an-cell__name">${m}</span>
    <span class="an-cell__note">${NOTES[m]}</span>
  </div>`).join('');

/* The whole zoo, alive. Same eyes, different ears. */
document.getElementById('an-zoo').innerHTML = CREATURES.map((k) => `
  <div class="an-cell">
    <span class="an-cell__pic">${mascot({ mood: 'curious', kind: k })}</span>
    <span class="an-cell__name">${k}</span>
  </div>`).join('');

/* The standalone files, loaded as <img> exactly as a splash screen would. */
document.getElementById('an-files').innerHTML = FILES.map(([f, note]) => `
  <div class="an-cell">
    <img class="an-cell__pic" src="${f}" alt="${f}">
    <span class="an-cell__name">${f.replace('mascot-', '').replace('.svg', '')}</span>
    <span class="an-cell__note">${note}</span>
  </div>`).join('')
  + `<div class="an-cell an-cell--wide">
       <img class="an-cell__pic" src="curiozoo-logo-intro.svg" alt="curiozoo-logo-intro.svg">
       <span class="an-cell__name">logo-intro</span>
       <span class="an-cell__note">Reload to replay</span>
     </div>`;
