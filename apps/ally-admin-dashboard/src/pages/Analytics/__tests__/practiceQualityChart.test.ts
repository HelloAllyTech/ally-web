import { describe, expect, it } from "vitest";

import {
  PRACTICE_QUALITY_GROUPS,
  PracticeQualityPoint,
  PracticeQualitySummary,
  buildLearnerTurnsSeries,
  buildPracticeShareBars,
  buildTalkShareSeries,
  formatPctValue,
  hasAnyValue,
  plottedPoints,
  practiceQualityTableColumns,
  practiceQualityTableRows,
  practiceShareTakeaway,
  practiceThresholdsText,
  talkShareTakeaway,
} from "../practiceQualityChart";

const thresholds = { minLearnerTurns: 3, minDurationMinutes: 2, minLearnerChars: 300 };

const point = (over: Partial<PracticeQualityPoint> = {}): PracticeQualityPoint => ({
  bucket: "2026-08-01",
  sessions: 120,
  talkShareSessions: 118,
  talkShareMedianPct: 41.5,
  talkShareP25Pct: 30.2,
  talkShareP75Pct: 52,
  learnerTurnsMedian: 7,
  practiceSessions: 80,
  practicePct: 66.7,
  shortTurnSessions: 22,
  shortTurnsPct: 18.3,
  ...over,
});

const summary = (over: Partial<PracticeQualitySummary> = {}): PracticeQualitySummary => ({
  sessions: 400,
  talkShareSessions: 390,
  talkShareMedianPct: 42.1,
  talkShareP25Pct: 31,
  talkShareP75Pct: 53.4,
  learnerTurnsMedian: 7.5,
  practiceSessions: 260,
  practicePct: 65,
  shortTurnSessions: 70,
  notPracticeShortTurnsPct: 17.5,
  ...over,
});

describe("talk share series", () => {
  it("emits p25, median and p75 per bucket so the band travels with the median", () => {
    const series = buildTalkShareSeries([point()]);
    expect(series.map(d => d.group)).toEqual([
      PRACTICE_QUALITY_GROUPS.talkShareP25,
      PRACTICE_QUALITY_GROUPS.talkShareMedian,
      PRACTICE_QUALITY_GROUPS.talkShareP75,
    ]);
    expect(series.map(d => d.value)).toEqual([30.2, 41.5, 52]);
  });

  it("keeps a withheld bucket as nulls so every line breaks there", () => {
    const series = buildTalkShareSeries([
      point(),
      point({
        bucket: "2026-09-01",
        talkShareMedianPct: null,
        talkShareP25Pct: null,
        talkShareP75Pct: null,
      }),
    ]);
    expect(series.filter(d => d.key === "2026-09-01").map(d => d.value)).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("plots median learner turns as its own series, nulls preserved", () => {
    expect(
      buildLearnerTurnsSeries([point(), point({ bucket: "b2", learnerTurnsMedian: null })]).map(
        d => d.value,
      ),
    ).toEqual([7, null]);
  });
});

describe("practice share bars", () => {
  it("is one bar per bucket with the server's share, never a share rebuilt from counts", () => {
    const bars = buildPracticeShareBars([
      point(),
      // Below the floor: the counts are present, the share is withheld — and stays so.
      point({ bucket: "2026-09-01", sessions: 4, practiceSessions: 4, practicePct: null }),
    ]);
    expect(bars.map(b => b.value)).toEqual([66.7, null]);
    expect(bars[0].group).toBe(PRACTICE_QUALITY_GROUPS.practiceShare);
  });

  it("knows when nothing at all can be plotted", () => {
    expect(hasAnyValue(buildPracticeShareBars([point({ practicePct: null })]))).toBe(false);
    expect(hasAnyValue(buildPracticeShareBars([point()]))).toBe(true);
  });
});

describe("in-progress bucket", () => {
  it("comes off the plot but stays in the table, flagged", () => {
    const points = [point(), point({ bucket: "2026-10-01" })];
    expect(plottedPoints(points, "2026-10-01").map(p => p.bucket)).toEqual(["2026-08-01"]);
    expect(plottedPoints(points, null)).toHaveLength(2);

    const rows = practiceQualityTableRows(points, "2026-10-01");
    expect(rows).toHaveLength(2);
    expect(rows[1].at(-1)).toBe("still accruing");
    expect(rows[0].at(-1)).toBe("");
  });

  it("names the turn rule in the table header from the server's threshold", () => {
    expect(practiceQualityTableColumns(thresholds)).toContain("Fewer than 3 turns %");
    expect(practiceQualityTableColumns()).toContain("Too few turns %");
  });
});

describe("words", () => {
  it("states the practice rule from the server's constants", () => {
    expect(practiceThresholdsText(thresholds)).toBe(
      "at least 3 learner turns, 2 minutes net of pauses and 300 characters of the learner's own speech",
    );
  });

  it("formats a withheld share as a dash, never 0%", () => {
    expect(formatPctValue(null)).toBe("—");
    expect(formatPctValue(0)).toBe("0%");
    expect(formatPctValue(41.5)).toBe("41.5%");
  });

  it("states the typical talk share with its middle half and turns", () => {
    expect(talkShareTakeaway(summary(), 20)).toBe(
      "In the typical session the learner did 42.1% of the talking (middle half 31–53.4%) · a median of 7.5 learner turns per session",
    );
  });

  it("refuses a talk-share median below the floor and says why", () => {
    expect(
      talkShareTakeaway(
        summary({ talkShareSessions: 12, talkShareMedianPct: null, talkShareP25Pct: null }),
        20,
      ),
    ).toBe("Too few sessions with speech to state a median (n = 12 · need 20)");
    expect(talkShareTakeaway(summary({ talkShareSessions: 0 }), 20)).toBeUndefined();
  });

  it("leads AAQ-209 with the share that was not practice for want of turns", () => {
    expect(practiceShareTakeaway(summary(), thresholds, 20)).toBe(
      "17.5% of sessions had fewer than 3 learner turns — not practice",
    );
  });

  it("refuses the not-practice share below the floor rather than computing it", () => {
    expect(
      practiceShareTakeaway(
        summary({ sessions: 9, shortTurnSessions: 3, notPracticeShortTurnsPct: null }),
        thresholds,
        20,
      ),
    ).toBe("Too few sessions to state a share (n = 9 · need 20)");
    expect(practiceShareTakeaway(summary({ sessions: 0 }), thresholds, 20)).toBeUndefined();
  });
});
