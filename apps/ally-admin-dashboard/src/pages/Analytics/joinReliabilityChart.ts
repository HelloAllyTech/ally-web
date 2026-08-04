import { AgentJoinReliabilityPoint, AnalyticsBucket, SessionOutcomeMix } from "@types";

import { ColorScale, OUTCOME_SCALE, PALETTE, STAT } from "./chartScales";

/**
 * Carbon plots a `null` value as a gap. Every rate builder here emits null
 * rather than 0 for a bucket with no sessions, because "no sessions ran" and
 * "sessions ran and none failed" are different facts and only one of them is
 * good news. The previous implementation returned 0 on a zero denominator, so a
 * quiet weekend rendered as a flat healthy 0% failure line.
 */
export type ChartDatum = { group: string; key: string; value: number | null };
export type DonutDatum = { group: string; value: number };

/** Reliability line labels, keyed so colour scale and data groups stay in sync. */
export const RELIABILITY_GROUPS = {
  joinFailure: "Join failure %",
  midDrop: "Mid-session drop %",
  freeze: "Suspected freeze %",
};

/**
 * Three distinct failure modes, so three distinct hues — but all in the warm
 * "something is wrong" family rather than spread across the spectrum.
 */
export const RELIABILITY_SCALE: ColorScale = {
  [RELIABILITY_GROUPS.joinFailure]: PALETTE.red,
  [RELIABILITY_GROUPS.midDrop]: PALETTE.orange,
  [RELIABILITY_GROUPS.freeze]: PALETTE.gold,
};

export const JOIN_LATENCY_GROUPS = {
  p50: "p50 (median)",
  p95: "p95 (slow tail)",
};

/** Same distribution, so same hue family as the other latency charts. */
export const JOIN_LATENCY_SCALE: ColorScale = {
  [JOIN_LATENCY_GROUPS.p50]: STAT.p50,
  [JOIN_LATENCY_GROUPS.p95]: STAT.p95,
};

/** Outcome-mix donut uses the shared outcome scale so green/red mean one thing. */
export const OUTCOME_MIX_SCALE = OUTCOME_SCALE;

/** A rate as a 1-dp percentage, or null when there is nothing to divide by. */
const pct = (num: number, denom: number): number | null =>
  denom > 0 ? Math.round((num / denom) * 1000) / 10 : null;

/**
 * Three failure-rate lines per bucket. All are rates over the same denominator
 * (sessions in the bucket), so they honestly share one % axis.
 *
 * A bucket with no sessions yields null for all three — a visible gap, not a
 * clean bill of health.
 */
export function buildReliabilitySeries(points: AgentJoinReliabilityPoint[]): ChartDatum[] {
  return points.flatMap(p => {
    const measured = p.totalSessions > 0;
    return [
      {
        group: RELIABILITY_GROUPS.joinFailure,
        key: p.bucket,
        value: measured ? p.failureRatePct : null,
      },
      {
        group: RELIABILITY_GROUPS.midDrop,
        key: p.bucket,
        value: pct(p.midSessionDrops, p.totalSessions),
      },
      {
        group: RELIABILITY_GROUPS.freeze,
        key: p.bucket,
        // Freezes are measured over conversations (sessions that got talking),
        // not all sessions — a session that never joined cannot freeze.
        value: p.conversations > 0 ? p.freezeRatePct : null,
      },
    ];
  });
}

/**
 * Dispatch->join latency p50/p95 (seconds) per bucket. Buckets with no joins
 * have null percentiles and are skipped — latency has no meaningful zero.
 */
export function buildJoinLatencySeries(points: AgentJoinReliabilityPoint[]): ChartDatum[] {
  return points.flatMap(p => {
    const rows: ChartDatum[] = [];
    if (p.joinLatencyP50Sec !== null) {
      rows.push({ group: JOIN_LATENCY_GROUPS.p50, key: p.bucket, value: p.joinLatencyP50Sec });
    }
    if (p.joinLatencyP95Sec !== null) {
      rows.push({ group: JOIN_LATENCY_GROUPS.p95, key: p.bucket, value: p.joinLatencyP95Sec });
    }
    return rows;
  });
}

/** Total sessions behind the reliability series — the n it is measured over. */
export function countReliabilitySessions(points: AgentJoinReliabilityPoint[]): number {
  return points.reduce((sum, p) => sum + p.totalSessions, 0);
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
