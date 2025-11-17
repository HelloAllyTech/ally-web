import React, { useState, useEffect, useRef } from "react";

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
  isFocused?: boolean;
}

// Separate component for table input to use hooks properly
// Uses AutoExpandableTextarea - always rendered but collapsed when not focused
const TableSentenceInput: React.FC<{
  value: string;
  placeholder?: string;
  onChange: (value: string[]) => void;
  isFocused?: boolean;
}> = ({ value, placeholder, onChange, isFocused = false }) => {
  const [localValue, setLocalValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync local state when prop value changes (from external updates)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-focus when becomes focused
  useEffect(() => {
    if (isFocused) {
      const textarea = wrapperRef.current?.querySelector("textarea");
      if (textarea && document.activeElement !== textarea) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          textarea.focus();
          // Select all text for better UX
          (textarea as HTMLTextAreaElement).select();
        });
      }
    }
  }, [isFocused]);

  return (
    <div ref={wrapperRef} className="flex-1 w-full flex items-center">
      {!isFocused ? (
        // Collapsed view - single line with fixed height
        <textarea
          value={localValue}
          readOnly
          onClick={e => e.currentTarget.focus()}
          placeholder={placeholder}
          className="px-3 py-2 text-sm bg-neutral-50 border rounded-sm w-full min-w-[240px] resize-none overflow-hidden cursor-pointer focus:outline-none"
          style={{
            height: "24px",
            lineHeight: "20px",
            paddingTop: "2px",
            paddingBottom: "2px",
          }}
        />
      ) : (
        // Expanded view - fully auto-expanding textarea without scrollbar
        <AutoExpandableTextarea
          value={localValue}
          onChange={newValue => {
            setLocalValue(newValue);
          }}
          onBlur={e => {
            // Only call onChange on blur to avoid lag (like EditableTextPopup)
            onChange(localValue ? [localValue] : []);
          }}
          onKeyDown={e => {
            // Allow Enter for new lines, Ctrl/Cmd+Enter to blur
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          placeholder={placeholder}
          disabled={false}
          minHeight={24}
          maxLines={100}
          autoFocus={true}
          className="px-3 mt-[-2px] text-sm border focus:outline-none focus:border-blue-500 rounded-sm w-full leading-tight !overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        />
      )}
    </div>
  );
};

export const TriggerConditionField: React.FC<TriggerConditionFieldProps> = ({
  field,
  value,
  onChange,
  isInTable = false,
  isFocused = false,
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
            className="px-2 py-1 text-sm border h-6 rounded-sm bg-neutral-50 w-[60px]"
            inputClassName="w-auto min-w-0 pr-6 py-0 text-sm"
            spinnerClassName="!left-auto right-1 !gap-0 px-2 !items-center"
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
            className="px-3 py-2 text-sm border h-6 rounded-sm bg-neutral-50 w-[80px]"
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

        // In table mode, use AutoExpandableTextarea with collapsed view when not focused
        if (isInTable) {
          return (
            <TableSentenceInput
              value={sentencesText}
              placeholder={field.placeholder}
              onChange={newValue => onChange(field.id, newValue)}
              isFocused={isFocused}
            />
          );
        }

        return (
          <div className="flex-1 max-w-[400px] mt-2">
            <AutoExpandableTextarea
              value={sentencesText}
              onChange={textareaValue => {
                const newSentencesArray = textareaValue.split("\n");
                onChange(field.id, newSentencesArray);
              }}
              placeholder={field.placeholder}
              disabled={false}
              minHeight={20}
              className="px-3 py-1 text-sm border-[0.5px] border-gray-300 bg-white focus:outline-none w-full"
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
        <span className="text-sm text-typography-500 flex-shrink-0">{field.labelAfter}</span>
      )}
    </>
  );
};
