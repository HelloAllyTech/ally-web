"use client";

import React, { useState } from "react";

import { ArrowUpward, ArrowDownward, FilterAlt, Sort } from "@mui/icons-material";
import { Popover } from "@mui/material";

import FilterPopover from "./FilterPopover";
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
    // If multiselect, prefill with current filter values
    if (activeCol && activeCol.filterType === "multiselect") {
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
      anchorEl={sortAnchorEl}
      onClose={handleCloseAll}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      PaperProps={{
        className: "shadow-none border border-[#E0E0E0] mt-5 -ml-2.5 font-['IBM_Plex_Serif']",
      }}
    >
      <div>
        <div
          className="flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7] text-[#6B7280]"
          onClick={() => handleSortSelect("ASC")}
        >
          <ArrowUpward fontSize="small" className="mr-2" />
          <div>Ascending</div>
        </div>
        <div
          className="flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7] text-[#6B7280]"
          onClick={() => handleSortSelect("DESC")}
        >
          <ArrowDownward fontSize="small" className="mr-2" />
          <div>Descending</div>
        </div>
      </div>
    </Popover>
  );

  const renderMainPopover = (col: Column<T>) => {
    return (
      <Popover
        open={Boolean(mainAnchorEl) && activeCol?.key === col.key}
        anchorEl={mainAnchorEl}
        onClose={handleCloseAll}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        className="font-['IBM_Plex_Serif']"
        PaperProps={{
          className: "shadow-none border border-[#E0E0E0] font-['IBM_Plex_Serif']",
        }}
      >
        <div>
          {col.sortable && (
            <div
              className="flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7] text-[#6B7280]"
              onClick={handleSortClick}
            >
              <Sort fontSize="small" className="mr-2" />
              <div>Sort</div>
            </div>
          )}
          {col.filterable && col.filterOptions && (
            <div
              className="text-[#6B7280] flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7]"
              onClick={handleFilterClick}
            >
              <FilterAlt fontSize="small" className="mr-2" />
              <div>Filter</div>
            </div>
          )}
        </div>
      </Popover>
    );
  };

  return (
    <thead>
      <tr className="bg-[#FFF] sticky top-0 border-b border-gray-300 z-10">
        {columns?.map(col => (
          <th
            key={col.key as string}
            className={`text-left font-[14px] font-[500] text-[#000] min-w-[100px] text-xs sm:text-sm ${
              col.className || ""
            }`}
            style={col.style}
          >
            <div
              className={`px-4 py-[14px] flex flex-row items-center justify-between ${
                (col.filterable || col.sortable) && "cursor-pointer"
              }`}
              onClick={e => handleHeaderClick(e, col)}
            >
              <div className="flex flex-row items-center">
                {col?.icon && <div className="pr-[8px]">{col?.icon}</div>}
                <div className="text-[14px] font-[500] text-[#6B7280]">{col.header}</div>
              </div>
            </div>
            {renderMainPopover(col)}
            {renderSortPopover()}
            {col.filterable && renderFilterPopover()}
          </th>
        ))}
      </tr>
    </thead>
  );
};

export default TableHeader;
