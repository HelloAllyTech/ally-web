import { GoalsXpPoint, XpGoalGrain } from "@types";

import { context, single } from "./chartKit";
import { ColorScale, PALETTE } from "./chartScales";

/**
 * Pure transforms for the Goals → XP card. Kept out of the component so the
 * honesty rules — a missing goal never becomes a fabricated zero, an
 * in-progress period is named rather than silently included — are
 * unit-testable without a DOM.
 */

export const GOALS_XP_GRAINS: { key: XpGoalGrain; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

export const ACTUAL_GROUP = "Actual XP";
export const GOAL_GROUP = "Goal";

/**
 * Actual is the subject (focal blue); Goal is a reference figure, not itself
 * the story, so it takes the context grey rather than a second categorical
 * hue — the same treatment a target line gets elsewhere on this page.
 */
export const goalsXpScale: ColorScale = {
  ...single(ACTUAL_GROUP, PALETTE.blue),
  ...context(GOAL_GROUP),
};

export interface GoalsXpSeriesDatum {
  group: string;
  key: string;
  value: number;
}

/**
 * Grouped-bar series: Actual XP for every period that has happened, Goal only
 * where a goal row exists. Actual and Goal are the same unit and could in
 * principle cross — exactly the two-tiles-or-one-axis case `comboOpts` is NOT
 * for — so both ride one value axis as ordinary grouped bars.
 *
 * A period with no goal simply has no Goal datum: Carbon draws only the
 * Actual bar for it. That gap is what "no goal set" looks like on the plot;
 * {@link goalsXpNoGoalNote} and the detail table both name it in prose so it
 * reads as a fact rather than a rendering glitch. Symmetrically, an upcoming
 * period has no Actual datum at all — it hasn't happened, so `actualXp: 0`
 * would read as "earned nothing" rather than "hasn't started"; the same
 * absence convention covers it, named by {@link goalsXpUpcomingNote}.
 */
export const buildGoalsXpSeries = (points: GoalsXpPoint[]): GoalsXpSeriesDatum[] => [
  ...points
    .filter(p => !p.upcoming)
    .map(p => ({ group: ACTUAL_GROUP, key: p.periodLabel, value: p.actualXp })),
  ...points
    .filter((p): p is GoalsXpPoint & { goalXp: number } => p.hasGoal && p.goalXp !== null)
    .map(p => ({ group: GOAL_GROUP, key: p.periodLabel, value: p.goalXp })),
];

/** Periods with no goal row — named so a missing bar reads as a fact, not a glitch. */
export const noGoalPeriods = (points: GoalsXpPoint[]): GoalsXpPoint[] =>
  points.filter(p => !p.hasGoal);

/**
 * The line naming which periods have no target set, or null when every period
 * shown has one. This is the panel's explicit "no goal set" placeholder —
 * without it a missing Goal bar looks like a data gap rather than a target
 * nobody has recorded yet.
 */
export const goalsXpNoGoalNote = (points: GoalsXpPoint[]): string | null => {
  const missing = noGoalPeriods(points);
  if (missing.length === 0) return null;
  if (missing.length === points.length) {
    return (
      "No goal has been set for any period shown — targets are added directly to " +
      "the database, one period at a time, so a fresh grain starts with none."
    );
  }
  return (
    `No goal set for ${missing.map(p => p.periodLabel).join(", ")} — shown with no Goal ` +
    "bar rather than a target of zero."
  );
};

/**
 * The one-sentence finding: how often the goal was actually met.
 *
 * Excludes the in-progress period — its actual figure can still rise, so
 * counting it against its goal now would understate it — and any upcoming
 * period, which hasn't happened at all and so was never "missed". Also
 * excludes any period with no goal, which has nothing to be met. Returns
 * null when nothing qualifies.
 */
export const goalsXpTakeaway = (points: GoalsXpPoint[]): string | null => {
  const withGoal = points.filter(
    p => p.hasGoal && !p.inProgress && !p.upcoming && p.goalXp !== null,
  );
  if (withGoal.length === 0) return null;

  const met = withGoal.filter(p => p.actualXp >= (p.goalXp as number));
  const periodNoun = withGoal.length === 1 ? "period" : "periods";
  return `Goal met in ${met.length} of ${withGoal.length} completed ${periodNoun} with a target set`;
};

/**
 * Upcoming periods that already have a goal set — named so an empty stretch
 * of bars beyond today reads as "targets ahead" rather than a data gap.
 * Excludes upcoming periods with no goal; those are already named by
 * {@link goalsXpNoGoalNote}, so the two notes never double up on one period.
 */
export const goalsXpUpcomingNote = (points: GoalsXpPoint[]): string | null => {
  const upcoming = points.filter(p => p.upcoming && p.hasGoal);
  if (upcoming.length === 0) return null;

  return (
    `Includes upcoming target${upcoming.length === 1 ? "" : "s"} for ` +
    `${upcoming.map(p => p.periodLabel).join(", ")} — no actual XP yet.`
  );
};

/**
 * True only when there is no XP to plot at all — a data gap, not a
 * missing-goal fact. Judged over periods that have actually happened, so a
 * window made up entirely of upcoming targets isn't misreported as empty.
 */
export const goalsXpEmptyText = (points: GoalsXpPoint[]): string | undefined => {
  if (points.length === 0) return "No XP has been earned in this window yet.";

  const happened = points.filter(p => !p.upcoming);
  // Nothing has happened yet at all (only upcoming targets in view) — that's
  // targets ahead, not a data gap, so there's nothing to flag as empty.
  if (happened.length === 0) return undefined;

  return happened.every(p => p.actualXp === 0)
    ? "No XP has been earned in this window yet."
    : undefined;
};

const goalsXpPeriodLabel = (p: GoalsXpPoint): string => {
  if (p.inProgress) return `${p.periodLabel} (in progress)`;
  if (p.upcoming) return `${p.periodLabel} (upcoming)`;
  return p.periodLabel;
};

export const buildGoalsXpTable = (
  points: GoalsXpPoint[],
): { columns: string[]; rows: (string | number)[][] } => ({
  columns: ["Period", "Actual XP", "Goal XP"],
  rows: points.map(p => [
    goalsXpPeriodLabel(p),
    // Upcoming periods haven't happened — "—" says so explicitly, rather than
    // a 0 that would read as "earned nothing".
    p.upcoming ? "—" : p.actualXp,
    // Literal text, not a blank or a 0 — the table's own "no goal set" placeholder.
    p.hasGoal && p.goalXp !== null ? p.goalXp : "No goal set",
  ]),
});
