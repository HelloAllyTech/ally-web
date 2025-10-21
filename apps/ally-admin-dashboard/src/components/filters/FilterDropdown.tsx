import React, { useEffect, useState } from "react";

import { Trash } from "@assets";
import { FilterDropdownProps, FilterDropdownType } from "@components/types";
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
  onApplyOrganizations,
  onApplyRoles,
  onApplyStatuses,
  anchorRect,
}) => {
  const orgItems = organizations || [];

  const menuItems = [
    { id: FilterDropdownType.ROLE, label: filterDropdownOptions.ROLE },
    { id: FilterDropdownType.ORGANIZATION, label: filterDropdownOptions.ORGANIZATION },
    { id: FilterDropdownType.STATUS, label: filterDropdownOptions.STATUS },
  ];

  const [viewSubList, setViewSubList] = useState<FilterDropdownType | null>(null);
  const [selectedOrgs, setSelectedOrgs] = useState<Record<string, boolean>>({});
  const [selectedRoles, setSelectedRoles] = useState<Record<string, boolean>>({});
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, boolean>>({});

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

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedOrgs({});
    setSelectedRoles({});
    setSelectedStatuses({});
    setViewSubList(null);
    onClose();
  };

  const applyOrgs = () => {
    const selected = orgItems.filter(name => selectedOrgs[name]);
    onApplyOrganizations?.(selected);
    handleClose();
  };
  const applyRoles = () => {
    const selected = userRoleItems.filter(name => selectedRoles[name]);
    onApplyRoles?.(selected);
    handleClose();
  };
  const applyStatuses = () => {
    const selected = userStatusItems.filter(name => selectedStatuses[name]);
    onApplyStatuses?.(selected);
    handleClose();
  };

  const top = anchorRect ? anchorRect.bottom + 8 : 100;
  const left = anchorRect ? anchorRect.left : 100;

  const renderSelectablePanel = (
    title: string,
    items: string[],
    selected: Record<string, boolean>,
    setSelected: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    onApply: () => void,
  ) => {
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[#9CA3AF] text-[14px]">{title}</div>
          <button
            className="text-gray-400 hover:text-gray-600"
            title="Clear"
            onClick={() => setSelected({})}
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
                onChange={e => setSelected(prev => ({ ...prev, [name]: e.target.checked }))}
              />
              <span className="text-gray-800 text-[14px]">{formatCapitalizedEnum(name)}</span>
            </label>
          ))}
        </div>
        <div className="border-t mt-3 pt-3 flex justify-end">
          <button
            className="bg-[#0957D0] hover:bg-[#0957D0]/90 text-[#FFFFFF] font-medium px-8 py-2 rounded-full"
            onClick={onApply}
          >
            {en.common.apply}
          </button>
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
          selectedOrgs,
          setSelectedOrgs,
          applyOrgs,
        );
        break;
      case FilterDropdownType.ROLE:
        children = renderSelectablePanel(
          filterDropdownOptions.ROLE,
          userRoleItems,
          selectedRoles,
          setSelectedRoles,
          applyRoles,
        );
        break;
      case FilterDropdownType.STATUS:
        children = renderSelectablePanel(
          filterDropdownOptions.STATUS,
          userStatusItems,
          selectedStatuses,
          setSelectedStatuses,
          applyStatuses,
        );
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
              aria-selected={isActive}
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
