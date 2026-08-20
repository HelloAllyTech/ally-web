import { describe, expect, it } from "vitest";

import {
  RoadmapFacets,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

import {
  EMPTY_FACET_STATE,
  RoadmapFacetState,
  buildFacetSections,
  countActiveFacets,
  describeActiveFacets,
  fromFacetSelection,
  mergeFacetSelection,
  toFacetSelection,
} from "../utils/filterSelection";

const state = (patch: Partial<RoadmapFacetState> = {}): RoadmapFacetState => ({
  ...EMPTY_FACET_STATE,
  ...patch,
});

const facets: RoadmapFacets = {
  creators: [
    { id: 7, email: "sandeep@helloally.ai", name: "Sandeep Malhotra" },
    { id: 9, email: "nameless@helloally.ai", name: "" },
  ],
  goals: ["Reliability & Trust"],
  owners: ["Ajey Gore", "Sandeep Malhotra"],
};

describe("toFacetSelection / fromFacetSelection", () => {
  it("round-trips a selection without changing it", () => {
    const original = state({
      typeFilter: [RoadmapOpportunityType.BUG],
      stageFilter: [RoadmapOpportunityStage.RELEASED],
      sourceFilter: [RoadmapOpportunitySource.CONSUMER],
      goalFilter: ["Reliability & Trust"],
      ownerFilter: ["Ajey Gore"],
      createdBy: [7],
    });

    expect(fromFacetSelection(toFacetSelection(original))).toEqual(original);
  });

  it("carries creator ids across the string boundary as numbers", () => {
    // The popover speaks string[] for every section, so ids leave as "7" and must come back as 7 —
    // the API's @IsInt rejects the string.
    expect(toFacetSelection(state({ createdBy: [7, 9] })).createdBy).toEqual(["7", "9"]);
    expect(fromFacetSelection({ ...toFacetSelection(state({ createdBy: [7] })) }).createdBy).toEqual(
      [7],
    );
  });

  it("drops a non-numeric creator id rather than sending NaN", () => {
    // Only reachable from a corrupted saved view. NaN in the query string is a 400 that reads to
    // the user as "filtering is broken", which is worse than quietly ignoring one bad id.
    const selection = { ...toFacetSelection(state()), createdBy: ["7", "not-an-id"] };
    expect(fromFacetSelection(selection).createdBy).toEqual([7]);
  });
});

/**
 * The bug this guards is the reason mergeFacetSelection exists. FilterDropdown builds its result by
 * iterating the sections it was GIVEN, and owner/goal/creator sections are omitted while their
 * options are still loading. Spreading that result directly would clear an active owner filter the
 * moment someone applied a type filter — and four of the saved views migrated from production are
 * defined ENTIRELY by ownerFilter, so those tabs would look like they had silently stopped working.
 */
describe("mergeFacetSelection", () => {
  const current = toFacetSelection(
    state({ ownerFilter: ["Ajey Gore"], stageFilter: [RoadmapOpportunityStage.NEW] }),
  );

  it("keeps a facet the popover did not report on", () => {
    const merged = mergeFacetSelection(current, { type: [RoadmapOpportunityType.BUG] });

    expect(merged.owner).toEqual(["Ajey Gore"]);
    expect(merged.stage).toEqual([RoadmapOpportunityStage.NEW]);
    expect(merged.type).toEqual([RoadmapOpportunityType.BUG]);
  });

  it("applies an explicitly emptied facet, which is how a section gets cleared", () => {
    // The distinction that matters: absent means "no opinion", [] means "cleared". Treating them
    // the same in either direction makes one of the two operations impossible.
    expect(mergeFacetSelection(current, { owner: [] }).owner).toEqual([]);
  });

  it("ignores a non-array value instead of writing it through", () => {
    const merged = mergeFacetSelection(current, { owner: undefined });
    expect(merged.owner).toEqual(["Ajey Gore"]);
  });
});

describe("buildFacetSections", () => {
  it("always offers the three enum-backed facets", () => {
    const ids = buildFacetSections([], undefined).map(section => section.id);
    expect(ids).toEqual(["type", "stage", "source"]);
  });

  it("adds the data-driven facets once their options exist", () => {
    const sections = buildFacetSections(
      [{ id: "g1", name: "Reliability & Trust", position: 0 }],
      facets,
    );

    expect(sections.map(s => s.id)).toEqual([
      "type",
      "stage",
      "source",
      "productGoal",
      "owner",
      "createdBy",
    ]);
  });

  it("labels options for reading, not with wire values", () => {
    const stage = buildFacetSections([], undefined).find(s => s.id === "stage");
    expect(stage?.options).toContainEqual({
      label: "In development",
      value: RoadmapOpportunityStage.UNDER_DEVELOPMENT,
    });
  });

  it("falls back to a creator's email when they have no name", () => {
    const createdBy = buildFacetSections([], facets).find(s => s.id === "createdBy");
    expect(createdBy?.options).toEqual([
      { label: "Sandeep Malhotra", value: "7" },
      { label: "nameless@helloally.ai", value: "9" },
    ]);
  });
});

/**
 * The chips are what makes hiding these filters behind a popover safe: an applied filter that is
 * narrowing the list with nothing on screen to say so is how someone concludes the board is broken.
 */
describe("describeActiveFacets", () => {
  it("says nothing when nothing is applied", () => {
    expect(describeActiveFacets(state())).toEqual([]);
    expect(countActiveFacets(state())).toBe(0);
  });

  it("names a stage by its label rather than its wire value", () => {
    const chips = describeActiveFacets(
      state({ stageFilter: [RoadmapOpportunityStage.UNDER_DEVELOPMENT] }),
    );
    expect(chips).toEqual([{ id: "stage", label: "Stage", values: ["In development"] }]);
  });

  it("resolves creator ids to names, and keeps an unresolvable one visible", () => {
    // A creator whose Ally account was deleted is missing from GET /facets. The filter is still
    // applied and still hiding rows, so dropping the chip would hide the reason the list is short.
    const chips = describeActiveFacets(state({ createdBy: [7, 404] }), facets);
    expect(chips).toEqual([
      { id: "createdBy", label: "Filed by", values: ["Sandeep Malhotra", "404"] },
    ]);
  });

  it("counts groups rather than values", () => {
    // Three owners is one narrowing ("owner is one of these three"), not three.
    const applied = state({
      ownerFilter: ["Ajey Gore", "Sandeep Malhotra", "Gopikrishnan Sasikumar"],
      typeFilter: [RoadmapOpportunityType.BUG],
    });
    expect(countActiveFacets(applied)).toBe(2);
  });

  it("orders chips the way the popover lists its sections", () => {
    const applied = state({
      createdBy: [7],
      typeFilter: [RoadmapOpportunityType.BUG],
      ownerFilter: ["Ajey Gore"],
    });
    expect(describeActiveFacets(applied, facets).map(chip => chip.id)).toEqual([
      "type",
      "owner",
      "createdBy",
    ]);
  });
});
