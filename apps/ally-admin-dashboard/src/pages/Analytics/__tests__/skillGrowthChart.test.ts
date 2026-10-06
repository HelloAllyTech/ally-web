import { describe, expect, it } from "vitest";

import {
  SkillGrowthKnowledgeAttempt,
  SkillGrowthLearnerSession,
  SkillTrendMix,
  SkillTrendThresholds,
} from "@types";

import {
  MIN_LEARNERS_FOR_SHARE,
  TREND_LABELS,
  bandSentence,
  buildKnowledgeSeries,
  buildLearnerCompositeSeries,
  buildTrendMixSeries,
  classifiedShareValue,
  escapeHtml,
  formatBand,
  formatDelta,
  learnerName,
  learnerSliceTooltip,
  learnerTableRows,
  learnerTakeaway,
  monthLabel,
  sessionTick,
  skillLevelsText,
  trendMixTakeaway,
} from "../skillGrowthChart";

const thresholds: SkillTrendThresholds = {
  minSessions: 4,
  window: 2,
  flatBand: 0.31,
  cutNoiseSd: 0.112,
  bandZ: 1.96,
  bandRule: "k = the learner's scored cuts (at least 4); w = floor(k / 2).",
};

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
  skillLevels: Record<string, number> = {},
  occurredAt = "2026-02-12T10:00:00.000Z",
): SkillGrowthLearnerSession => ({
  ordinal,
  occurredAt,
  scenarioTitle: "De-escalation",
  compositeScore,
  skillCoverage: null,
  skillLevels,
  hasUnhelpfulBehaviour: null,
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
    const series = buildTrendMixSeries([{ month: "2026-01", improving: 0, flat: 0, declining: 2 }]);

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

  it("states the share once enough learners are classified, in slices against noise", () => {
    expect(classifiedShareValue(mix())).toBe("60%");
    const text = trendMixTakeaway(mix());
    expect(text).toContain("60% of the 10 learners with 4+ scored slices");
    expect(text).toContain("slice-to-slice noise");
    expect(text).not.toMatch(/session/i);
  });

  it("explains an empty mix by naming the slice threshold", () => {
    const none = mix({
      classifiedLearners: 0,
      improving: 0,
      flat: 0,
      declining: 0,
      insufficientLearners: 7,
    });

    expect(trendMixTakeaway(none)).toContain("4 scored slices");
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

  it("names the unclassified by the reason — not enough slices", () => {
    expect(TREND_LABELS.insufficient).toBe("Not enough slices");
  });
});

describe("band copy", () => {
  it("sizes the band from the server's noise, never as fixed points", () => {
    const text = bandSentence(thresholds);
    expect(text).toContain("±0.31 at 4 slices");
    expect(text).toContain("SD 0.11");
    expect(text).toContain("narrower with more");
    expect(text).not.toContain("points");
  });

  it("says the band cannot be sized when the server has no noise estimate", () => {
    expect(bandSentence({ ...thresholds, flatBand: null, cutNoiseSd: null })).toContain(
      "cannot be sized yet",
    );
  });
});

describe("learner timeline", () => {
  it("plots one point per scored slice, oldest first, on the 1–4 composite", () => {
    const series = buildLearnerCompositeSeries([session(1, 2.1), session(2, 2.45)]);

    expect(series.map(d => d.value)).toEqual([2.1, 2.45]);
    expect(series[0].key).toContain("#1");
    expect(series[0].group).toBe("Helping-skills score");
  });

  it("carries the slice's scenarios and skill levels for the tooltip", () => {
    const [point] = buildLearnerCompositeSeries([session(1, 2.5, { empathy: 3, verbal: 2 })]);

    expect(point.scenarios).toBe("De-escalation");
    // Rubric order (verbal before empathy), whatever order the server sent.
    expect(point.skills).toBe("Verbal 2 · Empathy 3");
  });

  it("keeps a slice tick inside the Carbon truncation limit", () => {
    expect(sessionTick(session(12, 2.6)).length).toBeLessThanOrEqual(14);
  });

  it("lists only skills that had an opportunity — an absent skill is not a low score", () => {
    expect(skillLevelsText({ rapport: 4 })).toBe("Rapport 4");
    expect(skillLevelsText({})).toBe("");
    expect(skillLevelsText(null)).toBe("");
    // An unknown key still shows rather than vanishing.
    expect(skillLevelsText({ newSkill: 2 })).toBe("newSkill 2");
  });

  it("appends scenarios and skill levels to Carbon's tooltip, escaped", () => {
    const [point] = buildLearnerCompositeSeries([
      { ...session(1, 2.5, { empathy: 3 }), scenarioTitle: "<b>Grief</b> · Exam stress" },
    ]);
    const html = learnerSliceTooltip([point], "<ul>default</ul>");

    expect(html.startsWith("<ul>default</ul>")).toBe(true);
    expect(html).toContain("Scenarios: &lt;b&gt;Grief&lt;/b&gt; · Exam stress");
    expect(html).toContain("Skill levels: Empathy 3");
    expect(html).not.toContain("<b>Grief</b>");
  });

  it("leaves the default tooltip alone for a datum without slice detail", () => {
    expect(learnerSliceTooltip([{ group: "x", value: 1 }], "<p>d</p>")).toBe("<p>d</p>");
  });

  it("escapes every HTML-significant character", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
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
  it("names both halves and the learner's own band rather than only the change", () => {
    const text = learnerTakeaway(
      {
        trend: "improving",
        delta: 0.4,
        band: 0.22,
        firstWindowMean: 2.1,
        lastWindowMean: 2.5,
        evaluatedSessions: 8,
      },
      thresholds,
    );

    expect(text).toContain("last half of their slices averages 2.50");
    expect(text).toContain("0.40 higher than the first half (2.10)");
    expect(text).toContain("±0.22 for 8 slices");
    expect(text).not.toContain("points");
  });

  it("says how many more slices an unclassified learner needs", () => {
    const text = learnerTakeaway(
      {
        trend: "insufficient",
        delta: null,
        band: null,
        firstWindowMean: null,
        lastWindowMean: null,
        evaluatedSessions: 2,
      },
      thresholds,
    );

    expect(text).toContain("2 scored slices");
    expect(text).toContain("needs 4");
  });

  it("frames a steady learner against noise, not as no change", () => {
    const text = learnerTakeaway(
      {
        trend: "flat",
        delta: 0.05,
        band: 0.27,
        firstWindowMean: 2.4,
        lastWindowMean: 2.45,
        evaluatedSessions: 6,
      },
      thresholds,
    );

    expect(text).toContain("Holding steady");
    expect(text).toContain("inside slice-to-slice noise");
    expect(text).toContain("±0.27");
  });
});

describe("formatting", () => {
  it("signs a delta and uses a real minus glyph", () => {
    expect(formatDelta(0.25)).toBe("+0.25");
    expect(formatDelta(-0.4)).toBe("−0.4");
    expect(formatDelta(0)).toBe("0");
    expect(formatDelta(null)).toBe("—");
  });

  it("prints a learner's band at the server's precision, or a dash", () => {
    expect(formatBand(0.2)).toBe("±0.20");
    expect(formatBand(null)).toBe("—");
  });

  it("falls back through email to an id rather than rendering blank", () => {
    expect(learnerName({ name: "Asha", email: "a@x.com" })).toBe("Asha");
    expect(learnerName({ name: null, email: "a@x.com" })).toBe("a@x.com");
    expect(learnerName({ name: null, email: null, learnerId: 7 })).toBe("Learner 7");
  });

  it("exports the band beside the change for each learner", () => {
    const [row] = learnerTableRows([
      {
        learnerId: 1,
        name: "Asha",
        email: null,
        tenantId: null,
        evaluatedSessions: 8,
        firstWindowMean: 2.1,
        lastWindowMean: 2.5,
        delta: 0.4,
        band: 0.22,
        trend: "improving",
        lastSessionAt: "2026-09-30T10:00:00.000Z",
      },
    ]);
    expect(row).toEqual(["Asha", 8, 2.1, 2.5, "+0.4", "±0.22", "Improving", "2026-09-30"]);
  });
});
