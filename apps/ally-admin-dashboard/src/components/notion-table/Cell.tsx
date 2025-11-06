import React, { useEffect, useState, useRef } from "react";

import { EmojiPickerComponent, TriggerConditions } from "@components";
import {
  EditableTextPopup,
  NumberInput,
  TextDropdown,
  Switch,
  SelectComponent,
} from "@components/notion-table";
import { formatCapitalizedEnum } from "@utils";

import { cellTypes } from "./utils";

export const Cell = ({
  value: initialValue,
  rowIndex: index,
  column: { dataType, options, minWidth, width, id, placeholder },
  onCellChange,
  row,
  onTriggerConditionsFocus,
}) => {
  // Extract value and disabled from the cell data structure
  const cellValue = initialValue?.value !== undefined ? initialValue.value : initialValue;
  const isDisabled = initialValue?.disabled !== undefined ? initialValue.disabled : false;

  const [value, setValue] = useState({ value: cellValue, update: false });

  useEffect(() => {
    const newCellValue = initialValue?.value !== undefined ? initialValue.value : initialValue;
    setValue({ value: newCellValue, update: false });
  }, [initialValue]);

  const updateCellValue = (newValue: any) => {
    setValue({ value: newValue, update: true });
    onCellChange({
      columnId: id,
      rowIndex: index,
      value: newValue,
      row: row,
      rowId: initialValue?.rowId,
    });
  };

  const onChangeSwitch = (checked: boolean) => {
    setValue({ value: checked, update: true });
    updateCellValue(checked);
  };

  const onChangeEmojiPicker = (newValue: string) => {
    setValue({ value: newValue, update: true });
    updateCellValue(newValue);
  };

  let element: React.ReactNode;

  switch (dataType) {
    case cellTypes.normalText:
      element = (
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {formatCapitalizedEnum(value.value)}
        </span>
      );
      break;
    case cellTypes.editableText:
      element = (
        <EditableTextPopup
          value={value.value}
          width={width}
          minWidth={minWidth}
          onChange={updateCellValue}
          placeholder={placeholder}
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.dropdownSearchable:
      element = (
        <TextDropdown
          value={value.value}
          options={options}
          onChange={updateCellValue}
          placeholder={"Select an option"}
          searchPlaceholder="Search options..."
          isSearchable={true}
          disabled={isDisabled || value.value?.length > 0}
        />
      );
      break;
    case cellTypes.dropdown:
      element = (
        <TextDropdown
          value={value.value}
          options={options}
          onChange={updateCellValue}
          placeholder={"Select an option"}
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.number:
      element = (
        <NumberInput value={value.value} onChange={updateCellValue} disabled={isDisabled} />
      );
      break;
    case cellTypes.select:
      element = (
        <SelectComponent
          value={value.value}
          options={options}
          onChange={updateCellValue}
          placeholder="Select an option"
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.switch:
      element = (
        <Switch
          checked={value.value === "On" || value.value === true}
          onChange={onChangeSwitch}
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.emoji_select:
      element = (
        <EmojiPickerComponent
          onEmojiClick={onChangeEmojiPicker}
          buttonText={value.value}
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.triggerConditions: {
      // Extract event data from row (row is already row.original from NotionTable)
      const eventType = row?.detectionType?.value || row?.detectionType;
      // Use value.value if it exists (from state), otherwise fall back to row data
      const currentTriggerCondition =
        value.value || row?.triggerCondition?.value || row?.triggerCondition || {};
      const sentences = row?.sentences?.value || row?.sentences || [];

      const wrapperRef = useRef<HTMLDivElement>(null);

      // Handle focus events from child elements and notify parent
      useEffect(() => {
        const handleFocusIn = () => {
          onTriggerConditionsFocus?.(index, true);
        };

        const handleFocusOut = () => {
          // Check if focus moved outside the wrapper
          setTimeout(() => {
            if (!wrapperRef.current?.contains(document.activeElement)) {
              onTriggerConditionsFocus?.(index, false);
            }
          }, 0);
        };

        const wrapper = wrapperRef.current;
        if (wrapper) {
          wrapper.addEventListener("focusin", handleFocusIn);
          wrapper.addEventListener("focusout", handleFocusOut);
        }

        return () => {
          if (wrapper) {
            wrapper.removeEventListener("focusin", handleFocusIn);
            wrapper.removeEventListener("focusout", handleFocusOut);
          }
        };
      }, [index, onTriggerConditionsFocus]);

      element = (
        <div ref={wrapperRef} data-trigger-conditions-cell className="w-full">
          <TriggerConditions
            eventType={eventType}
            triggerCondition={currentTriggerCondition}
            sentences={sentences}
            isInTable={true}
            onChange={(field: string, fieldValue: string | number | string[]) => {
              // Handle trigger condition changes similar to EventSidePanel
              let updatedTriggerCondition;

              // Handle sentences separately (not part of triggerCondition)
              if (field === "sentences") {
                // Update sentences in the row, not triggerCondition
                onCellChange({
                  columnId: "sentences",
                  rowIndex: index,
                  value: fieldValue,
                  row: row,
                  rowId: initialValue?.rowId,
                });
                return;
              }

              // Handle speaker in triggerCondition for sentence similarity
              if (field === "speaker" && eventType === "SENTENCE_SIMILARITY") {
                // Update speaker in the row, not triggerCondition
                onCellChange({
                  columnId: "speaker",
                  rowIndex: index,
                  value: fieldValue,
                  row: row,
                  rowId: initialValue?.rowId,
                });
                return;
              }

              // Handle conditions array for combination events
              if (field === "conditions" && eventType === "COMBINATION") {
                updatedTriggerCondition = {
                  conditions: fieldValue as any[],
                };
              } else {
                // Handle other triggerCondition fields
                updatedTriggerCondition = {
                  ...currentTriggerCondition,
                  [field]: fieldValue,
                };
              }

              updateCellValue(updatedTriggerCondition);
            }}
          />
        </div>
      );
      break;
    }
    default:
      element = <span />;
      break;
  }

  return element;
};
