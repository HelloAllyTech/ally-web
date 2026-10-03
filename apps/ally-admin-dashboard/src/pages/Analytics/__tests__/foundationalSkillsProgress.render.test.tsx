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
import { SimpleBarChart, StackedBarChart } from "@carbon/charts-react";
import { render } from "@testing-library/react";

import { hBarOpts } from "../chartKit";
import {
  DIRECTION_SCALE,
  FhsProgressSkill,
  LEVEL_SCALE,
  OPPORTUNITY_SCALE,
  buildLevelMix,
  buildOpportunity,
  buildSkillChange,
  buildWhoMoved,
} from "../foundationalSkillsProgressChart";
import { SkillCutGrid } from "../SkillCutGrid";

/**
 * Carbon options are opaque to the typechecker: a wrong `mapsTo`, or a colour
 * scale whose keys don't match the groups, typechecks and then throws at render.
 * The Skills tab builds its horizontal stacked options locally (the kit has no
 * horizontal stacked factory), so these mirror that shape exactly.
 */
const skills: FhsProgressSkill[] = ["verbal", "goals", "feedback"].map((key, i) => ({
  skill: key,
  name: key,
  tier: "engage",
  pairedLearners: 24,
  earlyAvg: 2,
  lateAvg: 2 + i * 0.2 - 0.2,
  change: i * 0.2 - 0.2,
  improved: i * 3,
  unchanged: 20 - i * 3,
  declined: 4,
  levelMix: {
    early: { assessments: 40, levels: [10, 20, 8, 2] },
    late: { assessments: 40, levels: [5, 20, 10, 5] },
  },
  opportunityCuts: 100,
  opportunityPct: 50 + i * 10,
}));

const hStacked = (colorScale: Record<string, string>, domain?: [number, number]) => ({
  height: "300px",
  axes: {
    left: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: "" },
    bottom: {
      mapsTo: "value",
      scaleType: ScaleTypes.LINEAR,
      stacked: true,
      title: "x",
      ...(domain ? { domain } : { includeZero: true }),
    },
  },
  color: { scale: colorScale },
  legend: { enabled: true },
  toolbar: { enabled: false },
});

describe("Skills sub-tab charts render", () => {
  it("renders per-skill change as horizontal bars with a per-skill direction scale", () => {
    const { data, scale } = buildSkillChange(skills, 0.1);
    const { container } = render(
      <SimpleBarChart
        data={data}
        options={hBarOpts({ bottomTitle: "Change", colorScale: scale })}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders who moved as horizontal stacked bars", () => {
    const { container } = render(
      <StackedBarChart data={buildWhoMoved(skills)} options={hStacked(DIRECTION_SCALE)} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders the level mix as 100% horizontal stacks", () => {
    const { container } = render(
      <StackedBarChart
        data={buildLevelMix(skills, "late")}
        options={hStacked(LEVEL_SCALE, [0, 100])}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders opportunity as single-series horizontal bars keyed by skill", () => {
    const opts = {
      ...hStacked(OPPORTUNITY_SCALE, [0, 100]),
      axes: {
        left: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: "" },
        bottom: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: "x", domain: [0, 100] },
      },
      legend: { enabled: false },
    };
    const { container } = render(<SimpleBarChart data={buildOpportunity(skills)} options={opts} />);
    expect(container.querySelector("svg")).toBeTruthy();
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
    expect(getByText("Verbal communication")).toBeTruthy();
    expect(getByText("Engage")).toBeTruthy();
    expect(getAllByText("2.50")).toHaveLength(3);
    expect(getByText("—").getAttribute("title")).toBe("n = 3");
  });
});
