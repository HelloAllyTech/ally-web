"use client";
import { FC, useState, useRef, useEffect } from "react";

import PlayArrow from "@mui/icons-material/PlayArrow";

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
          <PlayArrow
            className="w-4 h-4 cursor-pointer rotate-90"
            onClick={() => setIsOpen(prev => !prev)}
          />
        )}
      </div>
      {isOpen && (
        <Dropdown
          options={options}
          handleChange={handleChange}
          onHandleSearch={onHandleSearch}
          searchPlaceholder={searchPlaceholder}
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
