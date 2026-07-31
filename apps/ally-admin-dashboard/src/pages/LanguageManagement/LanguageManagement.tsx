import React, { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import {
  useGetLanguagesQuery,
  useCreateLanguageMutation,
  useUpdateLanguageMutation,
  useGetSttConfigsQuery,
  useGetLlmConfigsQuery,
} from "@api";
import { NotionTable, ListToolbar, LanguageManagementSidePanel } from "@components";
import { ButtonVariant } from "@components/types";
import {
  buildConfigPickerOptions,
  en,
  SCENARIO_LANGUAGE_COLUMNS,
  SORT_BY,
  SORT_ORDER,
} from "@constants";
import { ScenarioLanguage } from "@types";

export const ScenarioLanguages: React.FC = () => {
  const limit = 30;
  const [offset, setOffset] = useState<number>(0);
  const [languages, setLanguages] = useState<ScenarioLanguage[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<ScenarioLanguage | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const { data: languagesResponse, isFetching: isQueryFetching } = useGetLanguagesQuery({
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

  const [createLanguage] = useCreateLanguageMutation();
  const [updateLanguage] = useUpdateLanguageMutation();

  // Handle data updates when query data changes
  useEffect(() => {
    const incoming = languagesResponse;

    if (incoming) {
      setHasMore(incoming.length === limit);

      if (offset === 0) {
        setLanguages(incoming);
      } else {
        setLanguages(prev => {
          const seen = new Set(prev.map(language => language.id));
          const merged = [...prev];
          for (const item of incoming) {
            if (!seen.has(item.id)) merged.push(item);
          }
          return merged;
        });
      }
    }
  }, [languagesResponse, offset]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setOffset(0);
  };

  const handleNewLanguageClick = () => {
    const newLanguageData: ScenarioLanguage = {
      label: "",
      value: "",
      translationCode: "",
      active: true,
    };
    setSelectedLanguage(newLanguageData);
    setIsSidePanelOpen(true);
  };

  const handleLanguageSelect = (rowIndex: number) => {
    if (rowIndex !== null && languages?.length > 0) {
      setSelectedLanguage(languages[rowIndex]);
      setIsSidePanelOpen(true);
    }
  };

  const handleSidePanelClose = () => {
    setIsSidePanelOpen(false);
    setSelectedLanguage(null);
  };

  const handleLanguageUpdate = async (languageData: ScenarioLanguage) => {
    try {
      if (selectedLanguage?.id) {
        // Update existing language
        const response = await updateLanguage({
          id: selectedLanguage.id,
          language: {
            label: languageData.label,
            value: languageData.value,
            translationCode: languageData.translationCode,
            active: languageData.active,
            llmProviderConfig: languageData.llmProviderConfig,
            sttProviderConfig: languageData.sttProviderConfig,
          },
        });
        if (response.error) {
          toast.error(en.errors.failedToCreateEvent);
        } else {
          toast.success(en.simulation.languageUpdatedSuccessfully);
          handleSidePanelClose();
        }
      } else {
        // Create new language (no ID yet)
        const response = await createLanguage({
          languages: [languageData],
        });
        if (response.error) {
          toast.error(en.errors.failedToCreateEvent);
        } else {
          toast.success(en.simulation.languageCreatedSuccessfully);
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

    // Find the original language from state to preserve proper object types
    const originalLanguage = languages[rowIndex];
    if (!originalLanguage) return;

    // Update local state immediately for UI feedback
    setLanguages(prev => {
      const updated = [...prev];
      if (updated[rowIndex]) {
        updated[rowIndex] = {
          ...updated[rowIndex],
          [columnId]: value,
        };
      }
      return updated;
    });

    try {
      // Both legacy jsonb columns are carried through untouched — they are the
      // fallback a language reverts to if its registry reference is cleared.
      const llmConfig = originalLanguage.llmProviderConfig || {};
      const parsedValue = value;

      const response = await updateLanguage({
        id: originalLanguage.id,
        language: {
          label: columnId === "label" ? parsedValue : originalLanguage.label,
          value: columnId === "value" ? parsedValue : originalLanguage.value,
          translationCode:
            columnId === "translationCode" ? parsedValue : originalLanguage.translationCode,
          llmProviderConfig: llmConfig,
          llmConfigId:
            columnId === "llmConfigId"
              ? parsedValue || null
              : (originalLanguage.llmConfigId ?? null),
          // The legacy jsonb column is no longer editable — carried through so
          // moving a language onto the registry doesn't destroy the fallback it
          // would revert to. An empty pick clears the reference.
          sttProviderConfig: originalLanguage.sttProviderConfig,
          sttConfigId:
            columnId === "sttConfigId"
              ? parsedValue || null
              : (originalLanguage.sttConfigId ?? null),
          active: columnId === "active" ? parsedValue : originalLanguage.active,
        },
      });

      if (response.error) {
        toast.error(en.errors.failedToCreateEvent);
        // Revert the local change on error
        setLanguages(prev => {
          const updated = [...prev];
          if (updated[rowIndex]) {
            updated[rowIndex] = originalLanguage;
          }
          return updated;
        });
      } else {
        toast.success(en.simulation.languageUpdatedSuccessfully);
      }
    } catch {
      toast.error(en.errors.failedToCreateEvent);
      // Revert on error
      setLanguages(prev => {
        const updated = [...prev];
        if (updated[rowIndex]) {
          updated[rowIndex] = originalLanguage;
        }
        return updated;
      });
    }
  };

  // Not activeOnly: a language may still point at a retired config, and the
  // dropdown has to be able to show it rather than silently reading as unset.
  const { data: sttConfigs = [] } = useGetSttConfigsQuery();
  const { data: llmConfigs = [] } = useGetLlmConfigsQuery();

  const sttOptions = useMemo(
    () => buildConfigPickerOptions(sttConfigs, "Platform default"),
    [sttConfigs],
  );

  const llmOptions = useMemo(
    () => buildConfigPickerOptions(llmConfigs, "Platform default"),
    [llmConfigs],
  );

  const languageColumns = useMemo(
    () =>
      SCENARIO_LANGUAGE_COLUMNS.map(column => {
        if (column.id === "sttConfigId") return { ...column, options: sttOptions };
        if (column.id === "llmConfigId") return { ...column, options: llmOptions };
        return column;
      }),
    [sttOptions, llmOptions],
  );

  const formatTableData = languages.map(language => ({
    ...language,
    createdAt: language.createdAt ? new Date(language.createdAt).toLocaleDateString() : "",
    sttConfigId: language.sttConfigId ?? "",
    llmConfigId: language.llmConfigId ?? "",
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
            {en.simulation.scenarioLanguages}
          </h1>
        </div>
        <ListToolbar
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          placeholder={en.simulation.searchLanguages || "Search languages..."}
          action={{
            label: en.simulation.createLanguage || "Create new language",
            variant: ButtonVariant.PRIMARY,
            onClick: handleNewLanguageClick,
          }}
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={{
              data: formatTableData,
              columns: languageColumns,
            }}
            onRowChange={handleTableRowChange}
            onRowClick={handleLanguageSelect}
            onSelectionChange={() => {}}
            tableFooter={tableFooter}
          />
        </div>
      </div>
      {isSidePanelOpen && (
        <LanguageManagementSidePanel
          selectedLanguage={selectedLanguage}
          isOpen={isSidePanelOpen}
          onClose={handleSidePanelClose}
          onUpdate={handleLanguageUpdate}
        />
      )}
    </div>
  );
};
