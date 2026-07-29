import { describe, expect, it } from "vitest";

import {
  CoachingLoopPoint,
  CompetencyMapRow,
  CompletionRatePoint,
  OrgHealthRow,
  QualityDistributionPoint,
  SatisfactionMixPoint,
  SkillGrowthOrdinal,
  TimeToFirstPractice,
  TrackItemTypeRow,
} from "@types";

import { CONTEXT, PALETTE } from "../chartScales";
import {
  TESTING_GROUPS,
  allRatesMissing,
  buildActivationFunnelStages,
  buildCompetencyScatter,
  buildCompletionRateSeries,
  buildItemTypeBars,
  buildLanguageMixScale,
  buildLanguageMixSeries,
  buildPractisingLearnersSeries,
  buildQualityBandSeries,
  buildRankedBarScale,
  buildSatisfactionMixSeries,
  buildSkillGrowthSeries,
  buildTimeToFirstBars,
  buildTimeToFirstScale,
  buildTurnaroundSeries,
  competencyTakeaway,
  creditUtilisationLabel,
  formatHours,
  formatPct,
  formatScore,
  itemTypeLabel,
  itemTypeTakeaway,
  ordinalLabel,
  orgStatus,
  plottableOrdinals,
  practisingTakeaway,
  ratedBuckets,
  satisfactionTakeaway,
  skillGrowthTakeaway,
  suppressedCompetencies,
  suppressedItemTypes,
} from "../testingChart";

const stat = (median: number | null, n: number, p25 = median, p75 = median) => ({
  median,
  p25: median === null ? null : p25,
  p75: median === null ? null : p75,
  n,
});

const ordinal = (
  ordinalNo: number,
  allMedian: number | null,
  n: number,
  experiencedMedian: number | null = allMedian,
): SkillGrowthOrdinal => ({
  ordinal: ordinalNo,
  all: stat(allMedian, n),
  experienced: stat(experiencedMedian, n),
});

const completionPoint = (over: Partial<CompletionRatePoint> = {}): CompletionRatePoint => ({
  bucket: "2026-01-01",
  started: 0,
  completed: 0,
  abandoned: 0,
  completionRatePct: null,
  ...over,
});

const satisfactionPoint = (over: Partial<SatisfactionMixPoint> = {}): SatisfactionMixPoint => ({
  bucket: "2026-01-01",
  low: 0,
  mid: 0,
  high: 0,
  responses: 0,
  top2BoxPct: null,
  completedSessions: 0,
  responseRatePct: null,
  ...over,
});

const competency = (over: Partial<CompetencyMapRow> = {}): CompetencyMapRow => ({
  competencyId: "c1",
  name: "Active listening",
  completedSessions: 100,
  evaluatedSessions: 80,
  medianScore: 70,
  learners: 20,
  scenarios: 4,
  belowFloor: false,
  ...over,
});

const itemType = (over: Partial<TrackItemTypeRow> = {}): TrackItemTypeRow => ({
  type: "QUIZ",
  reached: 100,
  completed: 40,
  completionRatePct: 40,
  learners: 30,
  belowFloor: false,
  ...over,
});

const org = (over: Partial<OrgHealthRow> = {}): OrgHealthRow => ({
  tenantId: "t1",
  tenantName: "Acme",
  code: "acme",
  learners: 40,
  activeLearners28d: 10,
  completedSimulations: 500,
  completedLast28d: 50,
  completedPrev28d: 50,
  lastCompletedAt: "2026-07-20T10:00:00.000Z",
  daysSinceLastCompleted: 9,
  trend: [1, 2, 3],
  creditLimit: 100,
  consumedCredits: 40,
  creditUtilisationPct: 40,
  creditsUnset: false,
  belowFloor: false,
  ...over,
});

const coachingPoint = (over: Partial<CoachingLoopPoint> = {}): CoachingLoopPoint => ({
  bucket: "2026-01-01",
  sharedSessions: 0,
  completedSessions: 0,
  sharePct: null,
  reviewsWithComment: 0,
  medianHoursToFirstComment: null,
  p90HoursToFirstComment: null,
  comments: 0,
  ...over,
});

describe("formatting", () => {
  it("renders a missing value as an em dash rather than a zero", () => {
    expect(formatPct(null)).toBe("—");
    expect(formatScore(null)).toBe("—");
    expect(formatHours(null)).toBe("—");
  });

  it("keeps a composite score to one decimal, the precision the rubric carries", () => {
    expect(formatScore(72.46)).toBe("72.5");
  });

  it("switches turnaround to days once hours stop being readable", () => {
    expect(formatHours(5.25)).toBe("5.3 h");
    expect(formatHours(36)).toBe("1.5 d");
  });

  it("titles an item type without shouting the enum", () => {
    expect(itemTypeLabel("ROLEPLAY")).toBe("Roleplay");
  });

  it("names an ordinal the way a reader says it", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(ordinalLabel)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
    ]);
  });
});

describe("practising learners", () => {
  it("plots one point per bucket", () => {
    const series = buildPractisingLearnersSeries([
      { bucket: "2026-01-05", learners: 12, sessions: 30 },
      { bucket: "2026-01-12", learners: 15, sessions: 41 },
    ]);
    expect(series).toEqual([
      { group: TESTING_GROUPS.practisingLearners, key: "2026-01-05", value: 12 },
      { group: TESTING_GROUPS.practisingLearners, key: "2026-01-12", value: 15 },
    ]);
  });

  it("refuses a comparison when there is only one period", () => {
    const takeaway = practisingTakeaway([{ bucket: "2026-01-05", learners: 12, sessions: 30 }]);
    expect(takeaway).toContain("12 learners");
    expect(takeaway).not.toContain("vs");
  });

  it("compares the latest period against the first on the axis", () => {
    expect(
      practisingTakeaway([
        { bucket: "2026-01-05", learners: 10, sessions: 20 },
        { bucket: "2026-01-12", learners: 4, sessions: 9 },
      ]),
    ).toContain("↓ 6 vs the first period");
  });
});

describe("activation funnel and time to first practice", () => {
  it("marks only the last stage as terminal", () => {
    const stages = buildActivationFunnelStages({
      denominatorLabel: "learner accounts",
      stages: [
        { key: "signedUp", label: "Signed up", reached: 100 },
        { key: "startedASim", label: "Started a simulation", reached: 60 },
        { key: "completedASim", label: "Completed one", reached: 40 },
      ],
    });
    expect(stages.map(s => s.terminal)).toEqual([false, false, true]);
  });

  const ttf: TimeToFirstPractice = {
    bands: [
      { label: "Same day", minDays: 0, maxDays: 0 },
      { label: "1–3", minDays: 1, maxDays: 3 },
      { label: "31+", minDays: 31, maxDays: null },
    ],
    learnersByBand: [10, 5, 2],
    neverPractised: 83,
    boundsNote: "Bands are inclusive on both ends.",
    cumulative: [],
  };

  it("puts the never-practised residual last, as a count", () => {
    const bars = buildTimeToFirstBars(ttf);
    expect(bars).toHaveLength(4);
    expect(bars[3]).toEqual({ group: TESTING_GROUPS.neverPractised, value: 83 });
  });

  it("greys the residual instead of giving it the ramp's darkest step", () => {
    const scale = buildTimeToFirstScale(ttf);
    expect(scale[TESTING_GROUPS.neverPractised]).toBe(CONTEXT.faint);
    // The day bands take the ordered ramp, and the residual is not part of it.
    expect(Object.values(scale).filter(c => c === CONTEXT.faint)).toHaveLength(1);
  });
});

describe("skill growth", () => {
  it("stops the plotted curve at the first ordinal below the sample floor", () => {
    const ordinals = [
      ordinal(1, 60, 400),
      ordinal(2, 63, 300),
      ordinal(3, null, 12),
      // Later ordinals that happen to clear the floor must not reappear: a line
      // with a hole invites the reader to extrapolate through it.
      ordinal(4, 70, 40),
    ];
    expect(plottableOrdinals(ordinals, "all").map(o => o.ordinal)).toEqual([1, 2]);
    const series = buildSkillGrowthSeries(ordinals, "all");
    expect(series.map(d => d.key)).toEqual(["1st", "1st", "1st", "2nd", "2nd", "2nd"]);
  });

  it("emits median, p25 and p75 so the spread travels with the average", () => {
    const series = buildSkillGrowthSeries([ordinal(1, 60, 400)], "all");
    expect(series.map(d => d.group)).toEqual([
      TESTING_GROUPS.p25,
      TESTING_GROUPS.medianScore,
      TESTING_GROUPS.p75,
    ]);
  });

  it("reads the variant the caller asked for", () => {
    const ordinals = [ordinal(1, 60, 400, null)];
    expect(buildSkillGrowthSeries(ordinals, "all")).toHaveLength(3);
    expect(buildSkillGrowthSeries(ordinals, "experienced")).toHaveLength(0);
  });

  it("refuses an efficacy claim built on a single comparable ordinal", () => {
    expect(skillGrowthTakeaway([ordinal(1, 60, 400)], "all", 20)).toContain(
      "not enough of the curve",
    );
    expect(skillGrowthTakeaway([], "all", 20)).toBeNull();
  });

  it("states the movement between the first and last comparable ordinal", () => {
    const takeaway = skillGrowthTakeaway([ordinal(1, 60, 400), ordinal(2, 66.5, 300)], "all", 20);
    expect(takeaway).toContain("6.5 points higher");
    expect(takeaway).toContain("60.0 → 66.5");
  });

  it("says flat rather than inventing a direction", () => {
    expect(skillGrowthTakeaway([ordinal(1, 60, 400), ordinal(2, 60, 300)], "all", 20)).toContain(
      "flat",
    );
  });
});

describe("completion rate", () => {
  it("keeps a null rate null so the line breaks instead of reading as 0%", () => {
    const series = buildCompletionRateSeries([
      completionPoint({ started: 10, completed: 8, completionRatePct: 80 }),
      completionPoint({ bucket: "2026-02-01" }),
    ]);
    expect(series.map(d => d.value)).toEqual([80, null]);
  });

  it("treats an axis of nothing but gaps as empty", () => {
    expect(allRatesMissing([completionPoint(), completionPoint()])).toBe(true);
    expect(allRatesMissing([completionPoint({ completionRatePct: 0 })])).toBe(false);
  });
});

describe("quality and satisfaction", () => {
  it("emits the quality band as three series per bucket", () => {
    const points: QualityDistributionPoint[] = [
      { bucket: "2026-01-01", median: 70, p25: 60, p75: 80, evaluatedSessions: 50 },
    ];
    expect(buildQualityBandSeries(points).map(d => d.value)).toEqual([60, 70, 80]);
  });

  it("drops buckets with no ratings — a mix over nobody is undefined", () => {
    const points = [
      satisfactionPoint({ low: 1, mid: 1, high: 2, responses: 4, top2BoxPct: 50 }),
      satisfactionPoint({ bucket: "2026-02-01" }),
    ];
    expect(ratedBuckets(points)).toHaveLength(1);
    const series = buildSatisfactionMixSeries(points);
    expect(series.every(d => d.key === "2026-01-01")).toBe(true);
  });

  it("computes shares that sum to 100 per bucket", () => {
    const series = buildSatisfactionMixSeries([
      satisfactionPoint({ low: 1, mid: 1, high: 2, responses: 4 }),
    ]);
    expect(series.map(d => d.value)).toEqual([25, 25, 50]);
  });

  it("reports the change in percentage points, not percent", () => {
    const takeaway = satisfactionTakeaway([
      satisfactionPoint({ responses: 10, high: 5, top2BoxPct: 50 }),
      satisfactionPoint({ bucket: "2026-02-01", responses: 10, high: 7, top2BoxPct: 70 }),
    ]);
    expect(takeaway).toContain("↑ 20.0 pp");
  });

  it("ranks tag bars with the leader in the accent and the tail in grey", () => {
    const bars = [
      { group: "voice quality", value: 12 },
      { group: "unrealistic client", value: 4 },
    ];
    const scale = buildRankedBarScale(bars);
    expect(scale["voice quality"]).toBe(PALETTE.blue);
    expect(scale["unrealistic client"]).toBe(CONTEXT.line);
  });
});

describe("competency map", () => {
  it("omits competencies whose score was suppressed rather than plotting them at zero", () => {
    const rows = [
      competency(),
      competency({
        competencyId: "c2",
        name: "De-escalation",
        medianScore: null,
        belowFloor: true,
      }),
    ];
    expect(buildCompetencyScatter(rows)).toHaveLength(1);
    expect(suppressedCompetencies(rows).map(r => r.name)).toEqual(["De-escalation"]);
  });

  it("names the weakest and strongest scored competency", () => {
    const takeaway = competencyTakeaway([
      competency({ medianScore: 80 }),
      competency({ competencyId: "c2", name: "De-escalation", medianScore: 55 }),
    ]);
    expect(takeaway).toContain("Lowest median: De-escalation at 55.0");
    expect(takeaway).toContain("highest: Active listening at 80.0");
  });

  it("does not claim a comparison when only one competency clears the floor", () => {
    expect(competencyTakeaway([competency()])).toContain("Only Active listening");
  });
});

describe("track drop-off", () => {
  it("holds back a rate over too few learners but keeps the row available", () => {
    const rows = [
      itemType(),
      itemType({ type: "JOURNAL", learners: 2, belowFloor: true, completionRatePct: 50 }),
      itemType({ type: "VIDEO", reached: 0, completed: 0, completionRatePct: null }),
    ];
    expect(buildItemTypeBars(rows).map(b => b.group)).toEqual(["Quiz"]);
    expect(suppressedItemTypes(rows).map(r => r.type)).toEqual(["JOURNAL", "VIDEO"]);
  });

  it("preserves the platform's format order rather than sorting by value", () => {
    const bars = buildItemTypeBars([
      itemType({ type: "ROLEPLAY", completionRatePct: 20 }),
      itemType({ type: "QUIZ", completionRatePct: 90 }),
    ]);
    expect(bars.map(b => b.group)).toEqual(["Roleplay", "Quiz"]);
  });

  it("contrasts the worst and best format", () => {
    const takeaway = itemTypeTakeaway([
      itemType({ type: "QUIZ", completionRatePct: 40 }),
      itemType({ type: "VIDEO", completionRatePct: 95 }),
    ]);
    expect(takeaway).toContain("Quiz items are finished 40%");
    expect(takeaway).toContain("95% for video");
  });
});

describe("coaching loop", () => {
  it("passes a suppressed median through as a gap", () => {
    const series = buildTurnaroundSeries([
      coachingPoint({ medianHoursToFirstComment: 12 }),
      coachingPoint({ bucket: "2026-02-01" }),
    ]);
    expect(series.map(d => d.value)).toEqual([12, null]);
  });
});

describe("language mix", () => {
  const labels = ["Hindi", "English", "Other", "Unknown"];
  const points = [
    { bucket: "2026-01-01", label: "Hindi", sessions: 30 },
    { bucket: "2026-01-01", label: "English", sessions: 10 },
    { bucket: "2026-01-01", label: "Unknown", sessions: 10 },
  ];
  const totals = [
    { bucket: "2026-01-01", sessions: 50 },
    { bucket: "2026-02-01", sessions: 0 },
  ];

  it("divides by the server's total, not the rows it happened to receive", () => {
    const series = buildLanguageMixSeries(labels, points, totals);
    const jan = series.filter(d => d.key === "2026-01-01");
    expect(jan.find(d => d.group === "Hindi")?.value).toBe(60);
    // "Other" has no row for the bucket and is a real zero share, not a gap.
    expect(jan.find(d => d.group === "Other")?.value).toBe(0);
  });

  it("drops a bucket with no sessions rather than drawing an empty stack", () => {
    const series = buildLanguageMixSeries(labels, points, totals);
    expect(series.some(d => d.key === "2026-02-01")).toBe(false);
  });

  it("greys the pooled and unknown series and keeps language colours stable", () => {
    const scale = buildLanguageMixScale(labels);
    expect(scale.Other).toBe(CONTEXT.faint);
    expect(scale.Unknown).toBe(CONTEXT.faint);
    // A language's colour must not depend on which other languages are present.
    expect(buildLanguageMixScale(["Hindi"]).Hindi).toBe(scale.Hindi);
  });
});

describe("org health", () => {
  it("reads status from recency and direction, not lifetime volume", () => {
    expect(orgStatus(org({ completedSimulations: 0 }))).toBe("never started");
    expect(orgStatus(org({ completedLast28d: 0 }))).toBe("dormant");
    expect(orgStatus(org({ completedLast28d: 80, completedPrev28d: 50 }))).toBe("growing");
    expect(orgStatus(org({ completedLast28d: 20, completedPrev28d: 50 }))).toBe("slowing");
    expect(orgStatus(org())).toBe("steady");
    // A first active period is growth, not an undefined ratio.
    expect(orgStatus(org({ completedPrev28d: 0 }))).toBe("growing");
  });

  it("says no limit is set instead of printing 0% of nothing", () => {
    expect(creditUtilisationLabel(org({ creditsUnset: true, creditUtilisationPct: null }))).toBe(
      "no limit set",
    );
    expect(creditUtilisationLabel(org())).toBe("40% of 100");
  });
});
