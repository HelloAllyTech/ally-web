import {
  CostPerSimPoint,
  CsatTrendPoint,
  PracticeMinutesPoint,
  QualityTrendPoint,
  TopOrgRow,
  TrackFunnel,
} from "@types";

export type HighlightsDatum = { group: string; key: string; value: number };
export type HighlightsBarDatum = { group: string; value: number };

/** Series labels, keyed so the color scales and data groups stay in sync. */
export const HIGHLIGHTS_GROUPS = {
  practiceMinutes: "Minutes practiced",
  qualityScore: "Avg score",
  csat: "Avg rating",
  costPerSim: "Cost / sim",
  totalCost: "Total cost",
};

/**
 * Minutes practiced per bucket. The BE gap-fills this series, so zero buckets
 * are real zeros (nobody practiced) rather than missing data — plot them.
 */
export function buildPracticeMinutesSeries(points: PracticeMinutesPoint[]): HighlightsDatum[] {
  return points.map(p => ({
    group: HIGHLIGHTS_GROUPS.practiceMinutes,
    key: p.bucket,
    value: p.minutes,
  }));
}

/**
 * Roleplay quality trend (mean composite evaluation score, 0-100). The BE
 * leaves this series sparse — a bucket with no evaluated sessions has no
 * meaningful average, so it is dropped and the line shows a gap rather than a
 * fabricated zero.
 */
export function buildQualityTrendSeries(points: QualityTrendPoint[]): HighlightsDatum[] {
  return points
    .filter(p => p.avgCompositeScore !== null)
    .map(p => ({
      group: HIGHLIGHTS_GROUPS.qualityScore,
      key: p.bucket,
      value: p.avgCompositeScore as number,
    }));
}

/** Learner CSAT trend; sparse for the same reason as the quality trend. */
export function buildCsatTrendSeries(points: CsatTrendPoint[]): HighlightsDatum[] {
  return points
    .filter(p => p.avgRating !== null)
    .map(p => ({
      group: HIGHLIGHTS_GROUPS.csat,
      key: p.bucket,
      value: p.avgRating as number,
    }));
}

/** Top orgs by completed simulations, as one bar per org. */
export function buildTopOrgBars(rows: TopOrgRow[]): HighlightsBarDatum[] {
  return rows.map(r => ({ group: r.tenantName, value: r.completedSimulations }));
}

export type FunnelRow = { phase: string; reached: number };

/**
 * Ordered learning-track funnel rows for the horizontal-bar funnel. Cohort
 * semantics on the BE guarantee enrolled >= started >= completed.
 */
export function buildTrackFunnelRows(funnel?: TrackFunnel): FunnelRow[] {
  if (!funnel) return [];
  return [
    { phase: "Enrolled", reached: funnel.enrolled },
    { phase: "Started", reached: funnel.started },
    { phase: "Completed", reached: funnel.completed },
  ];
}

/**
 * AI cost per completed simulation plus total spend, as two lines. Buckets with
 * no completed simulations have a null ratio (never Infinity) and are dropped
 * from the "Cost / sim" line; total cost is gap-filled by the BE so it plots
 * every bucket.
 */
export function buildCostPerSimSeries(points: CostPerSimPoint[]): HighlightsDatum[] {
  return points.flatMap(p => {
    const total = {
      group: HIGHLIGHTS_GROUPS.totalCost,
      key: p.bucket,
      value: p.estimatedCostUsd,
    };
    if (p.costPerSimUsd === null) return [total];
    return [{ group: HIGHLIGHTS_GROUPS.costPerSim, key: p.bucket, value: p.costPerSimUsd }, total];
  });
}

/** Pre-formatted KPI value, or an em-dash when the metric has no value. */
export function formatKpi(
  value: number | null | undefined,
  opts: { suffix?: string; prefix?: string; decimals?: number } = {},
): string {
  if (value === null || value === undefined) return "—";
  const { suffix = "", prefix = "", decimals } = opts;
  const body =
    decimals === undefined
      ? value.toLocaleString()
      : value.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  return `${prefix}${body}${suffix}`;
}
