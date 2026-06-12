import { AnalyticsBucket, VoiceLatencyPoint } from "@types";

// Latency series labels, keyed so the color scale and data groups stay in sync.
export const LATENCY_GROUPS = {
  pipelineAvg: "Live avg",
  pipelineP95: "Live p95",
  transcriptAvg: "History avg",
  transcriptP95: "History p95",
};

export type LatencyDatum = { group: string; key: string; value: number };

/**
 * Map the BE's per-bucket, per-source latency points (milliseconds) into Carbon
 * line-chart data in **seconds**, one line per (source × {avg, p95}). Buckets
 * with no turns are simply absent from `points` — latency has no meaningful
 * zero, so the chart shows a gap rather than a fabricated 0.
 */
export function buildVoiceLatencySeries(points: VoiceLatencyPoint[]): LatencyDatum[] {
  const toS = (ms: number) => Math.round(ms) / 1000;
  return points.flatMap(point => {
    const isPipeline = point.source === "pipeline";
    const avgGroup = isPipeline ? LATENCY_GROUPS.pipelineAvg : LATENCY_GROUPS.transcriptAvg;
    const p95Group = isPipeline ? LATENCY_GROUPS.pipelineP95 : LATENCY_GROUPS.transcriptP95;
    return [
      { group: avgGroup, key: point.bucket, value: toS(point.avgMs) },
      { group: p95Group, key: point.bucket, value: toS(point.p95Ms) },
    ];
  });
}

/** Human-readable x-axis title for the bucket granularity returned by the BE. */
export function latencyBucketTitle(bucket?: AnalyticsBucket | string): string {
  if (bucket === "day") return "Day";
  if (bucket === "month") return "Month";
  return "Week";
}
