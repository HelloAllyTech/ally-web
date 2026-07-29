import {
  AnalyticsBucket,
  StartLatencyPoint,
  VoiceLatencyByLanguageRow,
  VoiceLatencyPoint,
} from "@types";

import { bucketTitle } from "./analyticsGrouping";
import { CONTEXT, ColorScale, STAT } from "./chartScales";

/**
 * Latency series labels, keyed so the colour scale and data groups stay in sync.
 *
 * Live and Historical are split into SEPARATE CHARTS rather than four lines on
 * one plot: they measure latency differently (real-time pipeline instrumentation
 * vs. values derived from backfilled transcripts), so a crossover between them
 * is an artefact of the measurement, not a fact about the system.
 */
export const LATENCY_GROUPS = {
  p50: "p50 (median)",
  avg: "Average",
  p95: "p95 (slow tail)",
};

/**
 * One hue, three shades: p50/avg/p95 are the same measure at different points of
 * one distribution, so they read as a family. The previous scale gave them four
 * unrelated hues across two sources, which made the avg-vs-p95 pairing legible
 * in one source and invisible in the other.
 */
export const LATENCY_STAT_SCALE: ColorScale = {
  [LATENCY_GROUPS.p50]: STAT.p50,
  [LATENCY_GROUPS.avg]: STAT.avg,
  [LATENCY_GROUPS.p95]: STAT.p95,
};

export type LatencyDatum = { group: string; key: string; value: number };

export type LatencySource = "pipeline" | "transcript";

const toS = (ms: number) => Math.round(ms) / 1000;

/**
 * Per-bucket latency for ONE source, in seconds, as three lines: p50, average
 * and p95.
 *
 * p50 is plotted alongside the average and the tail because an average on its
 * own is a half-truth — it cannot distinguish "everyone waits 2s" from "most
 * wait 1s and some wait 8s", and those call for different fixes. The backend has
 * always returned p50; it was simply discarded.
 *
 * Buckets with no turns are absent from `points`: latency has no meaningful
 * zero, so the chart shows a gap rather than a fabricated 0.
 */
export function buildVoiceLatencySeries(
  points: VoiceLatencyPoint[],
  source: LatencySource,
): LatencyDatum[] {
  return points
    .filter(point => point.source === source)
    .flatMap(point => [
      { group: LATENCY_GROUPS.p50, key: point.bucket, value: toS(point.p50Ms) },
      { group: LATENCY_GROUPS.avg, key: point.bucket, value: toS(point.avgMs) },
      { group: LATENCY_GROUPS.p95, key: point.bucket, value: toS(point.p95Ms) },
    ]);
}

/** Total turns behind a source's series — the n the chart is measured over. */
export function countVoiceLatencyTurns(points: VoiceLatencyPoint[], source: LatencySource): number {
  return points
    .filter(point => point.source === source)
    .reduce((sum, point) => sum + point.turns, 0);
}

export type LanguageBarDatum = { group: string; value: number };

/**
 * Per-language live-pipeline latency (seconds), as avg and p95 series.
 *
 * Rows are sorted worst-first so the bar that matters is the one the eye lands
 * on, and `turns` travels alongside because a language with four turns and one
 * with forty thousand rendered identically before — the reader had no way to
 * tell a real regression from noise.
 */
export function buildVoiceLatencyByLanguageBars(rows: VoiceLatencyByLanguageRow[]): {
  avg: LanguageBarDatum[];
  p95: LanguageBarDatum[];
  turnsByLanguage: Record<string, number>;
  totalTurns: number;
} {
  const sorted = [...rows].sort((a, b) => b.avgMs - a.avgMs);
  return {
    avg: sorted.map(r => ({ group: r.language, value: toS(r.avgMs) })),
    p95: sorted.map(r => ({ group: r.language, value: toS(r.p95Ms) })),
    turnsByLanguage: Object.fromEntries(sorted.map(r => [r.language, r.turns])),
    totalTurns: sorted.reduce((sum, r) => sum + r.turns, 0),
  };
}

/**
 * Human-readable x-axis title for the bucket granularity returned by the BE.
 * Delegates to the shared grain table so a new granularity cannot be legible on
 * one tab and fall back to "Week" on another (which is what happened when this
 * held its own if-chain and `year` was added).
 */
export function latencyBucketTitle(bucket?: AnalyticsBucket | string): string {
  return bucketTitle(bucket);
}

/**
 * Start-latency ("time to first word") stacked-segment labels — the four
 * startup phases that sum to the mean total.
 *
 * The historical (backfilled) total is deliberately NOT one of these. It used to
 * be stacked into the same bar as the four parts, which meant the bar's height
 * meant "sum of phases" in some buckets and "the whole measurement" in others —
 * a part and a whole sharing one stack. It now gets its own chart.
 */
export const START_LATENCY_GROUPS = {
  configure: "Configure",
  initialize: "Initialize",
  connect: "Connect",
  prep: "Prep",
};

/**
 * Sequential scale over the startup phases: these are ORDERED stages of one
 * process, so a same-hue ramp reads as a sequence. Four unrelated hues implied
 * four unrelated things.
 */
export const START_SEGMENT_SCALE: ColorScale = {
  [START_LATENCY_GROUPS.configure]: "#a6c8ff",
  [START_LATENCY_GROUPS.initialize]: "#78a9ff",
  [START_LATENCY_GROUPS.connect]: "#4589ff",
  [START_LATENCY_GROUPS.prep]: "#0043ce",
};

export const START_TOTAL_GROUPS = {
  live: "Live total",
  historical: "Historical total",
};

/** Live is the subject; the backfilled series is context (§8.2). */
export const START_TOTAL_SCALE: ColorScale = {
  [START_TOTAL_GROUPS.live]: STAT.avg,
  [START_TOTAL_GROUPS.historical]: CONTEXT.line,
};

/**
 * Mean per-phase start latency (seconds) for LIVE pipeline buckets only, as a
 * stacked bar whose height is the mean total time to first word.
 *
 * Transcript-derived rows carry no phase breakdown, so they are excluded here
 * and plotted by {@link buildStartTotalSeries} instead.
 */
export function buildStartLatencySegments(points: StartLatencyPoint[]): LatencyDatum[] {
  return points
    .filter(point => point.source === "pipeline")
    .flatMap(point => [
      {
        group: START_LATENCY_GROUPS.configure,
        key: point.bucket,
        value: toS(point.configureMs),
      },
      {
        group: START_LATENCY_GROUPS.initialize,
        key: point.bucket,
        value: toS(point.initializeMs),
      },
      { group: START_LATENCY_GROUPS.connect, key: point.bucket, value: toS(point.connectMs) },
      { group: START_LATENCY_GROUPS.prep, key: point.bucket, value: toS(point.prepMs) },
    ]);
}

/**
 * Mean total time-to-first-word per bucket as two comparable lines — live and
 * historical — each a WHOLE, so they can honestly share an axis.
 */
export function buildStartTotalSeries(points: StartLatencyPoint[]): LatencyDatum[] {
  return points.map(point => ({
    group: point.source === "pipeline" ? START_TOTAL_GROUPS.live : START_TOTAL_GROUPS.historical,
    key: point.bucket,
    value: toS(point.avgMs),
  }));
}

/** Total sessions behind the start-latency series — the n it is measured over. */
export function countStartLatencySessions(
  points: StartLatencyPoint[],
  source?: LatencySource,
): number {
  return points
    .filter(point => !source || point.source === source)
    .reduce((sum, point) => sum + point.sessions, 0);
}
