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
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = en.userManagement.selectOrg,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const dropdownPosition = useCreatePortal(triggerRef, isOpen, {
    matchTriggerWidth: true,
    dropdownHeight: 240,
  });

  const handleClose = useCallback(() => {
    setIsOpen(false);
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

  // Helper function to get option id
  const getOptionId = (option: Option | UserRoles): string | number => {
    return option.id;
  };

  // Helper function to get option display value
  const getOptionValue = (option: Option | UserRoles): string => {
    return "value" in option ? option.value : option.name;
  };

  const selectedOption = options.find(opt => getOptionId(opt).toString() === value.toString());

  const handleSelect = (optionId: string | number) => {
    onChange(optionId);
    setIsOpen(false);
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
              className="fixed bg-white border rounded-md shadow-lg max-h-[240px] overflow-auto z-[9999] animate-fadeIn custom-scrollbar"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
              }}
            >
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-typography-900 ">
                  {en.common.noOptionsAvailable}
                </div>
              ) : (
                options.map(option => {
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
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
};
