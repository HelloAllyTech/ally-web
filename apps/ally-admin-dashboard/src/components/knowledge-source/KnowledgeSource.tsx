import { useState } from "react";

import { Controller } from "react-hook-form";
import { toast } from "sonner";

import { TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import { Close, Delete, Plus, Search } from "@assets";
import { en, ENHANCE_TYPE } from "@constants";

import { EnhanceButton } from "../enhance-button";

/**
 * How many knowledge documents to generate when the form is empty and the
 * user clicks Generate. Chosen to match the typical authored set (see
 * studio screenshots: 5 docs across themes — relational, interior life,
 * life context). Users can adjust the count by clicking + Add before
 * generating; the LLM produces exactly the current count.
 */

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

  // ------------------------------------------------------------------------

  const renderKnowledgeSources = () => {
    return (
      <div className="w-[35%] min-w-[150px] max-w-[280px] shrink-0 overflow-hidden border-r border-border-light flex flex-col">
        <div className="p-4 border-b border-border-light">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-typography-900 text-md">
              Documents ({knowledgeSources.length})
            </span>
            <Tooltip label={en.knowledgeSource.addNewTab} align="top">
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
              className="w-full rounded bg-background-secondary py-2 pl-10 pr-3 text-sm focus:outline-none"
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

                  <Tooltip label={en.knowledgeSource.remove} align="top">
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
              <TextArea
                id="knowledge-source-content"
                labelText={en.knowledgeSource.content}
                hideLabel
                maxLength={MAX_CONTENT_LENGTH}
                value={activeTab.content}
                onChange={handleContentChange}
                placeholder={en.knowledgeSource.content}
                rows={12}
                className="w-full flex-1 min-h-0"
              />

              {/* Character Count and Delete Button */}
              <div className="flex-shrink-0 flex items-center justify-end gap-3 pt-1">
                <span className="text-typography-500 text-sm">
                  {activeTab.content.length}/{MAX_CONTENT_LENGTH}
                </span>
                <Tooltip label={en.knowledgeSource.deleteContent} align="top">
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <label className="text-typography-900 text-base flex items-center gap-2">
          {label} {isMandatory && <span className="text-destructive-500">*</span>}
        </label>
        {activeTab && (
          <EnhanceButton
            enhanceType={ENHANCE_TYPE.KNOWLEDGE_SOURCES}
            label={en.knowledgeSource.label}
            currentValue={activeTab.content}
            onApply={improved => handleUpdateTab(activeTabIndex, "content", improved)}
          />
        )}
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
