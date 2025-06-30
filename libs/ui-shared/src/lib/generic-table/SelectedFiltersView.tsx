import React from "react";
import { Plus, X } from "lucide-react";
import { Column, TableSort, TableFilter } from "./types";

interface SelectedFiltersViewProps<T> {
  columns: Column<T>[];
  sort: TableSort;
  filter: TableFilter;
  onAddFilter: (event: React.MouseEvent<HTMLElement>) => void;
  openFilterList: (col: Column<T> | undefined, event: React.MouseEvent<HTMLElement>) => void;
  onRemoveSort: () => void;
  onRemoveFilter: (key: string) => void;
}

function SelectedFiltersView<T extends Record<string, any>>({
  columns,
  sort,
  filter,
  openFilterList,
  onAddFilter,
  onRemoveSort,
  onRemoveFilter,
}: SelectedFiltersViewProps<T>) {
  return (
    <div className="flex flex-row gap-2 mb-2 items-center text-xs sm:text-sm">
      {sort.key && sort.value && (
        <>
          <div
            className="p-[10px] bg-[#F5F5F7] text-[#000] rounded flex items-center"
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
      )}
      {filter.map(f => {
        const col = columns.find(c => c.key === f.key);
        let displayValue = f.value;
        if (Array.isArray(f.value)) {
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
            className="rounded flex items-center gap-2 bg-[#F5F5F7]"
            title={`Filter: ${col?.header || f.key}`}
          >
            <div
              className="p-[10px] text-[#000] cursor-pointer"
              onClick={e => openFilterList(col, e)}
            >
              {col?.header || f.key}: "{displayValue}"
            </div>
            <button
              type="button"
              className="ml-2 p-1 rounded hover:bg-[#E0E0E0] focus:outline-none"
              onClick={() => onRemoveFilter(f.key)}
              title="Remove filter"
              aria-label={`Remove filter ${col?.header || f.key}`}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      {/* Plus button for adding a new filter */}
      <button
        type="button"
        className="p-[10px] flex items-center justify-center rounded"
        onClick={onAddFilter}
        aria-label="Add filter"
      >
        <Plus size={18} />
        <span className="ml-[4px]">Add Filter</span>
      </button>
    </div>
  );
}

export default SelectedFiltersView;
