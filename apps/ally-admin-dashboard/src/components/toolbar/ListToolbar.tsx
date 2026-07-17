import React from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { Add, Close, Plus, Search } from "@assets";
import { Button } from "@components";
import { ListToolbarProps, FilterChipProps } from "@components/types";
import { en } from "@constants";
import { formatCapitalizedEnum } from "@utils";

export const ListToolbar: React.FC<ListToolbarProps> = ({
  searchValue,
  onSearchChange,
  placeholder = en.common.search,
  filter,
  filterChips,
  addFilterCta,
  action,
  secondaryAction,
  className,
  addFilterButtonRef,
}) => {
  const ClearSearch = () => {
    onSearchChange("");
  };

  const searchInput = (
    <div className="flex relative items-center w-full max-w-xl">
      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-typography-600">
        <Search />
      </span>
      <input
        value={searchValue}
        onChange={e => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-md border border-border bg-transparent pl-10 pr-3 py-2 placeholder-text-tertiary outline-none font-ibmPlexSerif text-base"
      />
      {searchValue.length > 0 && (
        <button className="absolute right-2 " onClick={ClearSearch}>
          <Close />
        </button>
      )}
    </div>
  );

  const renderFilterChip = (chip: FilterChipProps) => {
    return (
      <div
        key={`${chip.label}-${chip.value}`}
        className="flex items-center text-typography-900 px-2 text-sm border border-border-light rounded-[20px]"
      >
        <span className="mr-1 text-xs">{chip.label}:</span>
        <div className="flex">
          <Tooltip label={formatCapitalizedEnum(chip.allValue.join(", "))} align="top">
            <span className="font-medium mr-1 text-xs">{formatCapitalizedEnum(chip.value)}</span>
          </Tooltip>
          <button onClick={chip.onClear} className="text-typography-800 hover:text-typography-900">
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
      className="inline-flex items-center text-typography-800 hover:text-typography-900 text-xs"
    >
      <span className="mr-1 text-base p-[1px]">
        <Plus />
      </span>
      {addFilterCta.label}
    </button>
  ) : null;

  const renderActionButton = (actionProps: typeof action) =>
    actionProps ? (
      <Button
        onClick={actionProps.onClick}
        variant={actionProps.variant}
        className={`inline-flex font-tertiary items-center text-sm font-medium px-4 py-2 rounded-full`}
      >
        {actionProps?.icon ? (
          <span className="mr-[1px] text-lg">{actionProps?.icon}</span>
        ) : (
          <Add />
        )}
        {actionProps.label}
      </Button>
    ) : null;

  return (
    <div className={`flex items-center justify-between gap-4 min-h-[50px] ${className ?? ""}`}>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {searchInput}
        {filter}
        {addFilterButton}
        {filterChips?.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap px-2">
            {filterChips?.map(chip => renderFilterChip(chip))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {renderActionButton(secondaryAction)}
        {renderActionButton(action)}
      </div>
    </div>
  );
};

export default ListToolbar;
