import { AgentJoinReliabilityPoint, AnalyticsBucket, SessionOutcomeMix } from "@types";

export type ChartDatum = { group: string; key: string; value: number };
export type DonutDatum = { group: string; value: number };

// Reliability line labels, keyed so color scale and data groups stay in sync.
export const RELIABILITY_GROUPS = {
  joinFailure: "Join failure %",
  midDrop: "Mid-session drop %",
  freeze: "Suspected freeze %",
};

export const JOIN_LATENCY_GROUPS = {
  p50: "p50",
  p95: "p95",
};

const pct = (num: number, denom: number): number =>
  denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0;

/**
 * Two percentage lines per bucket: join-failure rate (agent never joined) and
 * mid-session drop rate (agent joined then left). Both are rates so they share
 * the % y-axis.
 */
export function buildReliabilitySeries(points: AgentJoinReliabilityPoint[]): ChartDatum[] {
  return points.flatMap(p => [
    {
      group: RELIABILITY_GROUPS.joinFailure,
      key: p.bucket,
      value: p.failureRatePct,
    },
    {
      group: RELIABILITY_GROUPS.midDrop,
      key: p.bucket,
      value: pct(p.midSessionDrops, p.totalSessions),
    },
    {
      group: RELIABILITY_GROUPS.freeze,
      key: p.bucket,
      value: p.freezeRatePct,
    },
  ]);
}

/**
 * Dispatch->join latency p50/p95 (seconds) per bucket. Buckets with no joins
 * (null percentiles) are skipped — latency has no meaningful zero, so the chart
 * shows a gap rather than a fabricated 0 (mirrors the voice-latency chart).
 */
export function buildJoinLatencySeries(points: AgentJoinReliabilityPoint[]): ChartDatum[] {
  return points.flatMap(p => {
    const rows: ChartDatum[] = [];
    if (p.joinLatencyP50Sec !== null) {
      rows.push({
        group: JOIN_LATENCY_GROUPS.p50,
        key: p.bucket,
        value: p.joinLatencyP50Sec,
      });
    }
    if (p.joinLatencyP95Sec !== null) {
      rows.push({
        group: JOIN_LATENCY_GROUPS.p95,
        key: p.bucket,
        value: p.joinLatencyP95Sec,
      });
    }
    return rows;
  });
}

/** Outcome mix as donut slices. */
export function buildOutcomeMixData(mix?: SessionOutcomeMix): DonutDatum[] {
  if (!mix) return [];
  return [
    { group: "Completed", value: mix.completed },
    { group: "No conversation", value: mix.noConversation },
    { group: "In progress", value: mix.inProgress },
  ];
}

/** Human-readable x-axis title for the bucket granularity returned by the BE. */
export function reliabilityBucketTitle(bucket?: AnalyticsBucket | string): string {
  if (bucket === "day") return "Day";
  if (bucket === "month") return "Month";
  return "Week";
}
