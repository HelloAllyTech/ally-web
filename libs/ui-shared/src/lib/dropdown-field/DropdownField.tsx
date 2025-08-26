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
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

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
          className="top-5 left-0"
        />
      )}
    </div>
  );
};

/**
 * Props for DropdownField component.
 */
export default DropdownField;
