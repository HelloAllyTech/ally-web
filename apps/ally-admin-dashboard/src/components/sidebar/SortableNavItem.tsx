import { FC, ReactNode } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { NavigationItem } from "@components/types";

interface SortableNavItemProps {
  item: NavigationItem;
  icon: ReactNode;
  isActive: boolean;
  isExpanded: boolean;
  /** When true the row is draggable; clicking still navigates (press-and-drag). */
  canReorder: boolean;
  onNavigate: (path: string) => void;
}

/**
 * A single left-nav tab rendered as a sortable list item.
 *
 * The whole row is the drag source (no separate handle). A `PointerSensor` with
 * an activation distance lives in the parent `DndContext`, so a quick click
 * navigates while a press-and-drag past the threshold reorders — and dnd-kit
 * suppresses the trailing click after a real drag.
 */
export const SortableNavItem: FC<SortableNavItemProps> = ({
  item,
  icon,
  isActive,
  isExpanded,
  canReorder,
  onNavigate,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Attach drag attributes/listeners only when reordering is enabled. Object
  // spread tolerates `listeners` being undefined, and this keeps the sortable
  // ARIA semantics off rows for roles that can't reorder.
  const dragProps = canReorder ? { ...attributes, ...listeners } : {};

  return (
    <li ref={setNodeRef} style={style}>
      <button
        onClick={() => onNavigate(item.path)}
        {...dragProps}
        className={`w-full flex items-center px-3 py-3 mb-3 rounded-lg text-left transition-colors ${
          canReorder ? "cursor-grab active:cursor-grabbing" : ""
        } ${
          isActive
            ? "bg-neutral-100 text-typography-900 font-medium "
            : "text-typography-800 hover:bg-background-secondary hover:text-typography-900"
        }`}
        title={!isExpanded ? item.label : ""}
      >
        <span
          className={`w-6 flex items-center justify-center ${isExpanded ? "mr-3" : "mx-auto"} ${isActive ? "text-typography-800" : "text-typography-600"}`}
        >
          {icon}
        </span>
        {isExpanded && (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-base text-ellipsis overflow-hidden whitespace-nowrap">
              {item.label}
            </span>
          </span>
        )}
      </button>
    </li>
  );
};
