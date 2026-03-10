import React, { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { useGetPromptsQuery, useUpdatePromptMutation, useDeletePromptMutation } from "@api";
import { NotionTable, ListToolbar, PromptSidePanel, ActionConfirmationPopup } from "@components";
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
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);
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

  const [updatePrompt] = useUpdatePromptMutation();
  const [deletePrompt] = useDeletePromptMutation();

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
    if (!selectedPrompt?.id) return;
    try {
      await updatePrompt({
        id: selectedPrompt.id,
        prompt: {
          name: promptData.name,
          description: promptData.description,
          promptCode: promptData.promptCode,
          prompt: promptData.prompt,
          useDashboardOverride: promptData.useDashboardOverride,
        },
      }).unwrap();
      toast.success(en.simulation.promptUpdatedSuccessfully);
      handleSidePanelClose();
    } catch {
      toast.error(en.errors.failedToCreateEvent);
    }
  };

  const handleRowChange = async (action: { columnId?: string; value?: unknown; row?: Prompt }) => {
    const { columnId, value, row } = action;
    if (columnId !== "useDashboardOverride" || value === undefined || !row?.id) return;

    const prompt = prompts.find(p => p.id === row!.id) ?? row!;
    try {
      await updatePrompt({
        id: prompt.id,
        prompt: {
          name: prompt.name,
          description: prompt.description,
          promptCode: prompt.promptCode,
          prompt: prompt.prompt,
          useDashboardOverride: Boolean(value),
        },
      }).unwrap();
      toast.success(en.simulation.promptUpdatedSuccessfully);
    } catch {
      toast.error(en.errors.failedToCreateEvent);
    }
  };

  const handleDeleteObsoletePrompt = async () => {
    if (!promptToDelete?.id) return;
    try {
      await deletePrompt(promptToDelete.id).unwrap();
      toast.success("Prompt permanently deleted");
      setPromptToDelete(null);
    } catch {
      toast.error("Failed to delete prompt");
    }
  };

  const handleLoadMore = () => {
    if (isFetching || !hasMore) return;
    setOffset(prev => prev + limit);
  };

  const formatTableData = prompts.map(prompt => ({
    ...prompt,
    useDashboardOverride: prompt.useDashboardOverride ?? false,
    createdAt: prompt.createdAt ? new Date(prompt.createdAt).toLocaleDateString() : "",
    isObsolete: prompt.isObsolete ? "OBSOLETE" : "ACTIVE",
  }));

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
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={{
              data: formatTableData,
              columns: PROMPT_COLUMNS,
            }}
            onRowChange={handleRowChange}
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
      {promptToDelete && (
        <ActionConfirmationPopup
          isOpen={!!promptToDelete}
          onClose={() => setPromptToDelete(null)}
          title="Delete Prompt"
          description="Are you sure you want to permanently delete this obsolete prompt?"
          primaryButton={{
            label: en.common.delete,
            onClick: handleDeleteObsoletePrompt,
            variant: ButtonVariant.DESTRUCTIVE,
          }}
          secondaryButton={{
            label: en.common.cancel,
            onClick: () => setPromptToDelete(null),
            variant: ButtonVariant.SECONDARY,
          }}
        />
      )}
    </div>
  );
};
