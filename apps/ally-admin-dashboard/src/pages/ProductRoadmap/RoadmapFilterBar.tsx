import React, { useRef, useState } from "react";

import { Close } from "@icons";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { Button, FilterDropdown, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import {
  RoadmapFacets,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapTaxonomyItem,
} from "@types";

import { RoadmapAdvancedFilters } from "./RoadmapAdvancedFilters";
import {
  EMPTY_ADVANCED_FILTERS,
  RoadmapAdvancedFilterValues,
  countActiveAdvancedFilters,
  countActiveRangeFilters,
} from "./utils/filters";
import {
  FacetPresentationOpts,
  RoadmapFacetSelection,
  RoadmapFacetState,
  buildFacetSections,
  countActiveFacets,
  describeActiveFacets,
  fromFacetSelection,
  mergeFacetSelection,
  toFacetSelection,
} from "./utils/filterSelection";

export interface RoadmapFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: RoadmapOpportunityType[];
  onTypeFilterChange: (value: RoadmapOpportunityType[]) => void;
  stageFilter: RoadmapOpportunityStage[];
  onStageFilterChange: (value: RoadmapOpportunityStage[]) => void;
  /** Who filed it — staff (admin) or consumer (in-app "Report a problem"). */
  sourceFilter: RoadmapOpportunitySource[];
  onSourceFilterChange: (value: RoadmapOpportunitySource[]) => void;
  goalFilter: string[];
  onGoalFilterChange: (value: string[]) => void;
  /** Owner NAMES, matching RoadmapViewState — options come from GET /facets. */
  ownerFilter: string[];
  onOwnerFilterChange: (value: string[]) => void;
  advanced: RoadmapAdvancedFilterValues;
  onAdvancedChange: (next: RoadmapAdvancedFilterValues) => void;
  goals: RoadmapTaxonomyItem[];
  facets?: RoadmapFacets;
  /** Opens the goal-management modal. Manager-only. */
  canVote: boolean;
  canManage: boolean;
  /** Rendered at the right of the control row — the layout toggle lives here. */
  trailing?: React.ReactNode;
  /**
   * Rendered at the LEFT of the control row, and unlike the filter buttons it survives
   * `showFilters={false}` — the Queue hides filters but still offers a sort.
   */
  leading?: React.ReactNode;
  /**
   * Whether the filter controls are offered at all. Nowadays only ever true — the Queue used to
   * pass false on the argument that its whole definition IS its filters, but that conflated the
   * one filter that defines it (stage) with the cuts people want while working through it
   * (goal, owner, source, dates…). The Queue now shows the full controls with `stageLocked`
   * carrying the part of that argument that was right. Kept as a prop because the reasoning is
   * a policy of the CALLER's view, not of this bar.
   */
  showFilters?: boolean;
  /**
   * Treat stage as the view's definition rather than as a filter: the popover does not offer it,
   * no chip describes it, the badge does not count it and "Clear all" leaves it alone. True on
   * the Queue, whose stage set (New + Prioritised + In development) is what MAKES it the Queue —
   * an offered-then-cleared stage facet there would edit the tab into something that is no
   * longer a queue, which is the exact failure hiding the whole bar used to guard against.
   */
  stageLocked?: boolean;
}

/** Whether any filter at all is applied, including the ones inside the collapsed panel. */
export const hasActiveFilters = (
  props: Pick<
    RoadmapFilterBarProps,
    "typeFilter" | "stageFilter" | "sourceFilter" | "goalFilter" | "ownerFilter" | "advanced"
  >,
  opts?: FacetPresentationOpts,
): boolean =>
  props.typeFilter.length +
    // A locked stage is the view's definition, not a filter — counting it would make the Queue
    // report "filters applied" forever, turning its true empty state into "no matches".
    (opts?.omitStage ? 0 : props.stageFilter.length) +
    props.sourceFilter.length +
    props.goalFilter.length +
    props.ownerFilter.length +
    countActiveAdvancedFilters(props.advanced) >
  0;

/**
 * Search, filtering and the layout switch — shared by the table and the month board.
 *
 * Sharing it is not just about the line count: the filter set is one contract with the backend
 * (RoadmapOpportunityFiltersDto), and a control that existed in only one layout would silently
 * stop filtering the moment somebody flipped the toggle — which reads as "the filters are broken",
 * not "that control is missing".
 *
 * SHAPE: one search row, then ONE control row — the two filter entry points, then what is applied,
 * then "Clear all", with goal management and the layout switch pushed to the right.
 *
 * It used to render every option of every facet as a permanently-visible pill: 19 pills plus five
 * group labels wrapping to three lines, which pushed the first table row roughly 900px down the
 * page on a board holding 500+ opportunities. Past a certain density extra controls stop reading as
 * options at all (Stacks: "Signal Overload Creates Noise"), and the saved-view tabs directly above
 * — Backlog, Released, Open Bugs, Prioritised, one per owner — were already the one-click paths
 * those pills were meant to be, so the pills were a redundant second layer of the same thing.
 * Collapsing them into the admin app's standard FilterDropdown is what UserManagement,
 * PromptManagement, ScenarioVoices and UserBadges already do.
 *
 * The cost of a popover is that an applied filter can hide. It doesn't: every applied facet stays
 * on screen as a removable chip, and the ranges keep their count badge. A filter narrowing the
 * list with nothing on screen to say so is how someone concludes the board is broken.
 *
 * Filters live ABOVE the content, never in a second header row. The standalone app put date and
 * number inputs inside <th>s, which forced a 1240px min-width plus horizontal scroll and placed
 * absolute-positioned dropdowns inside a scroll container — this repo's known
 * phantom-second-scrollbar bug.
 */
export const RoadmapFilterBar: React.FC<RoadmapFilterBarProps> = props => {
  const {
    search,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    stageFilter,
    onStageFilterChange,
    sourceFilter,
    onSourceFilterChange,
    goalFilter,
    onGoalFilterChange,
    ownerFilter,
    onOwnerFilterChange,
    advanced,
    onAdvancedChange,
    goals,
    facets,
    trailing,
    leading,
    showFilters = true,
    stageLocked = false,
  } = props;

  const facetOpts: FacetPresentationOpts = { omitStage: stageLocked };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const rangeCount = countActiveRangeFilters(advanced);
  /**
   * Start the range panel expanded when something in it is already applied — e.g. after selecting a
   * saved view that carries a date range, so the reason the list is narrowed is visible without
   * hunting for it.
   */
  const [isRangesOpen, setIsRangesOpen] = useState(rangeCount > 0);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  /** The six checkbox facets as one value, so the popover reads and writes in one shape. */
  const facetState: RoadmapFacetState = {
    typeFilter,
    stageFilter,
    sourceFilter,
    goalFilter,
    ownerFilter,
    createdBy: advanced.createdBy,
  };

  const chips = describeActiveFacets(facetState, facets, facetOpts);
  const facetCount = countActiveFacets(facetState, facetOpts);

  /** Outlined when the control is open or carrying something, muted when it is neither. */
  const chipClass = (isActive: boolean) =>
    `border px-2 py-1 ${
      isActive
        ? "border-primary-500 text-primary-600"
        : "border-border-light text-typography-secondary"
    }`;

  /** Fan a whole facet selection back out to the individual setters the page owns. */
  const applyFacetState = (next: RoadmapFacetState) => {
    onTypeFilterChange(next.typeFilter);
    onStageFilterChange(next.stageFilter);
    onSourceFilterChange(next.sourceFilter);
    onGoalFilterChange(next.goalFilter);
    onOwnerFilterChange(next.ownerFilter);
    onAdvancedChange({ ...advanced, createdBy: next.createdBy });
  };

  const clearFacet = (id: keyof RoadmapFacetSelection) => {
    const cleared = mergeFacetSelection(toFacetSelection(facetState), { [id]: [] });
    applyFacetState(fromFacetSelection(cleared));
  };

  return (
    <>
      {/* No action button. "New opportunity" moved up to the page header beside "Report a bug":
          the two create actions belong together, and this row is now only about finding things.
          The per-view EMPTY states keep their own "New opportunity" call — there it is the
          answer to "nothing here", not a permanent toolbar fixture. */}
      <ListToolbar
        searchValue={search}
        onSearchChange={onSearchChange}
        placeholder="Search opportunities"
      />

      {showFilters ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {leading}
          {/* Two entry points, styled identically because they are the same kind of control: the
            checkbox facets, and the ranges FilterDropdown cannot express. Both keep a STABLE label
            and report open/closed through aria-expanded rather than swapping in "Hide" — a control
            whose text changes under the cursor is harder to re-find than one that doesn't. */}
          <button
            ref={filterButtonRef}
            type="button"
            onClick={() => setIsFilterOpen(open => !open)}
            aria-expanded={isFilterOpen}
            className={chipClass(facetCount > 0 || isFilterOpen)}
          >
            Filter{facetCount > 0 ? ` (${facetCount})` : ""}
          </button>

          <button
            type="button"
            onClick={() => setIsRangesOpen(open => !open)}
            aria-expanded={isRangesOpen}
            className={chipClass(rangeCount > 0 || isRangesOpen)}
          >
            Dates &amp; score{rangeCount > 0 ? ` (${rangeCount})` : ""}
          </button>

          {/* Applied facets. Rendered here rather than through ListToolbar's own `filterChips` slot:
            that one runs every label through formatCapitalizedEnum, which lowercases past the
            first character and would render an owner as "Sandeep malhotra" and a goal as "Roleplay
            actor realism". The four other pages using it pass raw enum values, where that is what
            you want — so this borrows the house chip's styling rather than changing its behaviour
            underneath them. */}
          {chips.map(chip => (
            <span
              key={chip.id}
              className="text-typography-900 border-border-light flex items-center rounded-[20px] border px-2 py-0.5"
            >
              <span className="text-typography-secondary mr-1 text-xs">{chip.label}:</span>
              <Tooltip label={chip.values.join(", ")} align="top">
                <span className="mr-1 max-w-[16rem] truncate text-xs font-medium">
                  {chip.values.join(", ")}
                </span>
              </Tooltip>
              <button
                type="button"
                onClick={() => clearFacet(chip.id)}
                aria-label={`Clear ${chip.label} filter`}
                className="text-typography-800 hover:text-typography-900"
              >
                <Close />
              </button>
            </span>
          ))}

          {hasActiveFilters(props, facetOpts) && (
            <Button
              variant={ButtonVariant.TEXT}
              onClick={() => {
                onTypeFilterChange([]);
                // A locked stage is not one of the filters being cleared — emptying it on the
                // Queue would turn the tab into an all-stages list. See the stageLocked docblock.
                if (!stageLocked) onStageFilterChange([]);
                onSourceFilterChange([]);
                onGoalFilterChange([]);
                onOwnerFilterChange([]);
                // Must include the collapsed panel: "Clear all" that leaves a hidden date range
                // applied is the exact confusion the count badge exists to prevent.
                onAdvancedChange({ ...EMPTY_ADVANCED_FILTERS });
              }}
            >
              Clear all
            </Button>
          )}

          {/* "Manage goals" moved OUT of this bar and up beside the page title as an icon: it is
            a once-in-a-while taxonomy edit, and sitting in the filter row it read as a filter
            control and competed with the ones people use every visit. */}
          <div className="ml-auto flex flex-wrap items-center gap-2">{trailing}</div>
        </div>
      ) : (
        // Filters hidden, but the row still exists: `leading` (the Queue's sort) on the left and
        // `trailing` on the right. Rendered even when one is absent rather than assuming the
        // caller nulled both — coupling props together is how one ends up forgotten.
        (leading || trailing) && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">{leading}</div>
            <div className="flex items-center gap-2">{trailing}</div>
          </div>
        )
      )}

      {showFilters && (
        <RoadmapAdvancedFilters
          isOpen={isRangesOpen}
          values={advanced}
          onChange={onAdvancedChange}
        />
      )}

      <FilterDropdown<RoadmapFacetSelection>
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        sections={buildFacetSections(goals, facets, facetOpts)}
        currentFilters={toFacetSelection(facetState)}
        onApplyFilters={selection =>
          applyFacetState(
            fromFacetSelection(mergeFacetSelection(toFacetSelection(facetState), selection)),
          )
        }
        anchorRect={filterButtonRef.current?.getBoundingClientRect() ?? null}
      />
    </>
  );
};
