import { describe, expect, it } from "vitest";

import { AgentJoinReliabilityPoint } from "@types";

import {
  JOIN_LATENCY_GROUPS,
  RELIABILITY_GROUPS,
  buildJoinLatencySeries,
  buildOutcomeMixData,
  buildReliabilitySeries,
  countReliabilitySessions,
  reliabilityBucketTitle,
} from "../joinReliabilityChart";

const point = (over: Partial<AgentJoinReliabilityPoint> = {}): AgentJoinReliabilityPoint => ({
  bucket: "2024-06-10",
  totalSessions: 100,
  joinFailures: 0,
  failureRatePct: 0,
  midSessionDrops: 0,
  conversations: 100,
  suspectedFreezes: 0,
  freezeRatePct: 0,
  joinLatencyP50Sec: null,
  joinLatencyP95Sec: null,
  ...over,
});

const valueOf = (
  series: { group: string; key: string; value: number | null }[],
  group: string,
  key = "2024-06-10",
) => series.find(d => d.group === group && d.key === key)?.value;

describe("buildReliabilitySeries", () => {
  it("computes each rate over its own denominator", () => {
    const series = buildReliabilitySeries([
      point({
        totalSessions: 200,
        failureRatePct: 1.5,
        midSessionDrops: 10,
        conversations: 150,
        freezeRatePct: 2,
      }),
    ]);

    expect(valueOf(series, RELIABILITY_GROUPS.joinFailure)).toBe(1.5);
    expect(valueOf(series, RELIABILITY_GROUPS.midDrop)).toBe(5); // 10 / 200
    expect(valueOf(series, RELIABILITY_GROUPS.freeze)).toBe(2);
  });

  it("emits NULL for a period with no sessions, not a healthy 0%", () => {
    // This is the important one: returning 0 made a quiet weekend render as a
    // flat, reassuring zero-failure line — a fabricated measurement.
    const series = buildReliabilitySeries([
      point({ totalSessions: 0, conversations: 0, failureRatePct: 0, midSessionDrops: 0 }),
    ]);

    expect(valueOf(series, RELIABILITY_GROUPS.joinFailure)).toBeNull();
    expect(valueOf(series, RELIABILITY_GROUPS.midDrop)).toBeNull();
    expect(valueOf(series, RELIABILITY_GROUPS.freeze)).toBeNull();
  });

  it("still reports a real measured 0% when sessions did run", () => {
    const series = buildReliabilitySeries([
      point({ totalSessions: 50, conversations: 50, failureRatePct: 0, midSessionDrops: 0 }),
    ]);

    expect(valueOf(series, RELIABILITY_GROUPS.joinFailure)).toBe(0);
    expect(valueOf(series, RELIABILITY_GROUPS.midDrop)).toBe(0);
  });

  it("nulls the freeze rate when nothing got talking, even if sessions started", () => {
    // A session that never joined cannot freeze, so `conversations` is the right
    // denominator and zero of them means unmeasured.
    const series = buildReliabilitySeries([
      point({ totalSessions: 20, conversations: 0, freezeRatePct: 0 }),
    ]);

    expect(valueOf(series, RELIABILITY_GROUPS.freeze)).toBeNull();
    expect(valueOf(series, RELIABILITY_GROUPS.joinFailure)).not.toBeNull();
  });
});

describe("buildJoinLatencySeries", () => {
  it("skips null percentiles — latency has no meaningful zero", () => {
    const series = buildJoinLatencySeries([
      point({ joinLatencyP50Sec: 1.2, joinLatencyP95Sec: 4.5 }),
      point({ bucket: "2024-06-11", joinLatencyP50Sec: null, joinLatencyP95Sec: null }),
    ]);

    expect(series).toEqual([
      { group: JOIN_LATENCY_GROUPS.p50, key: "2024-06-10", value: 1.2 },
      { group: JOIN_LATENCY_GROUPS.p95, key: "2024-06-10", value: 4.5 },
    ]);
  });

  it("keeps a present percentile when only the other is missing", () => {
    const series = buildJoinLatencySeries([
      point({ joinLatencyP50Sec: 1.2, joinLatencyP95Sec: null }),
    ]);

    expect(series).toHaveLength(1);
    expect(series[0].group).toBe(JOIN_LATENCY_GROUPS.p50);
  });
});

describe("countReliabilitySessions", () => {
  it("sums sessions across buckets for the chart's n", () => {
    expect(
      countReliabilitySessions([
        point({ totalSessions: 100 }),
        point({ bucket: "2024-06-11", totalSessions: 40 }),
      ]),
    ).toBe(140);
  });
});

describe("buildOutcomeMixData", () => {
  it("maps the mix to humanised slice labels", () => {
    expect(buildOutcomeMixData({ completed: 80, noConversation: 15, inProgress: 5 })).toEqual([
      { group: "Completed", value: 80 },
      { group: "No conversation", value: 15 },
      { group: "In progress", value: 5 },
    ]);
  });

  it("returns nothing when there is no mix", () => {
    expect(buildOutcomeMixData(undefined)).toEqual([]);
  });
});

describe("reliabilityBucketTitle", () => {
  it("maps the bucket to an axis title, defaulting to Week", () => {
    expect(reliabilityBucketTitle("day")).toBe("Day");
    expect(reliabilityBucketTitle("month")).toBe("Month");
    expect(reliabilityBucketTitle(undefined)).toBe("Week");
  });
});
