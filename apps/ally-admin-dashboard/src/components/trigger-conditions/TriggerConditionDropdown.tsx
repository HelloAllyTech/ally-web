import React from "react";

import { TextDropdown } from "@components";
import { en } from "@constants";

interface TriggerConditionDropdownProps {
  value: string;
  displayValue?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isSearchable?: boolean;
  disabled?: boolean;
  className?: string;
  isInTable?: boolean;
  onLoadMore?: () => void;
  onSearch?: (searchTerm: string) => void;
}

/**
 * Styled wrapper for TextDropdown used in Trigger Conditions
 */
export const TriggerConditionDropdown: React.FC<TriggerConditionDropdownProps> = ({
  value,
  displayValue,
  options,
  onChange,
  placeholder = en.common.select,
  searchPlaceholder,
  isSearchable = false,
  disabled = false,
  className = "",
  isInTable = false,
  onLoadMore,
  onSearch,
}) => {
  // Check if we're showing placeholder (no value and no displayValue)
  const isShowingPlaceholder =
    !value || (value.trim() === "" && (!displayValue || displayValue.trim() === ""));

  return (
    <div
      className={`px-2 rounded-sm [&_button>span]:mr-3 [&_button>span]:font-normal [&_button>span]:leading-none [&_button]:py-0 [&_button]:h-full [&_button]:flex [&_button]:items-center ${isInTable ? "bg-neutral-100 [&_button]:pointer-events-none" : "bg-neutral-50 border"} ${className} rounded-sm
      ${isShowingPlaceholder ? "[&_button>span]:!text-typography-500" : "[&_button>span]:text-[#4A4459]"}
      `}
    >
      <TextDropdown
        value={value}
        displayValue={displayValue}
        options={options}
        onChange={onChange}
        onLoadMore={onLoadMore}
        onSearch={onSearch}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        isSearchable={isSearchable}
        disabled={disabled}
        className="w-full h-6 text-sm"
      />
    </div>
  );
};
