import { CohortRetentionResponse, CohortRetentionRow } from "@types";

import { PALETTE } from "./chartScales";

/**
 * Pure transforms for the cohort-retention card. Kept out of the component so
 * the honesty rules they encode — what is a real zero, what is unmeasured, what
 * is too small to state as a rate — are unit-testable without a DOM.
 */

/** Most recent cohorts plotted in the curves view. */
export const MAX_CURVE_COHORTS = 6;

/** A cell as the grid renders it: a rate, or an explicit reason there isn't one. */
export interface CohortGridCell {
  monthIndex: number;
  activityMonth: string;
  /** Learners who cleared the selected threshold. Always a real count. */
  active: number;
  /**
   * `active / learners` as a percentage, or null when it must not be stated:
   * the cohort is below the minimum group size, or the month is unmeasured.
   */
  pct: number | null;
  /** The current month is still accruing minutes — its figure can only rise. */
  partial: boolean;
}

export interface CohortGridRow {
  cohortMonth: string;
  /** "Aug 2025" — the row label. */
  label: string;
  learners: number;
  belowFloor: boolean;
  /** Sparse by month index: `cells[i]` is month i+1, or undefined if unmeasured. */
  cells: (CohortGridCell | undefined)[];
}

/** "2025-08-01" -> "Aug 2025". Parsed as UTC so the month never slips a day. */
export const monthLabel = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

/** Index of a threshold in the response's list; falls back to the loosest. */
export const thresholdIndex = (thresholds: number[], selected: number): number => {
  const i = thresholds.indexOf(selected);
  return i >= 0 ? i : 0;
};

/**
 * Widest row in the grid — how many month columns the header needs.
 *
 * Driven by the oldest cohort, so the columns are a real "months since signup"
 * axis rather than however far the last row happened to run.
 */
export const maxMonthIndex = (cohorts: CohortRetentionRow[]): number =>
  cohorts.reduce(
    (max, c) => c.cells.reduce((rowMax, cell) => Math.max(rowMax, cell.monthIndex), max),
    0,
  );

/**
 * The triangle, one selected threshold at a time.
 *
 * Percentages are computed HERE and only here, always as `active / learners` for
 * that cohort — the server sends counts precisely so the three thresholds cannot
 * end up divided by three different denominators.
 */
export const buildCohortGrid = (
  data: CohortRetentionResponse | undefined,
  thresholdIdx: number,
): CohortGridRow[] => {
  if (!data) return [];

  return data.cohorts.map(cohort => {
    const cells: (CohortGridCell | undefined)[] = [];
    for (const cell of cohort.cells) {
      const active = cell.activeByThreshold[thresholdIdx] ?? 0;
      cells[cell.monthIndex - 1] = {
        monthIndex: cell.monthIndex,
        activityMonth: cell.activityMonth,
        active,
        // A rate over four people re-identifies them and is mostly noise; the
        // size still shows, so the reader can see WHY there is no number.
        pct: cohort.belowFloor || cohort.learners === 0 ? null : (active / cohort.learners) * 100,
        partial: cell.partial,
      };
    }

    return {
      cohortMonth: cohort.cohortMonth,
      label: monthLabel(cohort.cohortMonth),
      learners: cohort.learners,
      belowFloor: cohort.belowFloor,
      cells,
    };
  });
};

/** Total learners across every cohort — the grid's n. */
export const totalCohortLearners = (data: CohortRetentionResponse | undefined): number =>
  (data?.cohorts ?? []).reduce((sum, c) => sum + c.learners, 0);

/**
 * Cohorts that carry at least one stateable percentage from a COMPLETE month.
 *
 * The completeness requirement is what keeps a cohort whose only month so far is
 * the unfinished current one out of the curves: it would contribute nothing but
 * the definitional 100% anchor, while taking a colour, a legend entry and a slot
 * that an older cohort with a real curve should have had.
 */
export const plottableCohorts = (rows: CohortGridRow[]): CohortGridRow[] =>
  rows.filter(
    r =>
      !r.belowFloor &&
      r.learners > 0 &&
      r.cells.some(cell => cell && !cell.partial && cell.pct !== null),
  );

/**
 * Retention curves for the most recent {@link MAX_CURVE_COHORTS} cohorts.
 *
 * Month 0 is included at 100% as the anchor every curve starts from. It is a
 * definition, not a measurement — the card's caption says so, because a plotted
 * point that was never measured has to be declared somewhere the screenshot
 * carries.
 *
 * The partial current month is dropped rather than plotted: an unfinished month
 * on a line chart reads as a fall, and there is no way to draw "not yet" on a
 * line. The heatmap keeps it, flagged.
 */
export const buildCohortCurves = (
  rows: CohortGridRow[],
): { key: string; group: string; value: number }[] => {
  const plottable = plottableCohorts(rows);
  const recent = plottable.slice(-MAX_CURVE_COHORTS);

  return recent.flatMap(row => [
    { key: "0", group: row.label, value: 100 },
    ...row.cells
      .filter(
        (cell): cell is CohortGridCell => Boolean(cell) && !cell!.partial && cell!.pct !== null,
      )
      .map(cell => ({
        key: String(cell.monthIndex),
        group: row.label,
        value: Number((cell.pct as number).toFixed(1)),
      })),
  ]);
};

/** How many plottable cohorts the curves view had to leave out. */
export const curvesOmitted = (rows: CohortGridRow[]): number =>
  Math.max(0, plottableCohorts(rows).length - MAX_CURVE_COHORTS);

/**
 * Same-hue ramp over the plotted cohorts, oldest palest.
 *
 * Cohorts are an ORDERED category, so they get one hue at rising saturation
 * rather than a rainbow — a rainbow here would imply that August and March
 * differ in kind rather than in age. Keyed on the cohort label, so a colour
 * cannot move when the selection changes.
 */
export const buildCohortCurveScale = (rows: CohortGridRow[]): Record<string, string> => {
  const recent = plottableCohorts(rows).slice(-MAX_CURVE_COHORTS);
  const ramp = ["#d0e2ff", "#a6c8ff", "#78a9ff", "#4589ff", "#0f62fe", PALETTE.blue];
  const offset = Math.max(0, ramp.length - recent.length);

  return recent.reduce<Record<string, string>>((scale, row, i) => {
    scale[row.label] = ramp[offset + i] ?? PALETTE.blue;
    return scale;
  }, {});
};

/** Alpha of the darkest cell. */
const MAX_CELL_ALPHA = 0.55;

/**
 * Heatmap cell background for a rate: one hue, opacity carrying magnitude.
 *
 * The ramp stops well short of opaque on purpose. Every cell prints its number,
 * so the text has to stay legible at every point on the scale — and a ramp that
 * runs to full saturation forces a light/dark text switch somewhere in the
 * middle, exactly where NEITHER colour clears 4.5:1 against the tile. Capping the
 * alpha keeps one text colour at better than 6:1 across the whole range. Colour
 * is the secondary encoding here; the number is the value.
 */
export const cellBackground = (pct: number | null): string | undefined => {
  if (pct === null) return undefined;
  // Floor the alpha so a measured 0% still reads as a filled cell rather than
  // as the blank of an unmeasured one.
  const alpha = pct <= 0 ? 0.04 : 0.06 + (Math.min(pct, 100) / 100) * (MAX_CELL_ALPHA - 0.06);
  return `rgba(38, 77, 142, ${alpha.toFixed(3)})`;
};

/**
 * The one-sentence finding, computed from the data.
 *
 * A live tile cannot carry a fixed claim in its title, so the headline is
 * derived: the median month-1 retention across cohorts that have a complete
 * month 1. Returns null when no cohort does — better silent than invented.
 */
export const monthOneTakeaway = (rows: CohortGridRow[], threshold: number): string | null => {
  const firstMonth = plottableCohorts(rows)
    .map(r => r.cells[0])
    .filter((cell): cell is CohortGridCell => Boolean(cell) && !cell!.partial && cell!.pct !== null)
    .map(cell => cell.pct as number)
    .sort((a, b) => a - b);

  if (firstMonth.length === 0) return null;

  const mid = Math.floor(firstMonth.length / 2);
  const median =
    firstMonth.length % 2 === 0 ? (firstMonth[mid - 1] + firstMonth[mid]) / 2 : firstMonth[mid];

  return `Median month-1 return: ${median.toFixed(0)}% across ${firstMonth.length} complete cohort${
    firstMonth.length === 1 ? "" : "s"
  } at ${threshold}+ min`;
};
