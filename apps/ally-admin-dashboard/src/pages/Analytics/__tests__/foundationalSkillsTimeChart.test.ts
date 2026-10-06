import { describe, expect, it } from "vitest";

import {
  PracticeProgressionResponse,
  SkillRetentionResponse,
  TimeToCompetenceResponse,
  TimeToCompetenceTier,
  competenceRule,
  competenceSeries,
  competenceTable,
  competenceTakeaway,
  excludedSkillsText,
  hasCompetencePoints,
  hasProgressionShares,
  mostOftenMissing,
  progressionSeries,
  progressionTable,
  progressionTakeaway,
  retentionRows,
  retentionTable,
  retentionTakeaway,
  tierHeadline,
  unplottedPairs,
  withheldOrdinals,
} from "../foundationalSkillsTimeChart";

/* -------------------------------------------------------------------------- */
/* Time to competence (AAQ-205)                                               */
/* -------------------------------------------------------------------------- */

const tier = (over: Partial<TimeToCompetenceTier>): TimeToCompetenceTier => ({
  tier: "engage",
  skills: ["verbal", "feelings", "empathy"],
  skillsRequired: 2,
  points: [],
  reachedLearners: 0,
  notReachedLearners: 0,
  medianCuts: null,
  notReachedByHalf: false,
  lastShownCut: null,
  medianMinutes: null,
  minutesLearners: 0,
  missing: { learners: 0, mostOftenMissing: null, skills: [] },
  ...over,
});

const point = (cut: number, atRisk: number, reachedShare: number | null, reachedAtCut = 2) => ({
  cut,
  atRisk,
  reachedAtCut,
  censoredAtCut: 1,
  reachedShare,
});

const competence: TimeToCompetenceResponse = {
  rubricVersion: "fhs-text-v1",
  cutSizeLearnerChars: 5000,
  minSampleSize: 20,
  minCohortSize: 5,
  competenceLevel: 3,
  tierCompetenceSkills: { engage: 2, understand: 3, support: 2 },
  excludedSkills: [
    { skill: "rapport", reason: "capped" },
    { skill: "confidentiality", reason: "rare" },
    { skill: "harm", reason: "rare" },
    { skill: "family", reason: "capped" },
  ],
  learners: 74,
  learnersWithoutFirstCut: 3,
  maxCut: 3,
  tiers: [
    // Support listed first on purpose: the series must still come out tier-ordered.
    tier({
      tier: "support",
      skills: ["goals", "hope", "feedback"],
      points: [point(1, 74, 5), point(2, 60, 12)],
      notReachedByHalf: true,
      lastShownCut: 2,
    }),
    tier({
      points: [point(1, 74, 20), point(2, 50, 41.2), point(3, 12, null)],
      medianCuts: null,
      notReachedByHalf: true,
      lastShownCut: 2,
      missing: {
        learners: 30,
        mostOftenMissing: "empathy",
        skills: [
          {
            skill: "empathy",
            name: "Empathy, warmth and genuineness",
            missingLearners: 18,
            neverAssessed: 2,
            assessedBelow: 16,
            sharePct: 60,
          },
        ],
      },
    }),
    tier({
      tier: "understand",
      skills: ["functioning", "explanation", "coping", "psychoeducation"],
      skillsRequired: 3,
      points: [point(1, 74, 30), point(2, 40, 55)],
      medianCuts: 2,
      medianMinutes: 47.4,
      minutesLearners: 21,
    }),
  ],
  scoping: { tenantId: null, unscopedSections: [] },
  provenance: { derivation: "d", note: "n" },
  computedAt: "2026-10-05T00:00:00.000Z",
};

describe("time to competence", () => {
  it("builds slice-major step series, tier-ordered, with a null where the share was withheld", () => {
    const s = competenceSeries(competence);
    expect(s.map(p => `${p.key}:${p.group}`)).toEqual([
      "Slice 1:Engage",
      "Slice 1:Understand",
      "Slice 1:Support",
      "Slice 2:Engage",
      "Slice 2:Understand",
      "Slice 2:Support",
      "Slice 3:Engage",
    ]);
    // Slice 3 has 12 at risk: the server withheld it, and the line breaks there.
    expect(s[6]).toMatchObject({ value: null, atRisk: 12 });
  });

  it("knows when nothing is plotted", () => {
    expect(hasCompetencePoints(competence)).toBe(true);
    expect(
      hasCompetencePoints({
        ...competence,
        tiers: competence.tiers.map(t => ({
          ...t,
          points: t.points.map(p => ({ ...p, reachedShare: null })),
        })),
      }),
    ).toBe(false);
  });

  it("headlines each tier: median slices and minutes, or not reached by half", () => {
    expect(tierHeadline(competence.tiers[2])).toBe(
      "Understand: median 2 slices, 47 min of practice among those who got there",
    );
    expect(tierHeadline(competence.tiers[1])).toBe("Engage: not reached by half by slice 2");
    expect(tierHeadline(tier({}))).toBeNull();
    expect(competenceTakeaway(competence)).toBe(
      "Engage: not reached by half by slice 2 · Understand: median 2 slices, 47 min of practice among those who got there · Support: not reached by half by slice 2.",
    );
  });

  it("states the rule and every excluded skill with its reason", () => {
    expect(competenceRule(competence)).toBe("Engage 2 of 3, Understand 3 of 4, Support 2 of 3");
    expect(excludedSkillsText(competence)).toBe(
      "Left out of every tier: rapport and family (capped at level 2 by the rubric); confidentiality and harm (assessable only when the client raises them).",
    );
  });

  it("names what not-yet-reached learners most often lack", () => {
    expect(mostOftenMissing(competence)).toEqual([
      "Engage: Empathy, warmth and genuineness (18 of 30 not yet there, 2 never had the chance)",
    ]);
  });

  it("tables every point with its at-risk count", () => {
    const t = competenceTable(competence);
    expect(t.rows[0]).toEqual(["Engage", 1, 74, 2, 1, 20]);
    expect(t.rows).toHaveLength(7);
  });
});

/* -------------------------------------------------------------------------- */
/* Retention (AAQ-206)                                                        */
/* -------------------------------------------------------------------------- */

const rchange = (over: object = {}) => ({
  pairs: 60,
  learners: 25,
  measurable: true,
  change: 0.02,
  ci: [-0.04, 0.08] as [number, number],
  up: 12,
  down: 11,
  tied: 2,
  signP: 0.9,
  detectable: false,
  ...over,
});

const band = (key: string, label: string, over: object = {}) => ({
  band: key,
  label,
  minDays: 0,
  maxDays: 7,
  reference: key === "<7",
  medianGapDays: 1.5,
  composite: rchange(),
  unhelpful: rchange({ change: -1.5, ci: [-4.2, 1.1] }),
  ...over,
});

const withheld = rchange({
  pairs: 8,
  learners: 6,
  measurable: false,
  change: null,
  ci: null,
  signP: null,
});

const retention: SkillRetentionResponse = {
  rubricVersion: "fhs-text-v1",
  cutSizeLearnerChars: 5000,
  minSampleSize: 20,
  minPairs: 20,
  minLearners: 10,
  bandDefs: [],
  learners: 40,
  pairs: {
    considered: 200,
    nonAdjacent: 4,
    sameSession: 30,
    missingTimes: 2,
    overlapping: 3,
    plotted: 164,
  },
  bands: [
    band("<7", "Under 7 days"),
    band("7-13", "7–13 days"),
    band("14-29", "14–29 days", { composite: withheld, medianGapDays: null }),
    band("30+", "30+ days", {
      composite: rchange({ pairs: 21, learners: 12, change: -0.11, ci: [-0.3, 0.06] }),
    }),
  ],
  takeaway: {
    referenceBand: "<7",
    referenceChange: 0.02,
    referenceCi: [-0.04, 0.08],
    longBreakBand: "30+",
    longBreakChange: -0.11,
    longBreakCi: [-0.3, 0.06],
  },
  scoping: { tenantId: null, unscopedSections: [] },
  provenance: { derivation: "d", note: "n" },
  computedAt: "2026-10-05T00:00:00.000Z",
};

describe("retention after a break", () => {
  it("draws one whisker per band, marking the reference and leaving a withheld band without a change", () => {
    const rows = retentionRows(retention);
    expect(rows.map(r => r.label)).toEqual(["Under 7 days", "7–13 days", "14–29 days", "30+ days"]);
    expect(rows[0].sublabel).toBe(
      "Reference: no real break · 60 pairs from 25 learners · median gap 1.5 days",
    );
    expect(rows[2]).toMatchObject({ change: null, ci: null, n: 6 });
    expect(rows[2].sublabel).toBe("8 pairs from 6 learners");
  });

  it("presents both bands with intervals, as an association, without presuming a drop", () => {
    const text = retentionTakeaway(retention);
    expect(text).toBe(
      "After a break of 30+ days, learners' next slice moves −0.11 (95% CI −0.30 to +0.06), against +0.02 (−0.04 to +0.08) after a gap of under 7 days — associated with the break, not caused by it.",
    );
    expect(text).not.toMatch(/caused by the break|decay|forget/i);
  });

  it("says when the long-break band is still too thin, and nothing when the reference is", () => {
    expect(
      retentionTakeaway({
        ...retention,
        takeaway: { ...retention.takeaway, longBreakChange: null, longBreakCi: null },
      }),
    ).toMatch(/Too few learners have come back after 30\+ days to compare yet\./);
    expect(
      retentionTakeaway({
        ...retention,
        takeaway: { ...retention.takeaway, referenceChange: null },
      }),
    ).toBeUndefined();
  });

  it("counts the pairs that had no gap to measure, and tables the unhelpful change too", () => {
    expect(unplottedPairs(retention)).toBe(32);
    const t = retentionTable(retention);
    expect(t.rows[0]).toEqual([
      "Under 7 days",
      "Yes",
      60,
      25,
      1.5,
      0.02,
      "−0.04 to +0.08",
      "12 / 11 / 2",
      "p=0.90",
      -1.5,
      "−4.2 to +1.1",
    ]);
  });
});

/* -------------------------------------------------------------------------- */
/* Difficulty mix (AAQ-207)                                                   */
/* -------------------------------------------------------------------------- */

const cell = (sessions: number, shares: [number, number, number, number] | null) => ({
  sessions,
  counts: { EASY: 10, MEDIUM: 20, HARD: 5, untagged: 1 },
  shares: shares
    ? { EASY: shares[0], MEDIUM: shares[1], HARD: shares[2], untagged: shares[3] }
    : { EASY: null, MEDIUM: null, HARD: null, untagged: null },
});

const progression: PracticeProgressionResponse = {
  maxOrdinal: 3,
  minSampleSize: 20,
  experiencedMinSessions: 12,
  levels: ["EASY", "MEDIUM", "HARD", "untagged"],
  learners: 120,
  experiencedLearners: 14,
  ordinals: [
    { ordinal: 1, ...cell(120, [30, 60, 8, 2]), experienced: cell(14, null) },
    { ordinal: 2, ...cell(80, [25, 55, 18, 2]), experienced: cell(14, null) },
    { ordinal: 3, ...cell(12, null), experienced: cell(14, null) },
  ],
  scoping: { tenantId: null, unscopedSections: [] },
  provenance: { derivation: "d", note: "n" },
  computedAt: "2026-10-05T00:00:00.000Z",
};

describe("difficulty mix by practice ordinal", () => {
  it("stacks the four labels per session, keeping a withheld session as an empty column", () => {
    const s = progressionSeries(progression, "all");
    expect(s.slice(0, 4).map(p => [p.group, p.key, p.value])).toEqual([
      ["Easy", "Session 1", 30],
      ["Medium", "Session 1", 60],
      ["Hard", "Session 1", 8],
      ["Untagged", "Session 1", 2],
    ]);
    expect(s.filter(p => p.key === "Session 3").every(p => p.value === null)).toBe(true);
  });

  it("reads the experienced panel when asked, and knows when it has nothing to show", () => {
    expect(hasProgressionShares(progression, "all")).toBe(true);
    expect(hasProgressionShares(progression, "experienced")).toBe(false);
    expect(progressionSeries(progression, "experienced").every(p => p.value === null)).toBe(true);
  });

  it("names withheld positions and the Hard share at the first and last stated ones", () => {
    expect(withheldOrdinals(progression, "all")).toEqual([3]);
    expect(progressionTakeaway(progression, "all")).toBe(
      "Hard scenarios: 8% of session 1s, 18% of session 2s (all learners).",
    );
    expect(progressionTakeaway(progression, "experienced")).toBeUndefined();
  });

  it("tables counts always and shares only where stated", () => {
    const t = progressionTable(progression, "all");
    expect(t.rows[2]).toEqual([3, 12, 10, 20, 5, 1, null, null, null, null]);
  });
});
