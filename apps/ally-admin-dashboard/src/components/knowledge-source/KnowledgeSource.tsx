import { useCallback, useState } from "react";

import { Tooltip } from "@mui/material";
import { Controller } from "react-hook-form";
import { toast } from "sonner";

import { useGetAutofillModelsQuery, useRegenerateFieldMutation } from "@api";
import { Close, Delete, Plus, Search, WandStars } from "@assets";
import { AutofillModelSelect } from "@components/autofill-model-select";
import {
  DEFAULT_AUTOFILL_MODEL,
  FALLBACK_AUTOFILL_MODEL_OPTIONS,
  REGENERATE_TYPE,
  en,
} from "@constants";

/**
 * How many knowledge documents to generate when the form is empty and the
 * user clicks Generate. Chosen to match the typical authored set (see
 * studio screenshots: 5 docs across themes — relational, interior life,
 * life context). Users can adjust the count by clicking + Add before
 * generating; the LLM produces exactly the current count.
 */
const DEFAULT_GENERATE_COUNT = 5;

interface KnowledgeSourceItem {
  id: string;
  title: string;
  content: string;
}

interface KnowledgeSourceProps {
  id: string;
  formMethods: any;
  isMandatory?: boolean;
  label?: string;
}

const MAX_CONTENT_LENGTH = 2500;

export const KnowledgeSource: React.FC<KnowledgeSourceProps> = ({
  id,
  formMethods,
  isMandatory = false,
  label = en.knowledgeSource.label,
}) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = formMethods;

  const knowledgeSources = getValues(id) || [];

  const filteredSources = knowledgeSources.filter((item: KnowledgeSourceItem) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const activeTab = knowledgeSources[activeTabIndex];

  const handleAddTab = () => {
    if (activeTab && (activeTab.title.trim() === "" || activeTab.content.trim() === "")) {
      toast.error(en.knowledgeSource.titleAndContentRequired);
      return;
    }
    const newTab: KnowledgeSourceItem = {
      id: crypto.randomUUID(),
      title: "",
      content: "",
    };
    const updatedSources = [newTab, ...knowledgeSources];
    setValue(id, updatedSources);
    setActiveTabIndex(0);
  };

  const handleRemoveTab = (event: React.MouseEvent<HTMLButtonElement>, tabId: string) => {
    event.stopPropagation();

    const removedIndex = knowledgeSources.findIndex(
      (item: KnowledgeSourceItem) => item.id === tabId,
    );
    const updatedSources = knowledgeSources.filter(
      (item: KnowledgeSourceItem) => item.id !== tabId,
    );
    setValue(id, updatedSources);

    if (removedIndex === activeTabIndex) {
      setActiveTabIndex(Math.max(0, activeTabIndex - 1));
    } else if (removedIndex < activeTabIndex) {
      setActiveTabIndex(activeTabIndex - 1);
    }

    setSearchTerm("");
  };

  const handleUpdateTab = (index: number, field: "title" | "content", value: string) => {
    const updatedSources = [...knowledgeSources];
    updatedSources[index] = {
      ...updatedSources[index],
      [field]: value,
    };
    setValue(id, updatedSources);
  };

  const handleDeleteAllContent = () => {
    handleUpdateTab(activeTabIndex, "title", "");
    handleUpdateTab(activeTabIndex, "content", "");
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;

    handleUpdateTab(activeTabIndex, "content", value);
  };

  // ---- Autofill (Generate / Regenerate) ----------------------------------
  // Mirrors StatesEditor's local-autofill pattern (rather than reusing the
  // shared RegenerateButton) because knowledge sources need custom request
  // context (numKnowledgeSources, existingKnowledgeSources) and a bespoke
  // merge that handles blank tabs.
  const [regenerateField] = useRegenerateFieldMutation();
  const { data: apiModels } = useGetAutofillModelsQuery();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);
  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const selectedProvider =
    allModelOptions.find(m => m.value === selectedModel)?.provider ?? "openai";

  // A document is "blank" when its title is empty/whitespace. Keying off
  // title (not OR over content) mirrors StatesEditor's rule: title is the
  // canonical "incomplete" signal because the retrieval LLM uses titles
  // to pick relevant documents.
  const isBlankSource = useCallback((s: KnowledgeSourceItem) => !s?.title?.trim(), []);

  const blankCount = knowledgeSources.filter(isBlankSource).length;
  const allBlank = knowledgeSources.length === 0 || blankCount === knowledgeSources.length;
  const anyFilled = blankCount < knowledgeSources.length;

  const generateLabel = isGenerating
    ? "Generating…"
    : allBlank
      ? "Generate"
      : anyFilled && blankCount > 0
        ? "Fill blanks"
        : "Regenerate";

  const buildScenarioContext = useCallback(() => {
    const values = formMethods.getValues();
    return {
      title: values.title,
      name: values.name,
      age: values.age,
      gender: values.gender,
      genderIdentity: values.genderIdentity,
      sexualOrientation: values.sexualOrientation,
      profession: values.profession,
      currentLocation: values.currentLocation,
      competency: values.competency?.name,
      characterProfileText: values.characterProfileText,
      challengeDescription: values.description,
    };
  }, [formMethods]);

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;

    // Mode selection mirrors StatesEditor:
    //   - All blank / empty → produce DEFAULT_GENERATE_COUNT fresh docs
    //   - Some blank + some filled → fill only the blanks (preserve filled)
    //   - All filled → re-roll the whole set
    let numToGenerate: number;
    if (knowledgeSources.length === 0) {
      numToGenerate = DEFAULT_GENERATE_COUNT;
    } else if (anyFilled && blankCount > 0) {
      numToGenerate = blankCount;
    } else {
      numToGenerate = knowledgeSources.length;
    }

    const filledForContext = knowledgeSources.filter((s: KnowledgeSourceItem) => !isBlankSource(s));
    const existingTitlesJson =
      filledForContext.length > 0
        ? JSON.stringify(
            filledForContext.map((s: KnowledgeSourceItem) => ({
              title: s.title,
            })),
          )
        : "";

    setIsGenerating(true);
    try {
      const response = await regenerateField({
        fieldName: REGENERATE_TYPE.KNOWLEDGE_SOURCES,
        scenarioContext: {
          ...buildScenarioContext(),
          numKnowledgeSources: numToGenerate,
          existingKnowledgeSources: existingTitlesJson,
        },
        model: selectedModel,
        provider: selectedProvider,
      }).unwrap();

      // Backend `extractContent` returns `KnowledgeSourceAutofillItem[]`
      // directly as `response.content`. Tolerate both shapes for safety.
      const raw = response.content;
      const generated: Array<{ title: string; content: string }> = Array.isArray(raw)
        ? (raw as Array<{ title: string; content: string }>)
        : Array.isArray((raw as { sources?: unknown })?.sources)
          ? (raw as { sources: Array<{ title: string; content: string }> }).sources
          : [];

      if (generated.length === 0) {
        toast.error("Generation returned no documents. Try a different model.");
        return;
      }

      // ID assignment is client-side; the LLM doesn't produce ids.
      const withIds: KnowledgeSourceItem[] = generated.map(g => ({
        id: crypto.randomUUID(),
        title: g.title ?? "",
        content: g.content ?? "",
      }));

      let next: KnowledgeSourceItem[];
      if (knowledgeSources.length === 0) {
        // Empty form → replace with generated set wholesale.
        next = withIds;
      } else if (anyFilled && blankCount > 0) {
        // Fill-blanks: walk the array, replace blank tabs with generated
        // entries in order, preserving filled tabs (keeping their ids).
        let cursor = 0;
        next = knowledgeSources.map((s: KnowledgeSourceItem) => {
          if (!isBlankSource(s) || cursor >= withIds.length) return s;
          const gen = withIds[cursor];
          cursor += 1;
          return { ...s, title: gen.title, content: gen.content };
        });
      } else {
        // All filled → re-roll wholesale.
        next = withIds;
      }

      setValue(id, next, { shouldDirty: true });
      // Reset selection to the first tab so the user sees a fresh card.
      setActiveTabIndex(0);
      toast.success("Knowledge sources generated.");
    } catch {
      toast.error("Failed to generate knowledge sources.");
    } finally {
      setIsGenerating(false);
    }
  }, [
    isGenerating,
    knowledgeSources,
    anyFilled,
    blankCount,
    isBlankSource,
    regenerateField,
    buildScenarioContext,
    selectedModel,
    selectedProvider,
    setValue,
    id,
  ]);
  // ------------------------------------------------------------------------

  const renderAutofillControls = (compact = false) => (
    <div className="flex items-center gap-3">
      <AutofillModelSelect
        value={selectedModel}
        onChange={setSelectedModel}
        disabled={isGenerating}
      />
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`flex items-center gap-1 ${
          compact ? "text-xs" : "text-sm"
        } border rounded-2xl px-2 py-1 transition-opacity ${
          isGenerating
            ? "text-primary-300 border-primary-300 cursor-not-allowed"
            : "text-primary-500 border-primary-500 hover:bg-primary-50 cursor-pointer"
        } ${isGenerating ? "animate-fadeInOut" : ""}`}
        title={
          isGenerating
            ? ""
            : "Generate knowledge source documents from scenario context (description, character profile, competency). Use + to control the count first."
        }
      >
        {isGenerating ? (
          <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
        ) : (
          <WandStars />
        )}{" "}
        {generateLabel}
      </button>
    </div>
  );

  const renderKnowledgeSources = () => {
    return (
      <div className="w-[35%] min-w-[150px] max-w-[280px] shrink-0 overflow-hidden border-r border-border-light flex flex-col">
        <div className="p-4 border-b border-border-light">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-typography-900 text-md">
              Documents ({knowledgeSources.length})
            </span>
            <Tooltip title={en.knowledgeSource.addNewTab} placement="top" arrow>
              <button
                type="button"
                onClick={handleAddTab}
                className="w-6 h-6 rounded-sm border border-border-light hover:bg-background-secondary flex items-center justify-center text-typography-600 hover:text-typography-900 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-typography-500"
              aria-hidden
            />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={en.knowledgeSource.search}
              className="w-full rounded border border-border-light bg-white py-2 pl-10 pr-3 text-sm"
            />
          </div>
        </div>

        {/* Tab List - Vertical */}
        <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {filteredSources.map((item: KnowledgeSourceItem) => {
            const actualIndex = knowledgeSources.findIndex(
              (source: KnowledgeSourceItem) => source.id === item.id,
            );
            return (
              <div key={item.id} className="relative group">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTabIndex(actualIndex)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveTabIndex(actualIndex);
                    }
                  }}
                  className={`w-full min-w-0 px-4 py-3 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    activeTabIndex === actualIndex
                      ? "bg-background-secondary text-typography-900"
                      : "text-typography-700 hover:bg-background-tertiary"
                  }`}
                >
                  <span className="text-base truncate pr-2 min-w-0 flex-1">
                    {item.title || "Untitled"}
                  </span>

                  <Tooltip title={en.knowledgeSource.remove} placement="top" arrow>
                    <button
                      type="button"
                      onClick={event => handleRemoveTab(event, item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-typography-500 hover:text-destructive-500 text-lg leading-none flex-shrink-0"
                    >
                      <Close className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCreateKnowledgeSource = () => {
    return (
      <div className="flex-1 min-w-0 h-full p-3 overflow-hidden">
        {activeTab ? (
          <div className="flex flex-col gap-1 h-full min-h-0">
            <div className="flex-shrink-0 min-w-0 overflow-hidden">
              <input
                type="text"
                value={activeTab.title}
                onChange={e => handleUpdateTab(activeTabIndex, "title", e.target.value)}
                placeholder={en.knowledgeSource.title}
                className="w-full min-w-0 rounded border-none bg-white p-1 text-base focus:outline-none"
              />
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <textarea
                maxLength={MAX_CONTENT_LENGTH}
                value={activeTab.content}
                onChange={handleContentChange}
                placeholder={en.knowledgeSource.content}
                className="w-full flex-1 min-h-0 rounded border-none p-1 bg-white text-base resize-none focus:outline-none overflow-y-auto"
              />

              {/* Character Count and Delete Button */}
              <div className="flex-shrink-0 flex items-center justify-end gap-3 pt-1">
                <span className="text-typography-500 text-sm">
                  {activeTab.content.length}/{MAX_CONTENT_LENGTH}
                </span>
                <Tooltip title={en.knowledgeSource.deleteContent} placement="top" arrow>
                  <button
                    type="button"
                    onClick={handleDeleteAllContent}
                    className="text-destructive-500 hover:text-destructive-600 transition-colors"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-typography-600 text-sm">
              {en.knowledgeSource.selectTabToViewContent}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (!knowledgeSources || knowledgeSources.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <label className="text-typography-900 text-base flex items-center gap-2">
            {label} {isMandatory && <span className="text-destructive-500">*</span>}
          </label>
          {renderAutofillControls()}
        </div>
        <button
          type="button"
          onClick={handleAddTab}
          className="w-fit border border-dashed px-4 py-2 flex text-typography-700 gap-3 items-center text-xs"
        >
          <Plus />
          {en.knowledgeSource.createKnowledgeSource}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <label className="text-typography-900 text-base cursor-pointer flex items-center gap-2">
          {label} {isMandatory && <span className="text-destructive-500">*</span>}
        </label>
        {renderAutofillControls()}
      </div>

      <Controller
        name={id}
        control={control}
        defaultValue={knowledgeSources}
        rules={{ required: isMandatory ? `${label} is required` : false }}
        render={() => (
          <div className="bg-white border border-border-light rounded-sm-">
            <div className="flex w-full min-w-0 gap-0 h-[360px] overflow-hidden">
              {renderKnowledgeSources()}
              {renderCreateKnowledgeSource()}
            </div>
          </div>
        )}
      />

      {errors && errors[id] && (
        <p className="text-destructive-500 text-sm mt-1">{errors[id]?.message}</p>
      )}
    </div>
  );
};
