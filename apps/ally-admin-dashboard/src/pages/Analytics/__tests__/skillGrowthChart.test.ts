import { describe, expect, it } from "vitest";

import {
  SkillGrowthKnowledgeAttempt,
  SkillGrowthLearnerSession,
  SkillTrendMix,
} from "@types";

import {
  MIN_LEARNERS_FOR_SHARE,
  TREND_LABELS,
  buildKnowledgeSeries,
  buildLearnerCompositeSeries,
  buildSkillCoverageSeries,
  buildTrendMixSeries,
  classifiedShareValue,
  formatDelta,
  learnerName,
  learnerTakeaway,
  monthLabel,
  sessionTick,
  skillCoverageCategories,
  skillCoverageScale,
  trendMixTakeaway,
} from "../skillGrowthChart";

const thresholds = { minSessions: 4, window: 2, flatBand: 5 };

const mix = (over: Partial<SkillTrendMix> = {}): SkillTrendMix => ({
  classifiedLearners: 10,
  insufficientLearners: 4,
  improving: 6,
  flat: 3,
  declining: 1,
  months: [],
  thresholds,
  ...over,
});

const session = (
  ordinal: number,
  compositeScore: number,
  skillCoverage: SkillGrowthLearnerSession["skillCoverage"] = null,
  occurredAt = "2026-02-12T10:00:00.000Z",
): SkillGrowthLearnerSession => ({
  ordinal,
  occurredAt,
  scenarioTitle: "De-escalation",
  compositeScore,
  skillCoverage,
});

describe("trend mix", () => {
  it("keeps the three classes in a fixed order per month so bars can be scanned", () => {
    const series = buildTrendMixSeries([
      { month: "2026-03", improving: 1, flat: 0, declining: 2 },
      { month: "2026-01", improving: 3, flat: 1, declining: 0 },
    ]);

    // Sorted by month regardless of input order...
    expect(series.map(d => d.key)).toEqual([
      "Jan 2026",
      "Jan 2026",
      "Jan 2026",
      "Mar 2026",
      "Mar 2026",
      "Mar 2026",
    ]);
    // ...and the group order repeats identically in every bar.
    expect(series.slice(0, 3).map(d => d.group)).toEqual([
      TREND_LABELS.improving,
      TREND_LABELS.flat,
      TREND_LABELS.declining,
    ]);
    expect(series.slice(3).map(d => d.group)).toEqual([
      TREND_LABELS.improving,
      TREND_LABELS.flat,
      TREND_LABELS.declining,
    ]);
  });

  it("emits a zero rather than dropping a class, so segments never reorder", () => {
    const series = buildTrendMixSeries([
      { month: "2026-01", improving: 0, flat: 0, declining: 2 },
    ]);

    expect(series).toHaveLength(3);
    expect(series.find(d => d.group === TREND_LABELS.improving)?.value).toBe(0);
  });

  it("shortens the month label to survive the 14-char tick truncation", () => {
    expect(monthLabel("2026-08")).toBe("Aug 2026");
    expect(monthLabel("2026-08").length).toBeLessThanOrEqual(14);
    // A malformed month passes through rather than rendering "undefined NaN".
    expect(monthLabel("nonsense")).toBe("nonsense");
  });

  it("refuses to state a share below the credible-sample floor", () => {
    const thin = mix({ classifiedLearners: 3, improving: 3, flat: 0, declining: 0 });

    expect(classifiedShareValue(thin)).toBe("—");
    expect(trendMixTakeaway(thin)).toContain("too few to state a share");
    // The specific failure this guards: "100%" over three people.
    expect(trendMixTakeaway(thin)).not.toContain("100%");
  });

  it("states the share once enough learners are classified", () => {
    expect(classifiedShareValue(mix())).toBe("60%");
    expect(trendMixTakeaway(mix())).toContain("60% of the 10 learners");
  });

  it("explains an empty mix by naming the session threshold", () => {
    const none = mix({
      classifiedLearners: 0,
      improving: 0,
      flat: 0,
      declining: 0,
      insufficientLearners: 7,
    });

    expect(trendMixTakeaway(none)).toContain("4 evaluated sessions");
  });

  it("says nothing at all when there are no learners either way", () => {
    expect(
      trendMixTakeaway(
        mix({
          classifiedLearners: 0,
          improving: 0,
          flat: 0,
          declining: 0,
          insufficientLearners: 0,
        }),
      ),
    ).toBeNull();
  });

  it("needs at least MIN_LEARNERS_FOR_SHARE to state a percentage", () => {
    const atFloor = mix({
      classifiedLearners: MIN_LEARNERS_FOR_SHARE,
      improving: MIN_LEARNERS_FOR_SHARE,
      flat: 0,
      declining: 0,
    });

    expect(classifiedShareValue(atFloor)).toBe("100%");
  });
});

describe("learner timeline", () => {
  it("plots one point per evaluated session, oldest first", () => {
    const series = buildLearnerCompositeSeries([session(1, 40), session(2, 55)]);

    expect(series.map(d => d.value)).toEqual([40, 55]);
    expect(series[0].key).toContain("#1");
  });

  it("keeps a session tick inside the Carbon truncation limit", () => {
    expect(sessionTick(session(12, 60)).length).toBeLessThanOrEqual(14);
  });

  it("discovers skill categories from the data, tolerating both label generations", () => {
    const sessions = [
      session(1, 50, [{ category: "Listening Engagement", percentage: 44 }]),
      session(2, 60, [{ category: "Learning", percentage: 61 }]),
    ];

    // A hardcoded enum would have dropped one of these entirely.
    expect(skillCoverageCategories(sessions)).toEqual([
      "Listening Engagement",
      "Learning",
    ]);
  });

  it("emits null for a session missing a category, so the line shows a real gap", () => {
    const sessions = [
      session(1, 50, [{ category: "Listening Engagement", percentage: 44 }]),
      session(2, 60, null),
    ];

    const series = buildSkillCoverageSeries(sessions);

    expect(series).toHaveLength(2);
    expect(series[1].value).toBeNull();
  });

  it("returns no coverage series at all when no session carries a payload", () => {
    expect(buildSkillCoverageSeries([session(1, 50), session(2, 60)])).toEqual([]);
  });

  it("gives every discovered category a colour", () => {
    const scale = skillCoverageScale(["A", "B", "C"]);

    expect(Object.keys(scale)).toEqual(["A", "B", "C"]);
    expect(Object.values(scale).every(Boolean)).toBe(true);
  });

  it("keeps quiz and annotation as separate series — different rulers", () => {
    const attempts: SkillGrowthKnowledgeAttempt[] = [
      {
        kind: "annotation",
        itemTitle: "Mark the cues",
        scorePct: 72,
        attemptNumber: 1,
        submittedAt: "2026-06-15T12:00:00.000Z",
      },
      {
        kind: "quiz",
        itemTitle: "Foundations",
        scorePct: 40,
        attemptNumber: 1,
        submittedAt: "2026-04-10T12:00:00.000Z",
      },
    ];

    const series = buildKnowledgeSeries(attempts);

    // Sorted by submission, and never merged into one "knowledge" line.
    expect(series.map(d => d.group)).toEqual(["Quiz", "Annotation"]);
    expect(series.map(d => d.value)).toEqual([40, 72]);
  });
});

describe("learner takeaway", () => {
  it("names both windows rather than only the delta", () => {
    const text = learnerTakeaway(
      {
        trend: "improving",
        delta: 30,
        firstWindowMean: 45,
        lastWindowMean: 75,
        evaluatedSessions: 5,
      },
      thresholds,
    );

    // "+30 points" alone would read as one before/after pair.
    expect(text).toContain("Last 2 sessions average 75");
    expect(text).toContain("30 points higher");
    expect(text).toContain("first 2 (45)");
  });

  it("says how many more sessions an unclassified learner needs", () => {
    const text = learnerTakeaway(
      {
        trend: "insufficient",
        delta: null,
        firstWindowMean: null,
        lastWindowMean: null,
        evaluatedSessions: 2,
      },
      thresholds,
    );

    expect(text).toContain("2 evaluated sessions");
    expect(text).toContain("needs 4");
  });

  it("frames a flat learner against the band, not as no change", () => {
    const text = learnerTakeaway(
      {
        trend: "flat",
        delta: 2,
        firstWindowMean: 60,
        lastWindowMean: 62,
        evaluatedSessions: 6,
      },
      thresholds,
    );

    expect(text).toContain("within 5 points");
  });
});

describe("formatting", () => {
  it("signs a delta and uses a real minus glyph", () => {
    expect(formatDelta(12.5)).toBe("+12.5");
    expect(formatDelta(-7)).toBe("−7");
    expect(formatDelta(0)).toBe("0");
    expect(formatDelta(null)).toBe("—");
  });

  it("falls back through email to an id rather than rendering blank", () => {
    expect(learnerName({ name: "Asha", email: "a@x.com" })).toBe("Asha");
    expect(learnerName({ name: null, email: "a@x.com" })).toBe("a@x.com");
    expect(learnerName({ name: null, email: null, learnerId: 7 })).toBe("Learner 7");
  });
});
