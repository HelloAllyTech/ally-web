import React, { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import {
  useGetScenarioVoicesQuery,
  useGetAvailableLanguageVoicesQuery,
  useCreateScenarioVoiceMutation,
  useUpdateScenarioVoiceMutation,
  useLazyGetPreviewVoiceQuery,
} from "@api";
import { NotionTable, ListToolbar, ScenarioVoiceSidePanel } from "@components";
import { FilterDropdown } from "@components/filters/FilterDropdown";
import { ButtonVariant } from "@components/types";
import { en, SCENARIO_VOICE_COLUMNS, SORT_BY, SORT_ORDER } from "@constants";
import {
  TTS_PROVIDER_OPTIONS,
  VOICE_AGE_FILTER_OPTIONS,
  VOICE_GENDER_FILTER_OPTIONS,
  isSupportedProvider,
  summarizeVoiceConfig,
} from "@constants/voiceProviders";
import { ScenarioVoice, ScenarioLanguage, ScenarioVoiceFilters } from "@types";

const getVoiceSaveErrorMessage = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return en.errors.failedToSaveVoice;
  }

  const apiError = error as {
    data?: { message?: string | string[] };
    error?: string;
  };

  if (Array.isArray(apiError.data?.message)) {
    return apiError.data.message.join(", ");
  }

  if (typeof apiError.data?.message === "string" && apiError.data.message.trim()) {
    return apiError.data.message;
  }

  if (typeof apiError.error === "string" && apiError.error.trim()) {
    return apiError.error;
  }

  return en.errors.failedToSaveVoice;
};

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
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlCacheRef = useRef<Record<string, string>>({});
  const [getPreviewVoice] = useLazyGetPreviewVoiceQuery();

  const resetAudioPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.currentTime = 0;
    audio.src = "";
    audioRef.current = null;
  };

  const [filters, setFilters] = useState<ScenarioVoiceFilters>({
    providers: [],
    languages: [],
    genders: [],
    ages: [],
  });
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const addFilterBtnRef = useRef<HTMLButtonElement>(null);

  const { data: voicesResponse, isFetching: isQueryFetching } = useGetScenarioVoicesQuery({
    searchName: debouncedSearchQuery,
    limit,
    offset,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
    providers: filters.providers.length > 0 ? filters.providers : undefined,
    languageIds: filters.languages.length > 0 ? filters.languages.map(Number) : undefined,
    genders: filters.genders.length > 0 ? filters.genders : undefined,
    ages: filters.ages.length > 0 ? filters.ages : undefined,
  });

  useEffect(() => {
    setIsFetching(isQueryFetching);
  }, [isQueryFetching]);

  useEffect(() => {
    return () => {
      resetAudioPlayback();
      Object.values(previewUrlCacheRef.current).forEach(url => URL.revokeObjectURL(url));
      previewUrlCacheRef.current = {};
    };
  }, []);

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

  const handleApplyFilters = (newFilters: ScenarioVoiceFilters) => {
    setFilters(newFilters);
    setOffset(0);
    setIsFilterOpen(false);
    setVoices([]);
  };

  const filterChips = React.useMemo(() => {
    const chips: any[] = [];

    if (filters.providers.length > 0) {
      chips.push({
        label: "Provider",
        value: filters.providers.join(", "),
        allValue: filters.providers,
        onClear: () => {
          setFilters(prev => ({ ...prev, providers: [] }));
          setOffset(0);
          setVoices([]);
        },
      });
    }

    if (filters.languages.length > 0) {
      const labels = filters.languages.map(id => {
        const found = languageOptions.find((l: any) => String(l.language_id) === id);
        return found ? found.label : id;
      });

      chips.push({
        label: "Language",
        value: labels.join(", "),
        allValue: filters.languages,
        onClear: () => {
          setFilters(prev => ({ ...prev, languages: [] }));
          setOffset(0);
          setVoices([]);
        },
      });
    }

    const labelFor = (options: { label: string; value: string }[], values: string[]) =>
      values.map(v => options.find(o => o.value === v)?.label ?? v).join(", ");

    if (filters.genders.length > 0) {
      chips.push({
        label: "Gender",
        value: labelFor(VOICE_GENDER_FILTER_OPTIONS, filters.genders),
        allValue: filters.genders,
        onClear: () => {
          setFilters(prev => ({ ...prev, genders: [] }));
          setOffset(0);
          setVoices([]);
        },
      });
    }

    if (filters.ages.length > 0) {
      chips.push({
        label: "Age",
        value: labelFor(VOICE_AGE_FILTER_OPTIONS, filters.ages),
        allValue: filters.ages,
        onClear: () => {
          setFilters(prev => ({ ...prev, ages: [] }));
          setOffset(0);
          setVoices([]);
        },
      });
    }

    return chips;
  }, [filters, languageOptions]);

  const addFilterCta = React.useMemo(
    () => ({
      label: "Filter",
      onClick: () => setIsFilterOpen(prev => !prev),
      active: isFilterOpen,
    }),
    [isFilterOpen],
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setOffset(0);
  };

  const handleNewVoiceClick = () => {
    // Empty config on purpose: the side panel builds the right keys from the
    // provider's schema. The old placeholder ({age, gender, name, model,
    // voiceId}) matched no provider — `name` is read by nothing and `voiceId`
    // only works for ElevenLabs — so filling in its blanks produced a voice that
    // silently fell back to a default Deepgram voice at runtime.
    const newVoiceData: ScenarioVoice = {
      name: "",
      provider: "",
      languageId: undefined,
      config: {},
      active: true,
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
            active: voiceData.active,
          },
        });
        if (response.error) {
          toast.error(getVoiceSaveErrorMessage(response.error));
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
          toast.error(getVoiceSaveErrorMessage(response.error));
        } else {
          toast.success(en.simulation.voiceCreatedSuccessfully);
          handleSidePanelClose();
        }
      }
    } catch {
      toast.error(en.errors.failedToSaveVoice);
    }
  };

  const handleLoadMore = () => {
    if (isFetching || !hasMore) return;
    setOffset(prev => prev + limit);
  };

  const handlePausePreview = () => {
    resetAudioPlayback();
    setPlayingVoiceId(null);
    setLoadingVoiceId(null);
  };

  const handlePlayPreview = async (voice: ScenarioVoice) => {
    const voiceId = voice.id;
    if (!voiceId) {
      toast.error("Voice preview is unavailable for unsaved voices");
      return;
    }

    if (playingVoiceId === voiceId) {
      handlePausePreview();
      return;
    }

    resetAudioPlayback();

    setPlayingVoiceId(voiceId);

    try {
      let previewUrl = previewUrlCacheRef.current[voiceId];

      if (!previewUrl) {
        setLoadingVoiceId(voiceId);
        const result = await getPreviewVoice({ voiceId }).unwrap();
        previewUrl = URL.createObjectURL(new Blob([result]));
        previewUrlCacheRef.current[voiceId] = previewUrl;
      } else {
        setLoadingVoiceId(null);
      }

      const audio = new Audio(previewUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceId(current => (current === voiceId ? null : current));
        setLoadingVoiceId(current => (current === voiceId ? null : current));
      };

      audio.onerror = () => {
        setPlayingVoiceId(current => (current === voiceId ? null : current));
        setLoadingVoiceId(current => (current === voiceId ? null : current));
        toast.error("Failed to load voice preview");
      };

      await audio.play();
      setLoadingVoiceId(null);
    } catch {
      setPlayingVoiceId(current => (current === voiceId ? null : current));
      setLoadingVoiceId(current => (current === voiceId ? null : current));
      toast.error("Failed to load voice preview");
    }
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
      let parsedValue = value;

      if (columnId === "language") {
        // Language field comes as language_id from API, convert to number
        parsedValue = typeof value === "string" ? parseInt(value, 10) : value;
      }

      const response = await updateScenarioVoice({
        id: originalVoice.id,
        voice: {
          name: columnId === "name" ? parsedValue : originalVoice.name,
          provider: columnId === "provider" ? parsedValue : originalVoice.provider,
          languageId: columnId === "language" ? parsedValue : originalVoice.languageId,
          config: originalVoice.config,
          active: columnId === "active" ? parsedValue : originalVoice.active,
        },
      });

      if (response.error) {
        toast.error(getVoiceSaveErrorMessage(response.error));
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
      toast.error(en.errors.failedToSaveVoice);
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

  // Providers offered for filtering: the ones the runtime supports, plus any
  // legacy value already stored on a row so those rows stay findable.
  const uniqueProviders = React.useMemo(() => {
    const supported = TTS_PROVIDER_OPTIONS.map(option => option.value);
    const stored = voices.map(voice => voice.provider).filter(Boolean) as string[];
    return Array.from(new Set([...supported, ...stored]));
  }, [voices]);

  // Build a combined language options list for the table — includes active languages
  // plus any inactive languages already assigned to a voice (resolved via languageLabel
  // from the backend), so disabled languages show their name instead of a raw ID.
  const allLanguageOptionsForTable = React.useMemo(() => {
    const optionsMap = new Map(languageOptions.map((l: any) => [l.language_id, l.label]));
    voices.forEach(voice => {
      if (voice.languageId && voice.languageLabel && !optionsMap.has(voice.languageId)) {
        optionsMap.set(voice.languageId, voice.languageLabel);
      }
    });
    return Array.from(optionsMap.entries()).map(([value, label]) => ({ value, label }));
  }, [languageOptions, voices]);

  // Create dynamic columns with language and provider options
  const tableColumns = SCENARIO_VOICE_COLUMNS.map(column => {
    if (column.id === "language") {
      return {
        ...column,
        options: allLanguageOptionsForTable,
      };
    }
    if (column.id === "provider") {
      return {
        ...column,
        options: uniqueProviders.map((provider: string) => ({
          value: provider,
          label: isSupportedProvider(provider) ? provider : `${provider} (unsupported)`,
        })),
      };
    }
    return column;
  });

  const formatTableData = voices.map(voice => {
    const gender = voice.config?.gender;
    const formatted = {
      ...voice,
      preview: {
        isPlaying: playingVoiceId === voice.id,
        isLoading: loadingVoiceId === voice.id,
        disabled: !voice.id,
        onPlay: () => handlePlayPreview(voice),
        onPause: handlePausePreview,
      },
      createdAt: new Date(voice.createdAt).toLocaleDateString(),
      // A missing gender is worth calling out: ally-be only offers a language
      // for simulation creation when it has both a male and a female voice.
      gender: gender ? String(gender) : "⚠️ Not set",
      config: summarizeVoiceConfig(voice.provider, voice.config),
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
          filterChips={filterChips}
          addFilterCta={addFilterCta}
          addFilterButtonRef={addFilterBtnRef}
        />
        <FilterDropdown<ScenarioVoiceFilters>
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          currentFilters={filters}
          onApplyFilters={handleApplyFilters}
          anchorRect={addFilterBtnRef.current?.getBoundingClientRect() ?? null}
          sections={[
            {
              id: "providers",
              label: "Provider",
              options: uniqueProviders.map(p => ({ label: p, value: p })),
            },
            {
              id: "languages",
              label: "Language",
              options: languageOptions.map((l: any) => ({
                label: l.label,
                value: String(l.language_id),
              })),
            },
            {
              id: "genders",
              label: "Gender",
              options: VOICE_GENDER_FILTER_OPTIONS,
            },
            {
              id: "ages",
              label: "Age",
              options: VOICE_AGE_FILTER_OPTIONS,
            },
          ]}
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
        />
      )}
    </div>
  );
};
