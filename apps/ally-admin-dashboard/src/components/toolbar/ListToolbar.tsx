import React from "react";

import { Close, Plus, Search } from "@assets";
import { ListToolbarProps, FilterChipProps } from "@components/types";
import { en } from "@constants";
import { formatCapitalizedEnum } from "@utils";

export const ListToolbar: React.FC<ListToolbarProps> = ({
  searchValue,
  onSearchChange,
  placeholder = en.common.search,
  filterChips,
  addFilterCta,
  action,
  className,
  addFilterButtonRef,
}) => {
  const searchInput = (
    <div className="flex relative items-center w-full max-w-xl">
      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
        <Search />
      </span>
      <input
        value={searchValue}
        onChange={e => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-md border border-[#D2D2D2] bg-transparent pl-10 pr-3 py-2 placeholder-gray-400"
      />
    </div>
  );

  const renderFilterChip = (chip: FilterChipProps) => {
    return (
      <div
        key={`${chip.label}-${chip.value}`}
        className="flex items-center text-gray-700 px-2 text-sm border border-gray-200 rounded-[20px]"
      >
        <span className="mr-1 text-[12px]">{chip.label}:</span>
        <div className="flex">
          <span className="font-medium mr-1 text-[12px]">{formatCapitalizedEnum(chip.value)}</span>
          <button onClick={chip.onClear} className="text-gray-500 hover:text-gray-700">
            <Close />
          </button>
        </div>
      </div>
    );
  };

  const addFilterButton = addFilterCta ? (
    <button
      ref={addFilterButtonRef}
      onClick={addFilterCta.onClick}
      className="inline-flex items-center text-gray-600 hover:text-gray-700 text-[12px]"
    >
      <span className="mr-1 text-[14px] p-[1px]">
        <Plus />
      </span>
      {addFilterCta.label}
    </button>
  ) : null;

  const actionButton = action ? (
    <button
      onClick={action.onClick}
      className="inline-flex font-['Roboto'] items-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded-full"
    >
      <span className="mr-2 text-lg">+</span>
      {action.label}
    </button>
  ) : null;

  return (
    <div className={`flex items-center justify-between gap-4 min-h-[50px] ${className ?? ""}`}>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {searchInput}
        {addFilterButton}
        {filterChips?.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap px-2">
            {filterChips?.map(chip => renderFilterChip(chip))}
          </div>
        )}
      </div>

      {actionButton}
    </div>
  );
};

export default ListToolbar;
