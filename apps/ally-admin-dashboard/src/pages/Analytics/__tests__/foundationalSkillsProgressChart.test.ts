import { describe, expect, it } from "vitest";

import {
  ALL_ORGS,
  FhsProgressBehaviour,
  FhsProgressCut,
  FhsProgressSkill,
  LEVEL_LABELS,
  OPPORTUNITY_LABELS,
  SKILL_SHORT,
  behaviourProfile,
  buildCompositeBand,
  buildLevelMix,
  buildOpportunity,
  buildTrendMix,
  changeColor,
  changeVerdict,
  ciText,
  compositeTakeaway,
  credibleMoves,
  cutAxisLabel,
  depthStages,
  orgFilterItems,
  pValue,
  selfHarmSummary,
  signed,
  skillChangeRows,
  skillsByTier,
  testedMoves,
  trendTakeaway,
  unhelpfulTakeaway,
  whiskerExtent,
} from "../foundationalSkillsProgressChart";
import { CONTEXT, PALETTE } from "../chartScales";

const change = { n: 24, up: 10, down: 6, tied: 8, signP: 0.45 };

const skill = (key: string, extra: Partial<FhsProgressSkill> = {}): FhsProgressSkill => ({
  skill: key,
  name: `${key} full name`,
  tier: "engage",
  measurability: "measurable",
  earlyAvg: 2,
  lateAvg: 2.1,
  change: 0.1,
  ci: [-0.1, 0.3],
  detectable: false,
  ...change,
  levelMix: {
    early: { assessments: 40, levels: [10, 20, 8, 2] },
    late: { assessments: 40, levels: [5, 20, 10, 5] },
  },
  opportunityCuts: 100,
  opportunityPct: 50,
  learnersWithOpportunity: 60,
  learnersWithTwoPlus: 40,
  ...extra,
});

const cut = (k: number, composite: number | null, ci: [number, number] | null): FhsProgressCut => ({
  cut: k,
  learners: 24,
  composite,
  compositeCi: ci,
  unhelpfulPct: 25,
  unhelpfulCi: [10, 40],
  tiers: [],
  skills: [],
});

const behaviour = (
  code: string,
  extra: Partial<FhsProgressBehaviour> = {},
): FhsProgressBehaviour => ({
  code,
  skill: code.split(".")[0],
  kind: "basic",
  text: `text of ${code}`,
  pairedLearners: 24,
  earlyPct: 50,
  latePct: 60,
  changePts: 10,
  gained: 5,
  lost: 3,
  signP: 0.7,
  q: 0.9,
  credible: false,
  firstSliceLearners: 70,
  firstSlicePct: 40,
  everLearners: 74,
  everPct: 80,
  ...extra,
});

describe("helping skills progress transforms", () => {
  it("keeps every axis label within Carbon's 14-character budget", () => {
    for (const label of [
      ...Object.values(SKILL_SHORT),
      ...LEVEL_LABELS,
      ...Object.values(OPPORTUNITY_LABELS),
    ]) {
      expect(label.length).toBeLessThanOrEqual(14);
    }
    expect(cutAxisLabel(1)).toBe("Cut 1 *");
    expect(cutAxisLabel(12)).toBe("Cut 12");
  });

  it("formats signed values, intervals and p-values for reading", () => {
    expect(signed(0.345)).toBe("+0.34");
    expect(signed(-0.28)).toBe("−0.28");
    expect(signed(-0.001)).toBe("0.00");
    expect(ciText([-0.06, 0.09])).toBe("−0.06 to +0.09");
    expect(ciText(null)).toBe("—");
    expect(pValue(0.0004)).toBe("p<0.001");
    expect(pValue(0.541)).toBe("p=0.54");
  });

  it("says no detectable change unless the server says detectable", () => {
    expect(changeVerdict({ change: 0.13, detectable: false, n: 24 })).toBe("no detectable change");
    expect(changeVerdict({ change: 0.5, detectable: true, n: 24 })).toBe("detectably up");
    expect(changeVerdict({ change: -0.5, detectable: true, n: 24 })).toBe("detectably down");
    expect(changeVerdict({ change: null, detectable: false, n: 3 })).toBe(
      "too few learners (n = 3)",
    );
    expect(changeColor({ change: 0.4, detectable: false })).toBe(CONTEXT.line);
    expect(changeColor({ change: 0.4, detectable: true })).toBe(PALETTE.green);
    expect(changeColor({ change: -0.4, detectable: true })).toBe(PALETTE.red);
  });

  it("builds a bounded band, leaving withheld cuts as gaps without a band", () => {
    const band = buildCompositeBand([cut(1, 2.25, [2.15, 2.35]), cut(2, null, null)]);
    expect(band[0]).toMatchObject({ key: "Cut 1 *", value: 2.25, min: 2.15, max: 2.35 });
    expect(band[1]).toMatchObject({ key: "Cut 2", value: null });
    expect(band[1]).not.toHaveProperty("min");
  });

  it("splits measurable skills (by change) from the ones the measure cannot move", () => {
    const { measurable, notMeasurable } = skillChangeRows([
      skill("goals", { change: -0.04 }),
      skill("verbal", { change: 0.13 }),
      skill("rapport", { measurability: "capped" }),
      skill("harm", { measurability: "rare", change: null }),
    ]);
    expect(measurable.map(s => s.skill)).toEqual(["verbal", "goals"]);
    expect(notMeasurable.map(s => s.skill)).toEqual(["rapport", "harm"]);
  });

  it("sizes the whisker axis to the widest interval, at least ±0.5", () => {
    expect(whiskerExtent([{ change: 0.1, ci: [-0.2, 0.3] }])).toBe(0.5);
    expect(whiskerExtent([{ change: 0.1, ci: [-0.6, 0.7] }])).toBe(0.75);
  });

  it("groups by tier without reordering within a tier", () => {
    const ordered = skillsByTier([
      skill("goals", { tier: "support" }),
      skill("coping", { tier: "understand" }),
      skill("verbal", { tier: "engage" }),
    ]);
    expect(ordered.map(s => s.skill)).toEqual(["verbal", "coping", "goals"]);
  });

  it("draws level mix shares top-down by tier, dropping withheld skills", () => {
    const series = buildLevelMix(
      [
        skill("verbal"),
        skill("harm", {
          levelMix: {
            early: { assessments: 4, levels: null },
            late: { assessments: 3, levels: null },
          },
        }),
      ],
      "late",
    );
    expect(series.map(p => p.value)).toEqual([12.5, 50, 25, 12.5]);
    expect(series[0]).toMatchObject({ group: LEVEL_LABELS[0], key: "Verbal" });
  });

  it("counts learners with 2+, 1 and no chances, fewest-chances on top", () => {
    const series = buildOpportunity(
      [skill("verbal"), skill("harm", { learnersWithOpportunity: 28, learnersWithTwoPlus: 13 })],
      74,
    );
    // Carbon draws the first horizontal category at the bottom: verbal (40 with 2+) first, harm last = on top.
    expect([...new Set(series.map(p => p.key))]).toEqual(["Verbal", "Harm & safety"]);
    expect(series.slice(3).map(p => [p.group, p.value])).toEqual([
      [OPPORTUNITY_LABELS.two, 13],
      [OPPORTUNITY_LABELS.one, 15],
      [OPPORTUNITY_LABELS.none, 46],
    ]);
  });

  it("profiles one kind of behaviour most-shown first, and lists only credible moves", () => {
    const bs = [
      behaviour("verbal.b1", { everPct: 98 }),
      behaviour("goals.b1", { everPct: 60 }),
      behaviour("verbal.u1", { kind: "unhelpful", everPct: 10 }),
      behaviour("feedback.b1", { credible: true, changePts: 30, q: 0.01 }),
      behaviour("hope.b1", { signP: null, q: null }),
    ];
    expect(behaviourProfile(bs, "basic").map(b => b.code)).toEqual([
      "verbal.b1",
      "feedback.b1",
      "hope.b1",
      "goals.b1",
    ]);
    expect(credibleMoves(bs).map(b => b.code)).toEqual(["feedback.b1"]);
    expect(testedMoves(bs)).toBe(4);
  });

  it("turns depth into funnel stages and trend into donut slices", () => {
    expect(
      depthStages([
        { atLeast: 1, learners: 74 },
        { atLeast: 10, learners: 9 },
      ]),
    ).toEqual([
      { label: "1+ cut", reached: 74, terminal: false },
      { label: "10+ cuts", reached: 9, terminal: true },
    ]);
    expect(
      buildTrendMix({ improving: 1, steady: 25, declining: 0, tooEarly: 48 }).map(p => p.group),
    ).toEqual(["Improving", "Within noise", "Too early to say"]);
  });

  it("writes takeaways that carry the interval and the verdict", () => {
    const summary = {
      cohortLearners: 24,
      earlyComposite: 2.3,
      lateComposite: 2.32,
      composite: {
        n: 24,
        change: 0.02,
        ci: [-0.06, 0.09] as [number, number],
        up: 14,
        down: 10,
        tied: 0,
        signP: 0.541,
        detectable: false,
      },
      unhelpful: {
        earlyPct: 58.3,
        latePct: 41.7,
        changePts: -16.7,
        ciPts: [-45.8, 12.5] as [number, number],
        stopped: 9,
        started: 5,
        persisted: 5,
        never: 5,
        signP: 0.424,
        detectable: false,
      },
      skills: {
        detectableUp: 0,
        detectableDown: 0,
        noDetectableChange: 10,
        tooFewLearners: 0,
        notMeasurable: 4,
      },
    };
    expect(compositeTakeaway(summary)).toBe(
      "+0.02 on a 1–4 scale (95% CI −0.06 to +0.09; 14 up, 10 down, p=0.54): no detectable change.",
    );
    expect(unhelpfulTakeaway(summary.unhelpful)).toBe(
      "−17 points (95% CI −46 to +13): 9 stopped, 5 started, 5 still, 5 never — no detectable change.",
    );
    expect(trendTakeaway({ improving: 1, steady: 25, declining: 0, tooEarly: 48 }, 4)).toBe(
      "Of 26 learners with 4+ cuts, 1 moved up and 0 down by more than slice-to-slice noise; 25 are within it.",
    );
    expect(
      selfHarmSummary({
        learnersWithCue: 28,
        cutsWithCue: 45,
        cutsFollowedUp: 19,
        cutsMissed: 17,
        cutsAmbiguous: 9,
        cutsWithAdvanced: 12,
        cutsWithOtherUnhelpful: 0,
        learnersFollowedFirst: 12,
        learnersMissedFirst: 10,
        learnersAmbiguousFirst: 6,
        repeatLearners: 12,
        repeatBetter: 2,
        repeatWorse: 3,
        repeatSame: 7,
      }),
    ).toBe(
      "28 learners met a simulated self-harm cue in 45 slices. The first time, 12 followed it up, 10 missed it and 6 were unclear.",
    );
  });
});

describe("orgFilterItems", () => {
  it("opens on all orgs, then lists live, non-test orgs by name", () => {
    const items = orgFilterItems([
      { id: "z", name: "Zeta Health", isTestOrganization: false, deletedAt: null },
      { id: "qa", name: "QA sandbox", isTestOrganization: true, deletedAt: null },
      { id: "gone", name: "Gone Org", isTestOrganization: false, deletedAt: "2026-01-01" },
      { id: "a", name: "Alpha Care", isTestOrganization: false, deletedAt: null },
    ]);
    expect(items).toEqual([
      { id: ALL_ORGS, label: "All orgs" },
      { id: "a", label: "Alpha Care" },
      { id: "z", label: "Zeta Health" },
    ]);
  });

  it("still offers all orgs when the org list could not be read", () => {
    expect(orgFilterItems([])).toEqual([{ id: ALL_ORGS, label: "All orgs" }]);
  });
});
