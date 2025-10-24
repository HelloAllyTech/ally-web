import { useState, useRef, useEffect } from "react";

import { ArrowSolid } from "@assets";
import { en } from "@constants";
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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
      <label className="text-sm text-[#49454F] cursor-pointer font-['IBM_Plex_Serif']">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div
          className="border rounded-md px-3 py-2 bg-white w-full outline-none font-['IBM_Plex_Serif'] text-[14px] cursor-pointer flex items-center justify-between hover:border-gray-400 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={selectedOption ? "text-gray-900" : "text-gray-400"}>
            {selectedOption ? getOptionValue(selectedOption) : placeholder}
          </span>

          <div
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          >
            <ArrowSolid />
          </div>
        </div>

        {isOpen && (
          <div className="absolute left-0 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-[240px] overflow-auto z-10 animate-fadeIn ">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400 ">{en.common.noOptionsAvailable}</div>
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
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => handleSelect(optionId)}
                  >
                    <div className="flex items-center justify-between text-[14px] font-['IBM_Plex_Serif']">
                      <span>{formatCapitalizedEnum(optionValue)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
