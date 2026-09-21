import React from "react";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { Delete } from "@assets";
import { characterLibraryStrings as strings } from "@constants";
import { CharacterKnowledgeSource } from "@types";

interface CharacterKnowledgeSourcesFieldProps {
  sources: CharacterKnowledgeSource[];
  onChange: (sources: CharacterKnowledgeSource[]) => void;
  maxCount?: number;
  /** Locks every source and drops the add/remove controls. */
  readOnly?: boolean;
}

/** Repeatable title+text list the interview agent / admin uses to ground the character. */
export const CharacterKnowledgeSourcesField: React.FC<CharacterKnowledgeSourcesFieldProps> = ({
  sources,
  onChange,
  maxCount = 50,
  readOnly = false,
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

  if (readOnly && sources.length === 0) {
    return <span className="text-typography-500 text-base">—</span>;
  }

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
              placeholder={strings.knowledgeSourceTitlePlaceholder}
              readOnly={readOnly}
              className="flex-1 text-base font-medium bg-transparent border-none outline-none focus:ring-0 p-0"
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleRemove(source.id)}
                className="p-1 hover:bg-surface-100 rounded transition-colors"
                aria-label={`Remove ${source.title || "knowledge source"}`}
              >
                <Delete className="w-4 h-4" />
              </button>
            )}
          </div>
          <TextArea
            id={`knowledge-source-text-${source.id}`}
            labelText={source.title || "Knowledge source"}
            hideLabel
            value={source.text || ""}
            onChange={e => handleTextChange(source.id, e.target.value)}
            placeholder={strings.knowledgeSourceTextPlaceholder}
            readOnly={readOnly}
            rows={3}
          />
        </div>
      ))}

      {/* See DialectSamplesField: a cap is a limit, not a failure. */}
      {!readOnly && (
        <>
          <button
            type="button"
            onClick={handleAdd}
            disabled={sources.length >= maxCount}
            className="self-start text-sm text-primary hover:text-primary-700 disabled:cursor-not-allowed disabled:text-typography-500 disabled:hover:text-typography-500"
          >
            + {strings.addKnowledgeSource}
          </button>
          {sources.length >= maxCount && (
            <span className="text-typography-600 text-xs">{strings.knowledgeSourceLimit}</span>
          )}
        </>
      )}
    </div>
  );
};
