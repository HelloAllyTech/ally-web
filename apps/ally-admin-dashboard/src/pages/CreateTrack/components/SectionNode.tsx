import { FC, useState } from "react";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { ArrowDown, DragIndicator, Plus, Trash, WarningAlt } from "@assets";
import { TrackItemType, TrackSectionFormValue } from "@types";

import { ComponentTypePicker } from "./ComponentTypePicker";
import { ItemNode } from "./ItemNode";
import { TrackSelection, isSameItemSelection } from "./types";

interface SectionNodeProps {
  section: TrackSectionFormValue;
  sectionIndex: number;
  selection: TrackSelection;
  /** Node keys (item:{s}:{i} / section:{s}) that currently carry publish errors. */
  errorKeys: Set<string>;
  onSelectItem: (sectionIndex: number, itemIndex: number) => void;
  onAddItem: (sectionIndex: number, type: TrackItemType) => void;
  onDeleteSection: (sectionIndex: number) => void;
  onReorderItems: (sectionIndex: number, from: number, to: number) => void;
}

export const SectionNode: FC<SectionNodeProps> = ({
  section,
  sectionIndex,
  selection,
  errorKeys,
  onSelectItem,
  onAddItem,
  onDeleteSection,
  onReorderItems,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.localId,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = section.items.findIndex(item => item.localId === active.id);
    const to = section.items.findIndex(item => item.localId === over.id);
    if (from !== -1 && to !== -1) onReorderItems(sectionIndex, from, to);
  };

  const sectionHasError = errorKeys.has(`section:${sectionIndex}`);

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-secondary-50 group">
        <Tooltip label="Drag to reorder this section" align="top">
          <button
            {...attributes}
            {...listeners}
            type="button"
            className="cursor-grab active:cursor-grabbing text-typography-400 opacity-0 group-hover:opacity-100"
            aria-label="Reorder section"
          >
            <DragIndicator className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
        <button
          type="button"
          onClick={() => setCollapsed(prev => !prev)}
          className="text-typography-500"
          aria-label={collapsed ? "Expand section" : "Collapse section"}
        >
          <ArrowDown className={`w-4 h-4 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        <span className="text-sm font-medium text-typography-900 truncate flex-1">
          {section.title?.trim() || `Section ${sectionIndex + 1}`}
        </span>
        {sectionHasError && <WarningAlt className="w-3.5 h-3.5 text-destructive-500" />}
        <button
          type="button"
          onClick={() => onDeleteSection(sectionIndex)}
          className="text-destructive-500 opacity-0 group-hover:opacity-100 hover:text-destructive-600"
          aria-label="Delete section"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-0.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleItemDragEnd}
          >
            <SortableContext
              items={section.items.map(item => item.localId)}
              strategy={verticalListSortingStrategy}
            >
              {section.items.map((item, itemIndex) => (
                <ItemNode
                  key={item.localId}
                  item={item}
                  sectionIndex={sectionIndex}
                  itemIndex={itemIndex}
                  isSelected={isSameItemSelection(selection, sectionIndex, itemIndex)}
                  hasError={errorKeys.has(`item:${sectionIndex}:${itemIndex}`)}
                  onSelect={() => onSelectItem(sectionIndex, itemIndex)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className="relative pl-6">
            <button
              type="button"
              onClick={() => setShowPicker(prev => !prev)}
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add component
            </button>
            {showPicker && (
              <ComponentTypePicker
                onClose={() => setShowPicker(false)}
                onSelect={type => {
                  onAddItem(sectionIndex, type);
                  setShowPicker(false);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
