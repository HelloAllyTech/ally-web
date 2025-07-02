"use client";
import React from "react";
import { Popover, TextField } from "@mui/material";
import { FilterPopoverProps, FilterType } from "./types";
import DateFilterUI from "./DateFilterUI";

/**
 * Props for the FilterPopover component.
 * @template T - The type of data for each row.
 */

const FilterPopover: React.FC<FilterPopoverProps> = ({
  anchorEl,
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

  const renderSingleSelect = () => {
    return (
      <div className="max-h-[300px] overflow-y-auto">
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
        <div className="flex justify-end p-2">
          <button
            className="bg-blue-600 text-white px-4 py-1 mb-[4px] mr-[4px] rounded hover:bg-blue-700"
            onClick={onSaveMultiSelect}
            disabled={selectedValues.length === 0}
          >
            Apply
          </button>
        </div>
      </>
    );
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={anchorOrigin || { vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      className="font-['IBM_Plex_Serif']"
      PaperProps={{
        className: "shadow-none border border-[#E0E0E0] -ml-[15px] mt-[15px]",
      }}
    >
      <div className="min-w-[200px]">
        <div className="text-[14px]  text-[#6B7280] font-[500] m-[12px] mb-[0px]">
          {column?.header}
        </div>
        {column?.filterType !== FilterType.DATE && (
          <div className="p-[12px] pb-[8px] text-[#6B7280]">
            <TextField
              size="small"
              fullWidth
              placeholder="Search..."
              value={searchText}
              onChange={e => onSearchTextChange(e.target.value)}
              className="focus:outline-none border-none highlight-none"
            />
          </div>
        )}
        <div>
          {column.filterType === FilterType.MULTISELECT
            ? renderMultiSelect()
            : renderSingleSelect()}
          {column.filterType === FilterType.DATE ? (
            <DateFilterUI
              selectedValues={selectedValues}
              onChange={arr => onToggleOption(JSON.stringify(arr))}
              onDateSelect={value => onDateSelect?.(column.key as string, value)}
            />
          ) : (
            column?.filterOptions?.filter(option =>
              option?.label?.toLowerCase()?.includes(searchText.toLowerCase()),
            ).length === 0 && <div>No options</div>
          )}
        </div>
      </div>
    </Popover>
  );
};

export default FilterPopover;
