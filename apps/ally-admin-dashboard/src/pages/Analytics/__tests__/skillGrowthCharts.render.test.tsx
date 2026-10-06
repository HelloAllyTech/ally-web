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
  buildTrendMixSeries,
  learnerSliceTooltip,
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
    compositeScore: 2.1,
    skillCoverage: null,
    skillLevels: { verbal: 2, empathy: 2 },
    hasUnhelpfulBehaviour: true,
  },
  {
    ordinal: 3,
    occurredAt: "2026-01-19T10:00:00.000Z",
    scenarioTitle: "De-escalation · Exam stress",
    compositeScore: 2.55,
    skillCoverage: null,
    skillLevels: { verbal: 3 },
    hasUnhelpfulBehaviour: false,
  },
];

describe("skill growth charts render", () => {
  it("renders the learner slice line on the 1–4 scale with the slice tooltip", () => {
    const data = buildLearnerCompositeSeries(sessions);
    const { container } = render(
      <LineChart
        data={data}
        options={lineOpts({
          leftTitle: "Helping-skills score (1–4)",
          colorScale: LEARNER_SCALE,
          domain: [1, 4],
          extra: { tooltip: { customHTML: learnerSliceTooltip } },
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

  it("renders the knowledge series on its own 0–100 scale", () => {
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
