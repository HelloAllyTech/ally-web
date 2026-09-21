import { useLayoutEffect, useState, RefObject, useCallback } from "react";

type Position = { top: number; left: number; width?: number } | null;

export function useCreatePortal(
  // Only ever read via getBoundingClientRect, so any element works — callers
  // pass a <button> trigger as well as a <div>.
  triggerRef: RefObject<HTMLElement>,
  openDropdown: boolean,
  options?: {
    dropdownWidth?: number;
    dropdownHeight?: number;
    margin?: number;
    matchTriggerWidth?: boolean;
    // Ref to the rendered menu element. When provided, its real measured
    // height drives the flip decision instead of the `dropdownHeight` estimate,
    // so short menus (e.g. a 2-option list) don't flip upward on an
    // over-reserved height and paint over content above the trigger.
    dropdownRef?: RefObject<HTMLElement>;
  },
) {
  const {
    dropdownWidth = 300,
    dropdownHeight = 280,
    margin = 8,
    matchTriggerWidth = false,
    dropdownRef,
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

    // Prefer the menu's actual rendered height once it's mounted; fall back to
    // the configured estimate for the first pass (before the menu exists).
    const measuredHeight = dropdownRef?.current?.offsetHeight;
    const height = measuredHeight && measuredHeight > 0 ? measuredHeight : dropdownHeight;

    let top = rect.bottom + 4;
    let left = rect.left;

    // Flip vertically only when the menu would overflow the bottom AND there is
    // genuinely more room above than below — otherwise opening downward is
    // always preferred, even if it has to scroll.
    const spaceBelow = viewportHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    if (height > spaceBelow && spaceAbove > spaceBelow) {
      top = rect.top - height - 4;
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

    // Bail out of a re-render when nothing moved — keeps the ResizeObserver
    // recompute below from looping on a fresh-but-identical position object.
    setDropdownPosition(prev => {
      if (
        prev &&
        prev.top === top &&
        prev.left === left &&
        prev.width === (matchTriggerWidth ? width : undefined)
      ) {
        return prev;
      }
      return matchTriggerWidth ? { top, left, width } : { top, left };
    });
  }, [
    triggerRef,
    openDropdown,
    dropdownWidth,
    dropdownHeight,
    margin,
    matchTriggerWidth,
    dropdownRef,
  ]);

  useLayoutEffect(() => {
    if (!openDropdown) return undefined;

    updateDropdownPosition();

    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);

    // Re-measure once the menu mounts (dropdownPosition flips null → set) and
    // whenever its content height changes (search filtering, async option
    // loading), so the flip decision always uses the real rendered height.
    let observer: ResizeObserver | undefined;
    if (dropdownRef?.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateDropdownPosition());
      observer.observe(dropdownRef.current);
    }

    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
      observer?.disconnect();
    };
  }, [openDropdown, updateDropdownPosition, dropdownRef, dropdownPosition]);

  return dropdownPosition;
}
