import React, { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import { useGetPromptsQuery, useUpdatePromptMutation } from "@api";
import { NotionTable, ListToolbar, PromptSidePanel } from "@components";
import { en, PROMPT_COLUMNS, SORT_BY, SORT_ORDER } from "@constants";
import { Prompt } from "@types";

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

  const { data: promptsResponse, isFetching: isQueryFetching } = useGetPromptsQuery({
    searchName: debouncedSearchQuery,
    limit,
    offset,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
    includeBlocks: false,
  });

  // Fetch blocks separately so "Used Blocks" editor can open them.
  // This list is not used in the table.
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

  const filteredPrompts = useMemo(() => {
    return prompts.filter(prompt => !prompt.isObsolete && prompt.kind !== "block");
  }, [prompts]);

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

  const tableFooter = (
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
      {isSidePanelOpen && (
        <PromptSidePanel
          selectedPrompt={selectedPrompt}
          allPrompts={allPromptsForEditor}
          isOpen={isSidePanelOpen}
          onClose={handleSidePanelClose}
          onUpdate={handlePromptUpdate}
        />
      )}
    </div>
  );
};
