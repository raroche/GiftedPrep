/**
 * charts.js — The two small charts on the results screen.
 *
 * Both are built from inline SVG and plain divs, so they inherit the theme
 * tokens and need no charting library. Neither animates on load beyond a CSS
 * width transition, which the reduced-motion rule in the stylesheet disables.
 */

/**
 * A donut showing what fraction of the set was correct.
 * The number sits in the middle, and the label underneath says what it counts,
 * because a bare percentage on its own means very little to a seven-year-old.
 */
export function ring({ correct, total, size = 190 }) {
  const pct = total ? correct / total : 0;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const dash = (c * pct).toFixed(2);
  const tone = pct >= 0.7 ? 'var(--gp-good)' : pct >= 0.4 ? 'var(--gp-secondary)' : 'var(--gp-retry)';

  /* A rounded cap on a zero-length arc still paints a dot, which reads as a
     wrong score of "a bit". Draw no arc at all when nothing was correct. */
  const arc = correct === 0 ? '' : `
          <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
                  stroke="${tone}" stroke-width="16" stroke-linecap="round"
                  stroke-dasharray="${dash} ${(c - dash).toFixed(2)}"
                  transform="rotate(-90 ${size / 2} ${size / 2})" />`;

  return `
    <div class="gp-ring" role="img" aria-label="${correct} correct out of ${total}">
      <div class="gp-ring__track">
        <svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
          <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
                  stroke="var(--gp-surface-3)" stroke-width="16" />${arc}
        </svg>
      </div>
      <div class="gp-center">
        <div class="gp-ring__value">${correct}<span class="gp-muted" data-style="font-size:.5em"> / ${total}</span></div>
        <div class="gp-ring__label">puzzles right</div>
      </div>
    </div>`;
}

/**
 * One horizontal bar per category.
 * @param {{name: string, correct: number, seen: number}[]} rows
 */
export function bars(rows) {
  if (!rows.length) return '<p class="gp-muted">Nothing to show yet.</p>';
  return rows.map((row) => {
    const pct = row.seen ? Math.round((row.correct / row.seen) * 100) : 0;
    const tone = pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'low';
    return `
      <div class="gp-bar">
        <div class="gp-bar__label">
          <span>${escapeHtml(row.name)}</span>
          <span class="gp-bar__value">${row.correct} of ${row.seen}</span>
        </div>
        <div class="gp-bar__track" role="img" aria-label="${escapeHtml(row.name)}: ${row.correct} of ${row.seen} correct">
          <div class="gp-bar__fill" data-tone="${tone}" data-style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

export function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default { ring, bars, escapeHtml };
