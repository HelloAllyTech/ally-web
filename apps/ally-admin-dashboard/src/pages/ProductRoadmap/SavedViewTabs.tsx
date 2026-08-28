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
import { Add } from "@icons";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { ActionConfirmationPopup } from "@components";
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
  /** Creates a new, EMPTY view — see createNewView in useSavedViews. */
  onCreateView: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onTogglePinned: (view: RoadmapSavedView) => void;
  onDelete: (view: RoadmapSavedView) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

/**
 * The saved-view sub-tab strip: "Queue" and "All", then one tab per saved view,
 * drag-reorderable.
 *
 * Styled to match the top-level Tabs strip (bottom border, primary-coloured active label with a
 * 3px underline) so the two read as one system, but built bespoke because ui-shared's Tabs
 * cannot carry a pin icon, a dirty dot, an inline rename or a delete affordance.
 *
 * "Queue" and "All" are indices 0 and 1 IN THAT ORDER, and both live OUTSIDE the SortableContext
 * — neither is a saved view, so neither is draggable, reorderable, ownable, pinnable, renameable
 * or deletable. "Queue" is a hardcoded pseudo-view: New + Prioritised + In development
 * opportunities, opened as a list — see QUEUE_VIEW_ID / QUEUE_VIEW_STATE in utils/views.
 *
 * Queue leads because the pipeline is the working surface; "All" is the reference behind it.
 * NOTE this is position only — the page still LANDS on "All" when no ?view= is present, since
 * that is what an unparameterised URL has always meant.
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
  onCreateView,
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
    if (name) onCreateView(name);
  };

  return (
    <div className="border-border-light flex items-center justify-between gap-4 border-b">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/*
          pb-5 is for the ACTIVE TAB'S TOOLTIP, not spacing.
          This <ul> scrolls horizontally, and CSS will not let one axis clip while the other stays
          visible — so it clips vertically too, at exactly the tab's own height. Carbon's overflow
          menu portals its MENU out of here, but its trigger tooltip renders as a descendant, so
          neither `align` nor `autoAlign` can get the bubble out: aligning it top clipped it above,
          aligning it bottom clipped it below (measured at 18 of its 22px). Twenty pixels of room
          is the cheapest fix that keeps Carbon's accessible-name wiring intact.
          `overflow-x-clip` + `overflow-clip-margin` would cost no space but would also stop the
          strip scrolling, which it needs once there are more views than fit.
        */}
        <ul className="flex min-w-0 items-center overflow-x-auto pb-5">
          {/*
            "Queue" used to be FIRST here. It is now a top-level tab beside Opportunities, one
            level up — the pipeline is what people come here to work through, and sitting it a row
            below the thing it is the working subset of read as though it were one filter preset
            among eight. The pseudo-view id and state still drive it and `?view=queue` is still
            its URL, so nothing about the view machinery changed; only where it is offered. This
            strip is not rendered on the Queue at all — see ProductRoadmap.

            "All": not a saved view, so outside SortableContext. First now that Queue has gone up.
          */}
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
            /*
              Icon, not a text link. The label was the widest thing in this strip and it sat next
              to the view tabs competing for the same glance, while the action itself is
              occasional — you save a view once and then use it for months.
              Icon-only means it MUST carry both a tooltip and an aria-label, per the tooltip
              convention in ally-web/CLAUDE.md. align="bottom" for the same reason the header's
              tooltips use it: pointing up from this row renders off the top of the viewport.
            */
            <Tooltip label="New view" align="bottom">
              <button
                type="button"
                aria-label="New view"
                onClick={() => setIsNaming(true)}
                className="text-typography-secondary hover:text-typography-primary inline-flex cursor-pointer items-center"
              >
                <Add size={18} />
              </button>
            </Tooltip>
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
