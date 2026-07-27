import {
  AnalyticsBucket,
  StartLatencyPoint,
  VoiceLatencyByLanguageRow,
  VoiceLatencyPoint,
} from "@types";

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

export type LanguageBarDatum = { group: string; value: number };

/**
 * Map the BE's per-language live-pipeline latency rows (ms) into Carbon
 * simple-bar data in **seconds**, one bar per language. Returns avg and p95
 * as two separate series so each can drive its own bar chart, mirroring how
 * `driftRateByLanguage` feeds a single-metric-per-language bar chart.
 */
export function buildVoiceLatencyByLanguageBars(rows: VoiceLatencyByLanguageRow[]): {
  avg: LanguageBarDatum[];
  p95: LanguageBarDatum[];
} {
  const toS = (ms: number) => Math.round(ms) / 1000;
  return {
    avg: rows.map(r => ({ group: r.language, value: toS(r.avgMs) })),
    p95: rows.map(r => ({ group: r.language, value: toS(r.p95Ms) })),
  };
}

/** Human-readable x-axis title for the bucket granularity returned by the BE. */
export function latencyBucketTitle(bucket?: AnalyticsBucket | string): string {
  if (bucket === "day") return "Day";
  if (bucket === "month") return "Month";
  return "Week";
}

// Start-latency ("time to first word") stacked-segment labels. Pipeline rows
// carry the four-segment breakdown; transcript-derived (backfilled) rows have
// only a total, shown as a single "Historical total" segment.
export const START_LATENCY_GROUPS = {
  configure: "Configure",
  initialize: "Initialize",
  connect: "Connect",
  prep: "Prep",
  transcriptTotal: "Historical total",
};

/**
 * Map the BE's per-bucket, per-source start-latency points (ms) into Carbon
 * stacked-bar data in **seconds**. A `pipeline` row contributes one datum per
 * segment (Configure / Initialize / Connect / Prep) so the stack sums to the
 * mean total time-to-first-word; a `transcript` (backfilled) row has no segment
 * breakdown, so it contributes a single "Historical total" datum. Buckets with
 * no sessions are absent from `points` (no fabricated zero).
 */
export function buildStartLatencySeries(points: StartLatencyPoint[]): LatencyDatum[] {
  const toS = (ms: number) => Math.round(ms) / 1000;
  return points.flatMap(point => {
    if (point.source === "pipeline") {
      return [
        { group: START_LATENCY_GROUPS.configure, key: point.bucket, value: toS(point.configureMs) },
        {
          group: START_LATENCY_GROUPS.initialize,
          key: point.bucket,
          value: toS(point.initializeMs),
        },
        { group: START_LATENCY_GROUPS.connect, key: point.bucket, value: toS(point.connectMs) },
        { group: START_LATENCY_GROUPS.prep, key: point.bucket, value: toS(point.prepMs) },
      ];
    }
    return [
      { group: START_LATENCY_GROUPS.transcriptTotal, key: point.bucket, value: toS(point.avgMs) },
    ];
  });
}
