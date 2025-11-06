import React from "react";

import { TextDropdown } from "@components/notion-table";

interface TriggerConditionDropdownProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isSearchable?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Styled wrapper for TextDropdown used in Trigger Conditions
 * Applies consistent styling: white background, border, rounded corners, padding
 */
export const TriggerConditionDropdown: React.FC<TriggerConditionDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = "Select",
  searchPlaceholder,
  isSearchable = false,
  disabled = false,
  className = "",
}) => {
  return (
    <div
      className={`bg-gray-100 px-2 rounded-sm [&_button>span]:mr-3 [&_button>span]:text-[#4A4459] [&_button>span]:font-normal [&_button>span]:leading-none [&_button]:py-0 [&_button]:h-full [&_button]:flex [&_button]:items-center ${className}`}
    >
      <TextDropdown
        value={value}
        options={options}
        onChange={onChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        isSearchable={isSearchable}
        disabled={disabled}
        className="w-full h-6 text-sm"
      />
    </div>
  );
};
