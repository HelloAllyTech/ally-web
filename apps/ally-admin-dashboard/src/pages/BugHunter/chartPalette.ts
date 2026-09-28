import { BugFindingSource, BugHuntTrigger, BugHunterDifficulty, BugHunterReporter } from "@types";

/**
 * The colours the Bug Hunter charts draw with, and the rule for handing them out.
 *
 * ## Colour follows the entity, never its rank
 *
 * Every series here has a FIXED slot. A source that files nothing for a month
 * keeps its colour when it comes back, and filtering the window never repaints
 * the survivors — a reader who learned "code review is blue" must stay right.
 * So these are lookup tables keyed by the enum, not arrays indexed by position.
 *
 * ## Why these eight and this order
 *
 * The categorical slots are a validated palette: adjacent pairs clear a
 * colour-vision-deficiency separation floor in this order, and the first three
 * clear it for every pairing. Three of the light-surface slots (aqua, yellow,
 * magenta) sit below 3:1 contrast on white, which is why every chart built on
 * this file also ships a legend and a table view — the value is never
 * reachable through colour alone. Re-validate before changing a hex or the
 * order; the check is computable, so it is computed, not eyeballed.
 */
export const CATEGORICAL = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  magenta: "#e87ba4",
  green: "#008300",
  violet: "#4a3aa7",
  red: "#e34948",
} as const;

/** Text-token grey for a share that has not been decided either way. Not a series colour. */
export const NEUTRAL_MARK = "#c3c2b7";
/** The stub a day with nothing in it draws — quiet is a real observation. */
export const EMPTY_MARK = "#e1e0d9";

/**
 * One slot per finding source, in the order the palette was validated.
 * The two finders that file the most (code review, failing tests) take the
 * two strongest slots; the legacy analytics source, which nothing writes any
 * more, takes the last.
 */
export const SOURCE_COLORS: Record<BugFindingSource, string> = {
  [BugFindingSource.CODE_REVIEW]: CATEGORICAL.blue,
  [BugFindingSource.TEST_FAILURE]: CATEGORICAL.orange,
  [BugFindingSource.PRODUCTION_LOG]: CATEGORICAL.aqua,
  [BugFindingSource.LINT_ERROR]: CATEGORICAL.yellow,
  [BugFindingSource.REPORTED_BUG]: CATEGORICAL.magenta,
  [BugFindingSource.UX_SIGNAL]: CATEGORICAL.green,
  [BugFindingSource.ANALYTICS_SUGGESTION]: CATEGORICAL.violet,
};

/** The stacking order for sources — same as the slot order, so the legend reads top-down as the palette. */
export const SOURCE_ORDER: BugFindingSource[] = [
  BugFindingSource.CODE_REVIEW,
  BugFindingSource.TEST_FAILURE,
  BugFindingSource.PRODUCTION_LOG,
  BugFindingSource.LINT_ERROR,
  BugFindingSource.REPORTED_BUG,
  BugFindingSource.UX_SIGNAL,
  BugFindingSource.ANALYTICS_SUGGESTION,
];

/** Three triggers, the three all-pairs-safe slots. */
export const TRIGGER_COLORS: Record<BugHuntTrigger, string> = {
  [BugHuntTrigger.SCHEDULED]: CATEGORICAL.blue,
  [BugHuntTrigger.MANUAL]: CATEGORICAL.orange,
  [BugHuntTrigger.FIX_SESSION]: CATEGORICAL.aqua,
};

export const TRIGGER_ORDER: BugHuntTrigger[] = [
  BugHuntTrigger.SCHEDULED,
  BugHuntTrigger.MANUAL,
  BugHuntTrigger.FIX_SESSION,
];

/**
 * Where a filed bug stands now. Accepted and declined are the two decisions;
 * undecided is the absence of one, so it wears the neutral grey rather than a
 * series colour — "nothing yet" should not look like a third outcome.
 */
export const OUTCOME_COLORS = {
  accepted: CATEGORICAL.blue,
  declined: CATEGORICAL.orange,
  undecided: NEUTRAL_MARK,
} as const;

export const REPORTER_ORDER: BugHunterReporter[] = ["agent", "staff", "consumer"];

/**
 * Three ways a bug got spotted, the three all-pairs-safe slots. Reported bugs
 * take the third rather than a grey: a person spotting it is a real party, not
 * the absence of one.
 */
export const DIFFICULTY_COLORS: Record<BugHunterDifficulty, string> = {
  easy: CATEGORICAL.blue,
  hard: CATEGORICAL.orange,
  reported: CATEGORICAL.aqua,
};

export const DIFFICULTY_ORDER: BugHunterDifficulty[] = ["easy", "hard", "reported"];
