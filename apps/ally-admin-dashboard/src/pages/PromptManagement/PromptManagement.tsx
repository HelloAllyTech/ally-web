import React, { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import { useDuplicatePromptMutation, useGetPromptsQuery, useUpdatePromptMutation } from "@api";
import { FilterDropdown, NotionTable, ListToolbar, PromptSidePanel } from "@components";
import { en, PROMPT_COLUMNS, SORT_BY, SORT_ORDER } from "@constants";
import { Prompt } from "@types";

type PromptManagementFilters = {
  categories: string[];
};

export const PromptManagement: React.FC = () => {
  const limit = 30;
  const [offset, setOffset] = useState<number>(0);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [blockPrompts, setBlockPrompts] = useState<Prompt[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const addFilterBtnRef = useRef<HTMLButtonElement>(null);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<PromptManagementFilters>({
    categories: [],
  });

  const { data: promptsResponse, isFetching: isQueryFetching } = useGetPromptsQuery({
    searchName: debouncedSearchQuery,
    limit,
    offset,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
    includeBlocks: false,
  });

  const { data: promptCatalogResponse = [] } = useGetPromptsQuery({
    searchName: debouncedSearchQuery,
    limit: 500,
    offset: 0,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
    includeBlocks: false,
  });
  const promptCatalog = promptCatalogResponse ?? [];

  // Fetch blocks separately so "Used Blocks" editor can open them.
  const { data: blocksResponse } = useGetPromptsQuery({
    limit: 500,
    offset: 0,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
    includeBlocks: true,
  });

  useEffect(() => {
    setIsFetching(isQueryFetching);
  }, [isQueryFetching]);

  // Debounce search query - only update API query after 500ms of no typing
  useEffect(() => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setOffset(0); // Reset offset when search changes
    }, 500); // 500ms debounce delay

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchQuery]);

  const [updatePrompt] = useUpdatePromptMutation();
  const [duplicatePrompt] = useDuplicatePromptMutation();

  // Handle data updates when query data changes
  useEffect(() => {
    const incoming = promptsResponse;

    if (incoming) {
      setHasMore(incoming.length === limit);

      if (offset === 0) {
        setPrompts(incoming);
      } else {
        setPrompts(prev => {
          const seen = new Set(prev.map(prompt => prompt.id));
          const merged = [...prev];
          for (const item of incoming) {
            if (!seen.has(item.id)) merged.push(item);
          }
          return merged;
        });
      }
    }
  }, [promptsResponse, offset]);

  useEffect(() => {
    if (!blocksResponse) return;
    setBlockPrompts(blocksResponse.filter(p => p.kind === "block"));
  }, [blocksResponse]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setOffset(0);
  };

  const handleApplyFilters = (newFilters: PromptManagementFilters) => {
    // The FilterDropdown may emit a partial object containing only the
    // sections the user interacted with. Normalize to a fully-populated
    // filters object so downstream array reads never see `undefined`.
    setFilters({
      categories: newFilters.categories ?? [],
    });
    setIsFilterOpen(false);
  };

  const filteredPrompts = useMemo(() => {
    const sourcePrompts = filters.categories.length > 0 ? promptCatalog : prompts;

    return sourcePrompts.filter(prompt => {
      if (prompt.isObsolete || prompt.kind === "block") {
        return false;
      }

      if (filters.categories.length === 0) {
        return true;
      }

      return prompt.category ? filters.categories.includes(prompt.category) : false;
    });
  }, [filters.categories, promptCatalog, prompts]);

  const categoryOptions = useMemo(() => {
    return [...new Set(promptCatalog.map(prompt => prompt.category).filter(Boolean))]
      .sort((a, b) => a!.localeCompare(b!))
      .map(category => ({
        label: category as string,
        value: category as string,
      }));
  }, [promptCatalog]);

  const filterChips = useMemo(() => {
    if (filters.categories.length === 0) {
      return [];
    }

    return [
      {
        label: "Category",
        value: filters.categories.join(", "),
        allValue: filters.categories,
        onClear: () => setFilters({ categories: [] }),
      },
    ];
  }, [filters.categories]);

  const addFilterCta = useMemo(
    () => ({
      label: "Filter",
      onClick: () => setIsFilterOpen(prev => !prev),
      active: isFilterOpen,
    }),
    [isFilterOpen],
  );

  const allPromptsForEditor = useMemo(() => {
    const merged = [...prompts, ...blockPrompts];
    const seen = new Set<string>();
    return merged.filter(p => {
      if (!p?.id) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [prompts, blockPrompts]);

  const handlePromptSelect = (rowIndex: number) => {
    if (rowIndex !== null && filteredPrompts?.length > 0) {
      setSelectedPrompt(filteredPrompts[rowIndex]);
      setIsSidePanelOpen(true);
    }
  };

  const handleSidePanelClose = () => {
    setIsSidePanelOpen(false);
    setSelectedPrompt(null);
  };

  const handlePromptUpdate = async (promptData: Prompt) => {
    if (!promptData.id) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt, ...rest } = promptData;
      await updatePrompt({
        id: promptData.id,
        prompt: rest,
      }).unwrap();
      toast.success(en.simulation.promptUpdatedSuccessfully);

      // Only close the panel if we updated the main prompt, not a sub-block
      if (promptData.id === selectedPrompt?.id) {
        handleSidePanelClose();
      }
    } catch {
      toast.error(en.simulation.failedToUpdatePrompt);
    }
  };

  const handlePromptDuplicate = async (sourceId: string) => {
    try {
      const created = await duplicatePrompt(sourceId).unwrap();
      toast.success("Variant created");
      // Re-open the side panel with the new variant pre-selected so the user
      // can rename it / edit text immediately. The prompts list will refresh
      // via the PROMPTS tag invalidation.
      setSelectedPrompt(created);
      setIsSidePanelOpen(true);
    } catch {
      toast.error("Failed to duplicate prompt");
    }
  };

  const handleLoadMore = () => {
    if (isFetching || !hasMore) return;
    setOffset(prev => prev + limit);
  };

  const formatTableData = useMemo(
    () =>
      filteredPrompts.map(prompt => ({
        ...prompt,
        createdAt: prompt.createdAt ? new Date(prompt.createdAt).toLocaleDateString() : "",
      })),
    [filteredPrompts],
  );

  const tableFooter =
    filters.categories.length > 0 ? null : (
      <button
        type="button"
        onClick={handleLoadMore}
        className="flex justify-start items-center py-4 text-typography-700 hover:text-typography-900 disabled:opacity-50 w-[200px]"
        disabled={isFetching || !hasMore}
      >
        <span>+</span>
        <span className="text-base ml-[5px] font-primary">
          {isFetching ? en.common.loading : hasMore ? en.common.loadMore : en.common.noMoreData}
        </span>
      </button>
    );

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div>
        <h1 className="text-2xl text-typography-900 pb-6 font-secondary">
          {en.simulation.scenarioPrompts}
        </h1>
        <ListToolbar
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          placeholder={en.simulation.searchPrompts || "Search prompts..."}
          filterChips={filterChips}
          addFilterCta={addFilterCta}
          addFilterButtonRef={addFilterBtnRef}
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={{
              data: formatTableData,
              columns: PROMPT_COLUMNS,
            }}
            hideSelectionColumn={true}
            editIndex={0}
            onRowChange={() => {}}
            onRowClick={handlePromptSelect}
            onSelectionChange={() => {}}
            tableFooter={tableFooter}
          />
        </div>
      </div>
      <FilterDropdown<PromptManagementFilters>
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        sections={[
          {
            id: "categories",
            label: "Category",
            options: categoryOptions,
          },
        ]}
        onApplyFilters={handleApplyFilters}
        anchorRect={addFilterBtnRef.current?.getBoundingClientRect() ?? null}
        currentFilters={filters}
      />
      {isSidePanelOpen && (
        <PromptSidePanel
          selectedPrompt={selectedPrompt}
          allPrompts={allPromptsForEditor}
          isOpen={isSidePanelOpen}
          onClose={handleSidePanelClose}
          onUpdate={handlePromptUpdate}
          onDuplicate={handlePromptDuplicate}
        />
      )}
    </div>
  );
};
