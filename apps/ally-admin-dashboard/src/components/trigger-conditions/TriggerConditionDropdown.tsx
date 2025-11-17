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
  isInTable?: boolean;
}

/**
 * Styled wrapper for TextDropdown used in Trigger Conditions
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
  isInTable = false,
}) => {
  return (
    <div
      className={`px-2 rounded-sm [&_button>span]:mr-3 [&_button>span]:text-[#4A4459] [&_button>span]:font-normal [&_button>span]:leading-none [&_button]:py-0 [&_button]:h-full [&_button]:flex [&_button]:items-center ${isInTable ? "bg-neutral-100" : "bg-neutral-50 border"} ${className}`}
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
