import { describe, expect, it } from "vitest";

import { RoleplayVolumeResponse } from "@types";

import { CONTEXT, PALETTE } from "../chartScales";
import {
  bandLabels,
  buildRoleplayVolumeBars,
  buildRoleplayVolumeScale,
  buildRoleplayVolumeSeries,
  buildRoleplayVolumeTable,
  roleplayVolumeTakeaway,
  sharesSuppressed,
  volumePopulation,
} from "../roleplayVolumeChart";

/** Three bands keep the fixtures readable; the transforms are band-count agnostic. */
const BANDS = [
  { label: "1", minCount: 1, maxCount: 1 },
  { label: "2–5", minCount: 2, maxCount: 5 },
  { label: "6+", minCount: 6, maxCount: null },
];

const response = (overrides: Partial<RoleplayVolumeResponse> = {}): RoleplayVolumeResponse => ({
  bands: BANDS,
  zeroBandLabel: "0",
  minPopulationSize: 5,
  registeredLearners: 100,
  learnersWithAny: 40,
  learnersWithNone: 60,
  learnersByBand: [25, 10, 5],
  totalCompletedRoleplays: 300,
  medianAmongActiveLearners: 2,
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2026-07-29T10:00:00.000Z",
  ...overrides,
});

describe("bandLabels", () => {
  it("puts the zero band first, then the server's bands in order", () => {
    expect(bandLabels(response())).toEqual(["0", "1", "2–5", "6+"]);
  });

  it("returns nothing without a response", () => {
    expect(bandLabels(undefined)).toEqual([]);
  });
});

describe("buildRoleplayVolumeBars", () => {
  it("puts the residual zero band first and flags it", () => {
    const bars = buildRoleplayVolumeBars(response());

    expect(bars.map(b => b.label)).toEqual(["0", "1", "2–5", "6+"]);
    expect(bars.map(b => b.learners)).toEqual([60, 25, 10, 5]);
    expect(bars.map(b => b.zero)).toEqual([true, false, false, false]);
  });

  it("takes shares over the whole learner population, zero band included", () => {
    const bars = buildRoleplayVolumeBars(response());

    expect(bars.map(b => b.share)).toEqual([60, 25, 10, 5]);
    // The bands plus the residual account for everyone; a chart whose parts do
    // not sum to the population is a chart with a missing group.
    expect(bars.reduce((sum, b) => sum + (b.share ?? 0), 0)).toBe(100);
  });

  it("withholds every share when the population is below the server's floor", () => {
    const bars = buildRoleplayVolumeBars(
      response({
        registeredLearners: 4,
        learnersWithAny: 2,
        learnersWithNone: 2,
        learnersByBand: [2, 0, 0],
      }),
    );

    // Counts survive — they leak nothing on their own — and the shares do not.
    expect(bars.map(b => b.learners)).toEqual([2, 2, 0, 0]);
    expect(bars.every(b => b.share === null)).toBe(true);
  });

  it("has no shares to state when there are no learners at all", () => {
    const bars = buildRoleplayVolumeBars(
      response({
        registeredLearners: 0,
        learnersWithAny: 0,
        learnersWithNone: 0,
        learnersByBand: [0, 0, 0],
      }),
    );

    expect(bars.every(b => b.share === null)).toBe(true);
  });

  it("treats a missing band count as zero rather than undefined", () => {
    const bars = buildRoleplayVolumeBars(response({ learnersByBand: [25] }));

    expect(bars.map(b => b.learners)).toEqual([60, 25, 0, 0]);
  });
});

describe("buildRoleplayVolumeSeries", () => {
  it("maps each band to one categorical bar of learner counts", () => {
    const series = buildRoleplayVolumeSeries(buildRoleplayVolumeBars(response()));

    expect(series).toEqual([
      { group: "0", value: 60 },
      { group: "1", value: 25 },
      { group: "2–5", value: 10 },
      { group: "6+", value: 5 },
    ]);
  });
});

describe("buildRoleplayVolumeScale", () => {
  it("greys the zero band and gives every volume band the same accent", () => {
    const scale = buildRoleplayVolumeScale(bandLabels(response()));

    // The zero band is the absence of a volume level, not the lowest one.
    expect(scale["0"]).toBe(CONTEXT.faint);
    // Single measure, category already on the axis — one hue, not a ramp.
    expect(scale["1"]).toBe(PALETTE.blue);
    expect(scale["2–5"]).toBe(PALETTE.blue);
    expect(scale["6+"]).toBe(PALETTE.blue);
  });

  it("survives an empty label list", () => {
    expect(buildRoleplayVolumeScale([])).toEqual({});
  });
});

describe("sharesSuppressed / volumePopulation", () => {
  it("suppresses below the floor and not at or above it", () => {
    expect(sharesSuppressed(response({ registeredLearners: 4 }))).toBe(true);
    expect(sharesSuppressed(response({ registeredLearners: 5 }))).toBe(false);
  });

  it("does not call an empty population suppressed — there is nothing to hide", () => {
    expect(sharesSuppressed(response({ registeredLearners: 0 }))).toBe(false);
    expect(volumePopulation(response({ registeredLearners: 0 }))).toBe(0);
    expect(volumePopulation(undefined)).toBe(0);
  });
});

describe("roleplayVolumeTakeaway", () => {
  it("leads with the never-started share and names the median's basis", () => {
    expect(roleplayVolumeTakeaway(response())).toBe(
      "60% of 100 learners have never completed a roleplay. The median among the 40 who have is 2.",
    );
  });

  it("keeps one decimal on a median that lands between two learners", () => {
    expect(roleplayVolumeTakeaway(response({ medianAmongActiveLearners: 2.5 }))).toContain(
      "is 2.5",
    );
  });

  it("drops the median clause when nobody has completed a roleplay", () => {
    const takeaway = roleplayVolumeTakeaway(
      response({
        learnersWithAny: 0,
        learnersWithNone: 100,
        learnersByBand: [0, 0, 0],
        medianAmongActiveLearners: null,
      }),
    );

    expect(takeaway).toBe("100% of 100 learners have never completed a roleplay.");
  });

  it("states counts and says why there is no percentage below the floor", () => {
    const takeaway = roleplayVolumeTakeaway(
      response({
        registeredLearners: 4,
        learnersWithAny: 3,
        learnersWithNone: 1,
        learnersByBand: [3, 0, 0],
        medianAmongActiveLearners: 1,
      }),
    );

    expect(takeaway).toBe(
      "3 of 4 learners have completed at least one roleplay — too few learners to state a " +
        "percentage. The median among the 3 who have is 1.",
    );
  });

  it("says nothing rather than inventing a finding with no learners", () => {
    expect(roleplayVolumeTakeaway(response({ registeredLearners: 0 }))).toBeNull();
    expect(roleplayVolumeTakeaway(undefined)).toBeNull();
  });
});

describe("buildRoleplayVolumeTable", () => {
  it("carries the count next to the share and marks the residual band", () => {
    const table = buildRoleplayVolumeTable(buildRoleplayVolumeBars(response()));

    expect(table.columns).toEqual([
      "Roleplays completed (lifetime)",
      "Learners",
      "Share of learners (%)",
    ]);
    expect(table.rows[0]).toEqual(["0 (never started)", 60, 60]);
    expect(table.rows[3]).toEqual(["6+", 5, 5]);
  });

  it("keeps the rows when the shares are withheld", () => {
    const table = buildRoleplayVolumeTable(
      buildRoleplayVolumeBars(
        response({
          registeredLearners: 3,
          learnersWithAny: 1,
          learnersWithNone: 2,
          learnersByBand: [1, 0, 0],
        }),
      ),
    );

    expect(table.rows[0]).toEqual(["0 (never started)", 2, null]);
    expect(table.rows).toHaveLength(4);
  });
});
