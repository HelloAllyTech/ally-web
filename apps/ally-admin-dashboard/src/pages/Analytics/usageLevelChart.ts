import { UsageLevelResponse } from "@types";

import { CONTEXT, ColorScale, sequentialScale } from "./chartScales";
import { monthLabel } from "./cohortChart";

/**
 * Pure transforms for the monthly usage-level card. Kept out of the component so
 * the honesty rules they encode — which denominator a share is taken over, which
 * months may not be stated as percentages at all, and which month is too
 * unfinished to plot — are unit-testable without a DOM.
 */

/**
 * The two defensible readings of "percentage of users". Both come from one
 * response over one set of band counts, so switching is instant and the two can
 * never end up dividing different numerators.
 *
 * They answer different questions, which is exactly why the reader gets to pick
 * rather than being handed one silently:
 *  - `registered` — of everyone who has an account, how many practise? Includes
 *    people who never started, so the zero band is usually the largest thing on
 *    the chart. This is the activation question.
 *  - `activated` — of the people who have ever practised, how much are they
 *    practising now? Drops the never-started population, so a shift among real
 *    users stays visible instead of being crushed into a sliver. This is the
 *    depth-of-engagement question.
 */
export type UsageDenominator = "registered" | "activated";

export const USAGE_DENOMINATORS: {
  key: UsageDenominator;
  /** Switcher label. */
  label: string;
  /** What the denominator is, spelled out for the caption. */
  description: string;
}[] = [
  {
    key: "registered",
    label: "All learners",
    description: "every learner account that existed by the end of the month",
  },
  {
    key: "activated",
    label: "Learners who ever practised",
    description: "learners who had practised at least once by the end of the month",
  },
];

export const denominatorMeta = (key: UsageDenominator) =>
  USAGE_DENOMINATORS.find(d => d.key === key) ?? USAGE_DENOMINATORS[0];

/** One month as the chart and table render it. */
export interface UsageLevelMonthView {
  /** yyyy-mm-01. */
  month: string;
  /** "Aug 2025" — the axis label. */
  label: string;
  /** The selected denominator's population for this month. */
  population: number;
  /** Learners with any practice this month. */
  activeLearners: number;
  /**
   * Learners in each band INCLUDING the residual zero band at index 0, so the
   * array is index-aligned with {@link bandLabels}.
   */
  countsByBand: number[];
  /**
   * Share of the population per band, index-aligned with `countsByBand`, or null
   * when the shares must not be stated (population below the server's floor).
   */
  sharesByBand: number[] | null;
  /** True when the population is below the server-declared minimum group size. */
  belowFloor: boolean;
  /** True for the current, unfinished month. */
  partial: boolean;
}

/** Band labels in stack order: the zero band first, then rising usage. */
export const bandLabels = (data: UsageLevelResponse | undefined): string[] =>
  data ? [data.zeroBandLabel, ...data.bands.map(b => b.label)] : [];

/**
 * The months, resolved against one denominator.
 *
 * Three rules live here rather than in the component:
 *
 *  - **A share of nobody is undefined, not zero.** Months whose population is
 *    zero — before the platform, or the org, had any learners — are dropped
 *    entirely. Drawing a bar of 100% "0 min" for a month with no learners is a
 *    fabricated measurement, and it is the most flattering possible way to be
 *    wrong about the opposite metric.
 *  - **The zero band is a residual.** A learner who never practised has no
 *    activity row, so their band can only be `population - active`. Clamped at
 *    zero: if a data anomaly ever put more active learners in a month than the
 *    population it is counted against, a negative segment would silently invert
 *    the stack rather than showing anything wrong.
 *  - **Below the minimum group size, counts survive and percentages do not.** A
 *    breakdown over four learners names them to anyone who knows the org. The
 *    month keeps its counts for the table and loses its shares.
 */
export const buildUsageLevelMonths = (
  data: UsageLevelResponse | undefined,
  denominator: UsageDenominator,
): UsageLevelMonthView[] => {
  if (!data) return [];

  return data.months
    .map(m => {
      const raw = denominator === "registered" ? m.registeredLearners : m.activatedLearners;
      // The population can never be smaller than the people counted inside it.
      const population = Math.max(raw, m.activeLearners);
      const zero = Math.max(0, population - m.activeLearners);
      const countsByBand = [zero, ...m.learnersByBand];
      const belowFloor = population > 0 && population < data.minPopulationSize;

      return {
        month: m.month,
        label: monthLabel(m.month),
        population,
        activeLearners: m.activeLearners,
        countsByBand,
        sharesByBand:
          population === 0 || belowFloor
            ? null
            : countsByBand.map(c => Number(((c / population) * 100).toFixed(1))),
        belowFloor,
        partial: m.partial,
      };
    })
    .filter(m => m.population > 0);
};

/**
 * Months that may actually be drawn: a stateable share, and a finished month.
 *
 * The current month is excluded because it is still accruing minutes — every
 * learner in it is banded lower than they will finish, so its low bands are
 * systematically overstated and the last bar would read as a collapse in usage
 * that has not happened. There is no way to draw "not finished yet" on a stacked
 * bar; the table keeps it, flagged.
 */
export const plottableUsageMonths = (months: UsageLevelMonthView[]): UsageLevelMonthView[] =>
  months.filter(m => !m.partial && m.sharesByBand !== null);

/** Months held back because the population is too small to state shares for. */
export const suppressedUsageMonths = (months: UsageLevelMonthView[]): UsageLevelMonthView[] =>
  months.filter(m => !m.partial && m.sharesByBand === null);

/**
 * 100%-stacked series: one segment per band per month.
 *
 * Emitted band-by-band in stack order so the stack reads bottom-to-top as rising
 * usage, with the "did not practise" base at the bottom. Carbon assigns stack
 * order from the order groups first appear in the data.
 */
export const buildUsageLevelSeries = (
  months: UsageLevelMonthView[],
  labels: string[],
): { group: string; key: string; value: number }[] => {
  const plottable = plottableUsageMonths(months);
  return labels.flatMap((label, bandIdx) =>
    plottable.map(m => ({
      group: label,
      key: m.label,
      value: (m.sharesByBand as number[])[bandIdx] ?? 0,
    })),
  );
};

/**
 * Colours for the stack: the zero band in context grey, the usage bands on a
 * single-hue ramp that darkens with usage.
 *
 * The bands are an ORDERED category, so they get one hue at rising saturation
 * rather than a rainbow — a rainbow here would imply that "10–25 min" and
 * "500–1000 min" differ in kind rather than in degree. The zero band is
 * deliberately NOT part of the ramp: it is not the lightest usage level, it is
 * the absence of one, and greying it both says so and keeps the ramp's palest
 * step available for real practice. Meaning is never carried by colour alone —
 * every segment is named in the legend and in the table.
 */
export const buildUsageLevelScale = (labels: string[]): ColorScale => {
  const [zeroLabel, ...usageLabels] = labels;
  return {
    ...(zeroLabel ? { [zeroLabel]: CONTEXT.faint } : {}),
    ...sequentialScale(usageLabels),
  };
};

/** The share of a month's population that practised at all, or null. */
const practisedShare = (month: UsageLevelMonthView): number | null =>
  month.sharesByBand === null ? null : 100 - month.sharesByBand[0];

/**
 * The one-sentence finding, computed from the data.
 *
 * "Did any practice at all" in the most recent COMPLETE month, against the oldest
 * month on the axis — the change is the point of the chart, and a change needs a
 * named basis. Returns null when there is nothing to compare, which is better than
 * inventing a comparison out of one month.
 */
export const usageLevelTakeaway = (months: UsageLevelMonthView[]): string | null => {
  const plottable = plottableUsageMonths(months);
  if (plottable.length === 0) return null;

  const latest = plottable[plottable.length - 1];
  const latestShare = practisedShare(latest);
  if (latestShare === null) return null;

  const head = `${latestShare.toFixed(0)}% of ${latest.population.toLocaleString()} learners practised at all in ${latest.label}`;
  if (plottable.length < 2) return head;

  const first = plottable[0];
  const firstShare = practisedShare(first);
  if (firstShare === null) return head;

  const diff = latestShare - firstShare;
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  return `${head} — ${arrow} ${Math.abs(diff).toFixed(0)} pp vs ${first.label}`;
};

/**
 * The table behind the chart: counts, not just shares, and every month including
 * the ones the chart cannot draw.
 *
 * A count is what makes a share readable ("that 40% is two people"), and the
 * suppressed and in-progress months belong somewhere the reader can see them
 * rather than silently vanishing.
 */
export const buildUsageLevelTable = (
  months: UsageLevelMonthView[],
  labels: string[],
): { columns: string[]; rows: (string | number | null)[][] } => ({
  columns: ["Month", "Learners", ...labels.map(l => `${l} (n)`), "Practised at all (%)"],
  rows: months.map(m => {
    const share = practisedShare(m);
    return [
      m.partial ? `${m.label} (in progress)` : m.label,
      m.population,
      ...m.countsByBand,
      share === null ? null : Number(share.toFixed(1)),
    ];
  }),
});

/** Learners in the most recent plotted month — the chart's headline n. */
export const latestUsagePopulation = (months: UsageLevelMonthView[]): number | undefined => {
  const plottable = plottableUsageMonths(months);
  return plottable.length ? plottable[plottable.length - 1].population : undefined;
};
