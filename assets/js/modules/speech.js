/**
 * speech.js — Read-aloud using the browser's built-in speech synthesis.
 *
 * Grade 1 and 2 children take these tests with the questions read to them by a
 * proctor, so read-aloud is not a nicety here: it is what makes the practice
 * match the real thing for a six-year-old who cannot yet read the stem.
 *
 * No account and no audio files. Voices are chosen local-first: some browsers
 * ship cloud-backed voices whose names contain "Online", and those send the
 * text to a server to be spoken. A device voice is always preferred, and a
 * network-backed one is used only when the device offers nothing else. What is
 * actually in use can be read with `usingLocalVoice()`.
 *
 * If the browser has no voices (some Linux builds, some kiosk browsers) the
 * module degrades to a no-op and `isSupported()` returns false so the UI can
 * hide the speaker button instead of showing a dead control.
 */

const SUPPORTED = typeof window !== 'undefined'
  && 'speechSynthesis' in window
  && typeof window.SpeechSynthesisUtterance === 'function';

/* Voices load asynchronously in Safari and Chrome. Cache once ready. */
let voices = [];
let preferredVoice = null;

/* Voices that sound friendly and are widely present on Apple devices first,
   then common Windows/Android ones. Order is the preference order. */
const VOICE_WISHLIST = [
  'Samantha', 'Karen', 'Moira', 'Tessa',       // Apple en-US / en-AU / en-IE / en-ZA
  'Google US English',
  'Microsoft Zira - English (United States)'   // on-device Windows voice
];

/* A voice is treated as leaving the device if the browser says it is not a
   local service, or if its name carries the "Online" marker Microsoft uses for
   its cloud voices. Either is enough to prefer something else. */
const isLocalVoice = (v) => v.localService !== false && !/\bonline\b/i.test(v.name);

function pickVoice() {
  if (!SUPPORTED) return null;
  voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const local = voices.filter(isLocalVoice);
  /* Try the wishlist among device voices first, then any device voice, and
     only then fall back to whatever is left, which may be network-backed. */
  for (const pool of [local, voices]) {
    for (const wanted of VOICE_WISHLIST) {
      const hit = pool.find((v) => v.name === wanted);
      if (hit) return hit;
    }
    const en = pool.find((v) => /^en[-_]US/i.test(v.lang)) || pool.find((v) => /^en/i.test(v.lang));
    if (en) return en;
  }
  return voices.find((v) => /^en[-_]US/i.test(v.lang))
    || voices.find((v) => /^en/i.test(v.lang))
    || voices[0];
}

if (SUPPORTED) {
  preferredVoice = pickVoice();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    preferredVoice = pickVoice();
  });
}

/* ------------------------------------------------------------------ */

let enabled = true;
let rate = 0.85;              // a little slower than default; kinder to young ears
const listeners = new Set();

function emit(state) { listeners.forEach((fn) => fn(state)); }

/** True when the voice in use is a device voice, so nothing leaves the machine.
    Null when no voice has been chosen yet. */
export function usingLocalVoice() {
  if (!preferredVoice) return null;
  return isLocalVoice(preferredVoice);
}

export function isSupported() { return SUPPORTED; }

export function isEnabled() { return SUPPORTED && enabled; }

export function setEnabled(value) {
  enabled = Boolean(value);
  if (!enabled) cancel();
  emit(enabled ? 'idle' : 'off');
  return enabled;
}

export function getRate() { return rate; }

export function setRate(value) {
  rate = Math.max(0.5, Math.min(1.3, Number(value) || 0.85));
  return rate;
}

export function cancel() {
  if (!SUPPORTED) return;
  try { window.speechSynthesis.cancel(); } catch { /* Safari can throw when idle */ }
  emit('idle');
}

/**
 * Speak text. Cancels anything already playing so taps never pile up — a child
 * mashing the speaker button should restart, not queue five copies.
 *
 * @param {string|string[]} text  a string, or parts spoken with a pause between
 * @param {{ force?: boolean }} [opts] force speaks even when muted
 * @returns {Promise<void>} resolves when speech finishes or is cancelled
 */
export function speak(text, opts = {}) {
  if (!SUPPORTED) return Promise.resolve();
  if (!enabled && !opts.force) return Promise.resolve();

  const parts = (Array.isArray(text) ? text : [text])
    .map((t) => cleanForSpeech(t))
    .filter(Boolean);
  if (!parts.length) return Promise.resolve();

  cancel();
  emit('speaking');

  return new Promise((resolve) => {
    let index = 0;
    const next = () => {
      if (index >= parts.length) { emit('idle'); resolve(); return; }
      const u = new window.SpeechSynthesisUtterance(parts[index]);
      index += 1;
      if (preferredVoice) u.voice = preferredVoice;
      u.lang = (preferredVoice && preferredVoice.lang) || 'en-US';
      u.rate = rate;
      u.pitch = 1.05;
      u.volume = 1;
      u.onend = next;
      u.onerror = () => { emit('idle'); resolve(); };
      try {
        window.speechSynthesis.speak(u);
      } catch {
        emit('idle');
        resolve();
      }
    };
    next();
  });
}

/**
 * Strip characters that speech engines read out awkwardly, and expand the few
 * symbols that appear in maths stems so "3 + 4" is not read as "three four".
 */
export function cleanForSpeech(raw) {
  if (raw == null) return '';
  return String(raw)
    .replace(/\s*[?]\s*$/, '?')
    .replace(/([0-9])\s*\+\s*([0-9])/g, '$1 plus $2')
    .replace(/([0-9])\s*[-−]\s*([0-9])/g, '$1 minus $2')
    .replace(/([0-9])\s*[x×*]\s*([0-9])/g, '$1 times $2')
    .replace(/([0-9])\s*[÷/]\s*([0-9])/g, '$1 divided by $2')
    .replace(/\s*=\s*/g, ' equals ')
    .replace(/\s*::\s*/g, ' is to ')
    .replace(/\s+:\s+/g, ' is to ')
    .replace(/[_]{2,}/g, ' blank ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Subscribe to 'speaking' | 'idle' | 'off'. Returns an unsubscribe function. */
export function onStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * iOS Safari refuses to speak until synthesis has been triggered inside a real
 * user gesture. Call this once from the first tap to unlock audio.
 */
export function unlock() {
  if (!SUPPORTED) return;
  try {
    const u = new window.SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch { /* nothing to do; speech simply stays unavailable */ }
}

export default { isSupported, isEnabled, setEnabled, speak, cancel, unlock, onStateChange, setRate, getRate, cleanForSpeech };
