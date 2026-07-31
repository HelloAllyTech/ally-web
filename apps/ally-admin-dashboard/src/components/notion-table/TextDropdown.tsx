import React, { useState, useRef, useEffect, useCallback } from "react";

import clsx from "clsx";

import { ArrowDownFilled } from "@assets";
import { useClickOutside, useCreatePortal } from "@hooks";

import { keyCodes } from "./utils";

interface DropdownOption {
  label: string;
  value: string;
  backgroundColor?: string;
  /**
   * Optional heading this option sits under. Options carrying the same
   * consecutive `groupLabel` are rendered beneath one sticky header — callers
   * are responsible for ordering `options` so a group's members are adjacent.
   * Headers are display-only and never enter keyboard navigation.
   */
  groupLabel?: string;
}

interface TextDropdownProps {
  value: string;
  displayValue?: string;
  options: DropdownOption[];
  onChange: (value: string, label?: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isSearchable?: boolean;
  className?: string;
  disabled?: boolean;
  onLoadMore?: () => void;
  onSearch?: (searchTerm: string) => void;
  optionRenderer?: (option: DropdownOption, onSelect: (value: string) => void) => React.ReactNode;
}

export const TextDropdown = ({
  value,
  displayValue,
  options,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  className,
  isSearchable = false,
  disabled = false,
  onLoadMore,
  onSearch,
  optionRenderer,
}: TextDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Use options directly when onSearch is provided (global search), otherwise filter locally.
  // The group label is searchable too, so typing a provider still finds its
  // voices once the provider moved out of each option's own label.
  const filteredOptions = onSearch
    ? options
    : options?.filter(option => {
        const term = searchTerm.toLowerCase();
        return (
          option?.label?.toLowerCase().includes(term) ||
          option?.groupLabel?.toLowerCase().includes(term)
        );
      });

  // Handle opening/closing dropdown
  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm("");
      setHighlightedIndex(-1);
    }
  };

  // Handle option selection
  const selectOption = (option: DropdownOption) => {
    onChange(option.value, option.label);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
      return;
    }

    switch (e.key) {
      case keyCodes.arrowDown:
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case keyCodes.arrowUp:
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case keyCodes.enter:
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case keyCodes.escape:
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setHighlightedIndex(-1);
    if (onSearch) {
      onSearch(newSearchTerm);
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  }, []);

  useClickOutside(dropdownRef, handleClose);

  const dropdownPosition = useCreatePortal(triggerRef, isOpen, {
    dropdownHeight: 240,
    matchTriggerWidth: true,
    dropdownRef,
  });

  // Get current option display value
  const currentOption = options?.find(option => option.value === value);
  const finalDisplayValue =
    displayValue && displayValue.trim() !== ""
      ? displayValue
      : currentOption
        ? currentOption.label
        : value || placeholder;

  return (
    <div className={clsx("relative w-full", className)}>
      {/* Dropdown Trigger */}
      <div ref={triggerRef}>
        <button
          type="button"
          onMouseDown={e => {
            e.stopPropagation();
            toggleDropdown();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={clsx(
            "w-full bg-transparent py-2 text-left",
            "flex items-center justify-between",
            {
              "bg-background-secondary cursor-not-allowed": disabled,
              "cursor-pointer": !disabled,
            },
          )}
        >
          <div className={clsx("truncate mr-1", { "text-typography-500": !value })}>
            {finalDisplayValue}
          </div>
          {!disabled && <ArrowDownFilled width={8} height={8} />}
        </button>
      </div>

      {/* Dropdown Menu */}
      {dropdownPosition && isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-50 min-w-[120px] bg-background border border-border-light rounded-md shadow-lg max-h-60 overflow-hidden"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          {/* Search Input */}
          {isSearchable && (
            <div className="p-2 border-b border-border-light">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full px-2 py-1 text-sm border border-border-light rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-typography-800 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                // A header is emitted whenever the group changes, so the flat
                // index stays aligned with optionRefs and highlightedIndex.
                const previousGroup =
                  index > 0 ? filteredOptions[index - 1]?.groupLabel : undefined;
                const showGroupHeader = !!option.groupLabel && option.groupLabel !== previousGroup;

                return (
                  <React.Fragment key={option?.value}>
                    {showGroupHeader && (
                      <div className="sticky top-0 z-10 bg-background-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-typography-600">
                        {option.groupLabel}
                      </div>
                    )}
                    {optionRenderer ? (
                      <div
                        ref={el => (optionRefs.current[index] = el)}
                        className={clsx({
                          "bg-primary-50 text-primary-700": index === highlightedIndex,
                        })}
                      >
                        {optionRenderer(option, (v: string) =>
                          selectOption({ ...option, value: v }),
                        )}
                      </div>
                    ) : (
                      <div
                        ref={el => (optionRefs.current[index] = el)}
                        onClick={() => selectOption(option)}
                        className={clsx("px-3 py-2 cursor-pointer text-sm flex items-center", {
                          "bg-primary-50 text-primary-700": index === highlightedIndex,
                          "bg-white text-typography-900 hover:bg-background-secondary":
                            index !== highlightedIndex,
                        })}
                      >
                        {option.backgroundColor && (
                          <div
                            className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                            style={{ backgroundColor: option.backgroundColor }}
                          />
                        )}
                        <span className="whitespace-nowrap">{option?.label}</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
            {/* Load More Button */}
            {onLoadMore && (
              <div className="px-3 py-2 border-t border-border-light">
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="w-full text-sm text-center text-typography-500 hover:text-typography-700 font-medium"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
