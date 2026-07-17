import React, { useCallback } from "react";

import { AutoExpandableTextarea, TextArea } from "@ally-ui-mono/ui-shared";
import { NumberInput, TimeInput } from "@components";
import { TRIGGER_FIELD_TYPES } from "@constants";

import { TriggerConditionDropdown } from "./TriggerConditionDropdown";

interface TriggerConditionFieldProps {
  field: {
    id: string;
    type: string;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
    className?: string;
    defaultValue?: any;
    labelAfter?: string;
  };
  value: any;
  onChange: (fieldId: string, value: any) => void;
  isInTable?: boolean;
}

// This is just a read-only display since EditableTriggerConditionsPopup handles all editing
const TableSentenceInput: React.FC<{
  value: string;
  placeholder?: string;
  onChange: (value: string[]) => void;
  isInTable?: boolean;
}> = ({ value, placeholder }) => {
  return (
    <div className="flex-1 w-full flex items-center">
      <TextArea
        id="trigger-condition-sentence-display"
        labelText={placeholder || "Trigger condition"}
        hideLabel
        value={value}
        readOnly
        placeholder={placeholder}
        rows={1}
        className="w-full min-w-[230px] cursor-pointer"
      />
    </div>
  );
};

export const TriggerConditionField: React.FC<TriggerConditionFieldProps> = ({
  field,
  value,
  onChange,
  isInTable = false,
}) => {
  const fieldValue = value ?? field.defaultValue;

  const handleSentencesChange = useCallback(
    (textareaValue: string) => {
      const newSentencesArray = textareaValue.split("\n");
      onChange(field.id, newSentencesArray);
    },
    [field.id, onChange],
  );

  const renderField = () => {
    switch (field.type) {
      case TRIGGER_FIELD_TYPES.NUMBER:
        return (
          <NumberInput
            value={fieldValue !== undefined && fieldValue !== null ? fieldValue : undefined}
            onChange={numValue => onChange(field.id, numValue || 0)}
            placeholder={field.placeholder || "0"}
            className={`px-2 py-1 text-sm border h-6 rounded-sm w-[70px] ${isInTable ? "bg-neutral-100" : "bg-neutral-50 border"}`}
            inputClassName="w-auto min-w-0 pr-6 !py-0 text-sm"
            spinnerClassName="!left-auto right-1 !gap-0 px-2 !items-center"
          />
        );

      case TRIGGER_FIELD_TYPES.TIME:
        return (
          <TimeInput
            value={fieldValue || ""}
            onChange={value => onChange(field.id, value)}
            placeholder={field.placeholder || "hh:mm:ss"}
            className={`w-[100px] bg-[#F5F5F5] ${isInTable ? "bg-neutral-100" : "bg-neutral-50"}`}
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
            isInTable={isInTable}
          />
        );

      case TRIGGER_FIELD_TYPES.MULTILINE_TEXT: {
        const sentencesArray = Array.isArray(fieldValue) ? fieldValue : [];
        const sentencesText = sentencesArray.join("\n");

        // In table mode, show read-only display (editing happens in popup)
        if (isInTable) {
          return (
            <TableSentenceInput
              value={sentencesText}
              placeholder={field.placeholder}
              onChange={newValue => onChange(field.id, newValue)}
              isInTable={isInTable}
            />
          );
        }

        return (
          <div className="flex-1 max-w-[400px] border rounded">
            <div className="px-2 mt-[4px]">
              <AutoExpandableTextarea
                value={sentencesText}
                onChange={handleSentencesChange}
                placeholder={field.placeholder}
                disabled={false}
                minHeight={20}
                maxLines={20}
                className="text-sm focus:outline-none w-full !mt-0 placeholder:text-typography-500"
              />
            </div>
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
