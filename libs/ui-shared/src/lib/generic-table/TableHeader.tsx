"use client";

import React, { useState } from "react";

import { ArrowUp, ArrowDown, Filter, SortAscending } from "@carbon/icons-react";
import { Popover, PopoverContent } from "@carbon/react";

import FilterPopover from "./FilterPopover";
import HeaderTooltip from "./HeaderTooltip";
import { Column, SortDirection, TableFilter } from "./types";

/**
 * TableHeader renders the table's <thead> with sortable and filterable columns.
 *
 * @template T - The type of data for each row.
 * @param {Object} props - The props for the header.
 * @param {Column<T>[]} props.columns - The column definitions.
 * @param {TableFilter} props.filter - The current filter state.
 * @param {(key: string, value: string) => void} props.onSort - Handler for sort changes.
 * @param {(key: string, value: string | string[]) => void} props.onFilterChange - Handler for filter changes.
 */
const TableHeader = <T extends Record<string, any>>({
  columns,
  filter,
  onSort,
  onFilterChange,
}: {
  columns: Column<T>[];
  filter: TableFilter;
  onSort: (key: string, value: SortDirection) => void;
  onFilterChange: (key: string, value: string | string[]) => void;
}) => {
  // State for popovers
  const [mainAnchorEl, setMainAnchorEl] = useState<null | HTMLElement>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [activeCol, setActiveCol] = useState<null | Column<T>>(null);
  const [searchText, setSearchText] = useState("");
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([]);

  // Open main popover (Sort/Filter)
  const handleHeaderClick = (event: React.MouseEvent<HTMLElement>, col: Column<T>) => {
    if (col.sortable || col.filterable) {
      setFilterAnchorEl(null);
      setSortAnchorEl(null);
      setMainAnchorEl(event.currentTarget);
      setActiveCol(col);
      setSearchText("");
    }
  };

  // Open sort popover
  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  // Open filter popover
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
    setSearchText("");
    // Prefill array-valued filters (multiselect + number range) from current state
    if (
      activeCol &&
      (activeCol.filterType === "multiselect" || activeCol.filterType === "number")
    ) {
      const existing = filter.find(f => f.key === activeCol.key);
      setMultiSelectValues(Array.isArray(existing?.value) ? existing?.value : []);
    } else {
      setMultiSelectValues([]);
    }
  };

  // Close all popovers
  const handleCloseAll = () => {
    setFilterAnchorEl(null);
    setSortAnchorEl(null);
    setMainAnchorEl(null);
    setActiveCol(null);
    setSearchText("");
  };

  // Handle sort selection
  const handleSortSelect = (value: SortDirection) => {
    if (activeCol) {
      onSort(activeCol.key as string, value);
    }
    handleCloseAll();
  };

  // Handle filter option selection
  const handleFilterOptionSelect = (value: string) => {
    if (activeCol) {
      onFilterChange(activeCol.key as string, value);
    }
    handleCloseAll();
  };

  // Toggle multi-select option
  const handleToggleMultiSelectOption = (value: string) => {
    setMultiSelectValues(prev =>
      prev?.includes(value) ? prev.filter(v => v !== value) : [...prev, value],
    );
  };

  // Save multi-select filter
  const handleSaveMultiSelect = () => {
    if (activeCol) {
      onFilterChange(activeCol.key as string, multiSelectValues);
    }
    handleCloseAll();
  };

  const handleDateSelect = (key: string, value: string[]) => {
    if (key && value) {
      onFilterChange(key, value);
    }
    handleCloseAll();
  };

  const handleNumberSelect = (key: string, value: string[]) => {
    if (key) {
      onFilterChange(key, value);
    }
    handleCloseAll();
  };

  // Render filter popover content
  const renderFilterPopover = () => {
    if (!activeCol || !activeCol.filterable) return null;
    return (
      <FilterPopover
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleCloseAll}
        column={activeCol as any}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        selectedValues={multiSelectValues}
        onToggleOption={handleToggleMultiSelectOption}
        onSaveMultiSelect={handleSaveMultiSelect}
        onSelectSingle={(_colKey, value) => handleFilterOptionSelect(value)}
        onDateSelect={(key, value) => handleDateSelect(key, value)}
        onNumberSelect={(key, value) => handleNumberSelect(key, value)}
        singleSelectedValue={
          activeCol
            ? (() => {
                const found = filter.find(f => f.key === activeCol.key);
                return typeof found?.value === "string" ? found.value : "";
              })()
            : ""
        }
      />
    );
  };

  // Render sort popover content
  const renderSortPopover = () => (
    <Popover
      open={Boolean(sortAnchorEl)}
      onRequestClose={handleCloseAll}
      align="right-start"
      dropShadow={false}
      caret={false}
      className="font-['IBM_Plex_Serif']"
    >
      <span aria-hidden className="block h-0 w-0" />
      <PopoverContent className="border border-[#E0E0E0]">
        <div>
          <div
            className="flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7] text-[#6B7280]"
            onClick={() => handleSortSelect("ASC")}
          >
            <ArrowUp size={16} className="mr-2" />
            <div>Ascending</div>
          </div>
          <div
            className="flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7] text-[#6B7280]"
            onClick={() => handleSortSelect("DESC")}
          >
            <ArrowDown size={16} className="mr-2" />
            <div>Descending</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderMainPopover = (col: Column<T>) => {
    return (
      <Popover
        open={Boolean(mainAnchorEl) && activeCol?.key === col.key}
        onRequestClose={handleCloseAll}
        align="bottom-start"
        dropShadow={false}
        caret={false}
        className="font-['IBM_Plex_Serif']"
      >
        <span aria-hidden className="block h-0 w-0" />
        <PopoverContent className="border border-[#E0E0E0] font-['IBM_Plex_Serif']">
          <div>
            {col.sortable && (
              <div
                className="flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7] text-[#6B7280]"
                onClick={handleSortClick}
              >
                <SortAscending size={16} className="mr-2" />
                <div>Sort</div>
              </div>
            )}
            {col.filterable && (
              <div
                className="text-[#6B7280] flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7]"
                onClick={handleFilterClick}
              >
                <Filter size={16} className="mr-2" />
                <div>Filter</div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <thead>
      <tr className="bg-[#FFF] sticky top-0 border-b border-gray-300 z-10">
        {columns
          ?.filter(col => !col.hidden)
          .map(col => (
            <th
              key={col.key as string}
              className={`text-left font-[500] text-[#000] min-w-[100px] ${col.className || ""}`}
              style={col.style}
            >
              {col.headerNode ? (
                <div className="px-4 py-[14px] flex items-center justify-center">
                  {col.headerNode}
                </div>
              ) : (
                <div
                  className={`px-4 py-[14px] flex flex-row items-center justify-between ${
                    (col.filterable || col.sortable) && "cursor-pointer"
                  }`}
                  onClick={e => handleHeaderClick(e, col)}
                >
                  <div className="flex flex-row items-center">
                    {col?.icon && <div className="pr-[8px]">{col?.icon}</div>}
                    <div className="font-[500] text-[#6B7280]">{col.header}</div>
                    {col.tooltip && <HeaderTooltip text={col.tooltip} />}
                  </div>
                </div>
              )}
              {renderMainPopover(col)}
              {activeCol?.key === col.key && renderSortPopover()}
              {activeCol?.key === col.key && col.filterable && renderFilterPopover()}
            </th>
          ))}
      </tr>
    </thead>
  );
};

export default TableHeader;
