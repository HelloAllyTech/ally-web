import React, { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { useGetPromptsQuery, useCreatePromptMutation, useUpdatePromptMutation } from "@api";
import { NotionTable, ListToolbar, PromptSidePanel } from "@components";
import { ButtonVariant } from "@components/types";
import { en, PROMPT_COLUMNS, SORT_BY, SORT_ORDER } from "@constants";
import { Prompt } from "@types";

export const PromptManagement: React.FC = () => {
  const limit = 30;
  const [offset, setOffset] = useState<number>(0);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
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

  const [createPrompt] = useCreatePromptMutation();
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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setOffset(0);
  };

  const handleNewPromptClick = () => {
    const newPromptData: Prompt = {
      name: "",
      description: "",
      promptCode: "",
      prompt: "",
    };
    setSelectedPrompt(newPromptData);
    setIsSidePanelOpen(true);
  };

  const handlePromptSelect = (rowIndex: number) => {
    if (rowIndex !== null && prompts?.length > 0) {
      setSelectedPrompt(prompts[rowIndex]);
      setIsSidePanelOpen(true);
    }
  };

  const handleSidePanelClose = () => {
    setIsSidePanelOpen(false);
    setSelectedPrompt(null);
  };

  const handlePromptUpdate = async (promptData: Prompt) => {
    try {
      if (selectedPrompt?.id) {
        // Update existing prompt
        const response = await updatePrompt({
          id: selectedPrompt.id,
          prompt: {
            name: promptData.name,
            description: promptData.description,
            promptCode: promptData.promptCode,
            prompt: promptData.prompt,
          },
        });
        if (response.error) {
          toast.error(en.errors.failedToCreateEvent);
        } else {
          toast.success(en.simulation.promptUpdatedSuccessfully);
          handleSidePanelClose();
        }
      } else {
        // Create new prompt (no ID yet)
        const response = await createPrompt({
          prompts: [promptData],
        });
        if (response.error) {
          toast.error(en.errors.failedToCreateEvent);
        } else {
          toast.success(en.simulation.promptCreatedSuccessfully);
          handleSidePanelClose();
        }
      }
    } catch {
      toast.error(en.errors.failedToCreateEvent);
    }
  };

  const handleLoadMore = () => {
    if (isFetching || !hasMore) return;
    setOffset(prev => prev + limit);
  };

  const formatTableData = prompts.map(prompt => {
    return {
      ...prompt,
      createdAt: prompt.createdAt ? new Date(prompt.createdAt).toLocaleDateString() : "",
    };
  });

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
        <div className="flex items-center gap-3 pb-6">
          <h1 className="text-2xl text-typography-900 font-secondary">
            {en.simulation.scenarioPrompts}
          </h1>
        </div>
        <ListToolbar
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          placeholder={en.simulation.searchPrompts || "Search prompts..."}
          action={{
            label: en.simulation.createPrompt || "Create new prompt",
            variant: ButtonVariant.PRIMARY,
            onClick: handleNewPromptClick,
          }}
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={{
              data: formatTableData,
              columns: PROMPT_COLUMNS,
            }}
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
          isOpen={isSidePanelOpen}
          onClose={handleSidePanelClose}
          onUpdate={handlePromptUpdate}
        />
      )}
    </div>
  );
};
