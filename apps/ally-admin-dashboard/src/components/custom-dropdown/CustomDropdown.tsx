import { useState, useRef, useCallback, useEffect } from "react";

import { createPortal } from "react-dom";

import { ArrowSolid } from "@assets";
import { en } from "@constants";
import { useCreatePortal } from "@hooks";
import { Option, UserRoles } from "@types";
import { formatCapitalizedEnum } from "@utils";

interface CustomDropdownProps {
  label: string;
  options: Option[] | UserRoles[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = en.userManagement.selectOrg,
  required = false,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const dropdownPosition = useCreatePortal(triggerRef, isOpen, {
    matchTriggerWidth: true,
    dropdownHeight: 240,
  });

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    if (!isOpen) return () => {};
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current?.contains(target) || portalRef.current?.contains(target)) {
        return;
      }
      handleClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen, searchable]);

  const getOptionId = (option: Option | UserRoles): string | number => {
    return option.id;
  };

  const getOptionValue = (option: Option | UserRoles): string => {
    return "value" in option ? option.value : option.name;
  };

  const selectedOption = options.find(opt => getOptionId(opt).toString() === value.toString());

  const filteredOptions =
    searchable && searchQuery
      ? options.filter(opt => getOptionValue(opt).toLowerCase().includes(searchQuery.toLowerCase()))
      : options;

  const handleSelect = (optionId: string | number) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col gap-2" ref={dropdownRef}>
      <label className="text-sm text-typography-900 cursor-pointer font-primary">
        {label}
        {required && <span className="text-destructive-500">*</span>}
      </label>
      <div className="relative" ref={triggerRef}>
        <div
          className="border rounded-md px-3 py-2 bg-white w-full outline-none font-primary text-base cursor-pointer flex items-center justify-between hover:border-border-dark transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={selectedOption ? "text-typography-900" : "text-typography-600"}>
            {selectedOption ? getOptionValue(selectedOption) : placeholder}
          </span>

          <div
            className={`text-typography-700 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          >
            <ArrowSolid />
          </div>
        </div>

        {isOpen &&
          dropdownPosition &&
          createPortal(
            <div
              ref={portalRef}
              className="fixed bg-white border rounded-md shadow-lg z-[9999] animate-fadeIn flex flex-col"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                maxHeight: "240px",
              }}
            >
              {searchable && (
                <div className="px-2 pt-2 pb-1 border-b sticky top-0 bg-white">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full px-2 py-1 text-sm border rounded outline-none font-primary text-typography-900 placeholder:text-typography-500 focus:border-primary"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              )}
              <div className="overflow-auto custom-scrollbar flex-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-typography-900">
                    {en.common.noOptionsAvailable}
                  </div>
                ) : (
                  filteredOptions.map(option => {
                    const optionId = getOptionId(option);
                    const optionValue = getOptionValue(option);
                    const isSelected = optionId.toString() === value.toString();

                    return (
                      <div
                        key={optionId}
                        className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary-50 text-primary font-medium"
                            : "text-typography-900 hover:bg-background-secondary"
                        }`}
                        onClick={() => handleSelect(optionId)}
                      >
                        <div className="flex items-center justify-between text-sm font-primary">
                          <span>{formatCapitalizedEnum(optionValue)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
};
