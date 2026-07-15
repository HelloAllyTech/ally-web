"use client";
import { FC, useState, useRef, useEffect } from "react";

import { Play } from "@carbon/icons-react";

import { Dropdown } from ".";
import { DropdownFieldProps } from "./types";

/**
 * DropdownField component displays a dropdown with search and selection capabilities.
 * @component
 * @param {DropdownFieldProps} props - Props for DropdownField
 */
const DropdownField: FC<DropdownFieldProps> = ({
  disabled,
  label,
  value,
  onChange,
  options,
  valueClassName,
  onHandleSearch,
  searchPlaceholder,
  hideSearch = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [openUpward, setOpenUpward] = useState<boolean>(false);
  const [optionsMaxHeight, setOptionsMaxHeight] = useState<number>(240);

  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Handles option selection and closes the dropdown.
   * @param {string} value
   */
  const handleChange = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const estimatedDropdownHeight = 296;
    const gap = 8;
    const minOptionsHeight = 120;
    const reservedInputHeight = 56;

    const spaceBelow = viewportHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const shouldOpenUpward = spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow;

    setOpenUpward(shouldOpenUpward);
    const availableSpace = Math.max(shouldOpenUpward ? spaceAbove : spaceBelow, minOptionsHeight);
    setOptionsMaxHeight(Math.max(availableSpace - reservedInputHeight, minOptionsHeight));
  }, [isOpen]);

  return (
    <div className="w-full relative" ref={dropdownRef}>
      <div className="w-full flex gap-2 items-center">
        {label && <span>{label}</span>}
        <span className={valueClassName}>{value}</span>
        {!disabled && (
          <button
            type="button"
            aria-label={label ? `Toggle ${label} options` : "Toggle options"}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(prev => !prev)}
            className="cursor-pointer bg-transparent border-0 p-0 flex items-center rounded-[4px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Play size={16} className="w-4 h-4 rotate-90" />
          </button>
        )}
      </div>
      {isOpen && (
        <Dropdown
          options={options}
          handleChange={handleChange}
          onHandleSearch={onHandleSearch}
          onClose={() => setIsOpen(false)}
          searchPlaceholder={searchPlaceholder}
          hideSearch={hideSearch}
          optionsMaxHeight={optionsMaxHeight}
          className={`left-0 min-w-full font-secondary ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        />
      )}
    </div>
  );
};

/**
 * Props for DropdownField component.
 */
export default DropdownField;
