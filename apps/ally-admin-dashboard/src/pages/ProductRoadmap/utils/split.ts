/**
 * Largest-remainder (Hamilton) split, mirroring ally-be's
 * src/product-roadmap/util/largest-remainder.util.ts.
 *
 * This exists ONLY to preview how a split will divide coins before an admin commits. The backend
 * is the authority and runs the same algorithm per (user, period) allocation row, so the real
 * per-part totals are the sum of many small splits and can differ from this single-total preview
 * by a coin or two. That is expected, and the UI labels the numbers with "≈".
 *
 * Exactness still matters here: the previewed parts must sum to the total, or the preview would
 * imply coins are being created or lost — which is precisely the thing the split guarantees never
 * happens.
 */
export const largestRemainderPreview = (total: number, weights: number[]): number[] => {
  const n = weights.length;
  if (!n) return [];

  const clamped = weights.map(w => (Number.isFinite(w) && w > 0 ? w : 0));
  const sum = clamped.reduce((a, b) => a + b, 0);

  // Degenerate weights: everything to the first part, matching the backend rather than throwing.
  if (sum <= 0) {
    const shares = new Array<number>(n).fill(0);
    shares[0] = total;
    return shares;
  }

  const shares = new Array<number>(n).fill(0);
  const remainders: { index: number; remainder: number }[] = [];
  let allocated = 0;

  for (let i = 0; i < n; i++) {
    const ideal = (total * clamped[i]) / sum;
    const floored = Math.floor(ideal);
    shares[i] = floored;
    remainders.push({ index: i, remainder: ideal - floored });
    allocated += floored;
  }

  // Largest fractional remainder first; lowest index wins a tie — same tie-break as the backend.
  remainders.sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  const leftover = total - allocated;
  for (let k = 0; k < leftover; k++) shares[remainders[k % n].index] += 1;

  return shares;
};
