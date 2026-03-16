import { useState } from "react";

import { Controller } from "react-hook-form";

import { Close, Delete, Plus, Search } from "@assets";
import { en } from "@constants";

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

const MAX_CONTENT_LENGTH = 250;

export const KnowledgeSource: React.FC<KnowledgeSourceProps> = ({
  id,
  formMethods,
  isMandatory = false,
  label = en.knowledgeSource.label,
}) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [showRemoveTooltip, setShowRemoveTooltip] = useState<string | null>(null);
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

    if (knowledgeSources.length <= 1) return;

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

    setShowRemoveTooltip(null);
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
    if (value.length <= MAX_CONTENT_LENGTH) {
      handleUpdateTab(activeTabIndex, "content", value);
    }
  };

  const renderKnowledgeSources = () => {
    return (
      <div className="w-[35%] min-w-[150px] border-r border-border-light flex flex-col">
        <div className="p-4 border-b border-border-light">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-typography-900 text-md">
              Tabs <span className="text-primary-500">{knowledgeSources.length}</span>
            </span>
            <button
              type="button"
              onClick={handleAddTab}
              className="w-6 h-6 rounded border border-border-light hover:bg-background-secondary flex items-center justify-center text-typography-600 hover:text-typography-900 transition-colors"
              title={en.knowledgeSource.addNewTab}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-typography-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={en.knowledgeSource.search}
              className="w-full pl-10 pr-3 py-2 rounded border border-border-light bg-white text-sm"
            />
          </div>
        </div>

        {/* Tab List - Vertical */}
        <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {filteredSources.map((item: KnowledgeSourceItem) => {
            const actualIndex = knowledgeSources.findIndex(
              (source: KnowledgeSourceItem) => source.id === item.id,
            );
            return (
              <div
                key={item.id}
                className="relative group"
                onMouseEnter={() => setShowRemoveTooltip(item.id)}
                onMouseLeave={() => setShowRemoveTooltip(null)}
              >
                <button
                  type="button"
                  onClick={() => setActiveTabIndex(actualIndex)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors border-b border-border-light ${
                    activeTabIndex === actualIndex
                      ? "bg-background-secondary text-typography-900"
                      : "text-typography-700 hover:bg-background-tertiary"
                  }`}
                >
                  <span className="text-base truncate pr-2">{item.title || "Untitled"}</span>
                  {knowledgeSources.length > 1 && (
                    <button
                      type="button"
                      onClick={event => handleRemoveTab(event, item.id)}
                      className="text-typography-500 hover:text-destructive-500 text-lg leading-none flex-shrink-0"
                    >
                      <Close className="w-4 h-4" />
                    </button>
                  )}
                </button>

                {/* Remove Tooltip */}
                {showRemoveTooltip === item.id && knowledgeSources.length > 1 && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-typography-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
                    {en.knowledgeSource.remove}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCreateKnowledgeSource = () => {
    return (
      <div className="flex-1 h-full p-3 relative">
        {activeTab ? (
          <div className="flex flex-col gap-1 h-full">
            <div className="flex flex-col">
              <input
                type="text"
                value={activeTab.title}
                onChange={e => handleUpdateTab(activeTabIndex, "title", e.target.value)}
                placeholder={en.knowledgeSource.title}
                className="w-full rounded border-none bg-white p-1 text-base focus:outline-none"
              />
            </div>

            <div className="flex flex-col relative h-full">
              <textarea
                value={activeTab.content}
                onChange={handleContentChange}
                placeholder={en.knowledgeSource.content}
                rows={8}
                className="w-full rounded border-none p-1  bg-white text-base resize-none focus:outline-none"
              />

              {/* Character Count and Delete Button */}
              <div className="absolute bottom-0 right-0 z-10">
                <div className="flex items-center gap-3">
                  <span className="text-typography-500 text-sm">
                    {activeTab.content.length}/{MAX_CONTENT_LENGTH}
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteAllContent}
                    className="text-destructive-500 hover:text-destructive-600 transition-colors"
                    title={en.knowledgeSource.deleteContent}
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>
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
      <button
        type="button"
        onClick={handleAddTab}
        className="w-fit border border-dashed px-4 py-2 flex text-typography-700 gap-3 items-center text-xs"
      >
        <Plus />
        {en.knowledgeSource.createKnowledgeSource}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <label className="text-typography-900 text-base cursor-pointer flex items-center gap-2">
          {label} {isMandatory && <span className="text-destructive-500">*</span>}
        </label>
      </div>

      <Controller
        name={id}
        control={control}
        defaultValue={knowledgeSources}
        rules={{ required: isMandatory ? `${label} is required` : false }}
        render={() => (
          <div className="bg-white border border-border-light rounded-lg">
            <div className="flex gap-0 h-[270px]">
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
