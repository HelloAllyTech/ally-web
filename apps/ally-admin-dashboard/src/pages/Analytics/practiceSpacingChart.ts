/**
 * Practice spacing (Highlights → Usage, AAQ-224): pure helpers over the
 * `spacing` block of `GET /v1/analytics/practice-stickiness`.
 *
 * A gap is the whole days from one countable session's start to the same
 * learner's next; every gap counts, so a heavy practiser contributes many. The
 * server bands them, floors the shares (`minGapSample` gaps) and the per-learner
 * KPI (`minLearners` active learners). Nothing here divides a count by a count:
 * a withheld share stays withheld.
 *
 * What the chart can and cannot say: learners choose their own rhythm, so this
 * DESCRIBES practice spacing. It does not show that spaced practice works
 * better here — that would need learners assigned to a rhythm.
 */
import { StickinessSpacing, StickinessSpacingBand } from "@types";

import { ColorScale, PALETTE } from "./chartScales";

type BarDatum = { group: string; value: number | null };

/**
 * One bar per band, in the server's order (shortest gap first). The bands are
 * ordered but no step is "better" — massed practice at 0–1 days and a lapse at
 * 30+ are both off the weekly rhythm — so every bar takes the one accent rather
 * than a ramp that would read as a scale of good to bad.
 */
export const buildSpacingBars = (bands: StickinessSpacingBand[]): BarDatum[] =>
  bands.map(b => ({ group: b.label, value: b.sharePct }));

export const spacingScale = (bands: StickinessSpacingBand[]): ColorScale =>
  Object.fromEntries(bands.map(b => [b.label, PALETTE.blue]));

/** True when the server stated at least one share — otherwise the card is thin. */
export const hasSpacingShares = (bands: StickinessSpacingBand[]): boolean =>
  bands.some(b => b.sharePct !== null);

/**
 * The per-learner read, in one sentence: the share of active learners whose
 * typical gap is a week or less. Per learner, not per gap, so a handful of
 * daily practisers cannot make the platform look weekly.
 */
export const spacingTakeaway = (spacing: StickinessSpacing): string | undefined => {
  if (spacing.activeLearners === 0) return undefined;
  if (spacing.withinTargetPct === null) {
    return `Too few active learners to state a share (n = ${spacing.activeLearners.toLocaleString()} · need ${spacing.minLearners})`;
  }
  return `${spacing.withinTargetPct}% of active learners practise at least weekly (median gap ≤ ${spacing.targetDays} days)`;
};

/** Rows for the expanded table / CSV: counts always, shares as the server sent them. */
export const spacingTableRows = (bands: StickinessSpacingBand[]): (string | number | null)[][] =>
  bands.map(b => [b.label, b.gaps, b.sharePct, b.learners]);

export const SPACING_TABLE_COLUMNS = ["Gap", "Gaps", "Share of gaps %", "Learners with such a gap"];
