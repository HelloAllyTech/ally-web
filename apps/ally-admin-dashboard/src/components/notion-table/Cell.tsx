import React, { useEffect, useState } from "react";

import { EmojiPickerComponent, TimeInput } from "@components";
import {
  EditableTextPopup,
  NumberInput,
  TextDropdown,
  Switch,
  SelectComponent,
  EditableTriggerConditionsPopup,
} from "@components/notion-table";
import { formatCapitalizedEnum, isObject } from "@utils";

import { cellTypes } from "./utils";

export const Cell = ({
  value: initialValue,
  rowIndex: index,
  column: { dataType, options, minWidth, width, id, placeholder },
  onCellChange,
  row,
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

  // TODO: Need refactoring for time input
  const CustomTimeInput = () => {
    const infinityText = id === "startTime" ? "00:00:00" : "∞";
    if (
      (isObject(value.value) && (value.value.value === null || value.value.value === undefined)) ||
      value.value === null ||
      value.value === undefined
    )
      return (
        <div onClick={() => updateCellValue("00:00:00")} className="cursor-pointer px-1">
          {infinityText}
        </div>
      );
    return (
      <div className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 rounded-md p-1            ">
        <TimeInput
          className="px-[0px]"
          value={value.value}
          onBlur={updateCellValue}
          disabled={isDisabled}
        />
      </div>
    );
  };

  // TODO: Need refactoring for time input
  const CustomScoreInput = () => {
    const ifinityText = id === "minScore" ? "-∞" : "+∞";
    if (
      (isObject(value.value) && (value.value.value === null || value.value.value === undefined)) ||
      value.value === null ||
      value.value === undefined
    )
      return (
        <div onClick={() => updateCellValue(0)} className="cursor-pointer">
          {ifinityText}
        </div>
      );
    return (
      <div className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 rounded-md p-1            ">
        <NumberInput value={value.value} onChange={updateCellValue} disabled={isDisabled} />
      </div>
    );
  };

  switch (dataType) {
    case cellTypes.normalText:
      element = (
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {id === "eventCode" ? value.value : formatCapitalizedEnum(value.value)}
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
      element = (
        <EditableTriggerConditionsPopup
          eventType={row?.detectionType?.value}
          triggerCondition={value.value || {}}
          onChange={updateCellValue}
          width={width}
          minWidth={minWidth}
          disabled={isDisabled}
          currentEventId={row?.id?.value}
        />
      );
      break;
    }
    case cellTypes.timeInput:
      element = <CustomTimeInput />;
      break;
    case cellTypes.score:
      element = <CustomScoreInput />;
      break;
    default:
      element = <span />;
      break;
  }

  return element;
};
