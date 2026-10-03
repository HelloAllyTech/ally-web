import { describe, expect, it, vi } from "vitest";

/**
 * d3 captures `requestAnimationFrame` at import time and its transition
 * callbacks touch SVG `.baseVal`, which jsdom does not implement — so the stub
 * is hoisted above the Carbon imports (same block as the other render tests).
 */
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

import { ScaleTypes } from "@carbon/charts";
import { AreaChart, StackedBarChart } from "@carbon/charts-react";
import { render } from "@testing-library/react";

import { BenchmarkSlope } from "../BenchmarkSlope";
import { ChangeWhiskers } from "../ChangeWhiskers";
import { lineOpts } from "../chartKit";
import {
  COMPOSITE_SCALE,
  FhsProgressSkill,
  FoundationalSkillsBenchmarkResponse,
  OPPORTUNITY_SCALE,
  buildCompositeBand,
  buildOpportunity,
} from "../foundationalSkillsProgressChart";
import { SkillCutGrid } from "../SkillCutGrid";

/**
 * Carbon options are opaque to the typechecker: a wrong `mapsTo`, a bounds key
 * that does not match the data, or a colour scale whose keys do not match the
 * groups all typecheck and then throw at render. These mirror the tab's shapes.
 */
const skills = ["verbal", "harm"].map(
  (key, i): FhsProgressSkill => ({
    skill: key,
    name: key,
    tier: "engage",
    measurability: i ? "rare" : "measurable",
    earlyAvg: 2,
    lateAvg: 2.1,
    n: 24,
    change: 0.1,
    ci: [-0.1, 0.3],
    up: 10,
    down: 6,
    tied: 8,
    signP: 0.45,
    detectable: false,
    levelMix: {
      early: { assessments: 40, levels: [10, 20, 8, 2] },
      late: { assessments: 40, levels: [5, 20, 10, 5] },
    },
    opportunityCuts: 100,
    opportunityPct: 50,
    learnersWithOpportunity: 60 - i * 30,
    learnersWithTwoPlus: 40 - i * 30,
  }),
);

describe("Helping skills charts render", () => {
  it("renders the overall score as a bounded area with a 95% band", () => {
    const data = buildCompositeBand([
      {
        cut: 1,
        learners: 24,
        composite: 2.25,
        compositeCi: [2.15, 2.35],
        unhelpfulPct: null,
        unhelpfulCi: null,
        tiers: [],
        skills: [],
      },
      {
        cut: 2,
        learners: 24,
        composite: 2.35,
        compositeCi: [2.25, 2.45],
        unhelpfulPct: null,
        unhelpfulCi: null,
        tiers: [],
        skills: [],
      },
    ]);
    const { container } = render(
      <AreaChart
        data={data}
        options={lineOpts({
          leftTitle: "Average level",
          colorScale: COMPOSITE_SCALE,
          domain: [1, 4],
          legend: false,
          extra: { bounds: { upperBoundMapsTo: "max", lowerBoundMapsTo: "min" } },
        })}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders learners-with-a-chance as horizontal stacked bars", () => {
    const { container } = render(
      <StackedBarChart
        data={buildOpportunity(skills, 74)}
        options={{
          height: "300px",
          axes: {
            left: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: "" },
            bottom: {
              mapsTo: "value",
              scaleType: ScaleTypes.LINEAR,
              stacked: true,
              title: "Learners",
              includeZero: true,
            },
          },
          color: { scale: OPPORTUNITY_SCALE },
          legend: { enabled: true },
          toolbar: { enabled: false },
        }}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders change whiskers with the value and interval in text", () => {
    const { getByText } = render(
      <ChangeWhiskers
        rows={[
          {
            key: "verbal",
            label: "Verbal communication",
            change: 0.13,
            ci: [-0.23, 0.48],
            n: 24,
            detectable: false,
          },
          { key: "harm", label: "Harm", change: null, ci: null, n: 1, detectable: false },
        ]}
      />,
    );
    expect(getByText("Verbal communication")).toBeTruthy();
    expect(getByText(/−0\.23 to \+0\.48/)).toBeTruthy();
    expect(getByText(/too few learners \(n = 1\)/)).toBeTruthy();
  });

  it("renders the benchmark slope chart with the averages labelled", () => {
    const bench: FoundationalSkillsBenchmarkResponse = {
      rubricVersion: "fhs-text-v1",
      minSampleSize: 20,
      scoreDomain: [1, 4],
      minLearnerChars: 1500,
      minCutsBetween: 3,
      scenarios: [{ id: 1, title: "Benchmark", sessionsScored: 4 }],
      coverage: {
        sessionsScored: 4,
        sessionsSkipped: 0,
        sessionsFailed: 0,
        sessionsPending: 0,
        learnersWithOne: 0,
        learnersPaired: 2,
      },
      summary: {
        learners: 2,
        firstAvg: 2.2,
        latestAvg: 2.5,
        change: 0.3,
        changeCi: [0.1, 0.5],
        up: 2,
        down: 0,
        tied: 0,
        signP: 0.5,
        detectable: true,
      },
      skills: [],
      learners: [1, 2].map(id => ({
        id,
        name: null,
        tenantId: null,
        scenarioId: 1,
        first: {
          sessionId: `a${id}`,
          endedAt: "2026-10-01T00:00:00Z",
          cutsBefore: 0,
          composite: 2.2,
        },
        latest: {
          sessionId: `b${id}`,
          endedAt: "2026-10-20T00:00:00Z",
          cutsBefore: 5,
          composite: 2.5,
        },
        change: 0.3,
      })),
      computedAt: "2026-10-21T00:00:00Z",
    };
    const { container, getByText } = render(<BenchmarkSlope data={bench} />);
    expect(container.querySelectorAll("line").length).toBeGreaterThan(4);
    expect(getByText("2.20")).toBeTruthy();
    expect(getByText("2.50")).toBeTruthy();
  });

  it("renders the skill × cut grid with values as text and dashes for blanks", () => {
    const { getByText, getAllByText } = render(
      <SkillCutGrid
        rows={[
          { key: "verbal", label: "Verbal communication", group: "Engage" },
          { key: "goals", label: "Collaborative goal-setting", group: "Support" },
        ]}
        cuts={[1, 2]}
        cell={(s, c) =>
          s === "goals" && c === 2 ? { value: null, title: "n = 3" } : { value: 2.5 }
        }
      />,
    );
    expect(getByText("Engage")).toBeTruthy();
    expect(getAllByText("2.50")).toHaveLength(3);
    expect(getAllByText("—").find(el => el.getAttribute("title") === "n = 3")).toBeTruthy();
  });
});
