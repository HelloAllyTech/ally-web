import React, { useEffect, useMemo, useState } from "react";

import { Trash } from "@assets";
import { FilterDropdownProps, FilterValues } from "@components/types";
import {
  KeyboardKeys,
  en,
  FilterDropdownOptions,
  userRoleItems,
  userStatusItems,
  userStatus,
} from "@constants";
import { formatCapitalizedEnum } from "@utils";

import { StatusBadge } from "../status-badge";

const listWidth = 200;

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  isOpen,
  onClose,
  organizations,
  onApplyFilters,
  anchorRect,
  currentFilters,
}) => {
  const orgItems = organizations || [];

  const menuItems = [
    FilterDropdownOptions.ROLE,
    FilterDropdownOptions.ORGANIZATION,
    FilterDropdownOptions.STATUS,
  ];

  const [viewSubList, setViewSubList] = useState<FilterDropdownOptions | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Record<string, boolean>>>({
    organizations: {},
    roles: {},
    statuses: {},
  });

  const selectedCounts = useMemo(
    () => ({
      [FilterDropdownOptions.ORGANIZATION]: Object.values(selectedFilters.organizations).filter(
        Boolean,
      ).length,
      [FilterDropdownOptions.ROLE]: Object.values(selectedFilters.roles).filter(Boolean).length,
      [FilterDropdownOptions.STATUS]: Object.values(selectedFilters.statuses).filter(Boolean)
        .length,
    }),
    [selectedFilters],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === KeyboardKeys.ESCAPE) onClose();
    };
    if (isOpen) {
      window.addEventListener(KeyboardKeys.KEYDOWN, onKey);
    }
    return () => {
      if (isOpen) {
        window.removeEventListener(KeyboardKeys.KEYDOWN, onKey);
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    // Initialize selected filters based on current filters
    const initializeFilterSection = (items: string[], selectedItems: string[]) => {
      return items.reduce(
        (accumulator, itemName) => ({
          ...accumulator,
          [itemName]: selectedItems.includes(itemName),
        }),
        {},
      );
    };

    setSelectedFilters({
      organizations: initializeFilterSection(orgItems, currentFilters.organizations),
      roles: initializeFilterSection(userRoleItems, currentFilters.roles),
      statuses: initializeFilterSection(userStatusItems, currentFilters.statuses),
    });
  }, [currentFilters, organizations, orgItems]);

  if (!isOpen) return null;

  const handleClose = () => {
    setViewSubList(null);
    onClose();
  };

  const handleApplyFilters = () => {
    const filters: FilterValues = {
      organizations: orgItems.filter(name => selectedFilters.organizations[name]),
      roles: userRoleItems.filter(name => selectedFilters.roles[name]),
      statuses: userStatusItems.filter(name => selectedFilters.statuses[name]),
    };
    onApplyFilters(filters);
    handleClose();
  };

  const updateSelectedFilters = (
    filterType: keyof typeof selectedFilters,
    itemName: string,
    checked: boolean,
  ) => {
    setSelectedFilters(previousFilters => ({
      ...previousFilters,
      [filterType]: {
        ...previousFilters[filterType],
        [itemName]: checked,
      },
    }));
  };

  const clearFilterSection = (filterType: keyof typeof selectedFilters) => {
    setSelectedFilters(previousFilters => ({
      ...previousFilters,
      [filterType]: {},
    }));
  };

  const top = anchorRect ? anchorRect.bottom + 8 : 100;
  const left = anchorRect ? anchorRect.left : 100;

  const renderSelectablePanel = (
    title: string,
    items: string[],
    filterType: keyof typeof selectedFilters,
  ) => {
    const selected = selectedFilters[filterType];
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="text-text-400 text-base">{title}</div>
          <button
            className="text-text-400 hover:text-text-500"
            title="Clear"
            onClick={() => clearFilterSection(filterType)}
          >
            <Trash />
          </button>
        </div>
        <div className="max-h-64 overflow-auto pr-2">
          {items.map(name => (
            <label key={name} className="flex items-center gap-3 px-1 py-2">
              <input
                type="checkbox"
                className="h-4 w-4 border-border-dark"
                checked={!!selected[name]}
                onChange={e => updateSelectedFilters(filterType, name, e.target.checked)}
              />
              <span className={"text-neutral-800 text-base"}>
                {name === userStatus.SUSPENDED || name === userStatus.ACTIVE ? (
                  <StatusBadge status={name} />
                ) : (
                  formatCapitalizedEnum(name)
                )}
              </span>
            </label>
          ))}
        </div>
      </>
    );
  };

  const renderRightPanel = () => {
    let children = null;
    switch (viewSubList) {
      case FilterDropdownOptions.ORGANIZATION:
        children = renderSelectablePanel(
          FilterDropdownOptions.ORGANIZATION,
          orgItems,
          "organizations",
        );
        break;
      case FilterDropdownOptions.ROLE:
        children = renderSelectablePanel(FilterDropdownOptions.ROLE, userRoleItems, "roles");
        break;
      case FilterDropdownOptions.STATUS:
        children = renderSelectablePanel(FilterDropdownOptions.STATUS, userStatusItems, "statuses");
        break;
      default:
        children = null;
    }

    if (!children) return null;

    return (
      <div
        className="fixed z-[9999] min-w-[220px] bg-white border border-border-light shadow-lg rounded-lg p-4"
        style={{ top, left: anchorRect ? anchorRect.left + listWidth + 10 : left + listWidth + 20 }}
      >
        {children}
        <div className="border-t mt-3 pt-3 flex justify-end">
          <button
            className="bg-primary font-tertiary text-base hover:bg-primary/90 text-white font-medium px-8 py-2 rounded-full"
            onClick={handleApplyFilters}
          >
            {en.common.apply}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className={`fixed z-[9999] w-[${listWidth}px] bg-white border border-border-light shadow-lg rounded-lg`}
        style={{ top, left }}
      >
        {menuItems.map(item => {
          const isActive = viewSubList === item;
          const count = selectedCounts[item] ?? 0;
          return (
            <button
              key={item}
              className={`block font-normal text-base text-left px-4 py-2 m-2 rounded-md transition-colors ${
                isActive
                  ? "bg-neutral-100 text-text"
                  : "hover:bg-background-secondary text-neutral-800"
              }`}
              onClick={() => setViewSubList(item)}
              style={{ width: listWidth - 20 }}
              aria-pressed={isActive}
            >
              <div className="flex items-center justify-between">
                <span>{item}</span>
                {count > 0 && <span className="text-primary">{count}</span>}
              </div>
            </button>
          );
        })}
      </div>
      {renderRightPanel()}
    </div>
  );
};
