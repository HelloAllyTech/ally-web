import React, { useEffect, useRef, useState } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit, Pin } from "@icons";

import { OverflowMenu, OverflowMenuItem } from "@ally-ui-mono/ui-shared";
import { RoadmapSavedView } from "@types";

interface SortableViewTabProps {
  view: RoadmapSavedView;
  isActive: boolean;
  /** Unsaved changes on an owned view — shown as a dot, mirroring the source. */
  isDirty: boolean;
  isOwner: boolean;
  canReorder: boolean;
  canPin: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onTogglePinned: () => void;
  onDelete: () => void;
  /** Set while a rename input is open, so the parent can suspend dragging. */
  onEditingChange: (isEditing: boolean) => void;
}

/**
 * One saved-view tab.
 *
 * Mirrors components/sidebar/SortableNavItem: the whole tab is the drag source, and the parent's
 * PointerSensor activation distance means a quick click selects while a press-and-drag reorders,
 * with dnd-kit swallowing the trailing click.
 *
 * This is bespoke rather than ui-shared's Tabs because that component's TabItem is
 * `{ id, label, count }` only — no room for a pin icon, a dirty dot, an inline rename, a delete
 * affordance or a drag handle. The styling deliberately matches the top-level strip so the two
 * read as one system.
 */
export const SortableViewTab: React.FC<SortableViewTabProps> = ({
  view,
  isActive,
  isDirty,
  isOwner,
  canReorder,
  canPin,
  onSelect,
  onRename,
  onTogglePinned,
  onDelete,
  onEditingChange,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(view.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: view.id,
    // Dragging is suspended while renaming: the input would swallow the pointer anyway, and a
    // reorder mid-edit would leave the indices stale.
    disabled: !canReorder || isRenaming,
  });

  useEffect(() => {
    onEditingChange(isRenaming);
  }, [isRenaming, onEditingChange]);

  useEffect(() => {
    if (isRenaming) inputRef.current?.select();
  }, [isRenaming]);

  const commitRename = () => {
    const next = draftName.trim();
    setIsRenaming(false);
    if (!next || next === view.name) {
      setDraftName(view.name);
      return;
    }
    onRename(next);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dragProps = canReorder && !isRenaming ? { ...attributes, ...listeners } : {};

  return (
    <li ref={setNodeRef} style={style} className="relative shrink-0">
      <div
        className={`flex items-center gap-1.5 px-3 py-3 ${
          isActive ? "text-primary-500" : "text-typography-900"
        }`}
      >
        {isRenaming ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={event => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={event => {
              if (event.key === "Enter") commitRename();
              if (event.key === "Escape") {
                setDraftName(view.name);
                setIsRenaming(false);
              }
            }}
            aria-label="View name"
            className="border-border-light w-36 border px-1 text-base outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            {...dragProps}
            className={`flex items-center gap-1.5 whitespace-nowrap text-base ${
              canReorder ? "cursor-grab active:cursor-grabbing" : ""
            }`}
            title={canReorder ? "Click to open, press and drag to reorder" : view.name}
          >
            {view.pinned && <Pin size={14} aria-label="Pinned for everyone" />}
            <span>{view.name}</span>
            {isDirty && (
              <span
                aria-label="Unsaved changes"
                className="bg-primary-500 h-1.5 w-1.5 shrink-0 rounded-full"
              />
            )}
          </button>
        )}

        {/*
          Affordances only on the ACTIVE tab, so the strip stays quiet — and now behind ONE edit
          icon instead of up to three inline text buttons, which made the active tab three times
          the width of its neighbours and shifted the whole strip every time you changed tab.

          Carbon's OverflowMenu rather than a bespoke popover: it brings keyboard navigation,
          click-outside and focus return with it, and this is a menu attached to a draggable
          element where getting any of those wrong is easy.

          ORDER: Rename, Pin/Unpin, then Delete — not the requested unpin/delete/rename. Delete
          is last and marked `isDelete` because it is the one irreversible item here; sitting it
          between two benign options is how it gets clicked by muscle memory.

          Rendered only when there is at least one thing to offer: a non-owner without manage
          permission gets no menu rather than an empty one.
        */}
        {isActive && !isRenaming && (isOwner || canPin) && (
          <span
            // stopPropagation on both: the tab is a drag source and a select target, so a
            // pointerdown inside the menu would otherwise start a drag or re-select the tab.
            onClick={event => event.stopPropagation()}
            onPointerDown={event => event.stopPropagation()}
          >
            <OverflowMenu
              size="sm"
              flipped
              // The trigger's tooltip was being CLIPPED. It renders above the button by default,
              // and the tab strip is `overflow-x-auto` — CSS will not let one axis clip while the
              // other stays visible, so the strip cropped it vertically too. `align="bottom"`
              // drops it below the icon, `autoAlign` lets floating-ui shift it if that edge is
              // constrained as well.
              align="bottom"
              autoAlign
              renderIcon={Edit}
              // iconDescription, NOT aria-label. Carbon renders its own tooltip on this trigger
              // and points the button at it with aria-labelledby, so an aria-label is dropped on
              // the floor and the button keeps Carbon's default name of "Options" — verified in
              // the DOM. iconDescription is the string that tooltip actually shows, which makes
              // it both the accessible name and the hover label.
              iconDescription={`Actions for ${view.name}`}
            >
              {isOwner && (
                <OverflowMenuItem itemText="Rename" onClick={() => setIsRenaming(true)} />
              )}
              {canPin && (
                <OverflowMenuItem
                  itemText={view.pinned ? "Unpin" : "Pin"}
                  onClick={onTogglePinned}
                />
              )}
              {isOwner && (
                <OverflowMenuItem isDelete hasDivider itemText="Delete" onClick={onDelete} />
              )}
            </OverflowMenu>
          </span>
        )}
      </div>

      {isActive && (
        <span className="bg-primary-500 absolute inset-x-0 bottom-0 h-[3px] rounded-t-lg" />
      )}
    </li>
  );
};
