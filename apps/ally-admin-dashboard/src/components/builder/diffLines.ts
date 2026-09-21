/**
 * Pure line-level diff between a file edit's before/after text, kept out of
 * {@link DiffBlock} so the algorithm is unit-testable without a DOM.
 *
 * A textbook LCS-based diff: dynamic programming over lines rather than
 * characters, since a code review reads line-by-line and a character diff on
 * a renamed variable would light up the whole line for one letter.
 */

export interface DiffLine {
  type: "context" | "add" | "remove";
  text: string;
}

/**
 * Above this many line-pairs the O(n·m) LCS table gets too large for a
 * browser tab to build without stalling — a whole-block diff (every old line
 * removed, every new line added) is a worse diff but a page that stays
 * responsive.
 */
const MAX_LCS_CELLS = 4_000_000;

export const computeLineDiff = (oldText: string, newText: string): DiffLine[] => {
  const oldLines = oldText.length ? oldText.split("\n") : [];
  const newLines = newText.length ? newText.split("\n") : [];

  const n = oldLines.length;
  const m = newLines.length;

  if (n * m > MAX_LCS_CELLS) {
    return [
      ...oldLines.map(text => ({ type: "remove" as const, text })),
      ...newLines.map(text => ({ type: "add" as const, text })),
    ];
  }

  // dp[i][j] = length of the LCS of oldLines[i:] and newLines[j:].
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: "context", text: oldLines[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "remove", text: oldLines[i] });
      i += 1;
    } else {
      result.push({ type: "add", text: newLines[j] });
      j += 1;
    }
  }
  while (i < n) {
    result.push({ type: "remove", text: oldLines[i] });
    i += 1;
  }
  while (j < m) {
    result.push({ type: "add", text: newLines[j] });
    j += 1;
  }
  return result;
};
