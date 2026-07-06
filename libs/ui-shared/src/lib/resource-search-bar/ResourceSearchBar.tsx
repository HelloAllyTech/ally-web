"use client";

import { FC, useState, useEffect } from "react";

import { Search as SearchIcon } from "@carbon/icons-react";
import { Search } from "@carbon/react";

import { searchBarStyles } from "./constants";
import { SearchVariant } from "../../types";

/**
 * Props for SearchBar component.
 */

export interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  initialValue?: string;
  suggestions?: string[];
  mode?: SearchVariant;
  placeholder?: string;
}

const MAX_CHARACTER_LIMIT = 150;

/**
 * SearchBar component provides a search input with suggestions and autocomplete.
 * @component
 * @param {SearchBarProps} props - Props for SearchBar
 */
const SearchBar: FC<SearchBarProps> = ({
  onSearch,
  initialValue = "",
  suggestions = [],
  mode = SearchVariant.LIGHT,
  placeholder,
}) => {
  // Initialize with initialValue to match server render
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);

  // Only update after mount to prevent hydration mismatch
  useEffect(() => {
    if (initialValue?.length > 0 && initialValue !== searchTerm) {
      setSearchTerm(initialValue);
    }
  }, [initialValue]);

  /**
   * Handles form submission and triggers the onSearch callback.
   * @param {React.FormEvent} event
   */
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(searchTerm);
    // Only access document in browser environment
    if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  /**
   * Handles selecting a suggestion from the dropdown.
   * @param {string} option
   */
  const handleSelectOption = (option: string) => {
    const limitedValue = option.slice(0, MAX_CHARACTER_LIMIT);
    setSearchTerm(limitedValue);
    setIsOpen(false);
    if (limitedValue) onSearch(limitedValue);
  };

  const filteredSuggestions = suggestions.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <form onSubmit={handleSubmit} className="w-full" data-testid="search-bar-form">
      <div className="relative w-full h-[36px] sm:h-[60px]" data-testid="search-bar-autocomplete">
        <Search
          id="resource-search-bar-input"
          labelText={placeholder || "Need guidance? Search here.."}
          data-testid="search-bar-input"
          placeholder={placeholder || "Need guidance? Search here.."}
          value={searchTerm}
          closeButtonLabelText="Clear search"
          onChange={e => setSearchTerm(e.target.value.slice(0, MAX_CHARACTER_LIMIT))}
          onClear={() => setSearchTerm("")}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          className={`font-['IBM_Plex_Serif'] text-[16px] ${searchBarStyles[mode].searchIcon}`}
          style={{
            backgroundColor: searchBarStyles[mode].backgroundColor,
            borderRadius: "8px",
          }}
        />
        {isOpen && filteredSuggestions.length > 0 && (
          <ul
            className="absolute left-0 right-0 top-full z-50 max-h-[300px] overflow-y-auto rounded-b-[8px]"
            style={{ backgroundColor: searchBarStyles[mode].backgroundColor }}
          >
            {filteredSuggestions.map(option => (
              <li
                key={option}
                data-testid={`search-bar-option-${option.toLowerCase().replace(/\s+/g, "-")}`}
                className={`flex items-center h-12 sm:text-[12px] text-[14px] md:text-[12px] lg:text-[16px] font-['IBM_Plex_Serif'] cursor-pointer pl-4 transition-colors ${searchBarStyles[mode].optionCard}`}
                onMouseDown={e => {
                  e.preventDefault();
                  handleSelectOption(option);
                }}
              >
                <SearchIcon
                  size={16}
                  className="mr-2 text-[#888]"
                  data-testid="search-bar-option-icon"
                />
                {option}
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
};

export default SearchBar;
