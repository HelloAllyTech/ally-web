/**
 * Priority as a colour, for the list card's left edge.
 *
 * REPLACES a per-card progress bar. A bar spent a full row of every card restating the ordering
 * the list is already sorted by; the card's own edge carries the same signal for free.
 *
 * ## The scale
 *
 * Continuous hue from green through yellow to red, not a handful of buckets: votes have no cap,
 * so any bucket boundary would be arbitrary, and two cards a vote apart landing in different
 * buckets would imply a difference that isn't there.
 *
 * RED IS THE TOP OF THE SCALE — most votes, hottest. Green is the bottom. That is the reading
 * order of "green to yellow to red" mapped onto ascending score, and it matches how a heatmap
 * is normally read. Flipping it is one line: `120 * ratio` instead of `120 * (1 - ratio)`.
 *
 * ## What it is relative to
 *
 * `maxScore` is the board's UNFILTERED maximum, the same denominator the removed bar used and
 * the same one the table and month board use. Deliberately not the min/max of the rows currently
 * on screen: with an in-view range, filtering to the bottom ten would repaint the worst of them
 * red, and the same card would change colour depending on what else you were looking at.
 *
 * Colour is never the only encoding — the card also shows the score as a number, because a hue
 * cannot be read by someone who cannot distinguish these hues, and cannot be compared precisely
 * by anyone.
 */
export const priorityBorderColour = (score: number, maxScore: number): string => {
  const ceiling = Math.max(1, maxScore);
  // Clamped rather than trusted: a stale maxScore from a previous fetch can legitimately be
  // lower than a freshly-allocated score, and a negative hue renders as a different colour
  // entirely rather than as "off the top of the scale".
  const ratio = Math.min(1, Math.max(0, score / ceiling));
  const hue = Math.round(120 * (1 - ratio));
  // 65%/45% keeps every hue on the ramp at a similar weight; pure `hsl(hue 100% 50%)` makes the
  // yellows glare and the greens vanish against a white card.
  return `hsl(${hue} 65% 45%)`;
};
