import { FC } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { DragIndicator, WarningAlt } from "@assets";
import { TRACK_ITEM_TYPE_LABELS } from "@constants";
import { TrackItemFormValue } from "@types";

interface ItemNodeProps {
  item: TrackItemFormValue;
  sectionIndex: number;
  itemIndex: number;
  isSelected: boolean;
  hasError: boolean;
  onSelect: () => void;
}

/** A single sortable item row inside a section in the outline rail. */
export const ItemNode: FC<ItemNodeProps> = ({
  item,
  itemIndex,
  isSelected,
  hasError,
  onSelect,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.localId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const label = item.title?.trim() || `${TRACK_ITEM_TYPE_LABELS[item.type]} ${itemIndex + 1}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group flex items-center gap-1.5 pl-6 pr-2 py-1.5 rounded-md cursor-pointer ${
        isSelected ? "bg-primary-50 text-primary-700" : "hover:bg-secondary-50 text-typography-800"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        onClick={event => event.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-typography-400 opacity-0 group-hover:opacity-100"
        aria-label="Reorder item"
      >
        <DragIndicator className="w-3.5 h-3.5" />
      </button>
      <span className="text-[11px] uppercase tracking-wide text-typography-400 flex-shrink-0">
        {TRACK_ITEM_TYPE_LABELS[item.type].slice(0, 4)}
      </span>
      <span className="text-sm truncate flex-1">{label}</span>
      {hasError && <WarningAlt className="w-3.5 h-3.5 text-destructive-500 flex-shrink-0" />}
    </div>
  );
};
