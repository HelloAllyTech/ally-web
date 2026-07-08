"use client";
import React from "react";

import { Popover, PopoverContent, TextInput } from "@carbon/react";

import DateFilterUI from "./DateFilterUI";
import { FilterPopoverProps, FilterType } from "./types";

/**
 * Props for the FilterPopover component.
 * @template T - The type of data for each row.
 */

const FilterPopover: React.FC<FilterPopoverProps> = ({
  open,
  onClose,
  column,
  searchText,
  onSearchTextChange,
  selectedValues,
  onToggleOption,
  onSaveMultiSelect,
  onSelectSingle,
  singleSelectedValue,
  onDateSelect,
  anchorOrigin,
}) => {
  if (!column) return null;
  // Use the explicit singleSelectedValue if provided
  const selectedValue = singleSelectedValue || "";

  const renderNoOptions = () => {
    if (
      column?.filterOptions?.filter(option =>
        option?.label?.toLowerCase()?.includes(searchText.toLowerCase()),
      ).length === 0
    ) {
      return <div className="text-[14px] text-[#6B7280] font-[500] text-center">No options</div>;
    }
    return null;
  };

  const renderSingleSelect = () => {
    return (
      <div className="max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {renderNoOptions()}
        {column?.filterOptions
          .filter(option => option?.label?.toLowerCase()?.includes(searchText.toLowerCase()))
          .map(option => (
            <div
              key={option.value}
              className={`flex flex-row items-center cursor-pointer px-4 py-[10px] min-w-[200px] hover:bg-[#F5F5F7] text-[#6B7280] ${selectedValue === option.value ? "bg-[#F5F5F7]" : ""}`}
              onClick={() => onSelectSingle(column.key as string, option.value)}
            >
              <div>{option.label}</div>
            </div>
          ))}
      </div>
    );
  };

  const renderMultiSelect = () => {
    return (
      <>
        <div className="max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {renderNoOptions()}
          {column?.filterOptions
            ?.filter(option => option?.label?.toLowerCase()?.includes(searchText.toLowerCase()))
            ?.map(option => (
              <div
                key={option.value}
                className={`flex flex-row items-center cursor-pointer px-4 py-[10px] min-w-[200px] hover:bg-[#F5F5F7] text-[#6B7280] ${selectedValues.includes(option.value) ? "bg-[#F5F5F7]" : ""}`}
                onClick={() => onToggleOption(option.value)}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  readOnly
                  className="mr-2"
                />
                <div>{option.label}</div>
              </div>
            ))}
        </div>
        <div className="flex justify-end p-2">
          <button
            className="bg-primary-600 text-white px-4 py-1 mb-[4px] mr-[4px] rounded hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={onSaveMultiSelect}
          >
            Apply
          </button>
        </div>
      </>
    );
  };

  const align = anchorOrigin?.vertical === "bottom" ? "bottom-start" : "right-start";

  return (
    <Popover
      open={open}
      onRequestClose={onClose}
      align={align}
      dropShadow={false}
      caret={false}
      className="font-['IBM_Plex_Serif']"
    >
      <span aria-hidden className="block h-0 w-0" />
      <PopoverContent className="border border-[#E0E0E0]">
        <div className="min-w-[200px]">
          <div className="text-[14px]  text-[#6B7280] font-[500] m-[12px] mb-[0px]">
            {column?.header}
          </div>
          {column?.filterType !== FilterType.DATE && (
            <div className="p-[12px] pb-[8px] text-[#6B7280]">
              <TextInput
                id="filter-popover-search"
                labelText="Search"
                hideLabel
                size="sm"
                placeholder="Search..."
                value={searchText}
                onChange={e => onSearchTextChange(e.target.value)}
                className="focus:outline-none border-none highlight-none"
              />
            </div>
          )}
          <div>
            {column.filterType === FilterType.MULTISELECT ? (
              renderMultiSelect()
            ) : column.filterType === FilterType.DATE ? (
              <DateFilterUI
                selectedValues={selectedValues}
                onChange={arr => onToggleOption(JSON.stringify(arr))}
                onDateSelect={value => onDateSelect?.(column.key as string, value)}
              />
            ) : column.filterType === FilterType.TEXT ? (
              <div className="flex justify-end p-2">
                <button
                  className="bg-primary-600 text-white px-4 py-1 mb-[4px] mr-[4px] rounded hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={() => onSelectSingle(column.key as string, searchText)}
                >
                  Apply
                </button>
              </div>
            ) : (
              column.filterType === FilterType.SINGLESELECT && renderSingleSelect()
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FilterPopover;
