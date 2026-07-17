"use client";

import { FC, useId, useState } from "react";

import { DropdownProps } from "./types";

/**
 * Dropdown component displays a searchable, keyboard-navigable listbox of options.
 * @component
 * @param {DropdownProps} props - Props for Dropdown
 */
const Dropdown: FC<DropdownProps> = ({
  options,
  handleChange,
  className,
  style,
  optionsMaxHeight,
  onHandleSearch,
  searchPlaceholder,
  onClose,
  hideSearch = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();

  /**
   * Returns the filtered options based on the search query.
   */
  const getOptions = () => {
    if (onHandleSearch) {
      return options;
    }

    return options.filter(option =>
      option?.toLowerCase()?.trim()?.includes(searchQuery?.toLowerCase()?.trim()),
    );
  };

  const filteredOptions = getOptions();

  /**
   * Handles search input changes and triggers optional search callback.
   * @param {string} query
   */
  const handleSearch = (query: string) => {
    if (onHandleSearch) {
      onHandleSearch(query);
    }
    setSearchQuery(query);
    setActiveIndex(-1);
  };

  /**
   * Keyboard support: Up/Down move the highlight, Enter selects the highlighted
   * option, Escape asks the parent to close the dropdown.
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex(prev =>
          filteredOptions.length ? (prev < 0 ? 0 : (prev + 1) % filteredOptions.length) : -1,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex(prev =>
          filteredOptions.length
            ? prev < 0
              ? filteredOptions.length - 1
              : (prev - 1 + filteredOptions.length) % filteredOptions.length
            : -1,
        );
        break;
      case "Enter":
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          event.preventDefault();
          handleChange(filteredOptions[activeIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        onClose?.();
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={`p-2 absolute bg-white border border-[#DBDBDB] rounded-[8px] z-50 shadow-lg ${className}`}
      style={style}
      onClick={e => e.stopPropagation()}
    >
      {!hideSearch && (
        <input
          type="text"
          role="combobox"
          aria-expanded
          aria-controls={listboxId}
          aria-label={searchPlaceholder || "Search"}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={searchPlaceholder || "Search"}
          className="w-full mb-2 px-2 py-1.5 text-base rounded-[4px] bg-[#F5F5F7] border border-[#DBDBDB] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      )}
      <div
        id={listboxId}
        role="listbox"
        className="flex flex-col gap-0.5 overflow-y-auto pr-1"
        style={{ maxHeight: optionsMaxHeight ?? 240 }}
      >
        {filteredOptions.length === 0 ? (
          <span className="px-1 py-1 text-sm text-black/50">No results</span>
        ) : (
          filteredOptions.map((option, index) => (
            <button
              key={option}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleChange(option)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`text-left cursor-pointer text-base font-primary rounded-[4px] px-2 py-1.5 bg-transparent border-0 focus:outline-none ${
                index === activeIndex ? "bg-[#F5F5F7] text-primary" : "text-typography-900"
              }`}
            >
              {option}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default Dropdown;
