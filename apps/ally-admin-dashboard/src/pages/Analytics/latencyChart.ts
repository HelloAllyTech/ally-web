import {
  AnalyticsBucket,
  StartLatencyPoint,
  VoiceLatencyByLanguageRow,
  VoiceLatencyByScenarioRow,
  VoiceLatencyPoint,
} from "@types";

import { bucketTitle } from "./analyticsGrouping";
import { single } from "./chartKit";
import { CONTEXT, ColorScale, PALETTE, STAT } from "./chartScales";

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

/**
 * Per-bucket LLM time-to-first-token, in seconds, as p50/avg/p95 lines.
 *
 * Live-pipeline only — llmTtft is a live-instrumentation field with no
 * transcript-derived counterpart, so there is no "historical" companion
 * series the way {@link buildVoiceLatencySeries} has one. A bucket (or a
 * single group within it) is omitted rather than plotted as 0 when its
 * value is null — latency has no meaningful zero, same rule as the rest of
 * this file.
 */
export function buildLlmTtftSeries(points: VoiceLatencyPoint[]): LatencyDatum[] {
  return points
    .filter(point => point.source === "pipeline")
    .flatMap(point => {
      const datums: LatencyDatum[] = [];
      if (point.p50LlmTtftMs != null) {
        datums.push({
          group: LATENCY_GROUPS.p50,
          key: point.bucket,
          value: toS(point.p50LlmTtftMs),
        });
      }
      if (point.avgLlmTtftMs != null) {
        datums.push({
          group: LATENCY_GROUPS.avg,
          key: point.bucket,
          value: toS(point.avgLlmTtftMs),
        });
      }
      if (point.p95LlmTtftMs != null) {
        datums.push({
          group: LATENCY_GROUPS.p95,
          key: point.bucket,
          value: toS(point.p95LlmTtftMs),
        });
      }
      return datums;
    });
}

/** Single-measure chart — no percentile family, so one hue via `single()` (§8.1), not a scale. */
export const CACHE_HIT_RATE_GROUP = "Cache hit rate";
export const CACHE_HIT_RATE_SCALE: ColorScale = single(CACHE_HIT_RATE_GROUP, PALETTE.teal);

/**
 * Per-bucket OpenAI prompt-cache hit rate (%), one line, ratio-of-sums per
 * bucket (computed server-side, not averaged client-side across turns).
 *
 * Live-pipeline only, same as {@link buildLlmTtftSeries} — no transcript
 * counterpart exists for this field. Omitted (not zeroed) when null: a
 * bucket predating this being instrumented is a gap, not a real 0% turn.
 */
export function buildPromptCacheHitRateSeries(points: VoiceLatencyPoint[]): LatencyDatum[] {
  return points
    .filter(point => point.source === "pipeline")
    .flatMap(point =>
      point.avgCacheHitRatePct != null
        ? [{ group: CACHE_HIT_RATE_GROUP, key: point.bucket, value: point.avgCacheHitRatePct }]
        : [],
    );
}

/**
 * What the learner actually heard first on a turn.
 *
 * `responseLatencyMs` is time-to-FIRST-AUDIO, and the agent's first audio is a
 * thinking-filler or a predictive interim reply whenever one played. That is the
 * honest measure of "how long until someone spoke to me" — but on its own it
 * makes a turn masked at 400ms indistinguishable from one genuinely answered at
 * 400ms, so a rise in filler coverage would read as a latency win. These groups
 * exist to keep those two stories apart.
 */
export const FIRST_AUDIO_GROUPS = {
  filler: "Thinking filler",
  interim: "Interim reply",
  reply: "The reply itself",
  unknown: "Not recorded",
};

/**
 * Masking speech and the real reply are different KINDS of first audio, not
 * degrees of one thing, so they take distinct hues rather than a ramp. "Not
 * recorded" is the absence of knowledge, not a fourth kind of audio, so it takes
 * context grey — the same rule the usage-level zero band follows (§8.2).
 */
export const FIRST_AUDIO_SCALE: ColorScale = {
  [FIRST_AUDIO_GROUPS.filler]: PALETTE.teal,
  [FIRST_AUDIO_GROUPS.interim]: PALETTE.purple,
  [FIRST_AUDIO_GROUPS.reply]: STAT.avg,
  [FIRST_AUDIO_GROUPS.unknown]: CONTEXT.faint,
};

/** Live-pipeline buckets that have at least one turn to state shares over. */
const firstAudioBuckets = (points: VoiceLatencyPoint[]) =>
  points
    .filter(point => point.source === "pipeline")
    .map(point => ({
      point,
      // Denominator is the sum of the four mutually-exclusive counts rather
      // than `turns`: they partition the bucket by construction, so summing
      // them cannot produce shares that fail to reach 100%.
      total:
        point.firstAudioFillerTurns +
        point.firstAudioInterimTurns +
        point.firstAudioReplyTurns +
        point.firstAudioUnknownTurns,
    }))
    .filter(({ total }) => total > 0);

/**
 * Share of each bucket's turns by what spoke first, as a 100%-stacked bar.
 *
 * Emitted group-by-group in stack order (Carbon takes stack order from first
 * appearance), reading bottom-to-top: the unmasked reply, then the two kinds of
 * masking speech, then the unrecorded remainder LAST. "Not recorded" sits on top
 * on purpose — its size is an artefact of when instrumentation landed, and
 * putting it at the bottom would shift the real bands off a common baseline and
 * make them impossible to compare across buckets.
 */
export function buildFirstAudioMixSeries(points: VoiceLatencyPoint[]): LatencyDatum[] {
  const buckets = firstAudioBuckets(points);
  const share = (count: number, total: number) => Math.round((1000 * count) / total) / 10;
  return (
    [
      [FIRST_AUDIO_GROUPS.reply, (p: VoiceLatencyPoint) => p.firstAudioReplyTurns],
      [FIRST_AUDIO_GROUPS.interim, (p: VoiceLatencyPoint) => p.firstAudioInterimTurns],
      [FIRST_AUDIO_GROUPS.filler, (p: VoiceLatencyPoint) => p.firstAudioFillerTurns],
      [FIRST_AUDIO_GROUPS.unknown, (p: VoiceLatencyPoint) => p.firstAudioUnknownTurns],
    ] as const
  ).flatMap(([group, pick]) =>
    buckets.map(({ point, total }) => ({
      group,
      key: point.bucket,
      value: share(pick(point), total),
    })),
  );
}

/**
 * Mean time-to-first-voice per bucket, split by what spoke first.
 *
 * This is the "why" behind the headline trend: filler-first turns sit near the
 * filler's own delay, reply-first turns carry the full pipeline. A group is
 * OMITTED for a bucket with no turns of that kind rather than drawn at 0 —
 * latency has no meaningful zero, same rule as every other series here.
 *
 * Turns with no recorded provenance have no line: there is no per-source mean to
 * state for them. Their share is on the mix chart, which is where the reader
 * should look to see how much of the window this chart cannot speak for.
 */
export function buildFirstAudioLatencySeries(points: VoiceLatencyPoint[]): LatencyDatum[] {
  return points
    .filter(point => point.source === "pipeline")
    .flatMap(point =>
      (
        [
          [FIRST_AUDIO_GROUPS.filler, point.avgFirstAudioFillerMs],
          [FIRST_AUDIO_GROUPS.interim, point.avgFirstAudioInterimMs],
          [FIRST_AUDIO_GROUPS.reply, point.avgFirstAudioReplyMs],
        ] as const
      ).flatMap(([group, ms]) =>
        ms != null ? [{ group, key: point.bucket, value: toS(ms) }] : [],
      ),
    );
}

/**
 * Time to the REAL reply per bucket (p50/avg/p95) — the unmasked pipeline
 * number, which does not move when filler coverage does.
 *
 * Read against the time-to-first-voice chart above: that one is the learner's
 * experience, this one is the machine's. Widening the gap between them means
 * more masking; a rise in THIS one is a genuine regression no amount of filler
 * coverage can hide.
 *
 * Live-pipeline and instrumented turns only — null (not 0) for buckets that
 * predate the provenance instrumentation, so those buckets are simply absent.
 */
export function buildReplyLatencySeries(points: VoiceLatencyPoint[]): LatencyDatum[] {
  return points
    .filter(point => point.source === "pipeline")
    .flatMap(point =>
      (
        [
          [LATENCY_GROUPS.p50, point.p50ReplyLatencyMs],
          [LATENCY_GROUPS.avg, point.avgReplyLatencyMs],
          [LATENCY_GROUPS.p95, point.p95ReplyLatencyMs],
        ] as const
      ).flatMap(([group, ms]) =>
        ms != null ? [{ group, key: point.bucket, value: toS(ms) }] : [],
      ),
    );
}

/**
 * Live turns carrying a recorded first-audio source — the n the split charts are
 * measured over, which is NOT the same as the tab's live turn count while any
 * pre-instrumentation data is still inside the window.
 */
export function countFirstAudioTurns(points: VoiceLatencyPoint[]): number {
  return points
    .filter(point => point.source === "pipeline")
    .reduce(
      (sum, point) =>
        sum +
        point.firstAudioFillerTurns +
        point.firstAudioInterimTurns +
        point.firstAudioReplyTurns,
      0,
    );
}

/** Live turns whose first audio was masking speech (filler or interim). */
export function countMaskedTurns(points: VoiceLatencyPoint[]): number {
  return points
    .filter(point => point.source === "pipeline")
    .reduce((sum, point) => sum + point.firstAudioFillerTurns + point.firstAudioInterimTurns, 0);
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
  /**
   * Mean pure STT finalization time per language, seconds. Rows where
   * avgSttFinalizeMs is null (no turns with the field populated yet, e.g.
   * pre-rollout data) are omitted rather than fabricated as 0.
   */
  sttFinalize: LanguageBarDatum[];
  /** Same values as `sttFinalize`, keyed by language for table lookups (the array omits languages with no data, so index alignment with `avg`/`p95` can't be assumed). */
  sttFinalizeByLanguage: Record<string, number>;
  turnsByLanguage: Record<string, number>;
  totalTurns: number;
} {
  const sorted = [...rows].sort((a, b) => b.avgMs - a.avgMs);
  const sttFinalizeRows = sorted.filter(r => r.avgSttFinalizeMs != null);
  return {
    avg: sorted.map(r => ({ group: r.language, value: toS(r.avgMs) })),
    p95: sorted.map(r => ({ group: r.language, value: toS(r.p95Ms) })),
    sttFinalize: sttFinalizeRows.map(r => ({
      group: r.language,
      value: toS(r.avgSttFinalizeMs as number),
    })),
    sttFinalizeByLanguage: Object.fromEntries(
      sttFinalizeRows.map(r => [r.language, toS(r.avgSttFinalizeMs as number)]),
    ),
    turnsByLanguage: Object.fromEntries(sorted.map(r => [r.language, r.turns])),
    totalTurns: sorted.reduce((sum, r) => sum + r.turns, 0),
  };
}

/**
 * Top-N worst simulations, one bar chart per metric, each independently
 * sorted by ITS OWN metric — not "the top-10-by-response-latency
 * simulations' TTFT values". A simulation can be fine on overall response
 * latency but bad specifically on LLM TTFT (or vice versa), and showing one
 * chart's ranking through the other's lens would hide that.
 *
 * Truncated to `topN` (unlike {@link buildVoiceLatencyByLanguageBars}, which
 * shows every language because there are only a handful) — `totalScenarios`
 * travels alongside so the caller can caption "top N of M", making the
 * truncation visible rather than silent. Rows with a null metric are
 * dropped from THAT metric's chart only (a simulation can be missing
 * avgLlmTtftMs while still having a real avgResponseLatencyMs).
 */
export function buildVoiceLatencyByScenarioBars(
  rows: VoiceLatencyByScenarioRow[],
  topN = 10,
): {
  avgResponseLatency: LanguageBarDatum[];
  avgLlmTtft: LanguageBarDatum[];
  totalScenarios: number;
} {
  const worstBy = (metric: "avgResponseLatencyMs" | "avgLlmTtftMs"): LanguageBarDatum[] =>
    [...rows]
      .filter(r => r[metric] != null)
      .sort((a, b) => (b[metric] as number) - (a[metric] as number))
      .slice(0, topN)
      .map(r => ({ group: r.scenarioTitle, value: toS(r[metric] as number) }));

  return {
    avgResponseLatency: worstBy("avgResponseLatencyMs"),
    avgLlmTtft: worstBy("avgLlmTtftMs"),
    totalScenarios: rows.length,
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
