"use client";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";

import { SelectedFiltersViewProps } from "./types";

/**
 * SelectedFiltersView displays the currently applied sort and filter chips.
 *
 * @template T - The type of data for each row.
 * @param {Object} props - The props for the filter view.
 * @param {Column<T>[]} props.columns - The column definitions.
 * @param {TableSort} props.sort - The current sort state.
 * @param {TableFilter} props.filter - The current filter state.
 * @param {(event: React.MouseEvent<HTMLElement>) => void} props.onAddFilter - Handler to add a new filter.
 * @param {(col: Column<T> | undefined, event: React.MouseEvent<HTMLElement>) => void} props.openFilterList - Handler to open filter list for a column.
 * @param {() => void} props.onRemoveSort - Handler to remove sort.
 * @param {(key: string) => void} props.onRemoveFilter - Handler to remove a filter by key.
 */
function SelectedFiltersView<T extends Record<string, any>>({
  columns,
  sort,
  filter,
  openFilterList,
  onAddFilter,
  onRemoveSort,
  onRemoveFilter,
}: SelectedFiltersViewProps<T>) {
  /**
   * Render the sort chip.
   * @returns {React.ReactNode} - The sort chip.
   */
  const renderSort = () => {
    return (
      <>
        <div
          className="p-[10px] bg-[#F5F5F7] text-[#6B7280] rounded flex items-center"
          title="Remove sort"
        >
          <span>
            {columns.find(c => c.key === sort.key)?.header || sort.key} (
            {sort.value === "ASC" ? "ASC" : "DESC"})
          </span>
          <button
            type="button"
            className="ml-2 p-1 rounded hover:bg-[#E0E0E0] focus:outline-none"
            onClick={onRemoveSort}
            title="Remove sort"
          >
            <X size={14} />
          </button>
        </div>
        <div className="w-[1px] h-[42px] bg-[#E0E0E0]" />
      </>
    );
  };

  /**
   * Render the filter chips.
   * @returns {React.ReactNode} - The filter chips.
   */
  const renderFilter = () => {
    return (
      <>
        {filter?.map(f => {
          const col = columns?.find(c => c.key === f.key);
          let displayValue = f.value;
          // Handle date filter formatting
          if (col?.filterType === "date") {
            if (Array.isArray(f.value)) {
              displayValue = f.value
                .map(val => {
                  if (!val) return "";
                  const date = new Date(val);
                  return isNaN(date.getTime()) ? val : format(date, "yyyy-MM-dd");
                })
                .join(" - ");
            } else if (f.value) {
              const date = new Date(f.value);
              displayValue = isNaN(date.getTime()) ? f.value : format(date, "yyyy-MM-dd");
            }
          } else if (col?.filterType === "number" && Array.isArray(f.value)) {
            // Numeric range: "min - max", tolerating an open-ended bound.
            const [min, max] = f.value;
            displayValue =
              min && max ? `${min} - ${max}` : min ? `≥ ${min}` : max ? `≤ ${max}` : "";
          } else if (Array.isArray(f.value)) {
            // For multi-select, show comma-separated labels
            if (col && col.filterOptions) {
              displayValue = f.value
                .map(val => col.filterOptions?.find(o => o.value === val)?.label || val)
                .join(", ");
            } else {
              displayValue = f.value.join(", ");
            }
          } else if (col && col.filterOptions) {
            const opt = col.filterOptions.find(o => o.value === f.value);
            if (opt) displayValue = opt.label;
          }
          return (
            <div
              key={f.key}
              className="rounded flex items-center p-[10px]"
              title={`Filter: ${col?.header || f.key}`}
            >
              <div className=" text-[#6B7280] cursor-pointer" onClick={e => openFilterList(col, e)}>
                {col?.header || f.key}: "{displayValue}"
              </div>
              <button
                type="button"
                className="ml-2 p-1 rounded hover:bg-[#E0E0E0] focus:outline-none text-[#6B7280]"
                onClick={() => onRemoveFilter(f.key)}
                title="Remove filter"
                aria-label={`Remove filter ${col?.header || f.key}`}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </>
    );
  };

  /**
   * Render the add filter button.
   * @returns {React.ReactNode} - The add filter button.
   */
  const renderAddFilter = () => {
    return (
      <button
        type="button"
        className="p-[10px] flex items-center justify-center rounded pb-0"
        onClick={onAddFilter}
        aria-label="filter"
      >
        <Plus size={18} />
        <span className="ml-[4px]">Filter</span>
      </button>
    );
  };

  return (
    <div className="flex flex-row gap-2 mb-2 items-center">
      {sort.key && sort.value && renderSort()}
      {renderFilter()}
      {renderAddFilter()}
    </div>
  );
}

export default SelectedFiltersView;
