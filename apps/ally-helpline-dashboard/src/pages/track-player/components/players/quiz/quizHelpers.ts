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

// ---------------------------------------------------------------------------
// Graded / ungraded and the answer-key reveal
// ---------------------------------------------------------------------------

type GradedFlag = { graded?: boolean };

/** Missing `graded` means a payload from before ungraded questions: graded. */
export const isGraded = (entry: GradedFlag | undefined): boolean => entry?.graded !== false;

/**
 * Still waiting on the AI grader. `correct: null` alone no longer says so —
 * an ungraded question with no answer key is null too, and treating that as
 * pending would park the learner on a "Finish grading" button forever.
 */
export const isPendingResult = (result: { correct: boolean | null } & GradedFlag): boolean =>
  result.correct === null && isGraded(result);

/** A quiz with nothing graded is a survey: no score, no pass mark. */
export const isSurveyQuiz = (questions: GradedFlag[]): boolean =>
  questions.length > 0 && questions.every(q => !isGraded(q));

interface RevealableQuestion {
  type: string;
  options?: { id: string; text: string }[];
  items?: { id: string; text: string }[];
  left?: { id: string; text: string }[];
  right?: { id: string; text: string }[];
}

interface CorrectAnswerKey {
  selectedOptionIds?: string[];
  booleanAnswer?: boolean;
  orderedItemIds?: string[];
  pairs?: { leftId: string; rightId: string }[];
  blanks?: { blankId: string; acceptedAnswers: string[] }[];
}

/**
 * The answer key as display lines, ids resolved to the text the learner saw.
 * An id that no longer resolves (edited mid-attempt) is dropped rather than
 * shown raw. Pure.
 */
export const formatCorrectAnswer = (
  question: RevealableQuestion | undefined,
  key: CorrectAnswerKey | undefined,
  labels: { true: string; false: string },
): string[] => {
  if (!question || !key) return [];
  const textOf = (list: { id: string; text: string }[] | undefined, id: string) =>
    list?.find(o => o.id === id)?.text;
  const present = (values: (string | undefined)[]) => values.filter((v): v is string => !!v);

  switch (question.type) {
    case "mcq_single":
    case "mcq_multi": {
      const texts = present((key.selectedOptionIds ?? []).map(id => textOf(question.options, id)));
      return texts.length ? [texts.join(", ")] : [];
    }
    case "true_false":
      return typeof key.booleanAnswer === "boolean"
        ? [key.booleanAnswer ? labels.true : labels.false]
        : [];
    case "ordering":
      return present((key.orderedItemIds ?? []).map(id => textOf(question.items, id))).map(
        (text, index) => `${index + 1}. ${text}`,
      );
    case "matching":
      return present(
        (key.pairs ?? []).map(pair => {
          const left = textOf(question.left, pair.leftId);
          const right = textOf(question.right, pair.rightId);
          return left && right ? `${left} → ${right}` : undefined;
        }),
      );
    case "fill_blank":
      return (key.blanks ?? [])
        .filter(blank => blank.acceptedAnswers.length > 0)
        .map(blank => blank.acceptedAnswers.join(" / "));
    default:
      return [];
  }
};

/** "Statement — chosen scale point" for each rated row of a Likert answer. Pure. */
export const formatLikertResponses = (
  question: { statements?: { id: string; text: string }[]; scale?: { id: string; text: string }[] },
  ratings: Record<string, string> | undefined,
): { statement: string; rating: string | null }[] =>
  (question.statements ?? []).map(statement => ({
    statement: statement.text,
    rating: question.scale?.find(point => point.id === ratings?.[statement.id])?.text ?? null,
  }));
