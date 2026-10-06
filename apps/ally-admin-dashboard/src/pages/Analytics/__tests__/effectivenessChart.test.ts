import { describe, expect, it } from "vitest";

import {
  CostPerImprovementResponse,
  DoseResponse,
  DoseResponsePoint,
  EffectivenessFunnelResponse,
  FIT_SERIES,
  FoundationalSkillsSegmentsResponse,
  activationTile,
  biggestFunnelLoss,
  clampNote,
  competenceTile,
  compositeTile,
  costDescription,
  courseLiftTile,
  doseAxisItems,
  doseGateText,
  doseSeries,
  doseTakeaway,
  excludedForTier,
  funnelStages,
  funnelTakeaway,
  largestWithheld,
  measurableTile,
  proseList,
  segmentDimensionItems,
  segmentRows,
  segmentsTakeaway,
  segmentTable,
  selfHarmTile,
  trendParts,
  unhelpfulTile,
  withheldText,
} from "../effectivenessChart";

import type { FoundationalSkillsProgressResponse } from "../foundationalSkillsProgressChart";
import type { ActivationResponse } from "@types";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const stage = (
  key: string,
  reached: number,
  ofEnteredPct: number | null,
  ofPreviousPct: number | null,
  terminal = false,
) => ({
  key,
  label: key,
  description: `${key} def`,
  reached,
  ofEnteredPct,
  ofPreviousPct,
  terminal,
});

const funnel: EffectivenessFunnelResponse = {
  rubricVersion: "fhs-text-v1",
  minSampleSize: 20,
  minCohortSize: 5,
  trendMinCuts: 4,
  stages: [
    stage("signedUp", 400, 100, null),
    stage("firstSession", 250, 62.5, 62.5),
    stage("secondSession", 180, 45, 72),
    stage("firstScoredCut", 120, 30, 66.7),
    stage("measurable", 80, 20, 66.7),
    stage("classifiable", 30, 7.5, 37.5),
    // Withheld here to prove a server null reaches FunnelBars as a null.
    stage("improving", 4, null, null, true),
  ],
  trend: {
    classifiable: 30,
    improving: 4,
    steady: 24,
    declining: 2,
    unclassified: 0,
    improvingPct: 13.3,
    steadyPct: 80,
    decliningPct: null,
  },
  clamp: { measuredLearners: 130, outsideFunnel: 10, notInPopulation: 7, fewerThanTwoSessions: 3 },
  helpingSkillsTrend: { improving: 5, steady: 25, declining: 2, tooEarly: 98 },
  cutNoiseSd: 0.2,
  provenance: { derivation: "d", note: "n" },
  scoping: { tenantId: null, note: "s" },
  computedAt: "2026-10-05T00:00:00.000Z",
};

const change = (over: Partial<FoundationalSkillsSegmentsResponse["overall"]> = {}) => ({
  learners: 40,
  earlyComposite: 2.1,
  lateComposite: 2.25,
  change: 0.15,
  ci: [0.02, 0.28] as [number, number],
  up: 25,
  down: 12,
  tied: 3,
  signP: 0.04,
  detectable: true,
  ...over,
});

const segments: FoundationalSkillsSegmentsResponse = {
  rubricVersion: "fhs-text-v1",
  minSampleSize: 20,
  minCohortSize: 5,
  scoreDomain: [1, 4],
  dimension: "language",
  dimensions: ["language", "workerType", "orgSize", "course", "difficulty", "difficultyTransition"],
  cuts: 4,
  windows: { early: [1, 2], late: [3, 4], from: 1 },
  cohortOptions: [{ cuts: 4, learners: 50 }],
  measuredLearners: 120,
  panelLearners: 50,
  overall: change({ learners: 50 }),
  segments: [
    {
      ...change({ learners: 30, detectable: false, ci: [-0.05, 0.2], change: 0.07 }),
      key: "en",
      label: "English",
    },
    { ...change({ learners: 20 }), key: "hi", label: "Hindi" },
  ],
  withheld: [
    { key: "ta", label: "Tamil", learners: 7 },
    { key: "mixed", label: "Mixed", learners: 3 },
  ],
  provenance: { derivation: "d", note: "n" },
  scoping: { tenantId: null, note: "s" },
  computedAt: "2026-10-05T00:00:00.000Z",
};

const fhsChange = (over: object = {}) => ({
  n: 40,
  change: 0.04,
  ci: [-0.05, 0.13] as [number, number],
  up: 20,
  down: 18,
  tied: 2,
  signP: 0.8,
  detectable: false,
  ...over,
});

/** Only the fields the tiles read; the rest of the response is irrelevant to them. */
const progress = (over: object = {}) =>
  ({
    minSampleSize: 20,
    measuredLearners: 120,
    thresholds: { trendMinCuts: 4 },
    depth: [
      { atLeast: 1, learners: 120 },
      { atLeast: 2, learners: 80 },
      { atLeast: 4, learners: 30 },
    ],
    summary: {
      cohortLearners: 40,
      earlyComposite: 2.1,
      lateComposite: 2.14,
      composite: fhsChange(),
      unhelpful: {
        earlyPct: 30,
        latePct: 22,
        changePts: -8,
        ciPts: [-14, -2],
        stopped: 6,
        started: 3,
        persisted: 9,
        never: 22,
        signP: 0.03,
        detectable: true,
      },
    },
    trend: { improving: 5, steady: 25, declining: 2, tooEarly: 88 },
    safety: {
      selfHarm: {
        learnersWithCue: 18,
        cutsWithCue: 30,
        cutsFollowedUp: 18,
        cutsMissed: 6,
        cutsAmbiguous: 6,
      },
    },
    ...over,
  }) as unknown as FoundationalSkillsProgressResponse;

/* -------------------------------------------------------------------------- */
/* Funnel                                                                     */
/* -------------------------------------------------------------------------- */

describe("funnelStages", () => {
  it("passes the server's shares through, explicit nulls included", () => {
    const stages = funnelStages(funnel.stages);
    expect(stages[0]).toEqual({
      label: "signedUp",
      reached: 400,
      terminal: false,
      ofEnteredPct: 100,
      ofPreviousPct: null,
    });
    const last = stages[stages.length - 1];
    // null, not undefined: FunnelBars must not recompute 4 ÷ 30 on the client.
    expect(last.ofEnteredPct).toBeNull();
    expect(last.ofPreviousPct).toBeNull();
    expect("ofPreviousPct" in last).toBe(true);
    expect(last.terminal).toBe(true);
  });
});

describe("funnel takeaway", () => {
  it("names the step that loses the most learners, by count", () => {
    expect(biggestFunnelLoss(funnel.stages)).toMatchObject({
      lost: 150,
      from: { key: "signedUp" },
    });
  });

  it("quotes the server's carry-on share, never one it withheld", () => {
    expect(funnelTakeaway(funnel)).toBe(
      'Most learners leave between "signedUp" and "firstSession": 150 drop out at that step (62.5% of them carry on).',
    );
    const withheld = {
      ...funnel,
      stages: funnel.stages.map((s, i) => (i === 1 ? { ...s, ofPreviousPct: null } : s)),
    };
    expect(funnelTakeaway(withheld)).not.toMatch(/%/);
  });

  it("says nothing when nobody is lost", () => {
    expect(funnelTakeaway({ ...funnel, stages: [stage("a", 5, 100, null)] })).toBeUndefined();
  });
});

describe("trendParts", () => {
  it("keeps every count and only the shares the server stated", () => {
    const parts = trendParts(funnel.trend);
    expect(parts.map(p => [p.key, p.value, p.sharePct])).toEqual([
      ["improving", 4, 13.3],
      ["steady", 24, 80],
      ["declining", 2, null],
    ]);
  });
});

describe("clampNote", () => {
  it("says who the intersection drops, and why", () => {
    expect(clampNote(funnel.clamp)).toMatch(
      /^10 of 130 measured learners sit outside this funnel: 7 are not/,
    );
    expect(clampNote(funnel.clamp)).toMatch(/3 had fewer than two countable sessions/);
  });

  it("is silent when nobody is dropped", () => {
    expect(clampNote({ ...funnel.clamp, outsideFunnel: 0 })).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/* Segments                                                                   */
/* -------------------------------------------------------------------------- */

describe("segment rows", () => {
  it("puts everyone first, then the segments in the server's order", () => {
    const rows = segmentRows(segments);
    expect(rows.map(r => r.label)).toEqual(["Everyone in the panel", "English", "Hindi"]);
    expect(rows[0]).toMatchObject({ n: 50, change: 0.15, detectable: true });
    expect(rows[1].sublabel).toBe("2.10 → 2.25 · 25 up, 12 down");
  });

  it("lists withheld segments by count and finds the largest", () => {
    expect(withheldText(segments.withheld)).toBe("Tamil (n = 7), Mixed (n = 3)");
    expect(largestWithheld(segments)).toBe(7);
    expect(largestWithheld({ ...segments, withheld: [] })).toBe(0);
  });

  it("leaves the difficulty transition off the Effectiveness picker", () => {
    expect(segmentDimensionItems(segments.dimensions).map(d => d.id)).toEqual([
      "language",
      "workerType",
      "orgSize",
      "course",
      "difficulty",
    ]);
    // Before the first response: a default list rather than an empty picker.
    expect(segmentDimensionItems(undefined)).toHaveLength(5);
  });

  it("counts only server-detectable segments as moves", () => {
    expect(segmentsTakeaway(segments)).toBe(
      "Everyone in the panel: +0.15 (95% CI +0.02 to +0.28), detectably up. Of 2 segments with enough learners, 1 detectably up.",
    );
    expect(
      segmentsTakeaway({
        ...segments,
        segments: [segments.segments[0]],
      }),
    ).toMatch(/none shows a detectable change/);
  });

  it("says when no segment clears the floor, and nothing when everyone is withheld", () => {
    expect(segmentsTakeaway({ ...segments, segments: [] })).toMatch(
      /No language segment has 20 learners yet/,
    );
    expect(
      segmentsTakeaway({ ...segments, overall: change({ change: null, ci: null }) }),
    ).toBeUndefined();
  });

  it("tables withheld segments with their count only", () => {
    const t = segmentTable(segments);
    expect(t.rows).toHaveLength(5);
    expect(t.rows[3]).toEqual([
      "Tamil (withheld)",
      7,
      null,
      null,
      null,
      "—",
      null,
      null,
      null,
      "—",
      "—",
    ]);
  });
});

/* -------------------------------------------------------------------------- */
/* The chain tiles                                                            */
/* -------------------------------------------------------------------------- */

describe("chain tiles", () => {
  it("activation: all-time activated learners, with the rate only when stated", () => {
    const a = {
      summary: {
        latestCompleteBucket: "2026-09-28",
        latestPractisingLearners: 41,
        registeredLearners: 400,
        activatedLearners: 250,
        activationRatePct: 62.5,
        minPopulationSize: 20,
      },
    } as unknown as ActivationResponse;
    const t = activationTile(a);
    expect(t.value).toBe("250");
    expect(t.description).toMatch(
      /Of 400 learner accounts.*all time — 62.5% of them\. 41 practised in the latest complete week\. Detail: Usage\./,
    );
    expect(
      activationTile({ ...a, summary: { ...a.summary, activationRatePct: null } }).description,
    ).not.toMatch(/%/);
    expect(activationTile(undefined).value).toBe("—");
  });

  it("measurable: learners with 2+ scored slices", () => {
    expect(measurableTile(progress()).value).toBe("80");
  });

  it("composite: says 'no detectable change' when the interval spans zero, with n and the floor", () => {
    const t = compositeTile(progress());
    expect(t.value).toBe("+0.04");
    expect(t.description).toMatch(
      /^No detectable change: the 95% interval \(−0\.05 to \+0\.13\) spans zero\./,
    );
    expect(t).toMatchObject({ n: 40, minN: 20, nUnit: "learners" });
    const up = compositeTile(
      progress({
        summary: {
          ...progress().summary,
          composite: fhsChange({ change: 0.2, ci: [0.1, 0.3], detectable: true }),
        },
      }),
    );
    expect(up.description).toMatch(/^Detectably up/);
  });

  it("unhelpful: down reads as fewer", () => {
    const t = unhelpfulTile(progress());
    expect(t.value).toBe("−8 pts");
    expect(t.description).toMatch(
      /^Detectably fewer: the 95% interval \(−14 to −2 pts\) clears zero\. 30% → 22% of learners\./,
    );
  });

  it("course lift: thin below the floor, associated-with copy, the free-practice reference beside it", () => {
    const pooled = {
      learners: 12,
      beforeAvg: null,
      afterAvg: null,
      change: null,
      changeCi: null,
      up: 6,
      down: 5,
      tied: 1,
      signP: null,
      detectable: false,
    };
    const thin = courseLiftTile({ minSampleSize: 20, pooled });
    expect(thin).toMatchObject({ value: "—", n: 12, minN: 20 });
    const stated = courseLiftTile({
      minSampleSize: 20,
      pooled: { ...pooled, learners: 24, change: 0.3, changeCi: [0.1, 0.5], detectable: true },
      reference: { ...pooled, learners: 40, change: 0.05, changeCi: [-0.05, 0.15] },
    });
    expect(stated.value).toBe("+0.30");
    expect(stated.description).toMatch(/Associated with taking a course, not caused by it/);
    expect(stated.description).toMatch(
      /Free practice over the same slice positions: \+0\.05 \(−0\.05 to \+0\.15\)/,
    );
    // A backend from before `pooled`: say so rather than show a number.
    expect(courseLiftTile({ minSampleSize: 20 }).description).toMatch(
      /does not report the pooled figure/,
    );
  });

  it("self-harm: followed-up share of clear cue slices, unclear left out, internal, floored", () => {
    const t = selfHarmTile(progress());
    // 18 of 24 clear: the 6 unclear ones are not in the denominator.
    expect(t).toMatchObject({ value: "75%", n: 24, minN: 20 });
    expect(t.description).toMatch(
      /18 of 24 cue slices with a clear call were followed up \(6 unclear left out\)\. Internal/,
    );
    const none = selfHarmTile(
      progress({ safety: { selfHarm: { cutsFollowedUp: 0, cutsMissed: 0, cutsAmbiguous: 0 } } }),
    );
    expect(none).toMatchObject({ value: "—", n: 0 });
  });

  const competence = (engage: object) => ({
    minSampleSize: 20,
    learners: 74,
    excludedSkills: [
      { skill: "rapport", reason: "capped" as const },
      { skill: "confidentiality", reason: "rare" as const },
      { skill: "harm", reason: "rare" as const },
      { skill: "family", reason: "capped" as const },
    ],
    tiers: [
      {
        tier: "engage",
        skills: ["verbal", "feelings", "empathy"],
        skillsRequired: 2,
        medianCuts: null,
        notReachedByHalf: false,
        lastShownCut: null,
        medianMinutes: null,
        minutesLearners: 0,
        ...engage,
      },
    ],
  });

  it("competence: median slices, or 'not reached by half', naming the rule from the response", () => {
    const reached = competenceTile(
      competence({ medianCuts: 4, medianMinutes: 51.6, minutesLearners: 38 }),
    );
    expect(reached.value).toBe("4 slices");
    expect(reached.description).toMatch(
      /2 of 3 movable Engage skills at level 3 \(every basic behaviour\) at least once — rapport, confidentiality and harm left out\./,
    );
    expect(reached.description).toMatch(/Median 52 practice minutes among the 38 who got there/);
    const half = competenceTile(competence({ notReachedByHalf: true, lastShownCut: 9 }));
    expect(half.value).toBe("Not reached by half");
    expect(half.description).toMatch(/Fewer than half had by slice 9/);
    expect(competenceTile(competence({}))).toMatchObject({ n: 74, minN: 20 });
  });

  it("names a tier's own excluded skills in prose", () => {
    const excluded = competence({}).excludedSkills;
    expect(excludedForTier(excluded, "engage")).toEqual(["rapport", "confidentiality", "harm"]);
    expect(excludedForTier(excluded, "understand")).toEqual(["family"]);
    expect(proseList(["a"])).toBe("a");
    expect(proseList(["a", "b", "c"])).toBe("a, b and c");
  });
});

/* -------------------------------------------------------------------------- */
/* Dose–response (AAQ-217)                                                    */
/* -------------------------------------------------------------------------- */

const fit = {
  x: "cuts",
  n: 40,
  slope: 0.012,
  slopeCi: [-0.004, 0.028] as [number, number],
  intercept: -0.05,
  detectable: false,
  xMin: 4,
  xMax: 24,
};

const dose: DoseResponse = {
  minLearners: 40,
  classifiedLearners: 44,
  measurable: true,
  learnersWithMinutes: 41,
  fit,
  minutesFit: null,
  provenance: { derivation: "d", note: "n" },
};

const points: DoseResponsePoint[] = [
  { learnerId: 1, cuts: 4, practiceMinutes: 90, change: 0.3, trend: "improving" },
  { learnerId: 2, cuts: 12, practiceMinutes: null, change: -0.1, trend: "steady" },
];

describe("dose-response", () => {
  it("plots each learner by class and draws the server's fit over its own x range", () => {
    const series = doseSeries(points, fit, "cuts");
    expect(series.slice(0, 2)).toEqual([
      { group: "Improving", x: 4, y: 0.3, learnerId: 1 },
      { group: "Within noise", x: 12, y: -0.1, learnerId: 2 },
    ]);
    expect(series.filter(p => p.group === FIT_SERIES)).toEqual([
      { group: FIT_SERIES, x: 4, y: -0.002 },
      { group: FIT_SERIES, x: 24, y: 0.238 },
    ]);
  });

  it("leaves a learner with unknown minutes off the hours axis rather than at zero", () => {
    const series = doseSeries(points, null, "hours");
    expect(series).toEqual([{ group: "Improving", x: 1.5, y: 0.3, learnerId: 1 }]);
  });

  it("offers practice hours only when the server fitted them", () => {
    expect(doseAxisItems(dose).map(i => i.id)).toEqual(["cuts"]);
    expect(
      doseAxisItems({ ...dose, minutesFit: { ...fit, x: "practiceHours" } }).map(i => i.id),
    ).toEqual(["cuts", "hours"]);
  });

  it("states the slope as an association with its interval", () => {
    expect(doseTakeaway(fit)).toBe(
      "Each extra scored slice is associated with +0.012 on a learner's own change (95% CI −0.004 to +0.028; n = 40): no detectable association.",
    );
    expect(doseTakeaway({ ...fit, x: "practiceHours", detectable: true })).toMatch(
      /^Each extra hour of practice .* a detectable association\.$/,
    );
    expect(doseTakeaway(null)).toBeUndefined();
  });

  it("gates on the server's counts", () => {
    expect(doseGateText({ ...dose, classifiedLearners: 12, measurable: false })).toBe(
      "Not yet measurable — n = 12 of 40 needed",
    );
    expect(doseGateText(undefined)).toMatch(/does not report/);
  });
});

/* -------------------------------------------------------------------------- */
/* Cost per improved learner (AAQ-218)                                        */
/* -------------------------------------------------------------------------- */

describe("costDescription", () => {
  const cost = {
    spendUsd: 412.5,
    unpricedCalls: 3,
    improvedLearners: 22,
    classifiedLearners: 60,
  } as CostPerImprovementResponse;
  const usd = (v: number) => `$${v.toFixed(2)}`;

  it("names both halves of the ratio and the ceiling caveat", () => {
    const text = costDescription(cost, usd, false);
    expect(text).toMatch(/^\$412\.50 learner-caused AI spend ÷ 22 learners improving beyond noise/);
    expect(text).toMatch(/\(of 60 classifiable\)/);
    expect(text).toMatch(
      /A ceiling, not a unit price: spend is attributable to all learners, improvement only to the measurable subset\./,
    );
    expect(text).toMatch(/3 calls have no price on file/);
    expect(text).not.toMatch(/Platform-wide/);
  });

  it("says it stays platform-wide under an org filter", () => {
    expect(costDescription({ ...cost, unpricedCalls: 0 }, usd, true)).toMatch(
      /Platform-wide whatever the org filter/,
    );
  });
});
