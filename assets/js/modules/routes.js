/**
 * routes.js — where each screen goes back to.
 *
 * Kept out of app.js so it can be reasoned about and tested without a DOM. It
 * is pure: a hash in, a destination out.
 */

/**
 * Where "back" goes from here.
 *
 * One function rather than a chain of conditions, because the chain grew a hole:
 * nothing matched #/math, so a child inside a Math Lab lesson was thrown all the
 * way out to the home page instead of up to the grade they were working through.
 *
 * The rule is simply one step up the path. Returns null on the home page, which
 * is the top, and on screens that carry their own labelled link.
 */
export function backTarget(hash = location.hash || '#/home') {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [head, a] = parts;

  if (!head || head === 'home') return null;

  /* The games label their own way out: "Back to games", "Change the round". */
  if (head === 'fun' && parts.length > 1) return null;

  switch (head) {
    case 'fun':
    case 'gifted':
    case 'math':
      /* #/math/1/four-colours -> #/math/1 -> #/math -> home */
      if (head === 'math' && parts.length >= 3) return { href: `#/math/${a}`, label: `Grade ${a}` };
      if (head === 'math' && parts.length === 2) return { href: '#/math', label: 'Math Lab' };
      return { href: '#/home', label: 'Home' };
    case 'tests':
      return { href: '#/gifted', label: 'GiftedPrep' };
    case 'categories':
      return a === 'all'
        ? { href: '#/gifted', label: 'GiftedPrep' }
        : { href: '#/tests', label: 'Tests' };
    case 'quiz':
      return { href: null, label: 'Leave this set', action: 'leave-quiz' };
    case 'results':
      return { href: '#/gifted', label: 'GiftedPrep' };
    case 'parents':
      return { href: '#/gifted', label: 'GiftedPrep' };
    default:
      return { href: '#/home', label: 'Home' };
  }
}
