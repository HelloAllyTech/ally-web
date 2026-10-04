import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  FhsBehaviourRate,
  FoundationalSkillsBehavioursResponse,
  behaviourShort,
  countRate,
  countText,
  habitRows,
  habitsTakeaway,
  rateCellStyle,
  trackabilityLabel,
} from "../foundationalSkillsHabits";
import { HabitGrid } from "../HabitGrid";

const rate = (
  code: string,
  extra: Partial<FhsBehaviourRate> = {},
  change: Partial<FhsBehaviourRate["change"]> = {},
): FhsBehaviourRate => ({
  code,
  skill: code.split(".")[0],
  kind: code.includes(".u") ? "unhelpful" : code.includes(".a") ? "advanced" : "basic",
  text: `text of ${code}`,
  learnersWithChance: 74,
  ratePct: 40,
  icc: 0.2,
  trackable: true,
  change: {
    n: 26,
    startPct: 40,
    nowPct: 45,
    changePts: 5,
    ciPts: [-5, 15],
    up: 10,
    down: 8,
    signP: 0.8,
    q: 1,
    credible: false,
    learnersAdopted: 0,
    learnersDropped: 0,
    ...change,
  },
  ...extra,
});

const data = (
  behaviours: FhsBehaviourRate[],
  over: Partial<FoundationalSkillsBehavioursResponse> = {},
): FoundationalSkillsBehavioursResponse => ({
  rubricVersion: "fhs-text-v1",
  minSampleSize: 20,
  thresholds: { minCuts: 4, trackableIcc: 0.1, groupQ: 0.05, learnerP: 0.05, gridBehaviours: 10 },
  measuredLearners: 74,
  comparableLearners: 26,
  behaviours,
  gridCodes: ["rapport.b1", "hope.b2"],
  learners: [],
  provenance: { derivation: "", note: "" },
  computedAt: "2026-10-04T00:00:00Z",
  ...over,
});

describe("habit helpers", () => {
  it("filters habit rows by kind and trackability, biggest move first, dropping withheld ones", () => {
    const bs = [
      rate("rapport.b1", {}, { changePts: -2 }),
      rate("hope.b2", {}, { changePts: 9 }),
      rate("verbal.b1", { trackable: false, icc: 0.01 }, { changePts: 12 }),
      rate("verbal.u1", {}, { changePts: -20 }),
      rate("coping.b1", {}, { changePts: null }),
    ];
    expect(habitRows(bs, "trackable").map(b => b.code)).toEqual(["hope.b2", "rapport.b1"]);
    expect(habitRows(bs, "helpful").map(b => b.code)).toEqual([
      "verbal.b1",
      "hope.b2",
      "rapport.b1",
    ]);
    expect(habitRows(bs, "unhelpful").map(b => b.code)).toEqual(["verbal.u1"]);
    expect(habitRows(bs, "all")).toHaveLength(4);
  });

  it("says whether a behaviour is a personal habit", () => {
    expect(trackabilityLabel({ icc: 0.464, trackable: true })).toBe("ICC 0.46 · a personal habit");
    expect(trackabilityLabel({ icc: 0.03, trackable: false })).toBe(
      "ICC 0.03 · not person-specific",
    );
    expect(trackabilityLabel({ icc: null, trackable: false })).toBe(
      "too few repeat chances to tell",
    );
  });

  it("shortens column headers and shades rates on one hue", () => {
    expect(behaviourShort("rapport.b1", "Introduces self and explains their role")).toBe(
      "Introduces self",
    );
    expect(behaviourShort("x.b9", "A very long behaviour description indeed")).toBe(
      "A very long behaviour…",
    );
    expect(rateCellStyle(null).background).toBe("transparent");
    expect(rateCellStyle(0.9).color).toBe("#ffffff");
    expect(countText({ hits: 3, chances: 7 })).toBe("3/7");
    expect(countText({ hits: 0, chances: 0 })).toBe("—");
    expect(countRate({ hits: 3, chances: 6 })).toBe(0.5);
  });

  it("writes an honest takeaway when nothing clears the correction", () => {
    expect(habitsTakeaway(data([rate("rapport.b1"), rate("hope.b2", { trackable: false })]))).toBe(
      "No behaviour changed beyond chance across 26 learners (2 tested, corrected). 1 behaviours are personal habits worth tracking.",
    );
    expect(
      habitsTakeaway(
        data([rate("rapport.b1", {}, { credible: true, changePts: 20 }), rate("hope.b2")]),
      ),
    ).toBe("1 behaviour(s) changed beyond chance (1 up, 0 down) across 26 learners.");
  });
});

describe("HabitGrid", () => {
  it("renders counts as text, marks clear changes, and opens a learner", () => {
    const onOpen = vi.fn();
    const d = data(
      [rate("rapport.b1", { text: "Introduces self and explains their role" }), rate("hope.b2")],
      {
        learners: [
          {
            id: 7,
            name: "Asha",
            tenantId: null,
            cuts: 8,
            comparable: true,
            behaviours: [
              {
                code: "rapport.b1",
                all: { hits: 5, chances: 8 },
                start: { hits: 0, chances: 4 },
                now: { hits: 4, chances: 4 },
                p: 0.029,
                clear: "adopted",
              },
            ],
          },
        ],
      },
    );
    const { getByText, getAllByText } = render(
      <HabitGrid data={d} learners={d.learners} onOpen={onOpen} />,
    );
    expect(getByText("Introduces self")).toBeTruthy();
    expect(getByText("5/8")).toBeTruthy();
    expect(getByText("▲")).toBeTruthy();
    expect(getAllByText("—").length).toBeGreaterThan(0); // hope.b2: no chance yet
    fireEvent.click(getByText("Asha"));
    expect(onOpen).toHaveBeenCalledWith(7);
  });
});
