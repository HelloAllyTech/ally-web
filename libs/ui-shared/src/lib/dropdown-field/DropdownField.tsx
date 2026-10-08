"use client";
import { CSSProperties, FC, useState, useRef, useEffect, useLayoutEffect } from "react";

import { Play } from "@carbon/icons-react";
import { createPortal } from "react-dom";

import { Dropdown } from ".";
import { DropdownFieldProps } from "./types";

/** Narrowest a portaled list may be, however narrow its trigger is. */
const PORTAL_MIN_WIDTH = 280;

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
  portal = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [openUpward, setOpenUpward] = useState<boolean>(false);
  const [optionsMaxHeight, setOptionsMaxHeight] = useState<number>(240);
  const [portalStyle, setPortalStyle] = useState<CSSProperties | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
      const target = event.target as Node;
      // A portaled panel is not inside dropdownRef in the DOM, so it has to be
      // checked on its own or a click on an option would close the list first.
      if (dropdownRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Layout effect so a portaled panel is placed before the first paint rather
  // than flashing at the top-left corner of the page.
  useLayoutEffect(() => {
    if (!isOpen || !dropdownRef.current) return undefined;

    const place = () => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const estimatedDropdownHeight = 296;
      const gap = 8;
      const minOptionsHeight = 120;
      // Everything in the panel except the list: its padding, plus the search
      // box and its margin. A portaled panel has nothing to fall back on if
      // this is short — it runs off the window — so count it in full there.
      const reservedInputHeight = portal ? (hideSearch ? 16 : 64) + gap : 56;

      const spaceBelow = viewportHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const shouldOpenUpward = spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow;

      setOpenUpward(shouldOpenUpward);
      const availableSpace = Math.max(shouldOpenUpward ? spaceAbove : spaceBelow, minOptionsHeight);
      setOptionsMaxHeight(Math.max(availableSpace - reservedInputHeight, minOptionsHeight));

      if (portal) {
        // The trigger can be very narrow — in the 24rem scribe drawer a long
        // label like "Name of Institution:" leaves it ~30px at the right edge —
        // so a list sized to it squeezed every option to a word per line and
        // ran off the window. Give it a readable width, and shift it left to
        // stay on screen.
        const viewportWidth = window.innerWidth;
        const width = Math.min(Math.max(rect.width, PORTAL_MIN_WIDTH), viewportWidth - 2 * gap);
        const left = Math.max(gap, Math.min(rect.left, viewportWidth - width - gap));
        setPortalStyle({
          position: "fixed",
          left,
          width,
          height: 0,
          zIndex: 9999,
          ...(shouldOpenUpward
            ? { bottom: viewportHeight - rect.top + gap }
            : { top: rect.bottom + gap }),
        });
      }
    };

    place();
    if (!portal) return undefined;

    // A fixed panel does not move with its trigger, so follow it when any
    // ancestor scrolls (capture catches scroll containers, not just window).
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [isOpen, portal, hideSearch]);

  const dropdown = (
    <Dropdown
      options={options}
      handleChange={handleChange}
      onHandleSearch={onHandleSearch}
      onClose={() => setIsOpen(false)}
      searchPlaceholder={searchPlaceholder}
      hideSearch={hideSearch}
      optionsMaxHeight={optionsMaxHeight}
      className={`left-0 min-w-full font-secondary ${
        portal
          ? openUpward
            ? "w-full bottom-0"
            : "w-full top-0"
          : openUpward
            ? "bottom-full mb-2"
            : "top-full mt-2"
      }`}
    />
  );

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
      {isOpen &&
        (portal
          ? portalStyle &&
            createPortal(
              <div ref={panelRef} style={portalStyle}>
                {dropdown}
              </div>,
              document.body,
            )
          : dropdown)}
    </div>
  );
};

/**
 * Props for DropdownField component.
 */
export default DropdownField;
