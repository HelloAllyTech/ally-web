import { useLayoutEffect, useState, RefObject, useCallback } from "react";

type Position = { top: number; left: number; width?: number } | null;

export function useCreatePortal(
  triggerRef: RefObject<HTMLDivElement>,
  openDropdown: boolean,
  options?: {
    dropdownWidth?: number;
    dropdownHeight?: number;
    margin?: number;
    matchTriggerWidth?: boolean;
  },
) {
  const {
    dropdownWidth = 300,
    dropdownHeight = 280,
    margin = 8,
    matchTriggerWidth = false,
  } = options || {};

  const [dropdownPosition, setDropdownPosition] = useState<Position>(null);

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current || !openDropdown) {
      setDropdownPosition(null);
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const width = matchTriggerWidth ? rect.width : dropdownWidth;

    let top = rect.bottom + 4;
    let left = rect.left;

    // Flip vertically if overflow
    if (top + dropdownHeight > viewportHeight - margin) {
      top = rect.top - dropdownHeight - 4;
    }

    // Never let a flipped dropdown run off the top of the viewport (mirrors the
    // horizontal clamp below). Keeps it on-screen instead of overlapping far-up
    // content when the trigger sits low and space above is tight.
    if (top < margin) {
      top = margin;
    }

    // Adjust horizontally if overflow
    if (left + width > viewportWidth - margin) {
      left = viewportWidth - width - margin;
    }

    if (left < margin) {
      left = margin;
    }

    setDropdownPosition(matchTriggerWidth ? { top, left, width } : { top, left });
  }, [triggerRef, openDropdown, dropdownWidth, dropdownHeight, margin, matchTriggerWidth]);

  useLayoutEffect(() => {
    if (!openDropdown) return;

    updateDropdownPosition();

    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);

    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [openDropdown, updateDropdownPosition]);

  return dropdownPosition;
}
