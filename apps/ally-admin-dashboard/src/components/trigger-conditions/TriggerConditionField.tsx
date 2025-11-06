import React from "react";

import { AutoExpandableTextarea } from "@components";
import { NumberInput } from "@components/notion-table";
import { TRIGGER_FIELD_TYPES } from "@constants/TriggerConditionsConfig";

import { TriggerConditionDropdown } from "./TriggerConditionDropdown";

interface TriggerConditionFieldProps {
  field: {
    id: string;
    type: string;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
    className?: string;
    defaultValue?: any;
    labelAfter?: string; // Text to display after this field (e.g., "says" after speaker)
  };
  value: any;
  onChange: (fieldId: string, value: any) => void;
  isInTable?: boolean;
}

export const TriggerConditionField: React.FC<TriggerConditionFieldProps> = ({
  field,
  value,
  onChange,
  isInTable = false,
}) => {
  const fieldValue = value ?? field.defaultValue;

  const renderField = () => {
    switch (field.type) {
      case TRIGGER_FIELD_TYPES.TEXT:
        return null; // Not used in current implementation

      case TRIGGER_FIELD_TYPES.NUMBER:
        return (
          <NumberInput
            value={fieldValue || 0}
            onChange={numValue => onChange(field.id, numValue)}
            className="px-2 py-1 text-sm border h-6 rounded-sm bg-gray-100 w-[60px]"
            inputClassName="w-auto min-w-0 pr-6 py-0 text-sm"
            spinnerClassName="!left-auto right-1 flex flex-col gap-0.5"
          />
        );

      case TRIGGER_FIELD_TYPES.TIME:
        return (
          <input
            type="text"
            value={fieldValue || field.placeholder || "00:20:00"}
            onChange={e => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || "00:20:00"}
            pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"
            className="px-3 py-2 text-sm border h-6 rounded-sm bg-gray-100 w-[80px]"
          />
        );

      case TRIGGER_FIELD_TYPES.SELECT:
      case TRIGGER_FIELD_TYPES.OPERATOR_DROPDOWN:
      case TRIGGER_FIELD_TYPES.SPEAKER_DROPDOWN:
      case TRIGGER_FIELD_TYPES.STATUS_DROPDOWN:
        return (
          <TriggerConditionDropdown
            value={fieldValue || ""}
            options={field.options || []}
            onChange={newValue => onChange(field.id, newValue)}
            placeholder={field.placeholder || "Select"}
            disabled={false}
            className={field.className || ""}
          />
        );

      case TRIGGER_FIELD_TYPES.MULTILINE_TEXT: {
        const sentencesArray = Array.isArray(fieldValue) ? fieldValue : [];
        const sentencesText = sentencesArray.join("\n");

        // In table mode, use single-line input instead of textarea
        if (isInTable) {
          return (
            <div className="flex-1">
              <input
                type="text"
                value={sentencesText}
                onChange={e => {
                  // For single-line input, treat as single sentence
                  onChange(field.id, e.target.value ? [e.target.value] : []);
                }}
                placeholder={field.placeholder}
                className="px-3 py-2 text-sm border-[0.5px] border-gray-300 bg-white focus:outline-none focus:border-blue-500 h-6 rounded-sm w-full"
              />
            </div>
          );
        }

        return (
          <div className="flex-1">
            <AutoExpandableTextarea
              value={sentencesText}
              onChange={textareaValue => {
                // Split by newline and keep all lines (including empty ones)
                // Filter empty lines only when saving/submitting, not during editing
                const newSentencesArray = textareaValue.split("\n");
                onChange(field.id, newSentencesArray);
              }}
              placeholder={field.placeholder}
              disabled={false}
              minHeight={350}
              className="px-3 py-2 text-sm border-[0.5px] border-gray-300 bg-white focus:outline-none"
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderedField = renderField();

  if (!renderedField) return null;

  return (
    <>
      {renderedField}
      {field.labelAfter && (
        <span className="text-sm text-gray-500 flex-shrink-0">{field.labelAfter}</span>
      )}
    </>
  );
};
