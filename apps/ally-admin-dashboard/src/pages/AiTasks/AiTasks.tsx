import React, { useMemo, useRef, useState } from "react";

import { useGetAiTasksQuery } from "@api";
import { FilterDropdown, ListToolbar, NotionTable } from "@components";
import { FilterChipProps } from "@components/types";
import {
  AI_TASK_COLUMNS,
  AI_TASK_KIND_LABELS,
  AI_TASK_PROVIDER_LABELS,
  AI_TASK_RUNTIME_LABELS,
} from "@constants";

import { AiTaskFilters, filterAiTasks, optionsFrom, toTableRows } from "./aiTaskRows";

/**
 * AI Tasks — every action on the platform that calls a model, and which model
 * serves it.
 *
 * Read-only on purpose. The rows are derived from ally-be's code (the registry
 * in `src/llm/constants/ai-task-registry.constants.ts`), so an editable table
 * here would be a second source of truth that could disagree with what actually
 * runs. Changing a model means changing the env var named in "Configured by",
 * or the prompt row that overrides it — this screen tells you which.
 *
 * The screen exists because the mapping was previously only reconstructable by
 * reading four repos, which meant nobody costed a feature before shipping it.
 */

export const AiTasks: React.FC = () => {
  const { data: tasks = [], isFetching, isError } = useGetAiTasksQuery();

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<AiTaskFilters>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const addFilterBtnRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(
    () => filterAiTasks(tasks, searchQuery, filters),
    [tasks, searchQuery, filters],
  );

  const tableData = useMemo(() => toTableRows(filtered), [filtered]);

  /**
   * One chip per active filter section, not per selected value — the house
   * pattern, and the only one ListToolbar's FilterChipProps supports.
   */
  const filterChips: FilterChipProps[] = useMemo(() => {
    const chip = (
      section: keyof AiTaskFilters,
      label: string,
      labels: Record<string, string>,
    ): FilterChipProps | null => {
      const selected = filters[section] ?? [];
      if (!selected.length) return null;
      return {
        label,
        value: selected.map(value => labels[value] ?? value).join(", "),
        allValue: selected.map(value => labels[value] ?? value),
        onClear: () => setFilters(prev => ({ ...prev, [section]: [] })),
      };
    };

    return [
      chip("runtime", "Runs in", AI_TASK_RUNTIME_LABELS),
      chip("provider", "Provider", AI_TASK_PROVIDER_LABELS),
      chip("kind", "Call type", AI_TASK_KIND_LABELS),
    ].filter((entry): entry is FilterChipProps => entry !== null);
  }, [filters]);

  const sections = useMemo(
    () => [
      {
        id: "runtime" as const,
        label: "Runs in",
        options: optionsFrom(
          tasks.map(row => row.runtime),
          AI_TASK_RUNTIME_LABELS,
        ),
      },
      {
        id: "provider" as const,
        label: "Provider",
        options: optionsFrom(
          tasks.map(row => row.provider),
          AI_TASK_PROVIDER_LABELS,
        ),
      },
      {
        id: "kind" as const,
        label: "Call type",
        options: optionsFrom(
          tasks.map(row => row.kind),
          AI_TASK_KIND_LABELS,
        ),
      },
    ],
    [tasks],
  );

  const hotPathCount = useMemo(() => filtered.filter(row => row.hotPath).length, [filtered]);

  const footer = () => {
    if (isFetching) return "Loading…";
    if (isError) return "Could not load the AI task registry. Refresh to try again.";
    if (!tasks.length) return "No AI tasks are registered.";
    if (!tableData.length) return "No AI tasks match this search.";
    return `${tableData.length} of ${tasks.length} call${tasks.length === 1 ? "" : "s"}${
      hotPathCount ? ` · ${hotPathCount} on the live voice path (⚡)` : ""
    }`;
  };

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div className="flex items-center gap-3 pb-2">
        <h1 className="text-2xl text-typography-900 font-secondary">AI Tasks</h1>
      </div>
      <p className="pb-6 text-typography-500 text-sm max-w-[80ch]">
        Every action that calls a model, and which model serves it. Models shown are what this
        environment is configured for; rows marked <em>as documented</em> run in another service
        whose environment this screen cannot read. A model can still be overridden per language, per
        prompt or per simulation — “Configured by” names the default.
      </p>

      <ListToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search by action, model or env var..."
        filterChips={filterChips}
        addFilterCta={{ label: "Filter", onClick: () => setIsFilterOpen(open => !open) }}
        addFilterButtonRef={addFilterBtnRef}
      />
      <FilterDropdown<AiTaskFilters>
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        sections={sections}
        onApplyFilters={next =>
          setFilters({
            runtime: next.runtime as string[] | undefined,
            provider: next.provider as string[] | undefined,
            kind: next.kind as string[] | undefined,
          })
        }
        anchorRect={addFilterBtnRef.current?.getBoundingClientRect() ?? null}
        currentFilters={filters}
      />

      <div className="flex flex-col gap-4 h-[calc(100dvh-160px)] relative mt-[20px]">
        <NotionTable
          tableData={{ data: tableData, columns: AI_TASK_COLUMNS }}
          // Nothing here can be acted on in bulk, so the select-all column would
          // be a control that does nothing.
          hideSelectionColumn
          // Read-only: there is nothing to open, nothing to edit, and nothing to
          // select. NotionTable requires the handlers, so they are no-ops.
          onRowClick={() => {}}
          onRowChange={() => {}}
          onSelectionChange={() => {}}
          tableFooter={<div className="py-4 text-typography-500 text-base">{footer()}</div>}
        />
      </div>
    </div>
  );
};

export default AiTasks;
