/**
 * Applying styles that have to be computed at runtime.
 *
 * The site ships a strict Content-Security-Policy with `style-src 'self'` and
 * no 'unsafe-inline'. That means the browser silently DISCARDS any
 * `style="..."` attribute in markup we build as a string. Nothing errors and
 * nothing appears in the console; the declaration is simply gone.
 *
 * It cost real bugs before it was found: the results bar chart drew every bar
 * at zero width, and the map-colouring grid collapsed to six-pixel cells,
 * both only in production. A local dev server sends no CSP, so everything
 * looked correct right up until it was deployed.
 *
 * Setting the same declaration through the CSSOM from JavaScript is NOT
 * blocked by style-src, so the fix is to carry the value in a data attribute
 * and apply it after the markup is in the document. Verified against the live
 * site: the attribute form is dropped, `el.style.cssText` is honoured.
 *
 * Usage: write `data-style="width:60%"` instead of `style="width:60%"`, then
 * call applyStyles() on the container, or use setHtml() which does both.
 */

/** Apply every data-style inside `root` (and on `root` itself). */
export function applyStyles(root) {
  if (!root) return;
  const nodes = root.querySelectorAll('[data-style]');
  nodes.forEach((el) => {
    el.style.cssText = el.dataset.style;
    el.removeAttribute('data-style');
  });
  if (root.dataset && root.dataset.style) {
    root.style.cssText = root.dataset.style;
    root.removeAttribute('data-style');
  }
}

/** innerHTML, then apply any runtime styles it carried. */
export function setHtml(el, html) {
  if (!el) return;
  el.innerHTML = html;
  applyStyles(el);
}

export default { applyStyles, setHtml };
