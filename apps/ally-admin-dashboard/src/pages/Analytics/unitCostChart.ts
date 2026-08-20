import {
  QualityIndexCoverage,
  QualitySentimentPoint,
  QualitySentimentResponse,
  RoleplayCostPoint,
  RoleplayCostResponse,
} from "@types";

import { CATEGORICAL, CONTEXT, ColorScale, PALETTE } from "./chartScales";
import { ChartDatum } from "./ladderChart";

/**
 * Pure transforms for the unit-cost card and the quality-vs-sentiment card.
 *
 * Both encode caveats that must not be lost between the API and the pixel — an
 * understated cost total, and a sentiment figure that is not the NPS it
 * resembles — so they live here where they are testable without a DOM.
 */

/* -------------------------------------------------------------------------- */
/* AI cost per 10 minutes of roleplay                                         */
/* -------------------------------------------------------------------------- */

/**
 * The headline series: estimated USD per 10 minutes of practice.
 *
 * Nulls are preserved, not zeroed. A bucket with no practice has no unit cost,
 * and plotting it at zero would draw the cheapest month the platform ever had
 * out of a month where nothing happened.
 */
export const buildUnitCostSeries = (
  points: readonly RoleplayCostPoint[],
  label = "USD per 10 min",
): ChartDatum[] =>
  points.map(p => ({
    group: label,
    key: p.bucket,
    value: p.costPer10MinUsd,
  }));

/**
 * The same spend split by AREA — what the money buys.
 *
 * Stackable, unlike the ladder series: the three areas partition attributable
 * spend, so they genuinely sum to the total and a stack is the honest reading.
 */
export const buildCostByAreaSeries = (points: readonly RoleplayCostPoint[]): ChartDatum[] =>
  points.flatMap(p => [
    { group: "Live roleplay", key: p.bucket, value: p.breakdown.roleplay },
    { group: "Feedback & summary", key: p.bucket, value: p.breakdown.feedback },
    { group: "Quiz grading", key: p.bucket, value: p.breakdown.quiz },
  ]);

/** The same spend split by SERVICE — which vendor bill it lands on. */
export const buildCostByServiceSeries = (points: readonly RoleplayCostPoint[]): ChartDatum[] =>
  points.flatMap(p => [
    { group: "LLM", key: p.bucket, value: p.breakdown.llm },
    { group: "Speech-to-text", key: p.bucket, value: p.breakdown.stt },
    { group: "Text-to-speech", key: p.bucket, value: p.breakdown.tts },
  ]);

export const COST_AREA_SCALE: ColorScale = {
  "Live roleplay": PALETTE.blue,
  "Feedback & summary": PALETTE.teal,
  "Quiz grading": PALETTE.purple,
};

export const COST_SERVICE_SCALE: ColorScale = {
  LLM: PALETTE.blue,
  "Speech-to-text": PALETTE.cyan,
  "Text-to-speech": PALETTE.indigo,
};

export const UNIT_COST_SCALE: ColorScale = {
  "USD per 10 min": PALETTE.blue,
};

/** The two splits a reader can switch between. Same total, different question. */
export type CostSplit = "area" | "service";

export const COST_SPLITS: { key: CostSplit; label: string; description: string }[] = [
  {
    key: "area",
    label: "By area",
    description: "what the spend buys the learner",
  },
  {
    key: "service",
    label: "By service",
    description: "which vendor bill it lands on",
  },
];

/**
 * Money, at a precision that does not flatten a real figure to $0.00.
 *
 * Three tiers rather than a fixed two decimals. The unit cost on this tab is a
 * ratio of a small spend to a large number of minutes, and against real data it
 * came out at $0.000047 per ten minutes — which any of the shorter formats
 * renders as "$0", reporting free where money was spent. An exact zero is still
 * printed as a bare "$0", because that one IS zero.
 */
export const formatUsd = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "$0";
  const magnitude = Math.abs(value);
  const decimals = magnitude < 0.0001 ? 6 : magnitude < 0.01 ? 4 : 2;
  return `$${value.toFixed(decimals)}`;
};

/**
 * The caveat line a cost card must carry when any call went unpriced.
 *
 * `unpricedCalls` contribute $0, so the total is an UNDERSTATEMENT by an unknown
 * amount. Silence here would present an incomplete figure as complete, which is
 * the one failure mode a cost chart cannot recover from.
 */
export const unpricedNote = (response: RoleplayCostResponse | undefined): string => {
  const calls = response?.totalUnpricedCalls ?? 0;
  if (calls === 0) return "";
  return (
    ` ${calls.toLocaleString()} call${calls === 1 ? "" : "s"} had no price ` +
    `entry and count as $0, so the totals are understated.`
  );
};

/**
 * What share of platform AI spend this chart's numerator actually covers.
 *
 * Worth stating: a reader looking at "$0.02 per 10 minutes" will otherwise
 * assume it is the whole AI bill, when judges, authoring and internal tooling
 * are deliberately excluded. Null when nothing was spent at all.
 */
export const attributableSharePct = (response: RoleplayCostResponse | undefined): number | null => {
  if (!response) return null;
  const total = response.totalAttributableCostUsd + response.totalExcludedCostUsd;
  if (total <= 0) return null;
  return Math.round((response.totalAttributableCostUsd / total) * 1000) / 10;
};

/* -------------------------------------------------------------------------- */
/* Learner sentiment (proxy NPS)                                              */
/* -------------------------------------------------------------------------- */

/**
 * Proxy NPS, -100..+100.
 *
 * The label carries the qualifier because the label is what ends up in a
 * screenshot. "NPS" alone on this series would be quoted externally as a real
 * NPS within a week.
 */
export const buildProxyNpsSeries = (points: readonly QualitySentimentPoint[]): ChartDatum[] =>
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
      : `No period has both a judge score and a stateable sentiment figure.`;
  }

  const strength = Math.abs(r) >= 0.7 ? "strongly" : Math.abs(r) >= 0.4 ? "moderately" : "weakly";
  const direction = r >= 0 ? "together" : "in opposite directions";
  return (
    `Across ${paired} period${paired === 1 ? "" : "s"} the two move ` +
    `${strength} ${direction} (r = ${r.toFixed(2)}). Co-movement only — ` +
    `neither number causes the other.`
  );
};

/** Grey for the response-count context series under a sentiment plot. */
export const RESPONSES_SCALE: ColorScale = {
  Responses: CONTEXT.line,
};

/* -------------------------------------------------------------------------- */
/* Roleplay Quality Index                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Dimension keys, in the order the backend stacks them
 * (`QUALITY_INDEX_DIMENSIONS` in quality-index.constants.ts). Hardcoded here
 * rather than derived from a response: the STACK ORDER is part of the chart's
 * contract, not data, and must not reshuffle if a bucket happens to be missing
 * a dimension (see `buildQualityIndexAreaSeries` below).
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
 * The LINE is the subject here — the whole redesign is "here is the quality
 * index over time" — so it takes `CATEGORICAL[0]` (brand navy), matching
 * `single()`'s existing house convention of blue for "the one measure this
 * chart is about." The four STACK layers are the supporting decomposition, so
 * they take the next four categorical slots in fixed order — never the same
 * slot as the line, and never reassigned if a dimension drops out of a given
 * window (a filter changing the series present must not repaint the
 * survivors).
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
): ChartDatum[] =>
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
export const buildQualityIndexSeries = (points: readonly QualitySentimentPoint[]): ChartDatum[] =>
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
