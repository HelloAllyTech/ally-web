import React, { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import {
  useGetScenarioVoicesQuery,
  useGetAvailableLanguageVoicesQuery,
  useCreateScenarioVoiceMutation,
  useUpdateScenarioVoiceMutation,
} from "@api";
import { NotionTable, ListToolbar, ScenarioVoiceSidePanel } from "@components";
import { ButtonVariant } from "@components/types";
import { en, SCENARIO_VOICE_COLUMNS, SORT_BY, SORT_ORDER } from "@constants";
import { ScenarioVoice, ScenarioLanguage } from "@types";

export const ScenarioVoices: React.FC = () => {
  const limit = 30;
  const [offset, setOffset] = useState<number>(0);
  const [voices, setVoices] = useState<ScenarioVoice[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<ScenarioVoice | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const { data: voicesResponse, isFetching: isQueryFetching } = useGetScenarioVoicesQuery({
    searchName: debouncedSearchQuery,
    limit,
    offset,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
  });

  useEffect(() => {
    setIsFetching(isQueryFetching);
  }, [isQueryFetching]);

  const { data: languageOptions = [] } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: false,
  }) as {
    data: ScenarioLanguage[];
  };

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

  const [createScenarioVoice] = useCreateScenarioVoiceMutation();
  const [updateScenarioVoice] = useUpdateScenarioVoiceMutation();

  // Handle data updates when query data changes
  useEffect(() => {
    const incoming = voicesResponse;

    if (incoming) {
      setHasMore(incoming.length === limit);

      if (offset === 0) {
        setVoices(incoming);
      } else {
        setVoices(prev => {
          const seen = new Set(prev.map(voice => voice.id));
          const merged = [...prev];
          for (const item of incoming) {
            if (!seen.has(item.id)) merged.push(item);
          }
          return merged;
        });
      }
    }
  }, [voicesResponse, offset]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setOffset(0);
  };

  const handleNewVoiceClick = () => {
    const newVoiceData: ScenarioVoice = {
      name: "",
      provider: "",
      languageId: undefined,
      config: { age: "", gender: "", name: "", model: "", voiceId: "" },
    };
    setSelectedVoice(newVoiceData);
    setIsSidePanelOpen(true);
  };

  const handleVoiceSelect = (rowIndex: number) => {
    if (rowIndex !== null && voices?.length > 0) {
      setSelectedVoice(voices[rowIndex]);
      setIsSidePanelOpen(true);
    }
  };

  const handleSidePanelClose = () => {
    setIsSidePanelOpen(false);
    setSelectedVoice(null);
  };

  const handleVoiceUpdate = async (voiceData: ScenarioVoice) => {
    try {
      if (selectedVoice?.id) {
        // Update existing voice
        const response = await updateScenarioVoice({
          id: selectedVoice.id,
          voice: {
            name: voiceData.name,
            provider: voiceData.provider,
            languageId: voiceData.languageId,
            config: voiceData.config,
          },
        });
        if (response.error) {
          toast.error(en.errors.failedToCreateEvent);
        } else {
          toast.success(en.simulation.voiceUpdatedSuccessfully);
          handleSidePanelClose();
        }
      } else {
        // Create new voice (no ID yet)
        const response = await createScenarioVoice({
          voices: [voiceData],
        });
        if (response.error) {
          toast.error(en.errors.failedToCreateEvent);
        } else {
          toast.success(en.simulation.voiceCreatedSuccessfully);
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

  /**
   * Handles inline table cell changes and auto-saves to API
   * Called when user edits any cell in the table
   */
  const handleTableRowChange = async (action: any) => {
    const { columnId, rowIndex, value } = action;

    // Find the original voice from state to preserve proper object types
    const originalVoice = voices[rowIndex];
    if (!originalVoice) return;

    // Update local state immediately for UI feedback
    setVoices(prev => {
      const updated = [...prev];
      if (updated[rowIndex]) {
        // Map column id to actual field name (e.g., "language" -> "languageId")
        const fieldName = columnId === "language" ? "languageId" : columnId;
        updated[rowIndex] = {
          ...updated[rowIndex],
          [fieldName]: value,
        };
      }
      return updated;
    });

    try {
      let configValue = originalVoice.config;
      let parsedValue = value;

      if (columnId === "language") {
        // Language field comes as language_id from API, convert to number
        parsedValue = typeof value === "string" ? parseInt(value, 10) : value;
      }

      // Parse config if it was edited (it will be a string from table)
      if (columnId === "config") {
        try {
          configValue = typeof value === "string" ? JSON.parse(value) : value;
          parsedValue = configValue;
        } catch {
          toast.error("Invalid JSON in configuration");
          // Revert on parse error
          setVoices(prev => {
            const updated = [...prev];
            if (updated[rowIndex]) {
              updated[rowIndex] = originalVoice;
            }
            return updated;
          });
          return;
        }
      }

      const response = await updateScenarioVoice({
        id: originalVoice.id,
        voice: {
          name: columnId === "name" ? parsedValue : originalVoice.name,
          provider: columnId === "provider" ? parsedValue : originalVoice.provider,
          languageId: columnId === "language" ? parsedValue : originalVoice.languageId,
          config: columnId === "config" ? configValue : originalVoice.config,
        },
      });

      if (response.error) {
        toast.error(en.errors.failedToCreateEvent);
        // Revert the local change on error
        setVoices(prev => {
          const updated = [...prev];
          if (updated[rowIndex]) {
            updated[rowIndex] = originalVoice;
          }
          return updated;
        });
      } else {
        toast.success(en.simulation.voiceUpdatedSuccessfully);
      }
    } catch {
      toast.error(en.errors.failedToCreateEvent);
      // Revert on error
      setVoices(prev => {
        const updated = [...prev];
        if (updated[rowIndex]) {
          updated[rowIndex] = originalVoice;
        }
        return updated;
      });
    }
  };

  // Extract unique providers from voices
  const uniqueProviders = Array.from(new Set(voices.map(voice => voice.provider).filter(Boolean)));

  // Create dynamic columns with language and provider options
  const tableColumns = SCENARIO_VOICE_COLUMNS.map(column => {
    if (column.id === "language") {
      return {
        ...column,
        options: languageOptions.map((lang: any) => ({
          value: lang.language_id,
          label: lang.label, // Same as side panel
        })),
      };
    }
    if (column.id === "provider") {
      return {
        ...column,
        options: uniqueProviders.map((provider: string) => ({
          value: provider,
          label: provider,
        })),
      };
    }
    return column;
  });

  const formatTableData = voices.map(voice => {
    const formatted = {
      ...voice,
      createdAt: new Date(voice.createdAt).toLocaleDateString(),
      config: JSON.stringify(voice.config, null, 2),
      languageId: voice.languageId,
    };
    return formatted;
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
            {en.simulation.scenarioVoices}
          </h1>
        </div>
        <ListToolbar
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          placeholder={en.simulation.searchVoices || "Search voices..."}
          action={{
            label: en.simulation.createVoice || "Create new voice",
            variant: ButtonVariant.PRIMARY,
            onClick: handleNewVoiceClick,
          }}
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={{
              data: formatTableData,
              columns: tableColumns,
            }}
            onRowChange={handleTableRowChange}
            onRowClick={handleVoiceSelect}
            onSelectionChange={() => {}}
            tableFooter={tableFooter}
          />
        </div>
      </div>
      {isSidePanelOpen && (
        <ScenarioVoiceSidePanel
          selectedVoice={selectedVoice}
          isOpen={isSidePanelOpen}
          onClose={handleSidePanelClose}
          onUpdate={handleVoiceUpdate}
          existingProviders={uniqueProviders}
        />
      )}
    </div>
  );
};
