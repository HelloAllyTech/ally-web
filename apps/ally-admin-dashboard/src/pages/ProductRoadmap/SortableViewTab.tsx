import React, { useEffect, useRef, useState } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pin } from "@icons";

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

        {/* Affordances only on the ACTIVE tab, so the strip stays quiet. Rename and delete are
            owner-only; pinning additionally needs manage permission. */}
        {isActive && !isRenaming && (
          <span className="flex items-center gap-1">
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsRenaming(true)}
                aria-label={`Rename ${view.name}`}
                className="text-typography-secondary hover:text-primary-500 text-xs"
              >
                Rename
              </button>
            )}
            {canPin && (
              <button
                type="button"
                onClick={onTogglePinned}
                aria-label={view.pinned ? `Unpin ${view.name}` : `Pin ${view.name}`}
                className="text-typography-secondary hover:text-primary-500 text-xs"
              >
                {view.pinned ? "Unpin" : "Pin"}
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                onClick={onDelete}
                aria-label={`Delete ${view.name}`}
                className="text-typography-secondary hover:text-destructive-500 text-xs"
              >
                Delete
              </button>
            )}
          </span>
        )}
      </div>

      {isActive && (
        <span className="bg-primary-500 absolute inset-x-0 bottom-0 h-[3px] rounded-t-lg" />
      )}
    </li>
  );
};
