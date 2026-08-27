import { FC, ReactNode } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";

interface SortableMetricBlockProps {
  id: string;
  /** Full-width (xl:col-span-2) block vs. the default half-width tile. */
  wide?: boolean;
  children: ReactNode;
}

/**
 * Drag-to-reorder wrapper for one Organization Metrics chart/table block.
 *
 * Unlike the admin-dashboard sidebar's `SortableNavItem` (whole row = drag
 * source, since it's just a label + icon), these blocks are full of
 * interactive content of their own — retry buttons, table sort headers,
 * pagination, CSV export. Whole-block dragging would fight those click
 * targets, so only the small grip button in the corner is the drag source;
 * everything else inside the block behaves exactly as before.
 */
export const SortableMetricBlock: FC<SortableMetricBlockProps> = ({ id, wide, children }) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${wide ? "xl:col-span-2" : ""}`}
      data-testid={`sortable-metric-block-${id}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t("organizationMetrics.dragHandleLabel")}
        data-testid={`metric-block-drag-handle-${id}`}
        className="absolute right-2 top-2 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded text-typography-400 hover:bg-background-secondary hover:text-typography-700 active:cursor-grabbing"
      >
        <svg
          width="12"
          height="16"
          viewBox="0 0 12 16"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="2" cy="8" r="1.5" />
          <circle cx="2" cy="14" r="1.5" />
          <circle cx="10" cy="2" r="1.5" />
          <circle cx="10" cy="8" r="1.5" />
          <circle cx="10" cy="14" r="1.5" />
        </svg>
      </button>
      {children}
    </div>
  );
};
