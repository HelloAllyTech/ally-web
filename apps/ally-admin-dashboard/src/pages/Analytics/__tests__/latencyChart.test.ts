import { describe, expect, it } from "vitest";

import { StartLatencyPoint, VoiceLatencyByLanguageRow, VoiceLatencyPoint } from "@types";

import {
  CACHE_HIT_RATE_GROUP,
  FIRST_AUDIO_GROUPS,
  LATENCY_GROUPS,
  START_LATENCY_GROUPS,
  START_TOTAL_GROUPS,
  buildFirstAudioLatencySeries,
  buildFirstAudioMixSeries,
  buildLlmTtftSeries,
  buildPromptCacheHitRateSeries,
  buildReplyLatencySeries,
  buildStartLatencySegments,
  buildStartTotalSeries,
  buildVoiceLatencyByLanguageBars,
  buildVoiceLatencySeries,
  countFirstAudioTurns,
  countMaskedTurns,
  countStartLatencySessions,
  countVoiceLatencyTurns,
  latencyBucketTitle,
} from "../latencyChart";

const point = (over: Partial<VoiceLatencyPoint>): VoiceLatencyPoint => ({
  bucket: "2024-06-10",
  source: "pipeline",
  turns: 1,
  avgMs: 0,
  p50Ms: 0,
  p95Ms: 0,
  avgLlmTtftMs: null,
  p50LlmTtftMs: null,
  p95LlmTtftMs: null,
  avgCacheHitRatePct: null,
  firstAudioFillerTurns: 0,
  firstAudioInterimTurns: 0,
  firstAudioReplyTurns: 0,
  firstAudioUnknownTurns: 0,
  avgFirstAudioFillerMs: null,
  avgFirstAudioInterimMs: null,
  avgFirstAudioReplyMs: null,
  avgReplyLatencyMs: null,
  p50ReplyLatencyMs: null,
  p95ReplyLatencyMs: null,
  ...over,
});

const startPoint = (over: Partial<StartLatencyPoint>): StartLatencyPoint => ({
  bucket: "2024-06-10",
  source: "pipeline",
  sessions: 1,
  avgMs: 0,
  p50Ms: 0,
  p95Ms: 0,
  configureMs: 0,
  initializeMs: 0,
  connectMs: 0,
  prepMs: 0,
  ...over,
});

describe("buildVoiceLatencySeries", () => {
  it("plots p50, average AND p95 in seconds — an average alone hides the tail", () => {
    // p50 has always been returned by the API and was simply discarded, so the
    // chart could not distinguish "everyone waits 2s" from "most wait 1s and
    // some wait 8s".
    const series = buildVoiceLatencySeries(
      [point({ source: "pipeline", avgMs: 4858, p50Ms: 3200, p95Ms: 8046 })],
      "pipeline",
    );

    expect(series).toEqual([
      { group: LATENCY_GROUPS.p50, key: "2024-06-10", value: 3.2 },
      { group: LATENCY_GROUPS.avg, key: "2024-06-10", value: 4.858 },
      { group: LATENCY_GROUPS.p95, key: "2024-06-10", value: 8.046 },
    ]);
  });

  it("filters to ONE source, so live and backfilled numbers never share a plot", () => {
    // They measure the same quantity by different means, so a crossover between
    // them would be an artefact of the measurement.
    const points = [
      point({ source: "pipeline", avgMs: 1000 }),
      point({ source: "transcript", avgMs: 9000 }),
    ];

    const live = buildVoiceLatencySeries(points, "pipeline");
    const history = buildVoiceLatencySeries(points, "transcript");

    expect(live.map(d => d.value)).toEqual([0, 1, 0]);
    expect(history.map(d => d.value)).toEqual([0, 9, 0]);
    expect(live).toHaveLength(3);
    expect(history).toHaveLength(3);
  });

  it("omits buckets with no turns rather than plotting a zero latency", () => {
    expect(buildVoiceLatencySeries([], "pipeline")).toEqual([]);
  });
});

describe("buildLlmTtftSeries", () => {
  it("plots p50, average AND p95 in seconds, same as voice latency", () => {
    const series = buildLlmTtftSeries([
      point({ source: "pipeline", avgLlmTtftMs: 1200, p50LlmTtftMs: 900, p95LlmTtftMs: 2400 }),
    ]);

    expect(series).toEqual([
      { group: LATENCY_GROUPS.p50, key: "2024-06-10", value: 0.9 },
      { group: LATENCY_GROUPS.avg, key: "2024-06-10", value: 1.2 },
      { group: LATENCY_GROUPS.p95, key: "2024-06-10", value: 2.4 },
    ]);
  });

  it("is live-pipeline only — transcript points never appear, even if populated", () => {
    const points = [
      point({ source: "pipeline", avgLlmTtftMs: 1200, p50LlmTtftMs: 900, p95LlmTtftMs: 2400 }),
      point({ source: "transcript", avgLlmTtftMs: 5000, p50LlmTtftMs: 4000, p95LlmTtftMs: 9000 }),
    ];

    expect(buildLlmTtftSeries(points)).toHaveLength(3);
  });

  it("omits a null value rather than plotting a zero latency", () => {
    const series = buildLlmTtftSeries([
      point({ source: "pipeline", avgLlmTtftMs: 1200, p50LlmTtftMs: null, p95LlmTtftMs: 2400 }),
    ]);

    expect(series).toEqual([
      { group: LATENCY_GROUPS.avg, key: "2024-06-10", value: 1.2 },
      { group: LATENCY_GROUPS.p95, key: "2024-06-10", value: 2.4 },
    ]);
  });

  it("returns an empty series for no points", () => {
    expect(buildLlmTtftSeries([])).toEqual([]);
  });
});

describe("buildPromptCacheHitRateSeries", () => {
  it("plots one line — a ratio-of-sums has no percentile family", () => {
    const series = buildPromptCacheHitRateSeries([
      point({ source: "pipeline", avgCacheHitRatePct: 78 }),
    ]);

    expect(series).toEqual([{ group: CACHE_HIT_RATE_GROUP, key: "2024-06-10", value: 78 }]);
  });

  it("is live-pipeline only — transcript points never appear, even if populated", () => {
    const points = [
      point({ source: "pipeline", avgCacheHitRatePct: 78 }),
      point({ source: "transcript", avgCacheHitRatePct: 12 }),
    ];

    expect(buildPromptCacheHitRateSeries(points)).toHaveLength(1);
  });

  it("omits a null value rather than plotting a zero hit rate", () => {
    const points = [
      point({ source: "pipeline", avgCacheHitRatePct: null }),
      point({ bucket: "2024-06-11", source: "pipeline", avgCacheHitRatePct: 85 }),
    ];

    expect(buildPromptCacheHitRateSeries(points)).toEqual([
      { group: CACHE_HIT_RATE_GROUP, key: "2024-06-11", value: 85 },
    ]);
  });

  it("returns an empty series for no points", () => {
    expect(buildPromptCacheHitRateSeries([])).toEqual([]);
  });
});

describe("countVoiceLatencyTurns", () => {
  it("sums the turns behind a source, giving the chart its n", () => {
    const points = [
      point({ source: "pipeline", turns: 120 }),
      point({ source: "pipeline", turns: 80, bucket: "2024-06-11" }),
      point({ source: "transcript", turns: 5 }),
    ];

    expect(countVoiceLatencyTurns(points, "pipeline")).toBe(200);
    expect(countVoiceLatencyTurns(points, "transcript")).toBe(5);
  });
});

describe("buildVoiceLatencyByLanguageBars", () => {
  const row = (over: Partial<VoiceLatencyByLanguageRow>): VoiceLatencyByLanguageRow => ({
    language: "en",
    turns: 1,
    avgMs: 0,
    p50Ms: 0,
    p95Ms: 0,
    avgSttFinalizeMs: null,
    ...over,
  });

  it("sorts slowest-first so the bar that matters leads", () => {
    const { avg, p95 } = buildVoiceLatencyByLanguageBars([
      row({ language: "en", avgMs: 900, p95Ms: 1500 }),
      row({ language: "hi-IN", avgMs: 1200, p95Ms: 2100 }),
    ]);

    expect(avg).toEqual([
      { group: "hi-IN", value: 1.2 },
      { group: "en", value: 0.9 },
    ]);
    // Both series keep the SAME order, so the pair can be read across.
    expect(p95.map(b => b.group)).toEqual(["hi-IN", "en"]);
  });

  it("carries per-language turn counts, so a 4-turn language is not read as a 40k one", () => {
    const { turnsByLanguage, totalTurns } = buildVoiceLatencyByLanguageBars([
      row({ language: "en", turns: 40000, avgMs: 900 }),
      row({ language: "kn", turns: 4, avgMs: 3000 }),
    ]);

    expect(turnsByLanguage).toEqual({ en: 40000, kn: 4 });
    expect(totalTurns).toBe(40004);
  });

  it("returns empty bars for no rows", () => {
    expect(buildVoiceLatencyByLanguageBars([])).toEqual({
      avg: [],
      p95: [],
      sttFinalize: [],
      sttFinalizeByLanguage: {},
      turnsByLanguage: {},
      totalTurns: 0,
    });
  });

  it("omits languages with no STT-finalize data rather than fabricating a value", () => {
    const { sttFinalize, sttFinalizeByLanguage } = buildVoiceLatencyByLanguageBars([
      row({ language: "en", avgMs: 900, avgSttFinalizeMs: 300 }),
      row({ language: "ta-IN", avgMs: 1200, avgSttFinalizeMs: null }),
    ]);

    expect(sttFinalize).toEqual([{ group: "en", value: 0.3 }]);
    expect(sttFinalizeByLanguage).toEqual({ en: 0.3 });
  });
});

describe("start latency splits parts from wholes", () => {
  const points = [
    startPoint({
      source: "pipeline",
      configureMs: 500,
      initializeMs: 1000,
      connectMs: 1500,
      prepMs: 250,
      avgMs: 3250,
      sessions: 10,
    }),
    startPoint({ source: "transcript", bucket: "2024-06-11", avgMs: 5000, sessions: 3 }),
  ];

  it("stacks only the four PHASES, all from live rows", () => {
    // The historical total used to sit in this same stack, so a bar's height
    // meant "sum of phases" in some buckets and "the whole measurement" in
    // others.
    const segments = buildStartLatencySegments(points);

    expect(segments.map(d => d.group)).toEqual([
      START_LATENCY_GROUPS.configure,
      START_LATENCY_GROUPS.initialize,
      START_LATENCY_GROUPS.connect,
      START_LATENCY_GROUPS.prep,
    ]);
    expect(segments.map(d => d.value)).toEqual([0.5, 1, 1.5, 0.25]);
    // Sums to the reported mean total, which is what makes the stack meaningful.
    expect(segments.reduce((sum, d) => sum + (d.value ?? 0), 0)).toBe(3.25);
  });

  it("plots live and historical TOTALS as two comparable wholes", () => {
    const totals = buildStartTotalSeries(points);

    expect(totals).toEqual([
      { group: START_TOTAL_GROUPS.live, key: "2024-06-10", value: 3.25 },
      { group: START_TOTAL_GROUPS.historical, key: "2024-06-11", value: 5 },
    ]);
  });

  it("counts sessions overall and per source for the n", () => {
    expect(countStartLatencySessions(points)).toBe(13);
    expect(countStartLatencySessions(points, "pipeline")).toBe(10);
    expect(countStartLatencySessions(points, "transcript")).toBe(3);
  });
});

describe("latencyBucketTitle", () => {
  it("maps the backend bucket to an axis title, defaulting to Week", () => {
    expect(latencyBucketTitle("day")).toBe("Day");
    expect(latencyBucketTitle("month")).toBe("Month");
    expect(latencyBucketTitle("week")).toBe("Week");
    expect(latencyBucketTitle(undefined)).toBe("Week");
  });
});

describe("first-audio split", () => {
  const mixed = point({
    source: "pipeline",
    turns: 20,
    firstAudioFillerTurns: 10,
    firstAudioInterimTurns: 4,
    firstAudioReplyTurns: 4,
    firstAudioUnknownTurns: 2,
  });

  it("states shares out of the bucket's own turns, unrecorded ones included", () => {
    const series = buildFirstAudioMixSeries([mixed]);
    const byGroup = Object.fromEntries(series.map(d => [d.group, d.value]));

    expect(byGroup[FIRST_AUDIO_GROUPS.filler]).toBe(50);
    expect(byGroup[FIRST_AUDIO_GROUPS.interim]).toBe(20);
    expect(byGroup[FIRST_AUDIO_GROUPS.reply]).toBe(20);
    // Unrecorded turns are their own band, NOT folded into "the reply itself" —
    // they may have been masked and there is no way to tell.
    expect(byGroup[FIRST_AUDIO_GROUPS.unknown]).toBe(10);
    expect(series.reduce((sum, d) => sum + d.value, 0)).toBe(100);
  });

  it("stacks the unrecorded band last so the real bands share a baseline", () => {
    const groupsInOrder = Array.from(new Set(buildFirstAudioMixSeries([mixed]).map(d => d.group)));

    expect(groupsInOrder).toEqual([
      FIRST_AUDIO_GROUPS.reply,
      FIRST_AUDIO_GROUPS.interim,
      FIRST_AUDIO_GROUPS.filler,
      FIRST_AUDIO_GROUPS.unknown,
    ]);
  });

  it("omits a bucket with no turns rather than drawing an empty 100% stack", () => {
    expect(buildFirstAudioMixSeries([point({ turns: 0 })])).toEqual([]);
  });

  it("ignores transcript rows, which carry no provenance at all", () => {
    const transcript = point({ source: "transcript", turns: 5, firstAudioUnknownTurns: 5 });

    expect(buildFirstAudioMixSeries([transcript])).toEqual([]);
    expect(buildFirstAudioLatencySeries([transcript])).toEqual([]);
    expect(buildReplyLatencySeries([transcript])).toEqual([]);
  });

  it("plots a mean per source in seconds, omitting sources with no turns", () => {
    const series = buildFirstAudioLatencySeries([
      point({ avgFirstAudioFillerMs: 420, avgFirstAudioReplyMs: 3800 }),
    ]);

    expect(series).toEqual([
      { group: FIRST_AUDIO_GROUPS.filler, key: "2024-06-10", value: 0.42 },
      // No interim series: a bucket with no interim turns is a gap, not a 0s wait.
      { group: FIRST_AUDIO_GROUPS.reply, key: "2024-06-10", value: 3.8 },
    ]);
  });

  it("counts only instrumented turns as the n for the split charts", () => {
    // The 2 unrecorded turns are in the tab's other charts but cannot appear in
    // these, so quoting them as covered would overstate the sample.
    expect(countFirstAudioTurns([mixed])).toBe(18);
    expect(countMaskedTurns([mixed])).toBe(14);
  });
});

describe("buildReplyLatencySeries", () => {
  it("plots the unmasked reply time as p50/avg/p95 in seconds", () => {
    const series = buildReplyLatencySeries([
      point({ avgReplyLatencyMs: 3900, p50ReplyLatencyMs: 3400, p95ReplyLatencyMs: 7100 }),
    ]);

    expect(series).toEqual([
      { group: LATENCY_GROUPS.p50, key: "2024-06-10", value: 3.4 },
      { group: LATENCY_GROUPS.avg, key: "2024-06-10", value: 3.9 },
      { group: LATENCY_GROUPS.p95, key: "2024-06-10", value: 7.1 },
    ]);
  });

  it("leaves a gap for buckets predating the instrumentation instead of plotting 0", () => {
    // Null here means "we cannot say", and a 0s reply would be a lie the
    // reader has no way to spot.
    expect(buildReplyLatencySeries([point({ avgReplyLatencyMs: null })])).toEqual([]);
  });
});
