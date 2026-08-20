import { QualityIndexCoverage, QualitySentimentPoint, QualitySentimentResponse } from "@types";

import { CATEGORICAL, ColorScale, PALETTE } from "./chartScales";
import { HighlightsDatum } from "./highlightsChart";

/**
 * Pure transforms for the Roleplay Quality Index card — the stacked-area +
 * line replacement for the old raw `avgCompositeScore` trend. Kept in its own
 * file rather than folded into a shared "unit cost / quality" file: this card
 * has no dependency on the AI-cost-per-10-minutes card that shares a name with
 * such a file elsewhere, and this module should not gain one by accident.
 */

/* -------------------------------------------------------------------------- */
/* Learner sentiment (proxy NPS) — the series a reader compares the index to  */
/* -------------------------------------------------------------------------- */

/**
 * Proxy NPS, -100..+100.
 *
 * The label carries the qualifier because the label is what ends up in a
 * screenshot. "NPS" alone on this series would be quoted externally as a real
 * NPS within a week.
 */
export const buildProxyNpsSeries = (points: readonly QualitySentimentPoint[]): HighlightsDatum[] =>
  points.map(p => ({
    group: PROXY_NPS_LABEL,
    key: p.bucket,
    value: p.proxyNps,
  }));

export const PROXY_NPS_LABEL = "Proxy NPS (from 1–5 rating)";

/** Colour for the standalone sentiment card — its only series. */
export const PROXY_NPS_SCALE: ColorScale = {
  [PROXY_NPS_LABEL]: PALETTE.teal,
};

/** Proxy NPS is bounded -100..+100; the negative half is the point. */
export const PROXY_NPS_DOMAIN: [number, number] = [-100, 100];

/**
 * Plain-English reading of the correlation.
 *
 * Deliberately hedged and deliberately short. `r` between two short monthly
 * series is a weak instrument, and the card's value is the two lines, not the
 * coefficient — so this names the direction and stops, rather than implying a
 * mechanism the data cannot support.
 */
export const correlationNote = (response: QualitySentimentResponse | undefined): string => {
  const r = response?.correlation;
  const paired = response?.pairedBuckets ?? 0;
  if (r === null || r === undefined) {
    return paired > 0
      ? `Not enough overlapping periods to state a relationship.`
      : `No period has both an index value and a stateable sentiment figure.`;
  }

  const strength = Math.abs(r) >= 0.7 ? "strongly" : Math.abs(r) >= 0.4 ? "moderately" : "weakly";
  const direction = r >= 0 ? "together" : "in opposite directions";
  return (
    `Across ${paired} period${paired === 1 ? "" : "s"} the two move ` +
    `${strength} ${direction} (r = ${r.toFixed(2)}). Co-movement only — ` +
    `neither number causes the other.`
  );
};

/* -------------------------------------------------------------------------- */
/* Roleplay Quality Index                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Dimension keys, in the order the backend stacks them
 * (`QUALITY_INDEX_DIMENSIONS` in ally-be's quality-index.constants.ts).
 * Hardcoded here rather than derived from a response: the STACK ORDER is part
 * of the chart's contract, not data, and must not reshuffle if a bucket
 * happens to be missing a dimension (see `buildQualityIndexAreaSeries` below).
 */
export const QUALITY_INDEX_DIMENSIONS = [
  "actorComposite",
  "driftRate",
  "languageErrors",
  "responseLatency",
] as const;

export type QualityIndexDimension = (typeof QUALITY_INDEX_DIMENSIONS)[number];

export const QUALITY_INDEX_LABEL = "Quality index";

/** Mirrors QUALITY_INDEX_LABELS server-side — kept in one place so the stack
 *  legend and the server's own coverage rows never show two names for one
 *  dimension. */
export const QUALITY_INDEX_DIMENSION_LABELS: Record<QualityIndexDimension, string> = {
  actorComposite: "Actor goal score",
  driftRate: "Stayed in character",
  languageErrors: "Language quality",
  responseLatency: "Response latency",
};

/**
 * Colour assignment for the index card.
 *
 * The LINE is the subject here — the whole point of the card is "here is the
 * quality index over time" — so it takes `CATEGORICAL[0]` (brand navy),
 * matching `single()`'s existing house convention of blue for "the one
 * measure this chart is about." The four STACK layers are the supporting
 * decomposition, so they take the next four categorical slots in fixed
 * order — never the same slot as the line, and never reassigned if a
 * dimension drops out of a given window (a filter changing the series
 * present must not repaint the survivors).
 */
export const QUALITY_INDEX_SCALE: ColorScale = {
  [QUALITY_INDEX_LABEL]: PALETTE.blue,
  ...Object.fromEntries(
    QUALITY_INDEX_DIMENSIONS.map((dim, i) => [
      QUALITY_INDEX_DIMENSION_LABELS[dim],
      CATEGORICAL[i + 1],
    ]),
  ),
};

/** The index's own scale — always 0-100 by construction. */
export const QUALITY_INDEX_DOMAIN: [number, number] = [0, 100];

/**
 * The stacked-area layers: one datum per (dimension, bucket).
 *
 * A dimension absent from a bucket's `indexContributions` (no judged data that
 * period) is plotted as 0, NOT null — unlike every mean series in this file.
 * That is deliberate and not an inconsistency: `avgCompositeScore` or
 * `proxyNps` have no meaningful zero, so a gap must break the line. A
 * contribution genuinely IS zero when its dimension had nothing to contribute
 * that period — the renormalisation already spent that weight on the other
 * three, so drawing it as an absent (zero-height) layer is the true state, not
 * an invented one. The LINE (`buildQualityIndexSeries` below) is where the
 * real "nothing was measured this period" gap belongs.
 */
export const buildQualityIndexAreaSeries = (
  points: readonly QualitySentimentPoint[],
): HighlightsDatum[] =>
  QUALITY_INDEX_DIMENSIONS.flatMap(dim =>
    points.map(p => ({
      group: QUALITY_INDEX_DIMENSION_LABELS[dim],
      key: p.bucket,
      value: p.indexContributions[dim] ?? 0,
    })),
  );

/**
 * The index line: null (not zero) when NO dimension had data that bucket —
 * the one case the whole blend has nothing to say, same convention as every
 * other average series here.
 */
export const buildQualityIndexSeries = (
  points: readonly QualitySentimentPoint[],
): HighlightsDatum[] =>
  points.map(p => ({
    group: QUALITY_INDEX_LABEL,
    key: p.bucket,
    value: p.qualityIndex,
  }));

/**
 * Whether the index is fully backed by measured (non-placeholder) anchors.
 * `false` means at least one dimension is still normalised against a shipped
 * guess — a state the card must caption, never render silently as if
 * calibrated.
 */
export const isIndexFullyCalibrated = (coverage: readonly QualityIndexCoverage[]): boolean =>
  coverage.length > 0 && coverage.every(c => c.calibrated);

/**
 * One sentence per dimension naming its coverage and calibration state, for the
 * card's caption. Ordered to match the stack (bottom to top), so a reader can
 * match a caveat to the layer it describes.
 *
 * Coverage is stated as a fraction of buckets, not hidden in a tooltip: a
 * dimension covering 3 of 24 buckets is not a footnote, it is most of the
 * reason the line moves the way it does in the buckets it's missing from.
 */
export const qualityIndexCoverageNotes = (coverage: readonly QualityIndexCoverage[]): string[] =>
  coverage.map(c => {
    const calibration = c.calibrated
      ? "measured anchors"
      : "PLACEHOLDER anchors, not yet measured from production traffic";
    return (
      `${c.label}: ${c.bucketsCovered} of ${c.bucketsTotal} periods covered, ` +
      `weighted ${Math.round(c.weight * 100)}%, ${calibration}.`
    );
  });
