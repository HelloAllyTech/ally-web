import React from "react";

import { SortAscending, SortDescending } from "@icons";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  SkeletonText,
} from "@ally-ui-mono/ui-shared";
import { Button, EmptyState, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import {
  RoadmapCoinBudget,
  RoadmapFacets,
  RoadmapOpportunitiesQuery,
  RoadmapOpportunitiesResponse,
  RoadmapOpportunity,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapTaxonomyItem,
} from "@types";

import { CoinAllocator } from "./CoinAllocator";
import { RoadmapAdvancedFilters } from "./RoadmapAdvancedFilters";
import { useAllocateCoins } from "./useAllocateCoins";
import {
  EMPTY_ADVANCED_FILTERS,
  RoadmapAdvancedFilterValues,
  countActiveAdvancedFilters,
} from "./utils/filters";
import { pageRange } from "./utils/paging";

const STAGE_STYLE: Record<string, string> = {
  new: "bg-background-secondary text-typography-primary",
  prioritised: "bg-primary-100 text-primary-600",
  under_development: "bg-primary-50 text-primary-500",
  released: "bg-green-50 text-green-700",
  archived: "bg-background-secondary text-typography-secondary",
};

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  prioritised: "Prioritised",
  under_development: "In development",
  released: "Released",
  archived: "Archived",
};

interface OpportunitiesBoardProps {
  listArgs: RoadmapOpportunitiesQuery;
  data?: RoadmapOpportunitiesResponse;
  isLoading: boolean;
  isFetching: boolean;
  budget?: RoadmapCoinBudget;
  goals: RoadmapTaxonomyItem[];
  facets?: RoadmapFacets;
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
  /** Opens the goal-management modal. Manager-only. */
  onManageGoals: () => void;
  sortBy: NonNullable<RoadmapOpportunitiesQuery["sortBy"]>;
  order: "ASC" | "DESC";
  onToggleSort: (field: NonNullable<RoadmapOpportunitiesQuery["sortBy"]>) => void;
  canVote: boolean;
  canManage: boolean;
  onOpenOpportunity: (id: string) => void;
  onAddClick: () => void;
  /** Merge selection, manager-only. Lifted so the bar can live outside the table. */
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onSplit: (opportunity: RoadmapOpportunity) => void;
  /** Offset pagination. `offset` is the same value carried in `listArgs`. */
  offset: number;
  pageSize: number;
  onOffsetChange: (offset: number) => void;
}

/**
 * The opportunity table.
 *
 * BUILT ON THE Table PRIMITIVES rather than GenericTable or NotionTable, deliberately:
 *  - NotionTable is a spreadsheet-editing model (cells are declared as editableText/switch/…)
 *    with no route for putting an arbitrary stateful widget like CoinAllocator in a cell.
 *  - GenericTable fits on paper but has zero production consumers in this app, so adopting it
 *    here would mean debugging it and the roadmap at the same time.
 *  - This is the same shape as pages/AILab/RunsTab.tsx, which is the proven pattern.
 *
 * ALL filtering and sorting happens SERVER-SIDE. The standalone app sorted client-side by
 * summing the entire allocations map inside the sort comparator, which was O(n log n × users ×
 * periods) per keystroke and required shipping every user's every vote to every browser — a
 * privacy leak as much as a performance one. It also meant the list could not paginate at all.
 */
export const OpportunitiesBoard: React.FC<OpportunitiesBoardProps> = ({
  listArgs,
  data,
  isLoading,
  isFetching,
  budget,
  goals,
  facets,
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
  onManageGoals,
  sortBy,
  order,
  onToggleSort,
  canVote,
  canManage,
  onOpenOpportunity,
  onAddClick,
  selectedIds,
  onToggleSelected,
  onSplit,
  offset,
  pageSize,
  onOffsetChange,
}) => {
  const allocate = useAllocateCoins(listArgs);
  const rows = data?.items ?? [];
  // Unfiltered max, so the bars keep a stable scale when a filter is applied.
  const maxScore = Math.max(1, data?.maxScore ?? 1);
  const total = data?.count ?? 0;
  const { rangeStart, rangeEnd, page, totalPages, canPrev, canNext, prevOffset, nextOffset } =
    pageRange(offset, pageSize, total);

  const SortHeader: React.FC<{
    field: NonNullable<RoadmapOpportunitiesQuery["sortBy"]>;
    children: React.ReactNode;
    className?: string;
  }> = ({ field, children, className }) => (
    <TableHeader className={className}>
      <button
        type="button"
        onClick={() => onToggleSort(field)}
        className="inline-flex items-center gap-1 hover:text-primary-500"
      >
        {children}
        {sortBy === field &&
          (order === "DESC" ? <SortDescending size={14} /> : <SortAscending size={14} />)}
      </button>
    </TableHeader>
  );

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  const activeFilters =
    typeFilter.length +
      stageFilter.length +
      goalFilter.length +
      ownerFilter.length +
      countActiveAdvancedFilters(advanced) >
    0;

  return (
    <div className="flex flex-col gap-3">
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

      {/* Filters live above the table, not in a second <thead> row. The source put date and
          number inputs inside <th>s, which forced a 1240px min-width plus horizontal scroll and
          put absolute-positioned dropdowns inside a scroll container — this repo's known
          phantom-second-scrollbar bug. */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-typography-secondary">Type</span>
        {Object.values(RoadmapOpportunityType).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => onTypeFilterChange(toggle(typeFilter, value))}
            className={`border px-2 py-1 ${
              typeFilter.includes(value)
                ? "border-primary-500 text-primary-600"
                : "border-border-light text-typography-secondary"
            }`}
          >
            {value === RoadmapOpportunityType.BUG ? "Bug" : "Idea"}
          </button>
        ))}

        <span className="text-typography-secondary ml-3">Stage</span>
        {Object.values(RoadmapOpportunityStage).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => onStageFilterChange(toggle(stageFilter, value))}
            className={`border px-2 py-1 ${
              stageFilter.includes(value)
                ? "border-primary-500 text-primary-600"
                : "border-border-light text-typography-secondary"
            }`}
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
            className={`border px-2 py-1 ${
              goalFilter.includes(goal.name)
                ? "border-primary-500 text-primary-600"
                : "border-border-light text-typography-secondary"
            }`}
          >
            {goal.name}
          </button>
        ))}

        {/* Owner options come from GET /facets, not from the loaded rows. Deriving them from the
            page would shrink the option list as soon as a filter or the 50-row page limit hid an
            owner — and four of the saved views migrated from production are defined ENTIRELY by
            ownerFilter, so without this control those tabs would apply as "no filter" and
            silently show everything. */}
        {!!facets?.owners?.length && (
          <>
            <span className="text-typography-secondary ml-3">Owner</span>
            {facets.owners.map(owner => (
              <button
                key={owner}
                type="button"
                onClick={() => onOwnerFilterChange(toggle(ownerFilter, owner))}
                className={`border px-2 py-1 ${
                  ownerFilter.includes(owner)
                    ? "border-primary-500 text-primary-600"
                    : "border-border-light text-typography-secondary"
                }`}
              >
                {owner}
              </button>
            ))}
          </>
        )}

        {activeFilters && (
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

      {isLoading ? (
        <SkeletonText paragraph lineCount={8} />
      ) : rows.length === 0 ? (
        // `offset > 0` with no rows means the list shrank under us (a realtime delete, or a
        // merge) — that is a paging problem, not an empty board, so don't invite a new
        // opportunity. The footer keeps Previous enabled as the way out.
        <EmptyState
          title={offset > 0 ? "Nothing on this page" : "No opportunities yet"}
          subtitle={
            offset > 0
              ? "The list is shorter than it was — go back a page."
              : activeFilters || search
                ? "No opportunities match these filters."
                : "File the first one to start collecting votes."
          }
          {...(canVote && !activeFilters && !search && offset === 0
            ? { actionLabel: "New opportunity", onAction: onAddClick }
            : {})}
        />
      ) : (
        // `relative` is load-bearing: Carbon dropdown/tooltip internals are position:absolute
        // and escape a `static` overflow-scroll ancestor, inflating its scrollHeight and
        // producing a phantom second scrollbar.
        <TableContainer className="relative">
          <Table>
            <TableHead>
              <TableRow>
                {canManage && <TableHeader className="w-10" aria-label="Select for merge" />}
                <SortHeader field="priority" className="w-32">
                  Priority
                </SortHeader>
                <TableHeader className="w-24">Coins</TableHeader>
                <SortHeader field="description">Opportunity</SortHeader>
                <TableHeader className="w-40">Goal</TableHeader>
                <TableHeader className="w-32">Stage</TableHeader>
                <TableHeader className="w-32">Owner</TableHeader>
                <SortHeader field="createdAt" className="w-28">
                  Filed
                </SortHeader>
                {canManage && <TableHeader className="w-16" aria-label="Actions" />}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(opportunity => (
                <TableRow
                  key={opportunity.id}
                  onClick={() => onOpenOpportunity(opportunity.id)}
                  className="cursor-pointer"
                >
                  {canManage && (
                    // stopPropagation, or ticking the box also opens the drawer.
                    <TableCell onClick={event => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(opportunity.id)}
                        onChange={() => onToggleSelected(opportunity.id)}
                        aria-label={`Select for merge: ${opportunity.description.slice(0, 40)}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums w-8 text-right">
                        {opportunity.priorityScore}
                      </span>
                      <span className="bg-background-secondary h-2 flex-1">
                        <span
                          className="bg-primary-500 block h-2"
                          style={{
                            width: `${Math.round((opportunity.priorityScore / maxScore) * 100)}%`,
                          }}
                        />
                      </span>
                    </div>
                  </TableCell>

                  {/* stopPropagation, or every click inside the allocator also opens the
                      drawer. */}
                  <TableCell onClick={event => event.stopPropagation()}>
                    {budget ? (
                      <CoinAllocator
                        opportunity={opportunity}
                        budget={budget}
                        onCommit={allocate}
                        disabled={!canVote}
                      />
                    ) : null}
                  </TableCell>

                  <TableCell>
                    <div className="text-typography-primary line-clamp-2">
                      {opportunity.description}
                    </div>
                    <div className="text-typography-secondary text-xs mt-1 flex gap-2">
                      <span>
                        {opportunity.type === RoadmapOpportunityType.BUG ? "Bug" : "Idea"}
                      </span>
                      {opportunity.commentCount > 0 && (
                        <span>· {opportunity.commentCount} comments</span>
                      )}
                      {opportunity.creator && (
                        <span>· {opportunity.creator.name || opportunity.creator.email}</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-typography-secondary text-sm">
                    {opportunity.productGoal}
                  </TableCell>

                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs ${
                        STAGE_STYLE[opportunity.stage] ?? STAGE_STYLE.new
                      }`}
                    >
                      {STAGE_LABEL[opportunity.stage] ?? opportunity.stage}
                    </span>
                  </TableCell>

                  <TableCell className="text-typography-secondary text-sm">
                    {opportunity.owner ?? "—"}
                  </TableCell>

                  <TableCell className="text-typography-secondary font-mono text-xs">
                    {new Date(opportunity.createdAt).toISOString().slice(0, 10)}
                  </TableCell>

                  {canManage && (
                    <TableCell onClick={event => event.stopPropagation()}>
                      <Button variant={ButtonVariant.TEXT} onClick={() => onSplit(opportunity)}>
                        Split
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination footer, same shape as the other server-paged admin tables (AI Lab Runs,
          Roleplay Session Logs): a row-range count on the left, Previous/Next on the right.
          The controls render whenever there is more than one page — including on an empty page
          past the end, which would otherwise be a dead end. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-typography-secondary text-xs">
          {data ? `Showing ${rangeStart}–${rangeEnd} of ${total} opportunities` : null}
          {isFetching && !isLoading ? " · updating…" : null}
          {canManage ? " · you can manage stages and taxonomy" : null}
        </div>

        {(canPrev || canNext) && (
          <div className="flex items-center gap-3">
            <Button
              variant={ButtonVariant.SECONDARY}
              disabled={!canPrev}
              onClick={() => onOffsetChange(prevOffset)}
            >
              Previous
            </Button>
            <span className="text-typography-secondary text-xs tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant={ButtonVariant.SECONDARY}
              disabled={!canNext}
              onClick={() => onOffsetChange(nextOffset)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
