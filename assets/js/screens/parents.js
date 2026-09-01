/**
 * screens/parents.js — the Parent Guide screen.
 *
 * The guide's content lives in modules/parents.js; this is only the screen
 * around it and the language switch.
 */

import * as storage from './../modules/storage.js';
import { renderParentGuide } from './../modules/parents.js';
import { $, paint, state } from './../modules/shell.js';

/* ------------------------------------------------------------------ */
/* Parent guide                                                        */
/* ------------------------------------------------------------------ */

const GUIDE_TITLE = { en: 'For parents', es: 'Para padres' };
/* The button offers the language you are NOT reading, so it shows that flag. */
const LANG_SWITCH = {
  en: { flag: '🇪🇸', label: 'Español', aria: 'Ver esta guía en español', lang: 'es' },
  es: { flag: '🇺🇸', label: 'English', aria: 'Read this guide in English', lang: 'en' }
};

export function renderParents() {
  const lang = state.settings.guideLang === 'es' ? 'es' : 'en';
  const body = $('#gp-parents-body');
  if (body.dataset.lang !== lang) {
    body.innerHTML = renderParentGuide(state.manifest, lang);
    body.dataset.lang = lang;
    body.setAttribute('lang', lang);
    paint();
  }
  $('#parents-title').textContent = GUIDE_TITLE[lang];
  document.getElementById('screen-parents').setAttribute('lang', lang);

  const sw = LANG_SWITCH[lang];
  const btn = $('#gp-lang-toggle');
  btn.querySelector('.gp-flag').textContent = sw.flag;
  btn.querySelector('.gp-btn__label').textContent = sw.label;
  btn.setAttribute('aria-label', sw.aria);
  btn.setAttribute('lang', sw.lang);
}

export function toggleGuideLanguage() {
  const next = state.settings.guideLang === 'es' ? 'en' : 'es';
  state.settings.guideLang = next;
  storage.setSetting('guideLang', next);
  renderParents();
  $('#parents-title').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'auto' });
}
