import { useCallback, useEffect, useRef, useState } from "react";

import { ArrowSolid } from "@assets";
import { en } from "@constants";
import { useClickOutside, useDebounce } from "@hooks";

const DEBOUNCE_DELAY = 500;

interface CustomDropdownFieldProps {
  isSearchable?: boolean;
  handleSearchTextChange?: (searchTerm: string) => void;
  onHandleSelect: (option: { value: string; label: string }) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  defaultOption?: { value: string; label: string };
  customStyle?: any;
}

export const CustomDropdownField: React.FC<CustomDropdownFieldProps> = ({
  isSearchable = false,
  handleSearchTextChange = () => {},
  onHandleSelect = () => {},
  options,
  placeholder = en.common.select,
  defaultOption,
  customStyle = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{ value: string; label: string } | null>(
    null,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, handleClose);

  // Sync with defaultOption when it has valid value and label
  useEffect(() => {
    if (defaultOption?.value && defaultOption?.label) {
      setSelectedOption(defaultOption);
    }
  }, [defaultOption?.value, defaultOption?.label]);

  useEffect(() => {
    if (isOpen) handleSearchTextChange?.("");
  }, [isOpen]);

  const handleSelect = (option: { value: string; label: string }) => {
    setSelectedOption(option);
    onHandleSelect?.(option);
    setIsOpen(false);
  };

  // Debounced search handler
  const debouncedSearch = useDebounce((searchTerm: string) => {
    handleSearchTextChange?.(searchTerm);
  }, DEBOUNCE_DELAY);

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value;
    debouncedSearch(searchTerm);
  };

  const renderDropdown = () => {
    return (
      <div className="absolute left-0 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-[240px] overflow-auto z-10 custom-scrollbar">
        {isSearchable && (
          <div className="sticky top-0 p-2 bg-white">
            <input
              type="text"
              placeholder={en.common.search}
              onChange={handleTextChange}
              className="w-full rounded border border-border-light px-3 py-1 bg-white text-md cursor-pointer flex items-center justify-between focus-none"
            />
          </div>
        )}
        {options.length === 0 ? (
          <div className="px-3 py-2 text-sm text-typography-800">
            {en.common.noOptionsAvailable}
          </div>
        ) : (
          options.map(option => (
            <div
              key={option.value}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                option.value === selectedOption?.value
                  ? "bg-primary-50 text-primary font-medium"
                  : "text-typography-900 hover:bg-background-secondary"
              }`}
              onClick={() => handleSelect(option)}
            >
              <div className="flex items-center justify-between text-base">
                <span>{option.label}</span>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2" ref={dropdownRef}>
      <div className="relative">
        <div
          style={customStyle}
          className="w-full rounded border border-border-light px-3 py-1 bg-white text-base cursor-pointer flex items-center justify-between focus-within:ring-1 focus-within:ring-primary"
          onClick={() => setIsOpen(prev => !prev)}
        >
          <span className={selectedOption?.label ? "text-typography-900" : "text-typography-600"}>
            {selectedOption?.label || placeholder}
          </span>
          <span
            className={`text-typography-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <ArrowSolid />
          </span>
        </div>

        {isOpen && renderDropdown()}
      </div>
    </div>
  );
};
