import { FC } from "react";

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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Languages, Plus, Settings, WarningAlt } from "@assets";
import { TrackItemType, TrackSectionFormValue } from "@types";

import { SectionNode } from "./SectionNode";
import { TrackSelection, isSettingsSelection, isTranslationsSelection } from "./types";

interface TrackOutlineRailProps {
  sections: TrackSectionFormValue[];
  selection: TrackSelection;
  errorKeys: Set<string>;
  onSelectSettings: () => void;
  onSelectTranslations: () => void;
  /** Published translation count, shown as a badge on the Languages node. */
  publishedLanguageCount: number;
  onSelectItem: (sectionIndex: number, itemIndex: number) => void;
  onAddSection: () => void;
  onAddItem: (sectionIndex: number, type: TrackItemType) => void;
  onDeleteSection: (sectionIndex: number) => void;
  onReorderSections: (from: number, to: number) => void;
  onReorderItems: (sectionIndex: number, from: number, to: number) => void;
}

/** Left rail: Track settings node + dnd-sortable sections with their items. */
export const TrackOutlineRail: FC<TrackOutlineRailProps> = ({
  sections,
  selection,
  errorKeys,
  onSelectSettings,
  onSelectTranslations,
  publishedLanguageCount,
  onSelectItem,
  onAddSection,
  onAddItem,
  onDeleteSection,
  onReorderSections,
  onReorderItems,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex(section => section.localId === active.id);
    const to = sections.findIndex(section => section.localId === over.id);
    if (from !== -1 && to !== -1) onReorderSections(from, to);
  };

  const settingsHasError = errorKeys.has("settings");

  return (
    <div className="w-[300px] flex-shrink-0 border-r border-border-light h-full overflow-y-auto custom-scrollbar p-3">
      <button
        type="button"
        onClick={onSelectSettings}
        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md mb-2 ${
          isSettingsSelection(selection)
            ? "bg-primary-50 text-primary-700"
            : "hover:bg-secondary-50 text-typography-800"
        }`}
      >
        <Settings className="w-4 h-4" />
        <span className="text-sm font-medium flex-1 text-left">Track settings</span>
        {settingsHasError && <WarningAlt className="w-3.5 h-3.5 text-destructive-500" />}
      </button>

      <button
        type="button"
        onClick={onSelectTranslations}
        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md mb-2 ${
          isTranslationsSelection(selection)
            ? "bg-primary-50 text-primary-700"
            : "hover:bg-secondary-50 text-typography-800"
        }`}
      >
        <Languages className="w-4 h-4" />
        <span className="text-sm font-medium flex-1 text-left">Languages</span>
        {publishedLanguageCount > 0 && (
          <span className="rounded-full bg-success-50 px-1.5 py-0.5 text-[10px] text-success-700">
            {publishedLanguageCount}
          </span>
        )}
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sections.map(section => section.localId)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section, sectionIndex) => (
            <SectionNode
              key={section.localId}
              section={section}
              sectionIndex={sectionIndex}
              selection={selection}
              errorKeys={errorKeys}
              onSelectItem={onSelectItem}
              onAddItem={onAddItem}
              onDeleteSection={onDeleteSection}
              onReorderItems={onReorderItems}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={onAddSection}
        className="w-full inline-flex items-center justify-center gap-1 border border-dashed border-border-dark rounded-md py-2 text-sm text-typography-600 hover:bg-secondary-50 mt-2"
      >
        <Plus className="w-4 h-4" />
        Add section
      </button>
    </div>
  );
};
