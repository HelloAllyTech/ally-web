import { describe, expect, it, vi } from "vitest";

/**
 * d3 captures `requestAnimationFrame` at import time and its transition
 * callbacks touch SVG `.baseVal`, which jsdom does not implement — so the stub
 * has to be hoisted above the Carbon imports below. A `beforeAll` lands too
 * late. (Same block as testingCharts.render.test.tsx; it is copied rather than
 * shared because a helper module would import after the hoist.)
 */
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

import { LineChart, StackedBarChart } from "@carbon/charts-react";
import { render } from "@testing-library/react";

import { lineOpts, stackedBarOpts } from "../chartKit";
import {
  KNOWLEDGE_SCALE,
  LEARNER_SCALE,
  TREND_SCALE,
  buildKnowledgeSeries,
  buildLearnerCompositeSeries,
  buildSkillCoverageSeries,
  buildTrendMixSeries,
  skillCoverageScale,
} from "../skillGrowthChart";

/**
 * These assert only that the chart renders an `<svg>`.
 *
 * That is worth a test because a Carbon options object is opaque to the
 * typechecker: a wrong `mapsTo`, a scale type that does not match the series,
 * or a colour scale whose keys do not match the group names all typecheck
 * cleanly and then throw at render — in the browser, on the leadership tab.
 */
const sessions = [
  {
    ordinal: 1,
    occurredAt: "2026-01-05T10:00:00.000Z",
    scenarioTitle: "De-escalation",
    compositeScore: 40,
    skillCoverage: [
      { category: "Listening Engagement", percentage: 34 },
      { category: "Emotional Attunement", percentage: 42 },
    ],
  },
  {
    ordinal: 2,
    occurredAt: "2026-01-19T10:00:00.000Z",
    scenarioTitle: "De-escalation",
    compositeScore: 55,
    // No payload: the coverage series must carry nulls here, and Carbon must
    // still render rather than choking on the gap.
    skillCoverage: null,
  },
];

describe("skill growth charts render", () => {
  it("renders the learner composite line", () => {
    const data = buildLearnerCompositeSeries(sessions);
    const { container } = render(
      <LineChart
        data={data}
        options={lineOpts({
          leftTitle: "Composite score",
          colorScale: LEARNER_SCALE,
          domain: [0, 100],
        })}
      />,
    );

    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders the per-skill lines with a discovered colour scale and null gaps", () => {
    const data = buildSkillCoverageSeries(sessions);
    const categories = ["Listening Engagement", "Emotional Attunement"];
    const { container } = render(
      <LineChart
        data={data}
        options={lineOpts({
          leftTitle: "Skill %",
          colorScale: skillCoverageScale(categories),
          domain: [0, 100],
        })}
      />,
    );

    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders the improvement mix as a stacked bar", () => {
    const data = buildTrendMixSeries([
      { month: "2026-01", improving: 3, flat: 1, declining: 0 },
      { month: "2026-02", improving: 1, flat: 0, declining: 2 },
    ]);
    const { container } = render(
      <StackedBarChart
        data={data}
        options={stackedBarOpts({ leftTitle: "Learners", colorScale: TREND_SCALE })}
      />,
    );

    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders the knowledge series", () => {
    const data = buildKnowledgeSeries([
      {
        kind: "quiz",
        itemTitle: "Foundations",
        scorePct: 40,
        attemptNumber: 1,
        submittedAt: "2026-04-10T12:00:00.000Z",
      },
      {
        kind: "annotation",
        itemTitle: "Mark the cues",
        scorePct: 72,
        attemptNumber: 1,
        submittedAt: "2026-06-15T12:00:00.000Z",
      },
    ]);
    const { container } = render(
      <LineChart
        data={data}
        options={lineOpts({
          leftTitle: "Score %",
          colorScale: KNOWLEDGE_SCALE,
          domain: [0, 100],
        })}
      />,
    );

    expect(container.querySelector("svg")).toBeTruthy();
  });
});
