import { useCallback, useEffect, useRef, useState } from "react";

import { Controller } from "react-hook-form";

import { ArrowSolid } from "@assets";
import { DropdownFieldProps } from "@components/types";
import { en } from "@constants";
import { useClickOutside, useDebounce } from "@hooks";

const DEBOUNCE_DELAY = 500;

export const DropdownField: React.FC<DropdownFieldProps> = ({
  label,
  id,
  formMethods,
  isSearchable = false,
  handleSearchTextChange = () => {},
  options,
  placeholder = en.common.select,
  isMandatory = false,
  defaultOption,
  optionsRenderer,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, handleClose);

  const { control, getValues } = formMethods;

  useEffect(() => {
    if (isOpen) handleSearchTextChange?.("");
    if (!isOpen) onClose?.();
  }, [isOpen]);

  const handleSelect = (field: any, value: string) => {
    field.onChange(value);
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

  const renderDropdown = (field: { value: string }) => {
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
        ) : optionsRenderer ? (
          options.map(option =>
            optionsRenderer(option, (value: string) => handleSelect(field, value)),
          )
        ) : (
          options.map(option => (
            <div
              key={option.value}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                option.value === field.value
                  ? "bg-primary-50 text-primary font-medium"
                  : "text-typography-900 hover:bg-background-secondary"
              }`}
              onClick={() => handleSelect(field, option.value)}
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
        <Controller
          name={id}
          control={control}
          defaultValue={getValues?.(id) ?? ""}
          rules={{ required: isMandatory ? `${label} is required` : false }}
          render={({ field }) => {
            const selected = options.find(option => option.value === field.value);
            return (
              <>
                <div
                  className="w-full rounded border border-border-light px-3 py-1 bg-white text-base cursor-pointer flex items-center justify-between focus-within:ring-1 focus-within:ring-primary"
                  onClick={() => setIsOpen(prev => !prev)}
                >
                  <span
                    className={
                      selected || defaultOption ? "text-typography-900" : "text-typography-600"
                    }
                  >
                    {selected ? selected.label : defaultOption || placeholder}
                  </span>
                  <span
                    className={`text-typography-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    <ArrowSolid />
                  </span>
                </div>

                {isOpen && renderDropdown(field)}
              </>
            );
          }}
        />
      </div>
    </div>
  );
};
