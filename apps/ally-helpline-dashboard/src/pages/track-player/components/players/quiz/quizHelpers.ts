/**
 * Pure, testable helpers for the quiz widgets: fill-blank template splitting
 * and the matching-question pairing reducer.
 */

export type FillBlankSegment = { kind: "text"; value: string } | { kind: "blank"; blankId: string };

/**
 * Splits a fill-blank template into an ordered list of text and blank
 * segments. Blanks are `{{blankId}}` tokens; whitespace inside the braces is
 * tolerated. Text between/around tokens is preserved verbatim (including
 * empty strings so indices stay stable).
 */
export const splitFillBlankTemplate = (template: string): FillBlankSegment[] => {
  const segments: FillBlankSegment[] = [];
  const tokenRe = /\{\{\s*([^}]+?)\s*\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(template)) !== null) {
    segments.push({ kind: "text", value: template.slice(lastIndex, match.index) });
    segments.push({ kind: "blank", blankId: match[1] });
    lastIndex = tokenRe.lastIndex;
  }
  segments.push({ kind: "text", value: template.slice(lastIndex) });
  return segments;
};

export interface MatchingPair {
  leftId: string;
  rightId: string;
}

/**
 * Applies a "tap left, tap right" pairing to the current set of pairs.
 *
 * Rules (each keeps left AND right single-use):
 *  - selecting a left + right creates/replaces the pair, evicting any
 *    existing pair that used either side;
 *  - re-selecting an already-paired left (with no pending right) breaks it.
 *
 * Pure: returns a new array, never mutates the input.
 */
export const applyMatchSelection = (
  pairs: MatchingPair[],
  leftId: string,
  rightId: string,
): MatchingPair[] => {
  const withoutConflicts = pairs.filter(p => p.leftId !== leftId && p.rightId !== rightId);
  return [...withoutConflicts, { leftId, rightId }];
};

/** Removes any pair touching `leftId` or `rightId`. Pure. */
export const breakMatch = (
  pairs: MatchingPair[],
  side: "left" | "right",
  id: string,
): MatchingPair[] => pairs.filter(p => (side === "left" ? p.leftId !== id : p.rightId !== id));

/** The right id currently paired to `leftId`, or null. Pure. */
export const rightIdForLeft = (pairs: MatchingPair[], leftId: string): string | null =>
  pairs.find(p => p.leftId === leftId)?.rightId ?? null;

/** The left id currently paired to `rightId`, or null. Pure. */
export const leftIdForRight = (pairs: MatchingPair[], rightId: string): string | null =>
  pairs.find(p => p.rightId === rightId)?.leftId ?? null;
