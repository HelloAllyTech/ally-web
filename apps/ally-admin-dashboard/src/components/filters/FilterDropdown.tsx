import React, { useEffect, useMemo, useState } from "react";

import { Trash } from "@assets";
import { GenericFilterDropdownProps, RequestFilterOption } from "@components/types";
import { KeyboardKeys, en } from "@constants";

const listWidth = 200;

export function FilterDropdown<T extends Record<string, any>>({
  isOpen,
  onClose,
  sections,
  onApplyFilters,
  anchorRect,
  currentFilters,
}: GenericFilterDropdownProps<T>) {
  const [viewSubList, setViewSubList] = useState<keyof T | null>(null);

  // Initialize with correct type
  const [selectedFilters, setSelectedFilters] = useState<Record<keyof T, Record<string, boolean>>>(
    {} as any,
  );

  // Initialize count map
  const selectedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sections.forEach(section => {
      const sectionFilters = selectedFilters[section.id];
      counts[section.id as string] = sectionFilters
        ? Object.values(sectionFilters).filter(Boolean).length
        : 0;
    });
    return counts;
  }, [selectedFilters, sections]);

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

  // Reset internal state when isOpen opens or currentFilters change
  useEffect(() => {
    if (!sections.length) return;

    const newSelectedFilters: any = {};

    sections.forEach(section => {
      // currentFilters[section.id] should be string[]
      const currentSectionFilters = (currentFilters[section.id] as unknown as string[]) || [];

      const selectionMap: Record<string, boolean> = {};
      // Ensure specific options are marked
      currentSectionFilters.forEach(val => {
        selectionMap[val] = true;
      });

      newSelectedFilters[section.id] = selectionMap;
    });

    setSelectedFilters(newSelectedFilters);
  }, [currentFilters, sections, isOpen]); // Added isOpen to reset on open

  if (!isOpen) return null;

  const handleClose = () => {
    setViewSubList(null);
    onClose();
  };

  const handleApplyFilters = () => {
    const result: any = {};

    sections.forEach(section => {
      const sectionSelection = selectedFilters[section.id] || {};
      const selectedValues = Object.keys(sectionSelection).filter(key => sectionSelection[key]);
      result[section.id] = selectedValues;
    });

    onApplyFilters(result as T);
    handleClose(); // Close after apply? Original did.
  };

  const updateSelectedFilters = (sectionId: keyof T, itemValue: string, checked: boolean) => {
    setSelectedFilters(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        [itemValue]: checked,
      },
    }));
  };

  const clearFilterSection = (sectionId: keyof T) => {
    setSelectedFilters(prev => ({
      ...prev,
      [sectionId]: {},
    }));
  };

  const top = anchorRect ? anchorRect.bottom + 8 : 100;
  const left = anchorRect ? anchorRect.left : 100;

  const renderSelectablePanel = (sectionId: keyof T) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return null;

    const selected = selectedFilters[sectionId] || {};

    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="text-typography-600 text-base">{section.label}</div>
          <button
            className="text-typography-600 hover:text-typography-800"
            title="Clear"
            onClick={() => clearFilterSection(sectionId)}
          >
            <Trash />
          </button>
        </div>
        <div className="max-h-64 overflow-auto pr-2">
          {section.options.map((option: RequestFilterOption) => (
            <label key={option.value} className="flex items-center gap-3 px-1 py-2">
              <input
                type="checkbox"
                className="h-4 w-4 border-border-dark"
                checked={!!selected[option.value]}
                onChange={e => updateSelectedFilters(sectionId, option.value, e.target.checked)}
              />
              <span className={"text-typography-900 text-base"}>
                {section.renderOption ? section.renderOption(option) : option.label}
              </span>
            </label>
          ))}
          {section.options.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500 italic">
              {en.common.noOptionsAvailable}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderRightPanel = () => {
    if (!viewSubList) return null;

    const children = renderSelectablePanel(viewSubList);
    if (!children) return null; // Should not happen if viewSubList is set correctly

    return (
      <div
        className="fixed z-[9999] min-w-[220px] bg-white border border-border-light shadow-lg rounded-lg p-4"
        style={{ top, left: anchorRect ? anchorRect.left + listWidth + 10 : left + listWidth + 20 }}
      >
        {children}
        <div className="border-t mt-3 pt-3 flex justify-end">
          <button
            className="bg-primary-500 font-tertiary text-base hover:bg-primary-600 text-white font-medium px-8 py-2 rounded-full"
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
      <div className="fixed inset-0 z-[9998]" onClick={handleClose} />
      <div
        className={`fixed z-[9999] w-[${listWidth}px] bg-white border border-border-light shadow-lg rounded-lg`}
        style={{ top, left }}
      >
        {sections.map(section => {
          const isActive = viewSubList === section.id;
          const count = selectedCounts[section.id as string] ?? 0;
          return (
            <button
              key={section.id as string}
              className={`block font-normal text-base text-typography-900 text-left px-4 py-2 m-2 rounded-md transition-colors ${
                isActive
                  ? "bg-neutral-100 text-typography-900"
                  : "hover:bg-background-secondary text-neutral-800"
              }`}
              onClick={() => setViewSubList(section.id)}
              style={{ width: listWidth - 20 }}
              aria-pressed={isActive}
            >
              <div className="flex items-center justify-between">
                <span>{section.label}</span>
                {count > 0 && <span className="text-primary">{count}</span>}
              </div>
            </button>
          );
        })}
      </div>
      {renderRightPanel()}
    </div>
  );
}
