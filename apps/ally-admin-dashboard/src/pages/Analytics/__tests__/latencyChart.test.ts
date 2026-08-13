import { describe, expect, it } from "vitest";

import { StartLatencyPoint, VoiceLatencyByLanguageRow, VoiceLatencyPoint } from "@types";

import {
  LATENCY_GROUPS,
  START_LATENCY_GROUPS,
  START_TOTAL_GROUPS,
  buildLlmTtftSeries,
  buildStartLatencySegments,
  buildStartTotalSeries,
  buildVoiceLatencyByLanguageBars,
  buildVoiceLatencySeries,
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
