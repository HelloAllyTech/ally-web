import { describe, expect, it } from "vitest";

import {
  StartLatencyPoint,
  VoiceLatencyByLanguageRow,
  VoiceLatencyByScenarioRow,
  VoiceLatencyByVoiceModelRow,
  VoiceLatencyPoint,
  VoiceLatencySessionRow,
} from "@types";

import {
  CACHE_HIT_RATE_GROUP,
  FIRST_AUDIO_GROUPS,
  FIRST_AUDIO_SCALE,
  LATENCY_GROUPS,
  START_LATENCY_GROUPS,
  START_TOTAL_GROUPS,
  buildFirstAudioByVoiceModelSeries,
  buildFirstAudioLatencySeries,
  buildFirstAudioMixSeries,
  buildLlmTtftSeries,
  buildPromptCacheHitRateSeries,
  buildReplyLatencySeries,
  buildStartLatencySegments,
  buildStartTotalSeries,
  buildVoiceLatencyByLanguageBars,
  buildVoiceLatencyByScenarioBars,
  buildVoiceLatencySeries,
  buildVoiceLatencySessionSeries,
  buildVoiceModelTable,
  countFirstAudioTurns,
  countMaskedTurns,
  countStartLatencySessions,
  countVoiceLatencyTurns,
  countVoiceModelTurns,
  latencyBucketTitle,
  orderVoiceModelRows,
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
  firstAudioOpenerBridgeTurns: 0,
  firstAudioInterimTurns: 0,
  firstAudioReplyTurns: 0,
  firstAudioUnknownTurns: 0,
  avgFirstAudioFillerMs: null,
  avgFirstAudioOpenerBridgeMs: null,
  avgFirstAudioInterimMs: null,
  avgFirstAudioReplyMs: null,
  avgReplyLatencyMs: null,
  p50ReplyLatencyMs: null,
  p95ReplyLatencyMs: null,
  ...over,
});

const sessionRow = (over: Partial<VoiceLatencySessionRow>): VoiceLatencySessionRow => ({
  scenarioSessionId: "sess-1",
  occurredAt: "2024-06-10T14:32:00Z",
  turnCount: 1,
  avgResponseLatencyMs: 0,
  p50ResponseLatencyMs: 0,
  p95ResponseLatencyMs: 0,
  avgEouDelayMs: null,
  avgSttFinalizeMs: null,
  avgLlmTtftMs: null,
  avgTtsTtfbMs: null,
  avgOrchestrationMs: null,
  avgLlmResponseMs: null,
  avgBranchingMs: null,
  avgKnowledgeRetrievalMs: null,
  avgProcessEventsMs: null,
  avgBehaviorsMs: null,
  interruptedTurns: 0,
  llmTimedOutTurns: 0,
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

describe("buildVoiceLatencySessionSeries", () => {
  // The builder formats `occurredAt` in the local timezone (same as the rest
  // of this app's date display), so the expected label is derived the same
  // way rather than hardcoded — a hardcoded "14:32" would only pass in UTC.
  const label = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  it("plots p50, average AND p95 per session, keyed by its start time", () => {
    const occurredAt = "2024-06-10T14:32:00Z";
    const series = buildVoiceLatencySessionSeries([
      sessionRow({
        occurredAt,
        avgResponseLatencyMs: 4858,
        p50ResponseLatencyMs: 3200,
        p95ResponseLatencyMs: 8046,
      }),
    ]);

    expect(series).toEqual([
      { group: LATENCY_GROUPS.p50, key: label(occurredAt), value: 3.2 },
      { group: LATENCY_GROUPS.avg, key: label(occurredAt), value: 4.858 },
      { group: LATENCY_GROUPS.p95, key: label(occurredAt), value: 8.046 },
    ]);
  });

  it("skips a session with no start time — there is no honest x-position for it", () => {
    const series = buildVoiceLatencySessionSeries([sessionRow({ occurredAt: null })]);

    expect(series).toEqual([]);
  });

  it("omits a null stat rather than plotting it as zero latency", () => {
    const occurredAt = "2024-06-10T14:32:00Z";
    const series = buildVoiceLatencySessionSeries([
      sessionRow({
        occurredAt,
        avgResponseLatencyMs: null,
        p50ResponseLatencyMs: 1000,
        p95ResponseLatencyMs: null,
      }),
    ]);

    expect(series).toEqual([{ group: LATENCY_GROUPS.p50, key: label(occurredAt), value: 1 }]);
  });

  it("returns an empty series for no rows", () => {
    expect(buildVoiceLatencySessionSeries([])).toEqual([]);
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

describe("buildVoiceLatencyByScenarioBars", () => {
  const scenarioRow = (over: Partial<VoiceLatencyByScenarioRow>): VoiceLatencyByScenarioRow => ({
    scenarioId: 1,
    scenarioTitle: "Scenario",
    occurredAt: "2026-08-20T09:15:00.000Z",
    turnCount: 1,
    avgResponseLatencyMs: 0,
    p50ResponseLatencyMs: 0,
    p95ResponseLatencyMs: 0,
    avgEouDelayMs: null,
    avgSttFinalizeMs: null,
    avgLlmTtftMs: null,
    avgTtsTtfbMs: null,
    avgOrchestrationMs: null,
    avgLlmResponseMs: null,
    avgBranchingMs: null,
    avgKnowledgeRetrievalMs: null,
    avgProcessEventsMs: null,
    avgBehaviorsMs: null,
    interruptedTurns: 0,
    llmTimedOutTurns: 0,
    ...over,
  });

  it("ranks worst-first, independently per metric", () => {
    const { avgResponseLatency, avgLlmTtft } = buildVoiceLatencyByScenarioBars([
      scenarioRow({
        scenarioId: 1,
        scenarioTitle: "Fast overall, slow TTFT",
        avgResponseLatencyMs: 900,
        avgLlmTtftMs: 3000,
      }),
      scenarioRow({
        scenarioId: 2,
        scenarioTitle: "Slow overall, fast TTFT",
        avgResponseLatencyMs: 1200,
        avgLlmTtftMs: 200,
      }),
    ]);

    // Response latency ranks scenario 2 first...
    expect(avgResponseLatency).toEqual([
      { group: "Slow overall, fast TTFT", value: 1.2 },
      { group: "Fast overall, slow TTFT", value: 0.9 },
    ]);
    // ...but LLM TTFT ranks scenario 1 first — the two charts must not share one order.
    expect(avgLlmTtft).toEqual([
      { group: "Fast overall, slow TTFT", value: 3 },
      { group: "Slow overall, fast TTFT", value: 0.2 },
    ]);
  });

  it("truncates to topN but reports the true total", () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      scenarioRow({ scenarioId: i, scenarioTitle: `Scenario ${i}`, avgResponseLatencyMs: i * 100 }),
    );

    const { avgResponseLatency, totalScenarios } = buildVoiceLatencyByScenarioBars(rows, 10);

    expect(avgResponseLatency).toHaveLength(10);
    expect(totalScenarios).toBe(15);
    // Worst (highest) response latency leads.
    expect(avgResponseLatency[0].group).toBe("Scenario 14");
  });

  it("drops a scenario from one metric's chart without dropping it from the other", () => {
    const { avgResponseLatency, avgLlmTtft } = buildVoiceLatencyByScenarioBars([
      scenarioRow({
        scenarioId: 1,
        scenarioTitle: "No TTFT data",
        avgResponseLatencyMs: 900,
        avgLlmTtftMs: null,
      }),
    ]);

    expect(avgResponseLatency).toEqual([{ group: "No TTFT data", value: 0.9 }]);
    expect(avgLlmTtft).toEqual([]);
  });

  it("returns empty bars for no rows", () => {
    expect(buildVoiceLatencyByScenarioBars([])).toEqual({
      avgResponseLatency: [],
      avgLlmTtft: [],
      totalScenarios: 0,
    });
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
      FIRST_AUDIO_GROUPS.openerBridge,
      FIRST_AUDIO_GROUPS.unknown,
    ]);
  });

  describe("opener + bridge", () => {
    // The backend already EXCLUDES bridges from firstAudioFillerTurns, so the
    // five counts partition the bucket.
    const bridged = point({
      turns: 20,
      firstAudioFillerTurns: 6,
      firstAudioOpenerBridgeTurns: 4,
      firstAudioInterimTurns: 4,
      firstAudioReplyTurns: 4,
      firstAudioUnknownTurns: 2,
      avgFirstAudioFillerMs: 480,
      avgFirstAudioOpenerBridgeMs: 350,
    });

    it("is its own band, not folded into the thinking filler, and the stack still sums to 100", () => {
      const series = buildFirstAudioMixSeries([bridged]);
      const byGroup = Object.fromEntries(series.map(d => [d.group, d.value]));

      expect(byGroup[FIRST_AUDIO_GROUPS.filler]).toBe(30);
      expect(byGroup[FIRST_AUDIO_GROUPS.openerBridge]).toBe(20);
      expect(series.reduce((sum, d) => sum + d.value, 0)).toBe(100);
    });

    it("has a colour of its own, distinct from the filler's", () => {
      expect(FIRST_AUDIO_GROUPS.openerBridge).toBe("Opener + bridge");
      expect(FIRST_AUDIO_SCALE[FIRST_AUDIO_GROUPS.openerBridge]).toBeDefined();
      expect(FIRST_AUDIO_SCALE[FIRST_AUDIO_GROUPS.openerBridge]).not.toBe(
        FIRST_AUDIO_SCALE[FIRST_AUDIO_GROUPS.filler],
      );
    });

    it("gets its own mean time-to-first-voice line", () => {
      const byGroup = Object.fromEntries(
        buildFirstAudioLatencySeries([bridged]).map(d => [d.group, d.value]),
      );

      expect(byGroup[FIRST_AUDIO_GROUPS.openerBridge]).toBe(0.35);
      expect(byGroup[FIRST_AUDIO_GROUPS.filler]).toBe(0.48);
    });

    it("counts as instrumented and as masked", () => {
      expect(countFirstAudioTurns([bridged])).toBe(18);
      expect(countMaskedTurns([bridged])).toBe(14);
    });
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

describe("first-audio split by voice model", () => {
  const row = (over: Partial<VoiceLatencyByVoiceModelRow>): VoiceLatencyByVoiceModelRow => ({
    ttsModel: "cartesia/sonic-2",
    turns: 0,
    fillerTurns: 0,
    openerBridgeTurns: 0,
    interimTurns: 0,
    replyTurns: 0,
    unknownTurns: 0,
    p50FirstAudioMs: null,
    p50ReplyLatencyMs: null,
    ...over,
  });

  const masked = row({
    ttsModel: "cartesia/sonic-2",
    turns: 100,
    fillerTurns: 50,
    openerBridgeTurns: 10,
    interimTurns: 20,
    replyTurns: 20,
    p50FirstAudioMs: 900,
    p50ReplyLatencyMs: 3200,
  });
  // A generative voice can't play spoken masking: all reply-first.
  const generative = row({
    ttsModel: "elevenlabs/eleven_v3",
    turns: 40,
    replyTurns: 40,
    p50FirstAudioMs: 3400,
    p50ReplyLatencyMs: 3400,
  });
  const unrecorded = row({
    ttsModel: "unknown",
    turns: 500,
    unknownTurns: 500,
    p50FirstAudioMs: 2000,
  });

  it("orders busiest first with 'unknown' always last, dropping empty rows", () => {
    const ordered = orderVoiceModelRows([unrecorded, generative, masked, row({ ttsModel: "x" })]);

    expect(ordered.map(r => r.ttsModel)).toEqual([
      "cartesia/sonic-2",
      "elevenlabs/eleven_v3",
      "unknown",
    ]);
  });

  it("stacks each model to 100% in the same group order as the per-bucket split", () => {
    const series = buildFirstAudioByVoiceModelSeries([generative, masked]);

    expect(Array.from(new Set(series.map(d => d.group)))).toEqual([
      FIRST_AUDIO_GROUPS.reply,
      FIRST_AUDIO_GROUPS.interim,
      FIRST_AUDIO_GROUPS.filler,
      FIRST_AUDIO_GROUPS.openerBridge,
      FIRST_AUDIO_GROUPS.unknown,
    ]);
    const forModel = (model: string) =>
      Object.fromEntries(series.filter(d => d.key === model).map(d => [d.group, d.value]));

    expect(forModel("cartesia/sonic-2")).toMatchObject({
      [FIRST_AUDIO_GROUPS.filler]: 50,
      [FIRST_AUDIO_GROUPS.openerBridge]: 10,
      [FIRST_AUDIO_GROUPS.interim]: 20,
      [FIRST_AUDIO_GROUPS.reply]: 20,
    });
    expect(forModel("elevenlabs/eleven_v3")[FIRST_AUDIO_GROUPS.reply]).toBe(100);
  });

  it("tabulates shares and the two medians in seconds, blank where the backend had nothing", () => {
    const table = buildVoiceModelTable([unrecorded, masked]);

    expect(table.columns).toEqual([
      "Voice model",
      "Turns",
      "The reply itself %",
      "Interim reply %",
      "Thinking filler %",
      "Opener + bridge %",
      "Not recorded %",
      "p50 first voice (s)",
      "p50 real reply (s)",
    ]);
    expect(table.rows).toEqual([
      ["cartesia/sonic-2", 100, 20, 20, 50, 10, 0, 0.9, 3.2],
      ["unknown", 500, 0, 0, 0, 0, 100, 2, null],
    ]);
  });

  it("counts every turn the split covers, unrecorded ones included", () => {
    expect(countVoiceModelTurns([masked, generative, unrecorded])).toBe(640);
  });

  it("is empty with no rows", () => {
    expect(buildFirstAudioByVoiceModelSeries([])).toEqual([]);
    expect(buildVoiceModelTable([]).rows).toEqual([]);
  });
});
