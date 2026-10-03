import { describe, expect, it } from "vitest";

import {
  DIRECTION,
  DIRECTION_SCALE,
  FhsProgressBehaviour,
  FhsProgressCut,
  FhsProgressSkill,
  LEVEL_LABELS,
  OVERALL,
  SKILL_SHORT,
  behaviourMovers,
  buildDose,
  buildLevelMix,
  buildOpportunity,
  buildSkillChange,
  buildTierSeries,
  buildTransitions,
  buildTrendMix,
  buildWhoMoved,
  ceilingSkills,
  levelCellStyle,
  levelMixWithheld,
  panelOptionLabel,
  pct,
  signed,
  skillChangeTakeaway,
  skillsByTier,
  tierTakeaway,
  transitionsTakeaway,
  trendTakeaway,
  windowLabel,
  withheldSkills,
} from "../foundationalSkillsProgressChart";

const skill = (key: string, extra: Partial<FhsProgressSkill> = {}): FhsProgressSkill => ({
  skill: key,
  name: `${key} full name`,
  tier: "engage",
  pairedLearners: 24,
  earlyAvg: 2,
  lateAvg: 2,
  change: 0,
  improved: 0,
  unchanged: 24,
  declined: 0,
  levelMix: {
    early: { assessments: 40, levels: [10, 20, 8, 2] },
    late: { assessments: 40, levels: [5, 20, 10, 5] },
  },
  opportunityCuts: 100,
  opportunityPct: 50,
  ...extra,
});

const cut = (
  k: number,
  composite: number | null,
  tiers: [number, number, number],
): FhsProgressCut => ({
  cut: k,
  learners: 24,
  composite,
  unhelpfulPct: 25,
  tiers: [
    { tier: "engage", learners: 24, avgLevel: tiers[0] },
    { tier: "understand", learners: 24, avgLevel: tiers[1] },
    { tier: "support", learners: 24, avgLevel: tiers[2] },
  ],
  skills: [],
});

const behaviour = (
  code: string,
  kind: FhsProgressBehaviour["kind"],
  changePts: number | null,
): FhsProgressBehaviour => ({
  code,
  skill: code.split(".")[0],
  kind,
  text: `text of ${code}`,
  pairedLearners: 24,
  earlyPct: changePts === null ? null : 50,
  latePct: changePts === null ? null : 50 + changePts,
  changePts,
});

describe("foundational skills progress transforms", () => {
  it("keeps every axis label within Carbon's 14-character tick budget", () => {
    for (const label of [...Object.values(SKILL_SHORT), ...LEVEL_LABELS]) {
      expect(label.length).toBeLessThanOrEqual(14);
    }
    expect(Object.keys(SKILL_SHORT)).toHaveLength(14);
  });

  it("formats signed deltas with a real minus and no negative zero", () => {
    expect(signed(0.345)).toBe("+0.34");
    expect(signed(-0.28)).toBe("−0.28");
    expect(signed(-0.001)).toBe("0.00");
    expect(signed(null)).toBe("—");
    expect(signed(12, 0)).toBe("+12");
    expect(pct(25)).toBe("25%");
    expect(pct(33.3)).toBe("33.3%");
    expect(pct(null)).toBe("—");
  });

  it("names windows the way the captions use them", () => {
    expect(windowLabel([1, 2])).toBe("cuts 1–2");
    expect(windowLabel([3])).toBe("cut 3");
    expect(windowLabel([])).toBe("");
    expect(panelOptionLabel({ cuts: 5, learners: 24 })).toBe("First 5 cuts · 24 learners");
    expect(panelOptionLabel({ cuts: 9, learners: 1 })).toBe("First 9 cuts · 1 learner");
  });

  it("draws overall plus three tiers per cut, carrying nulls as gaps", () => {
    const series = buildTierSeries([cut(1, 2.25, [2.4, 2.1, 2.3]), cut(2, null, [2.5, 2.1, 2.2])]);
    expect(series).toHaveLength(8);
    expect(series[0]).toMatchObject({ group: OVERALL, key: "Cut 1", value: 2.25 });
    expect(series.find(p => p.group === OVERALL && p.key === "Cut 2")?.value).toBeNull();
  });

  it("orders skill change by gain and colours each bar by its direction", () => {
    const { data, scale } = buildSkillChange(
      [
        skill("goals", { change: -0.28 }),
        skill("verbal", { change: 0.33 }),
        skill("hope", { change: 0.05 }),
        skill("harm", { change: null }),
      ],
      0.1,
    );
    // Carbon draws the first horizontal category at the bottom: biggest gain last = on top.
    expect(data.map(d => d.group)).toEqual(["Goal-setting", "Hope", "Verbal"]);
    expect(scale).toEqual({
      Verbal: DIRECTION_SCALE[DIRECTION.up],
      Hope: DIRECTION_SCALE[DIRECTION.held],
      "Goal-setting": DIRECTION_SCALE[DIRECTION.down],
    });
    expect(withheldSkills([skill("harm", { change: null })])).toHaveLength(1);
  });

  it("stacks who moved per skill, most net improvers first, skipping unpaired skills", () => {
    const series = buildWhoMoved([
      skill("goals", { improved: 2, unchanged: 10, declined: 8 }),
      skill("verbal", { improved: 9, unchanged: 12, declined: 3 }),
      skill("confidentiality", { pairedLearners: 0, improved: 0, unchanged: 0, declined: 0 }),
    ]);
    expect([...new Set(series.map(p => p.key))]).toEqual(["Goal-setting", "Verbal"]);
    expect(series.slice(-3).map(p => [p.group, p.value])).toEqual([
      [DIRECTION.up, 9],
      [DIRECTION.held, 12],
      [DIRECTION.down, 3],
    ]);
  });

  it("turns level counts into shares per window and drops withheld skills", () => {
    const skills = [
      skill("verbal"),
      skill("harm", {
        levelMix: {
          early: { assessments: 6, levels: null },
          late: { assessments: 4, levels: null },
        },
      }),
    ];
    const late = buildLevelMix(skills, "late");
    expect(late.map(p => p.value)).toEqual([12.5, 50, 25, 12.5]);
    expect(late[0]).toMatchObject({ group: LEVEL_LABELS[0], key: "Verbal", count: 5 });
    expect(levelMixWithheld(skills, "early").map(s => s.skill)).toEqual(["harm"]);
  });

  it("flags a skill stuck at one level in both windows as a ceiling", () => {
    const stuck = skill("rapport", {
      levelMix: {
        early: { assessments: 40, levels: [0, 40, 0, 0] },
        late: { assessments: 38, levels: [1, 37, 0, 0] },
      },
    });
    expect(ceilingSkills([stuck, skill("verbal")]).map(s => s.skill)).toEqual(["rapport"]);
  });

  it("groups skills by tier without reordering within a tier", () => {
    const ordered = skillsByTier([
      skill("goals", { tier: "support" }),
      skill("coping", { tier: "understand" }),
      skill("verbal", { tier: "engage" }),
      skill("feedback", { tier: "support" }),
      skill("family", { tier: "understand" }),
    ]);
    expect(ordered.map(s => s.skill)).toEqual(["verbal", "coping", "family", "goals", "feedback"]);
  });

  it("puts the most-tested skill at the top", () => {
    const series = buildOpportunity([
      skill("harm", { opportunityPct: 4.8 }),
      skill("verbal", { opportunityPct: 100 }),
    ]);
    expect(series.map(p => p.key)).toEqual(["Harm & safety", "Verbal"]);
  });

  it("picks the biggest behaviour moves either way and reads a falling unhelpful one as good", () => {
    const movers = behaviourMovers(
      [
        behaviour("verbal.b1", "basic", 30),
        behaviour("goals.u1", "unhelpful", 12),
        behaviour("verbal.u1", "unhelpful", -20),
        behaviour("hope.a1", "advanced", 0),
        behaviour("harm.u1", "unhelpful", null),
      ],
      "all",
    );
    expect(movers.map(m => [m.code, m.good])).toEqual([
      ["verbal.b1", true],
      ["verbal.u1", true],
      ["goals.u1", false],
    ]);
    expect(behaviourMovers(movers, "unhelpful").map(m => m.code)).toEqual([
      "verbal.u1",
      "goals.u1",
    ]);
  });

  it("drops empty slices from the donuts and keeps buckets with no average", () => {
    expect(buildTransitions({ stopped: 4, persisted: 2, started: 0, never: 18 })).toEqual([
      { group: "Stopped", value: 4 },
      { group: "Never showed", value: 18 },
      { group: "Still showing", value: 2 },
    ]);
    expect(
      buildTrendMix({ improving: 5, steady: 10, declining: 0, tooEarly: 40 }).map(p => p.group),
    ).toEqual(["Improving", "Holding steady", "Too early to say"]);
    expect(buildDose([{ label: "4–5 cuts", learners: 9, avgChange: null }])[0]).toMatchObject({
      key: "4–5 cuts",
      value: null,
      learners: 9,
    });
  });

  it("writes takeaways only when there is something honest to say", () => {
    expect(
      skillChangeTakeaway([skill("verbal", { change: 0.33 }), skill("goals", { change: -0.28 })]),
    ).toBe("Biggest gain: verbal full name (+0.33). Biggest drop: goals full name (−0.28).");
    expect(skillChangeTakeaway([skill("verbal", { change: null })])).toBeUndefined();

    const byCut = [
      cut(1, 2.2, [2.4, 2.1, 2.4]),
      cut(2, 2.2, [2.4, 2.1, 2.4]),
      cut(3, 2.3, [2.6, 2.1, 2.3]),
      cut(4, 2.3, [2.6, 2.1, 2.3]),
    ];
    expect(tierTakeaway(byCut, { early: [1, 2], late: [3, 4] })).toBe(
      "Engage moved most (+0.20); Support least (−0.10).",
    );
    expect(transitionsTakeaway({ stopped: 4, persisted: 2, started: 1, never: 17 })).toBe(
      "4 of 24 stopped showing an unhelpful behaviour; 1 started.",
    );
    expect(transitionsTakeaway({ stopped: 0, persisted: 0, started: 0, never: 0 })).toBeUndefined();
    expect(trendTakeaway({ improving: 3, steady: 20, declining: 3, tooEarly: 48 }, 4)).toBe(
      "Of 26 learners with 4+ cuts, 3 improving and 3 declining against their own start.",
    );
  });

  it("darkens grid cells with level and keeps text readable on dark cells", () => {
    expect(levelCellStyle(null).background).toBe("transparent");
    expect(levelCellStyle(1.2).color).not.toBe("#ffffff");
    expect(levelCellStyle(3.6).color).toBe("#ffffff");
    expect(levelCellStyle(2.0).background).not.toBe(levelCellStyle(3.0).background);
  });
});
