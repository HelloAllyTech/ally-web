import React, { useEffect, useState } from "react";

import { Trash } from "@assets";
import { FilterDropdownProps, FilterDropdownType, FilterValues } from "@components/types";
import {
  KeyboardKeys,
  en,
  filterDropdownOptions,
  userRoleItems,
  userStatusItems,
} from "@constants";
import { formatCapitalizedEnum } from "@utils";

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
    { id: FilterDropdownType.ROLE, label: filterDropdownOptions.ROLE },
    { id: FilterDropdownType.ORGANIZATION, label: filterDropdownOptions.ORGANIZATION },
    { id: FilterDropdownType.STATUS, label: filterDropdownOptions.STATUS },
  ];

  const [viewSubList, setViewSubList] = useState<FilterDropdownType | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Record<string, boolean>>>({
    organizations: {},
    roles: {},
    statuses: {},
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === KeyboardKeys.ESCAPE) onClose();
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
    setSelectedFilters({
      organizations:
        organizations?.reduce(
          (acc, name) => ({ ...acc, [name]: currentFilters.organizations.includes(name) }),
          {},
        ) || {},
      roles: userRoleItems.reduce(
        (acc, name) => ({ ...acc, [name]: currentFilters.roles.includes(name) }),
        {},
      ),
      statuses: userStatusItems.reduce(
        (acc, name) => ({ ...acc, [name]: currentFilters.statuses.includes(name) }),
        {},
      ),
    });
  }, [currentFilters, organizations]);

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
          <div className="text-[#9CA3AF] text-[14px]">{title}</div>
          <button
            className="text-gray-400 hover:text-gray-600"
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
                className="h-4 w-4 border-[#9CA3AF]"
                checked={!!selected[name]}
                onChange={e => updateSelectedFilters(filterType, name, e.target.checked)}
              />
              <span className="text-gray-800 text-[14px]">{formatCapitalizedEnum(name)}</span>
            </label>
          ))}
        </div>
      </>
    );
  };

  const renderRightPanel = () => {
    let children = null;
    switch (viewSubList) {
      case FilterDropdownType.ORGANIZATION:
        children = renderSelectablePanel(
          filterDropdownOptions.ORGANIZATION,
          orgItems,
          "organizations",
        );
        break;
      case FilterDropdownType.ROLE:
        children = renderSelectablePanel(filterDropdownOptions.ROLE, userRoleItems, "roles");
        break;
      case FilterDropdownType.STATUS:
        children = renderSelectablePanel(filterDropdownOptions.STATUS, userStatusItems, "statuses");
        break;
      default:
        children = null;
    }

    if (!children) return null;

    return (
      <div
        className="fixed z-[9999] min-w-[220px] bg-white border border-gray-200 shadow-lg rounded-lg p-4"
        style={{ top, left: anchorRect ? anchorRect.left + listWidth + 20 : left + listWidth + 20 }}
      >
        {children}
        <div className="border-t mt-3 pt-3 flex justify-end">
          <button
            className="bg-[#0957D0] hover:bg-[#0957D0]/90 text-[#FFFFFF] font-medium px-8 py-2 rounded-full"
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
        className={`fixed z-[9999] w-[${listWidth}px] bg-white border border-gray-200 shadow-lg rounded-lg p-2`}
        style={{ top, left }}
      >
        {menuItems.map(item => {
          const isActive = viewSubList === item.id;
          return (
            <button
              key={item.id}
              className={`block w-full font-normal text-[14px] text-left px-4 py-2 rounded-md transition-colors ${
                isActive ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-800"
              }`}
              onClick={() => setViewSubList(item.id)}
              style={{ width: listWidth }}
              aria-pressed={isActive}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {renderRightPanel()}
    </div>
  );
};

export default FilterDropdown;
