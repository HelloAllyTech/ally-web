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
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapTaxonomyItem,
} from "@types";

import { CoinAllocator } from "./CoinAllocator";
import { useAllocateCoins } from "./useAllocateCoins";

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
  sortBy: NonNullable<RoadmapOpportunitiesQuery["sortBy"]>;
  order: "ASC" | "DESC";
  onToggleSort: (field: NonNullable<RoadmapOpportunitiesQuery["sortBy"]>) => void;
  canVote: boolean;
  canManage: boolean;
  onOpenOpportunity: (id: string) => void;
  onAddClick: () => void;
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
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  stageFilter,
  onStageFilterChange,
  goalFilter,
  onGoalFilterChange,
  sortBy,
  order,
  onToggleSort,
  canVote,
  canManage,
  onOpenOpportunity,
  onAddClick,
}) => {
  const allocate = useAllocateCoins(listArgs);
  const rows = data?.items ?? [];
  // Unfiltered max, so the bars keep a stable scale when a filter is applied.
  const maxScore = Math.max(1, data?.maxScore ?? 1);

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

  const activeFilters = typeFilter.length + stageFilter.length + goalFilter.length > 0;

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

        {activeFilters && (
          <Button
            variant={ButtonVariant.TEXT}
            onClick={() => {
              onTypeFilterChange([]);
              onStageFilterChange([]);
              onGoalFilterChange([]);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonText paragraph lineCount={8} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          subtitle={
            activeFilters || search
              ? "No opportunities match these filters."
              : "File the first one to start collecting votes."
          }
          {...(canVote && !activeFilters && !search
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
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(opportunity => (
                <TableRow
                  key={opportunity.id}
                  onClick={() => onOpenOpportunity(opportunity.id)}
                  className="cursor-pointer"
                >
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <div className="text-typography-secondary text-xs">
        {data ? `${rows.length} of ${data.count} opportunities` : null}
        {isFetching && !isLoading ? " · updating…" : null}
        {canManage ? " · you can manage stages and taxonomy" : null}
      </div>
    </div>
  );
};
