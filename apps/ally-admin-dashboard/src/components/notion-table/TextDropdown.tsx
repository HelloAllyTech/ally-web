import React, { useState, useRef, useEffect, useCallback } from "react";

import clsx from "clsx";

import { ArrowDownFilled } from "@assets";
import { useClickOutside } from "@hooks";

import { keyCodes } from "./utils";

interface DropdownOption {
  label: string;
  value: string;
  backgroundColor?: string;
}

interface TextDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isSearchable?: boolean;
  className?: string;
  disabled?: boolean;
}

export const TextDropdown = ({
  value,
  options,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  className,
  isSearchable = false,
  disabled = false,
}: TextDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter options based on search term
  const filteredOptions = options?.filter(option =>
    option?.label?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Find the current value's index in filtered options
  const currentValueIndex = filteredOptions.findIndex(option => option.value === value);

  // Handle opening/closing dropdown
  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm("");
      setHighlightedIndex(currentValueIndex);
    }
  };

  // Handle option selection
  const selectOption = (option: DropdownOption) => {
    onChange(option.value);
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
        setHighlightedIndex(currentValueIndex);
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
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
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

  // Get current option display value
  const currentOption = options.find(option => option.value === value);
  const displayValue = currentOption ? currentOption.label : value || placeholder;

  return (
    <div ref={dropdownRef} className={clsx("relative w-full", className)}>
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={clsx(
          "w-full bg-transparent py-2 text-left",
          "flex items-center justify-between",
          {
            "bg-gray-50 cursor-not-allowed": disabled,
            "cursor-pointer": !disabled,
          },
        )}
      >
        <span className={clsx("truncate mr-1", { "text-gray-500": !value })}>{displayValue}</span>
        {!disabled && <ArrowDownFilled width={8} height={8} />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-[calc(100%+24px)] left-[-12px] mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          {isSearchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">No options found</div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option?.value}
                  ref={el => (optionRefs.current[index] = el)}
                  onClick={() => selectOption(option)}
                  className={clsx("px-3 py-2 cursor-pointer text-sm flex items-center", {
                    "bg-blue-50 text-blue-700": index === highlightedIndex,
                    "bg-white text-gray-900 hover:bg-gray-50": index !== highlightedIndex,
                  })}
                >
                  {option.backgroundColor && (
                    <div
                      className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: option.backgroundColor }}
                    />
                  )}
                  <span className="truncate">{option?.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
