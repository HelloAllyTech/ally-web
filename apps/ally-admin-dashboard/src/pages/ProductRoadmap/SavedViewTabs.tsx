import React, { useState } from "react";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";

import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapSavedView } from "@types";

import { SortableViewTab } from "./SortableViewTab";

interface SavedViewTabsProps {
  views: RoadmapSavedView[];
  activeViewId: string | null;
  isDirty: boolean;
  isOwner: (view: RoadmapSavedView) => boolean;
  canReorder: boolean;
  canPin: boolean;
  canSave: boolean;
  onSelect: (id: string | null) => void;
  onSaveCurrentAs: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onTogglePinned: (view: RoadmapSavedView) => void;
  onDelete: (view: RoadmapSavedView) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

/**
 * The saved-view sub-tab strip: "All" plus one tab per view, drag-reorderable.
 *
 * Styled to match the top-level Tabs strip (bottom border, primary-coloured active label with a
 * 3px underline) so the two read as one system, but built bespoke because ui-shared's Tabs
 * cannot carry a pin icon, a dirty dot, an inline rename or a delete affordance.
 *
 * "All" is index 0 and lives OUTSIDE the SortableContext — it is not a saved view and must not
 * be draggable or reorderable.
 */
export const SavedViewTabs: React.FC<SavedViewTabsProps> = ({
  views,
  activeViewId,
  isDirty,
  isOwner,
  canReorder,
  canPin,
  canSave,
  onSelect,
  onSaveCurrentAs,
  onRename,
  onTogglePinned,
  onDelete,
  onReorder,
}) => {
  const [isEditingAny, setIsEditingAny] = useState(false);
  const [isNaming, setIsNaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RoadmapSavedView | null>(null);

  // Press-and-drag: a click under the threshold selects the tab, a press-and-move past it
  // reorders. Same constraint as the sidebar, for the same reason.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    // Suspended while a rename input is open — the indices would be stale.
    if (isEditingAny) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = views.map(v => v.id);
    const fromIndex = ids.indexOf(String(active.id));
    const toIndex = ids.indexOf(String(over.id));
    if (fromIndex === -1 || toIndex === -1) return;

    onReorder(fromIndex, toIndex);
  };

  const commitNewName = () => {
    const name = newName.trim();
    setIsNaming(false);
    setNewName("");
    if (name) onSaveCurrentAs(name);
  };

  return (
    <div className="border-border-light flex items-center justify-between gap-4 border-b">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <ul className="flex min-w-0 items-center overflow-x-auto">
          {/* "All": not a saved view, so outside SortableContext and never draggable. */}
          <li className="relative shrink-0">
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={`px-3 py-3 text-base whitespace-nowrap ${
                activeViewId === null ? "text-primary-500" : "text-typography-900"
              }`}
            >
              All
            </button>
            {activeViewId === null && (
              <span className="bg-primary-500 absolute inset-x-0 bottom-0 h-[3px] rounded-t-lg" />
            )}
          </li>

          <SortableContext items={views.map(v => v.id)} strategy={horizontalListSortingStrategy}>
            {views.map(view => (
              <SortableViewTab
                key={view.id}
                view={view}
                isActive={view.id === activeViewId}
                isDirty={view.id === activeViewId && isDirty && isOwner(view)}
                isOwner={isOwner(view)}
                canReorder={canReorder}
                canPin={canPin}
                onSelect={() => onSelect(view.id)}
                onRename={name => onRename(view.id, name)}
                onTogglePinned={() => onTogglePinned(view)}
                onDelete={() => setDeleteTarget(view)}
                onEditingChange={setIsEditingAny}
              />
            ))}
          </SortableContext>
        </ul>
      </DndContext>

      {canSave && (
        <div className="flex shrink-0 items-center gap-2 pb-1">
          {isNaming ? (
            <input
              autoFocus
              value={newName}
              onChange={event => setNewName(event.target.value)}
              onBlur={commitNewName}
              onKeyDown={event => {
                if (event.key === "Enter") commitNewName();
                if (event.key === "Escape") {
                  setIsNaming(false);
                  setNewName("");
                }
              }}
              placeholder="View name"
              aria-label="New view name"
              className="border-border-light w-40 border px-2 py-1 text-sm outline-none"
            />
          ) : (
            <Button variant={ButtonVariant.TEXT} onClick={() => setIsNaming(true)}>
              Save current filters as a view
            </Button>
          )}
        </div>
      )}

      <ActionConfirmationPopup
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete saved view"
        titleItalic={deleteTarget?.name}
        description="This removes the view for anyone it was shared with. Your opportunities are unaffected."
        primaryButton={{
          label: "Delete",
          onClick: () => {
            if (deleteTarget) onDelete(deleteTarget);
            setDeleteTarget(null);
          },
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setDeleteTarget(null),
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};
