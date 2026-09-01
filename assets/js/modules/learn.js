/**
 * learn.js — look through the answers before being asked about them.
 *
 * Every game here tests recall, which is useless if a child has never met the
 * material. So each one gets a browsing mode: one item at a time, with its name
 * shown, and a way forward and back. No score, no timer, nothing to get wrong.
 *
 * One component serves the flags, the outlines and the capitals, because they
 * are the same thing with a different picture. The periodic table gets its own
 * page instead: a table is meant to be seen whole, and its point is the shape
 * of it rather than any single cell.
 */

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

export const ORDERS = [
  { id: 'alpha', name: 'A to Z' },
  { id: 'continent', name: 'By continent' }
];

/** Sort a list for browsing. Continent order keeps A-to-Z inside each group. */
export function order(list, how, { nameOf, continentOf }) {
  const byName = (a, b) => nameOf(a).localeCompare(nameOf(b));
  if (how !== 'continent') return list.slice().sort(byName);
  return list.slice().sort((a, b) => {
    const c = String(continentOf(a) || '').localeCompare(String(continentOf(b) || ''));
    return c !== 0 ? c : byName(a, b);
  });
}

/**
 * The browser.
 *
 * `item` is { media, title, sub, note } where media is ready-made HTML — an
 * <img> for a flag, inline SVG for an outline, or nothing at all for a capital,
 * where the country name is the picture.
 */
export function renderBrowser({ title, backHref, orders, current, index, total, item, groups }) {
  const orderBtn = (o) => `
    <button type="button" class="gp-pill${current === o.id ? ' is-selected' : ''}"
            role="radio" aria-checked="${current === o.id}"
            tabindex="${current === o.id ? 0 : -1}"
            data-learnorder="${o.id}">${esc(o.name)}</button>`;

  const jump = groups && groups.length > 1 ? `
    <div class="gp-row gp-row--wrap cz-learn-jump">
      ${groups.map((g) => `
        <button type="button" class="gp-pill gp-pill--small" data-learnjump="${g.at}">
          ${esc(g.name)}
        </button>`).join('')}
    </div>` : '';

  return `
    <div class="cz-learn">
      <div class="cz-learn__bar">
        <a class="gp-btn gp-btn--ghost gp-backlink" href="${backHref}">&larr; Back to the game</a>
        <div class="gp-row gp-row--wrap" role="radiogroup" aria-label="Order">
          ${orders.map(orderBtn).join('')}
        </div>
      </div>

      <h1 class="gp-page-title cz-learn__head">${esc(title)}</h1>
      ${jump}

      <div class="cz-learn__card">
        <div class="cz-learn__media">${item.media || ''}</div>
        <p class="cz-learn__name">${esc(item.title)}</p>
        ${item.sub ? `<p class="cz-learn__sub">${esc(item.sub)}</p>` : ''}
        ${item.note ? `<p class="cz-learn__note">${esc(item.note)}</p>` : ''}
      </div>

      <div class="cz-learn__nav">
        <button type="button" class="gp-btn gp-btn--ghost gp-btn--big" data-learnstep="-1"
                aria-label="Previous">&larr;</button>
        <p class="cz-learn__count" aria-live="polite">
          <strong>${index + 1}</strong> of ${total}
        </p>
        <button type="button" class="gp-btn gp-btn--primary gp-btn--big" data-learnstep="1"
                aria-label="Next">&rarr;</button>
      </div>
      <p class="gp-muted cz-learn__hint">The arrow keys work too.</p>
    </div>`;
}

export default { renderBrowser, order, ORDERS };
