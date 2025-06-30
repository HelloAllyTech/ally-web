"use client";
import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Popover, CircularProgress } from "@mui/material";

import { GenericTableProps, TableSort, TableFilter, Column } from "./types";
import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import SelectedFiltersView from "./SelectedFiltersView";
import FilterPopover from "./FilterPopover";

/**
 * GenericTable is a reusable, type-safe, and highly customizable table component.
 * Supports sorting, filtering, and row click handling.
 * Only supports external control of sort and filter logic for server-side data fetching.
 */
export const GenericTable = forwardRef(
  (
    {
      columns,
      data,
      initialSort,
      initialFilter,
      onRowClick,
      className = "",
      style = {},
      fallbackUI,
      isLoading,
      showSelectedFilters = false,
      onFilterChange,
      handleLoadMore,
    }: GenericTableProps<Record<string, any>>,
    ref: React.Ref<HTMLDivElement | null>,
  ) => {
    // Internal state for sort and filter (used if not controlled externally)
    const [sort, setSort] = useState<TableSort>(initialSort || { key: "", value: null });
    const [filter, setFilter] = useState<TableFilter>(initialFilter || []);
    // State for filter popover UI
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const [optionAnchorEl, setOptionAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedColumn, setSelectedColumn] = useState<
      null | (Column<any> & { filterOptions: { label: string; value: string }[] })
    >(null);
    const [searchText, setSearchText] = useState("");
    // Add state for multi-select values
    const [multiSelectValues, setMultiSelectValues] = useState<string[]>([]);

    // Expose the scrollable div to the parent via the forwarded ref
    const scrollRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => scrollRef.current, []);

    // Open first popover (column selection)
    const handleOpenFilterPopover = (event: React.MouseEvent<HTMLElement>) => {
      setFilterAnchorEl(event.currentTarget);
      setSelectedColumn(null);
      setOptionAnchorEl(null);
      setSearchText("");
    };

    // Select a column and open second popover (option selection)
    const handleSelectColumn = (
      col: Column<any> | undefined,
      event: React.MouseEvent<HTMLElement>,
    ) => {
      if (!col) return;
      if (col.filterable && col.filterOptions) {
        setSelectedColumn(
          col as Column<any> & { filterOptions: { label: string; value: string }[] },
        );
        setOptionAnchorEl(event.currentTarget);
        setSearchText("");
        // If multiselect, prefill with current filter values
        if (col.filterType === "multiselect") {
          const existing = filter.find(f => f.key === col.key);
          setMultiSelectValues(Array.isArray(existing?.value) ? existing?.value : []);
        } else {
          setMultiSelectValues([]);
        }
      }
    };

    // Close all popovers
    const handleCloseFilterPopover = () => {
      setFilterAnchorEl(null);
      setSelectedColumn(null);
      setOptionAnchorEl(null);
      setSearchText("");
      setMultiSelectValues([]);
    };

    // Select a filter option
    const handleSelectFilterOption = (colKey: string, value: string) => {
      handleFilterChange(colKey, value);
      handleCloseFilterPopover();
    };

    // Toggle multi-select option
    const handleToggleMultiSelectOption = (value: string) => {
      setMultiSelectValues(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value],
      );
    };

    // Save multi-select filter
    const handleSaveMultiSelect = () => {
      if (selectedColumn) {
        handleFilterChange(selectedColumn.key as string, multiSelectValues);
      }
      handleCloseFilterPopover();
    };

    useEffect(() => {
      onFilterChange?.({ filter, sort });
    }, [filter, sort]);

    const handleDateSelect = (key: string, value: string[]) => {
      if (key && value) {
        handleFilterChange(key, value);
      }
      handleCloseFilterPopover();
    };

    // Filterable columns
    const filterableColumns = columns.filter(c => c.filterable && c.filterOptions);

    /**
     * Handles sort changes. Uses external handler if provided, otherwise updates internal state.
     */
    const handleSort = (key: string, value: string) => {
      setSort(prev => {
        if (prev.key === key) {
          if (prev.value === "ASC") return { key, value: "DESC" };
          if (prev.value === "DESC") return { key: "", value: null };
        }
        return { key, value: "ASC" };
      });
    };

    /**
     * Handles filter changes. Uses external handler if provided, otherwise updates internal state.
     */
    const handleFilterChange = (key: string, value: string | string[]) => {
      setFilter((prev: TableFilter) => {
        if (!value || (Array.isArray(value) && value.length === 0))
          return prev.filter(f => f.key !== key);
        const existing = prev.find(f => f.key === key);
        if (existing) {
          return prev.map(f => (f.key === key ? { key, value } : f));
        }
        return [...prev, { key, value }];
      });
    };

    const renderPopovers = () => {
      return (
        <>
          <Popover
            open={Boolean(filterAnchorEl)}
            anchorEl={filterAnchorEl}
            onClose={handleCloseFilterPopover}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            className="font-['IBM_Plex_Serif']"
          >
            <div>
              {filterableColumns.map(col => (
                <div
                  key={col.key as string}
                  className="flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7]"
                  onClick={e => handleSelectColumn(col, e)}
                >
                  {col.icon && <span className="mr-2">{col.icon}</span>}
                  <div>{col.header}</div>
                </div>
              ))}
            </div>
          </Popover>
          {/* Use shared FilterPopover for filter options */}
          <FilterPopover
            anchorEl={optionAnchorEl}
            open={Boolean(optionAnchorEl) && !!selectedColumn}
            onClose={handleCloseFilterPopover}
            column={selectedColumn}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            selectedValues={multiSelectValues}
            onToggleOption={handleToggleMultiSelectOption}
            onSaveMultiSelect={handleSaveMultiSelect}
            onSelectSingle={handleSelectFilterOption}
            singleSelectedValue={
              selectedColumn
                ? (() => {
                    const found = filter.find(f => f.key === selectedColumn.key);
                    return typeof found?.value === "string" ? found.value : "";
                  })()
                : ""
            }
            onDateSelect={handleDateSelect}
          />
        </>
      );
    };

    return (
      <div
        ref={scrollRef}
        className={`overflow-x-auto min-w-full ${className}`}
        style={{ scrollbarWidth: "thin", msOverflowStyle: "none", ...style }}
      >
        {/* Display selected sort and filter options */}
        {showSelectedFilters && (
          <SelectedFiltersView
            columns={columns}
            sort={sort}
            filter={filter}
            openFilterList={handleSelectColumn}
            onAddFilter={handleOpenFilterPopover}
            onRemoveSort={() => setSort({ key: "", value: null })}
            onRemoveFilter={(key: string) => setFilter(prev => prev.filter(f => f.key !== key))}
          />
        )}
        {renderPopovers()}
        <table className="w-full min-w-full text-xs sm:text-sm">
          <TableHeader
            columns={columns}
            filter={filter}
            onSort={handleSort}
            onFilterChange={handleFilterChange}
          />
          {
            <TableBody
              columns={columns}
              data={data}
              onRowClick={onRowClick}
              fallbackUI={fallbackUI}
            />
          }
        </table>
        {handleLoadMore && (
          <div
            onClick={handleLoadMore}
            className="flex cursor-pointer mt-4 text-center items-center"
          >
            <Plus />
            <span className="font-['IBM_Plex_Serif'] text-[18px] ml-[5px]">Load More</span>
            {isLoading && (
              <CircularProgress color="primary" size={20} className="ml-2 mr-2 text-[#000]" />
            )}
          </div>
        )}
      </div>
    );
  },
);

export default GenericTable;
