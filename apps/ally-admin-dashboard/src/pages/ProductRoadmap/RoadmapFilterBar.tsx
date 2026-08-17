import React from "react";

import { Button, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import {
  RoadmapFacets,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapTaxonomyItem,
} from "@types";

import { RoadmapAdvancedFilters } from "./RoadmapAdvancedFilters";
import {
  EMPTY_ADVANCED_FILTERS,
  RoadmapAdvancedFilterValues,
  countActiveAdvancedFilters,
} from "./utils/filters";
import { STAGE_LABEL, typeLabel } from "./utils/stages";

export interface RoadmapFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: RoadmapOpportunityType[];
  onTypeFilterChange: (value: RoadmapOpportunityType[]) => void;
  stageFilter: RoadmapOpportunityStage[];
  onStageFilterChange: (value: RoadmapOpportunityStage[]) => void;
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
  onManageGoals: () => void;
  canVote: boolean;
  canManage: boolean;
  onAddClick: () => void;
  /** Rendered between the search toolbar and the chips — the layout toggle lives here. */
  trailing?: React.ReactNode;
}

/** Whether any filter at all is applied, including the ones inside the collapsed panel. */
export const hasActiveFilters = (
  props: Pick<
    RoadmapFilterBarProps,
    "typeFilter" | "stageFilter" | "goalFilter" | "ownerFilter" | "advanced"
  >,
): boolean =>
  props.typeFilter.length +
    props.stageFilter.length +
    props.goalFilter.length +
    props.ownerFilter.length +
    countActiveAdvancedFilters(props.advanced) >
  0;

/**
 * Search, filter chips and the advanced panel — shared by the table and the month board.
 *
 * Extracted from OpportunitiesBoard when month boards arrived. Sharing it is not just about the
 * ~100 lines: the filter set is one contract with the backend (RoadmapOpportunityFiltersDto), and
 * a chip that existed in only one layout would silently stop filtering the moment somebody flipped
 * the toggle — which reads as "the filters are broken", not "that chip is missing".
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
    goalFilter,
    onGoalFilterChange,
    ownerFilter,
    onOwnerFilterChange,
    advanced,
    onAdvancedChange,
    goals,
    facets,
    onManageGoals,
    canVote,
    canManage,
    onAddClick,
    trailing,
  } = props;

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  const chipClass = (isActive: boolean) =>
    `border px-2 py-1 ${
      isActive ? "border-primary-500 text-primary-600" : "border-border-light text-typography-secondary"
    }`;

  return (
    <>
      <ListToolbar
        searchValue={search}
        onSearchChange={onSearchChange}
        placeholder="Search opportunities"
        action={
          canVote
            ? {
                label: "New opportunity",
                onClick: onAddClick,
                variant: ButtonVariant.PRIMARY,
              }
            : undefined
        }
      />

      {trailing}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-typography-secondary">Type</span>
        {Object.values(RoadmapOpportunityType).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => onTypeFilterChange(toggle(typeFilter, value))}
            className={chipClass(typeFilter.includes(value))}
          >
            {typeLabel(value)}
          </button>
        ))}

        <span className="text-typography-secondary ml-3">Stage</span>
        {Object.values(RoadmapOpportunityStage).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => onStageFilterChange(toggle(stageFilter, value))}
            className={chipClass(stageFilter.includes(value))}
          >
            {STAGE_LABEL[value]}
          </button>
        ))}

        <span className="text-typography-secondary ml-3">Goal</span>
        {canManage && (
          <Button variant={ButtonVariant.TEXT} onClick={onManageGoals}>
            Manage
          </Button>
        )}
        {goals.map(goal => (
          <button
            key={goal.id}
            type="button"
            onClick={() => onGoalFilterChange(toggle(goalFilter, goal.name))}
            className={chipClass(goalFilter.includes(goal.name))}
          >
            {goal.name}
          </button>
        ))}

        {/* Owner options come from GET /facets, not from the loaded rows. Deriving them from the
            page would shrink the option list as soon as a filter or the page limit hid an owner —
            and four of the saved views migrated from production are defined ENTIRELY by
            ownerFilter, so without this control those tabs would apply as "no filter" and silently
            show everything. */}
        {!!facets?.owners?.length && (
          <>
            <span className="text-typography-secondary ml-3">Owner</span>
            {facets.owners.map(owner => (
              <button
                key={owner}
                type="button"
                onClick={() => onOwnerFilterChange(toggle(ownerFilter, owner))}
                className={chipClass(ownerFilter.includes(owner))}
              >
                {owner}
              </button>
            ))}
          </>
        )}

        {hasActiveFilters(props) && (
          <Button
            variant={ButtonVariant.TEXT}
            onClick={() => {
              onTypeFilterChange([]);
              onStageFilterChange([]);
              onGoalFilterChange([]);
              onOwnerFilterChange([]);
              // Must include the collapsed panel: "Clear filters" that leaves a hidden date range
              // applied is the exact confusion the active-count badge exists to prevent.
              onAdvancedChange({ ...EMPTY_ADVANCED_FILTERS });
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <RoadmapAdvancedFilters values={advanced} onChange={onAdvancedChange} facets={facets} />
    </>
  );
};
