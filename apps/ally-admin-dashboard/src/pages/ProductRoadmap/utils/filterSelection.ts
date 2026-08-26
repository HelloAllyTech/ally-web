/**
 * Translation between the board's filter state and the shape FilterDropdown speaks.
 *
 * WHY THIS EXISTS: the six checkbox facets used to render as ~19 always-visible pills in a
 * wrapping row three lines deep — the exact failure RoadmapAdvancedFilters' docblock predicted for
 * inline chip groups, and past the point where extra controls read as information at all (Stacks:
 * "Signal Overload Creates Noise"). They now live behind the admin app's standard FilterDropdown,
 * which speaks one flat shape: every section is `string[]`, keyed by section id.
 *
 * The board's own state is not that shape — three facets are enums, two are name arrays, and
 * creator is `number[]`. Converting in a pure module (rather than inline in the component) keeps it
 * testable without pulling Carbon or `@components` into the test's module graph, which is the same
 * reason utils/filters.ts and utils/coins.ts exist.
 */
import {
  RoadmapFacets,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapTaxonomyItem,
} from "@types";

import { SOURCE_LABEL, STAGE_LABEL, typeLabel } from "./stages";

/**
 * The popover's shape. Keys are the section ids FilterDropdown round-trips, and are deliberately
 * the API's own field names (`productGoal`, not `goal`) so a reader can line a chip up against a
 * request without a lookup table.
 */
export interface RoadmapFacetSelection {
  type: string[];
  stage: string[];
  source: string[];
  productGoal: string[];
  owner: string[];
  createdBy: string[];
}

/** The board's live filter state, in its own native types. */
export interface RoadmapFacetState {
  typeFilter: RoadmapOpportunityType[];
  stageFilter: RoadmapOpportunityStage[];
  sourceFilter: RoadmapOpportunitySource[];
  goalFilter: string[];
  ownerFilter: string[];
  createdBy: number[];
}

export const EMPTY_FACET_STATE: RoadmapFacetState = {
  typeFilter: [],
  stageFilter: [],
  sourceFilter: [],
  goalFilter: [],
  ownerFilter: [],
  createdBy: [],
};

/** One selectable option, matching `RequestFilterOption` in `@components/types` structurally. */
export interface RoadmapFacetOption {
  label: string;
  value: string;
}

/** One popover section, matching `FilterSectionConfig` structurally. */
export interface RoadmapFacetSection {
  id: keyof RoadmapFacetSelection;
  label: string;
  options: RoadmapFacetOption[];
}

export const toFacetSelection = (state: RoadmapFacetState): RoadmapFacetSelection => ({
  type: [...state.typeFilter],
  stage: [...state.stageFilter],
  source: [...state.sourceFilter],
  productGoal: [...state.goalFilter],
  owner: [...state.ownerFilter],
  createdBy: state.createdBy.map(String),
});

export const fromFacetSelection = (selection: RoadmapFacetSelection): RoadmapFacetState => ({
  typeFilter: selection.type as RoadmapOpportunityType[],
  stageFilter: selection.stage as RoadmapOpportunityStage[],
  sourceFilter: selection.source as RoadmapOpportunitySource[],
  goalFilter: [...selection.productGoal],
  ownerFilter: [...selection.owner],
  // A non-numeric id can only arrive from a corrupted saved view; dropping it beats sending NaN,
  // which the API rejects with a 400 that reads as "filtering is broken".
  createdBy: selection.createdBy.map(Number).filter(Number.isFinite),
});

/**
 * Fold what the popover emitted onto what was already applied.
 *
 * NOT a plain spread of the emitted object. FilterDropdown derives its result by iterating the
 * `sections` it was GIVEN, so a section omitted because its options hadn't loaded yet — owner and
 * creator both come from GET /facets, and goals from their own query — is simply absent from the
 * result. Spreading that directly would clear an active owner filter the moment someone applied a
 * type filter, and four of the saved views migrated from production are defined ENTIRELY by
 * ownerFilter, so they would appear to silently stop working.
 */
export const mergeFacetSelection = (
  current: RoadmapFacetSelection,
  patch: Partial<RoadmapFacetSelection>,
): RoadmapFacetSelection => {
  const merged = { ...current };
  (Object.keys(merged) as (keyof RoadmapFacetSelection)[]).forEach(key => {
    const next = patch[key];
    if (Array.isArray(next)) merged[key] = next;
  });
  return merged;
};

/**
 * The popover's sections, in the order they are read.
 *
 * Type/Stage/Source come from enums so they are always offered. Goal, Owner and Filed-by are
 * data-driven and OMITTED when empty rather than shown as a dead end — see mergeFacetSelection for
 * why omitting a section cannot be allowed to clear it.
 *
 * Owner and creator options come from GET /facets, never from the loaded page: with a 50-row limit
 * the page rarely contains every owner, and an option list that shrinks as you filter is worse
 * than no filter at all.
 */
export const buildFacetSections = (
  goals: RoadmapTaxonomyItem[],
  facets?: RoadmapFacets,
): RoadmapFacetSection[] => {
  const sections: RoadmapFacetSection[] = [
    // No "Type" facet. It offered Idea and Bug, and bugs are no longer listed on
    // this board at all (they live in Bug Hunter) — so one option matched
    // everything and the other matched nothing. A filter whose every setting is
    // either a no-op or an empty table is worse than no filter.
    //
    // `typeFilter` itself survives in RoadmapViewState because saved views
    // migrated from the standalone app carry it; normaliseTypeFilter in views.ts
    // strips 'bug' on read so such a view shows the board rather than nothing.
    {
      id: "stage",
      label: "Stage",
      options: Object.values(RoadmapOpportunityStage).map(value => ({
        label: STAGE_LABEL[value] ?? value,
        value,
      })),
    },
    {
      id: "source",
      label: "Source",
      options: Object.values(RoadmapOpportunitySource).map(value => ({
        label: SOURCE_LABEL[value] ?? value,
        value,
      })),
    },
  ];

  if (goals.length) {
    sections.push({
      id: "productGoal",
      label: "Goal",
      options: goals.map(goal => ({ label: goal.name, value: goal.name })),
    });
  }

  if (facets?.owners?.length) {
    sections.push({
      id: "owner",
      label: "Owner",
      options: facets.owners.map(owner => ({ label: owner, value: owner })),
    });
  }

  if (facets?.creators?.length) {
    sections.push({
      id: "createdBy",
      label: "Filed by",
      options: facets.creators.map(creator => ({
        label: creator.name || creator.email,
        value: String(creator.id),
      })),
    });
  }

  return sections;
};

/** An applied facet, summarised for the chip row. */
export interface RoadmapFilterChip {
  id: keyof RoadmapFacetSelection;
  /** The facet's name, e.g. "Stage". */
  label: string;
  /** Display names of the selected values, e.g. ["In development"]. */
  values: string[];
}

/**
 * What is currently narrowing the list, as one chip per active facet.
 *
 * THE CHIPS ARE NOT DECORATION. Moving these filters behind a popover is only safe because what is
 * applied stays on screen: a hidden filter is how someone concludes the board is broken — rows are
 * missing and nothing explains why. This is the same reasoning as the count badge on the collapsed
 * range panel, applied to the facets.
 *
 * Values are rendered through their display labels rather than raw wire values, so a stage chip
 * reads "In development" and not "under_development". An id or value with no known label falls
 * back to itself rather than being dropped — a chip that cannot be named is still a chip that has
 * to be visible.
 */
export const describeActiveFacets = (
  state: RoadmapFacetState,
  facets?: RoadmapFacets,
): RoadmapFilterChip[] => {
  const creatorName = (id: number): string => {
    const match = facets?.creators?.find(creator => creator.id === id);
    return match ? match.name || match.email : String(id);
  };

  const chips: RoadmapFilterChip[] = [
    { id: "type", label: "Type", values: state.typeFilter.map(typeLabel) },
    {
      id: "stage",
      label: "Stage",
      values: state.stageFilter.map(stage => STAGE_LABEL[stage] ?? stage),
    },
    {
      id: "source",
      label: "Source",
      values: state.sourceFilter.map(source => SOURCE_LABEL[source] ?? source),
    },
    { id: "productGoal", label: "Goal", values: [...state.goalFilter] },
    { id: "owner", label: "Owner", values: [...state.ownerFilter] },
    { id: "createdBy", label: "Filed by", values: state.createdBy.map(creatorName) },
  ];

  return chips.filter(chip => chip.values.length > 0);
};

/**
 * How many facet GROUPS are applied — the badge on the Filter button.
 *
 * Groups, not values: someone who ticked three owners has applied one filter ("owner is one of
 * these three"), and reporting "3" would suggest three independent narrowings.
 */
export const countActiveFacets = (state: RoadmapFacetState): number =>
  describeActiveFacets(state).length;
