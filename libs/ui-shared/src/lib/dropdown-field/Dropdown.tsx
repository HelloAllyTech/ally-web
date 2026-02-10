"use client";

import { FC, useState } from "react";

import { DropdownProps } from "./types";

/**
 * Dropdown component displays a searchable dropdown list of options.
 * @component
 * @param {DropdownProps} props - Props for Dropdown
 */
const Dropdown: FC<DropdownProps> = ({
  options,
  handleChange,
  className,
  style,
  onHandleSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

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

  /**
   * Handles search input changes and triggers optional search callback.
   * @param {string} query
   */
  const handleSearch = (query: string) => {
    if (onHandleSearch) {
      onHandleSearch(query);
    }
    setSearchQuery(query);
  };

  return (
    <div
      className={`p-2 absolute bg-white border border-[#DBDBDB] rounded-[8px] z-50 ${className}`}
      style={style}
      onClick={e => e.stopPropagation()}
    >
      <input
        type="text"
        value={searchQuery}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search"
        className="w-full mb-2 px-2 py-1 rounded-[4px] bg-[#F5F5F7] border border-[#DBDBDB]"
      />
      <div className="flex flex-col gap-2 max-h-[110px] overflow-y-auto">
        {getOptions().map(option => (
          <span
            key={option}
            onClick={() => handleChange(option)}
            className="cursor-pointer font-primary"
          >
            {option}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Dropdown;
