import { describe, expect, it } from "vitest";

import { VoiceLatencyByLanguageRow, VoiceLatencyPoint } from "@types";

import {
  buildVoiceLatencyByLanguageBars,
  buildVoiceLatencySeries,
  LATENCY_GROUPS,
  latencyBucketTitle,
} from "../latencyChart";

const point = (over: Partial<VoiceLatencyPoint>): VoiceLatencyPoint => ({
  bucket: "2024-06-10",
  source: "pipeline",
  turns: 1,
  avgMs: 0,
  p50Ms: 0,
  p95Ms: 0,
  ...over,
});

describe("buildVoiceLatencySeries", () => {
  it("emits an avg + p95 line per point, in seconds", () => {
    const series = buildVoiceLatencySeries([
      point({ source: "pipeline", avgMs: 4858, p95Ms: 8046 }),
    ]);

    expect(series).toEqual([
      { group: LATENCY_GROUPS.pipelineAvg, key: "2024-06-10", value: 4.858 },
      { group: LATENCY_GROUPS.pipelineP95, key: "2024-06-10", value: 8.046 },
    ]);
  });

  it("maps the transcript source to the History groups", () => {
    const series = buildVoiceLatencySeries([
      point({ source: "transcript", avgMs: 2000, p95Ms: 6597 }),
    ]);

    expect(series.map(d => d.group)).toEqual([
      LATENCY_GROUPS.transcriptAvg,
      LATENCY_GROUPS.transcriptP95,
    ]);
    expect(series.map(d => d.value)).toEqual([2, 6.597]);
  });

  it("keeps pipeline and transcript as four distinct lines for the same bucket", () => {
    const series = buildVoiceLatencySeries([
      point({ source: "pipeline", avgMs: 4858, p95Ms: 8046 }),
      point({ source: "transcript", avgMs: 4421, p95Ms: 6597 }),
    ]);

    expect(new Set(series.map(d => d.group))).toEqual(
      new Set([
        LATENCY_GROUPS.pipelineAvg,
        LATENCY_GROUPS.pipelineP95,
        LATENCY_GROUPS.transcriptAvg,
        LATENCY_GROUPS.transcriptP95,
      ]),
    );
  });

  it("returns an empty series for no points (gap, not a fabricated zero)", () => {
    expect(buildVoiceLatencySeries([])).toEqual([]);
  });

  it("rounds sub-millisecond noise before converting to seconds", () => {
    const [avg] = buildVoiceLatencySeries([point({ avgMs: 1500.6, p95Ms: 0 })]);
    expect(avg.value).toBe(1.501);
  });
});

describe("buildVoiceLatencyByLanguageBars", () => {
  const row = (over: Partial<VoiceLatencyByLanguageRow>): VoiceLatencyByLanguageRow => ({
    language: "en",
    turns: 1,
    avgMs: 0,
    p95Ms: 0,
    ...over,
  });

  it("maps each language row to one avg bar and one p95 bar, in seconds", () => {
    const { avg, p95 } = buildVoiceLatencyByLanguageBars([
      row({ language: "en", avgMs: 900, p95Ms: 1600 }),
      row({ language: "hi-IN", avgMs: 1200, p95Ms: 2100 }),
    ]);

    expect(avg).toEqual([
      { group: "en", value: 0.9 },
      { group: "hi-IN", value: 1.2 },
    ]);
    expect(p95).toEqual([
      { group: "en", value: 1.6 },
      { group: "hi-IN", value: 2.1 },
    ]);
  });

  it("returns empty bars for no rows", () => {
    expect(buildVoiceLatencyByLanguageBars([])).toEqual({ avg: [], p95: [] });
  });
});

describe("latencyBucketTitle", () => {
  it("maps the bucket granularity to an axis label", () => {
    expect(latencyBucketTitle("day")).toBe("Day");
    expect(latencyBucketTitle("week")).toBe("Week");
    expect(latencyBucketTitle("month")).toBe("Month");
  });

  it("falls back to Week when the bucket is missing or unknown", () => {
    expect(latencyBucketTitle(undefined)).toBe("Week");
    expect(latencyBucketTitle("quarter")).toBe("Week");
  });
});
