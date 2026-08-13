import React from "react";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { TrashRed } from "@assets";
import { en } from "@constants";
import { CharacterKnowledgeSource } from "@types";

interface CharacterKnowledgeSourcesFieldProps {
  sources: CharacterKnowledgeSource[];
  onChange: (sources: CharacterKnowledgeSource[]) => void;
  maxCount?: number;
}

export const CharacterKnowledgeSourcesField: React.FC<CharacterKnowledgeSourcesFieldProps> = ({
  sources,
  onChange,
  maxCount = 50,
}) => {
  const handleTitleChange = (id: string, title: string) => {
    onChange(sources.map(source => (source.id === id ? { ...source, title } : source)));
  };

  const handleTextChange = (id: string, text: string) => {
    onChange(sources.map(source => (source.id === id ? { ...source, text } : source)));
  };

  const handleRemove = (id: string) => {
    onChange(sources.filter(source => source.id !== id));
  };

  const handleAdd = () => {
    onChange([...sources, { id: crypto.randomUUID(), title: "", text: "" }]);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {sources.map(source => (
        <div
          key={source.id}
          className="flex flex-col gap-2 border border-border-light rounded-md p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={source.title}
              onChange={e => handleTitleChange(source.id, e.target.value)}
              placeholder={en.simulation.knowledgeSourceTitlePlaceholder}
              className="flex-1 text-base font-medium bg-transparent border-none outline-none focus:ring-0 p-0"
            />
            <button
              type="button"
              onClick={() => handleRemove(source.id)}
              className="p-1 hover:bg-surface-100 rounded transition-colors"
              aria-label={`Remove ${source.title || "knowledge source"}`}
            >
              <TrashRed className="w-4 h-4 text-destructive-500" />
            </button>
          </div>
          <TextArea
            id={`knowledge-source-text-${source.id}`}
            labelText={source.title || "Knowledge source"}
            hideLabel
            value={source.text || ""}
            onChange={e => handleTextChange(source.id, e.target.value)}
            placeholder={en.simulation.knowledgeSourceTextPlaceholder}
            rows={3}
          />
        </div>
      ))}

      {sources.length < maxCount ? (
        <button
          type="button"
          onClick={handleAdd}
          className="self-start text-sm text-primary hover:text-primary-700"
        >
          + {en.simulation.addKnowledgeSource}
        </button>
      ) : (
        <span className="text-destructive-500 text-xs">* {en.simulation.knowledgeSourceLimit}</span>
      )}
    </div>
  );
};
