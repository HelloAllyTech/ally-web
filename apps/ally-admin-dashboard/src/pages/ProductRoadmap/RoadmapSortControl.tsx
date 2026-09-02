import React, { useEffect, useRef, useState } from "react";

import { RoadmapOpportunitiesQuery } from "@types";

import { QUEUE_SORTS, queueSortIdFor } from "./utils/queueSort";

type SortBy = NonNullable<RoadmapOpportunitiesQuery["sortBy"]>;
type Order = "ASC" | "DESC";

interface RoadmapSortControlProps {
  sortBy: SortBy;
  order: Order;
  /** Applies one ordering — the caller owns the state and the paging reset. */
  onChange: (sortBy: SortBy, order: Order) => void;
}

/**
 * The Queue's sort, as a labelled disclosure: "Sort: Top rank first".
 *
 * ## Replaces a collapsed glyph
 *
 * This was one of three icon-only QueueToolbarControls (sort, goal, owner) under the search box.
 * The two facets are gone — the Queue now offers the same multi-field Filter popover as the rest
 * of the board — which left one control that no longer earned a whole collapsed-toolbar pattern.
 * A chip that SAYS what it is set to beats a glyph plus a tooltip: the ordering is the one piece
 * of state every rank on screen is read against, so it should cost nothing to read.
 *
 * ## One ordering at a time, on purpose
 *
 * The options are (field, direction) pairs and picking one replaces the last — sorting by two
 * fields at once has no meaning the list could show. That makes this a radio list, not the
 * checkbox popover the Filter button opens, and why it is its own control rather than a section
 * in there: mixing single-choice and multi-choice in one panel is how one gets misread as the
 * other.
 *
 * Styled to match the Filter / Dates & score chips beside it (same border/active treatment), so
 * the row reads as one family of controls. Outlined only while OPEN, though — unlike a filter,
 * a sort is never "inactive", so a permanently outlined chip would just be noise; the departure
 * from the Queue's default ordering is what the label already says.
 */
export const RoadmapSortControl: React.FC<RoadmapSortControlProps> = ({
  sortBy,
  order,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentId = queueSortIdFor(sortBy, order);
  const currentLabel = QUEUE_SORTS.find(option => option.id === currentId)?.label ?? "";

  /** Light-dismiss: outside click or Escape, the two exits every popover here already has. */
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`border px-2 py-1 ${
          isOpen
            ? "border-primary-500 text-primary-600"
            : "border-border-light text-typography-secondary"
        }`}
      >
        Sort: {currentLabel}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Sort the queue"
          className="border-border-light bg-white absolute left-0 top-full z-20 mt-1 flex w-56 flex-col border py-1 shadow-md"
        >
          {QUEUE_SORTS.map(option => {
            const isSelected = option.id === currentId;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => {
                  onChange(option.sortBy, option.order);
                  setIsOpen(false);
                }}
                className={`cursor-pointer px-3 py-1.5 text-left text-sm ${
                  isSelected
                    ? "bg-primary-50 text-primary-500 font-medium"
                    : "text-typography-700 hover:bg-background-secondary hover:text-typography-900"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
