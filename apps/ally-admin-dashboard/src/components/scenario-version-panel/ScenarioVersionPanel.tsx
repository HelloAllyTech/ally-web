import React, { useState } from "react";

import { toast } from "sonner";

import {
  useGetScenarioVersionsQuery,
  useCreateScenarioVersionMutation,
  useUpdateScenarioVersionMutation,
  useDeleteScenarioVersionMutation,
} from "@api";
import { Branch, Close, Edit, Tick, Trash } from "@assets";
import { ActionConfirmationPopup } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { ScenarioVersion, ScenarioVersionStatus, formatVersionLabel } from "@types";
import { formatDate } from "@utils";

const t = en.simulation.versions;

interface ScenarioVersionPanelProps {
  scenarioId: string | number;
  /** The version currently open in the editor (highlighted in the list). */
  activeVersionId?: string;
  isOpen: boolean;
  onClose: () => void;
  /** Open a version for editing (parent loads its config into the form). */
  onEditVersion: (version: ScenarioVersion) => void;
  /** Fired after a version is deleted, so the parent can exit it if it was active. */
  onVersionDeleted?: (deletedId: string) => void;
  /**
   * Awaited before creating/branching so the parent can flush unsaved edits of
   * the current draft first — otherwise a branch would clone the server's
   * last-saved config and miss in-editor changes.
   */
  onBeforeCreate?: () => Promise<void>;
}

const STATUS_PILL: Record<ScenarioVersionStatus, string> = {
  [ScenarioVersionStatus.DRAFT]: "bg-warning-50 text-typography-900",
  [ScenarioVersionStatus.PUBLISHED]: "bg-success-100 text-typography-900",
  [ScenarioVersionStatus.ARCHIVED]: "bg-neutral-100 text-typography-700",
};

const StatusPill: React.FC<{ status: ScenarioVersionStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center px-[6px] py-[1px] rounded-full text-[11px] font-regular ${
      STATUS_PILL[status] ?? STATUS_PILL[ScenarioVersionStatus.DRAFT]
    }`}
  >
    {t.statusLabel[status] ?? t.statusLabel.DRAFT}
  </span>
);

const nameInputClass =
  "flex-1 min-w-0 border border-border-light px-2 py-1 text-sm text-typography-900 focus:border-border-blue outline-none rounded";
const iconBtnClass =
  "shrink-0 p-1 text-typography-600 hover:text-typography-900 disabled:opacity-50";
// Per-row action icons (rename / branch / delete) — uniform icon buttons so the
// row actions read consistently instead of mixing a pencil icon with text links.
const rowActionBtnClass =
  "shrink-0 p-1 rounded text-typography-500 hover:text-typography-900 hover:bg-secondary-100 disabled:opacity-50";

/**
 * Compact version switcher — a dropdown anchored under the header version
 * label. Clicking a row switches the editor to that version (one click).
 * Creating (blank or branch) and renaming happen INLINE inside the dropdown —
 * no extra modal. Delete keeps a confirmation since it's destructive. The live
 * scenario only changes on publish.
 */
export const ScenarioVersionPanel: React.FC<ScenarioVersionPanelProps> = ({
  scenarioId,
  activeVersionId,
  isOpen,
  onClose,
  onEditVersion,
  onVersionDeleted,
  onBeforeCreate,
}) => {
  const { data: versions = [], isFetching } = useGetScenarioVersionsQuery(
    { scenarioId },
    { skip: !isOpen || !scenarioId },
  );
  const [createVersion, { isLoading: isCreating }] = useCreateScenarioVersionMutation();
  const [updateVersion, { isLoading: isRenaming }] = useUpdateScenarioVersionMutation();
  const [deleteVersion] = useDeleteScenarioVersionMutation();

  const [deleteTarget, setDeleteTarget] = useState<ScenarioVersion | null>(null);
  // Inline create row: null = closed; otherwise blank (empty) or branch mode.
  const [createMode, setCreateMode] = useState<{
    fromVersionId?: string;
    empty?: boolean;
  } | null>(null);
  const [draftName, setDraftName] = useState("");
  // Inline rename: id of the version whose name is being edited in place.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startCreate = (opts: { fromVersionId?: string; empty?: boolean }) => {
    setRenamingId(null);
    setDraftName("");
    setCreateMode(opts);
  };
  const cancelCreate = () => setCreateMode(null);

  const handleCreateVersion = async () => {
    if (!createMode) return;
    try {
      // Persist the current draft's unsaved edits first so a branch clones the
      // latest config, not the server's last-autosaved snapshot.
      await onBeforeCreate?.();
      const created = await createVersion({
        scenarioId,
        name: draftName.trim() || undefined,
        fromVersionId: createMode.fromVersionId,
        empty: createMode.empty,
      }).unwrap();
      setCreateMode(null);
      toast.success(t.created(formatVersionLabel(created)));
      onEditVersion(created);
    } catch {
      toast.error(t.createError);
    }
  };

  const startRename = (version: ScenarioVersion) => {
    setCreateMode(null);
    setRenameValue(version.name?.trim() ?? "");
    setRenamingId(version.id);
  };
  const cancelRename = () => setRenamingId(null);

  const handleRename = async (version: ScenarioVersion) => {
    try {
      const updated = await updateVersion({
        scenarioId,
        versionId: version.id,
        name: renameValue.trim(),
      }).unwrap();
      setRenamingId(null);
      toast.success(t.renamed(formatVersionLabel(updated)));
    } catch {
      toast.error(t.renameError);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVersion({ scenarioId, versionId: deleteTarget.id }).unwrap();
      toast.success(t.deleted(formatVersionLabel(deleteTarget)));
      onVersionDeleted?.(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      toast.error(t.deleteError);
    }
  };

  if (!isOpen) return null;

  const branchFrom = createMode?.fromVersionId
    ? versions.find(v => v.id === createMode.fromVersionId)
    : undefined;

  return (
    <>
      {/* Click-away layer (sits below the dropdown, above the page). */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[360px] max-h-[70vh] overflow-y-auto custom-scrollbar bg-white border border-border-light rounded shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light sticky top-0 bg-white">
          <span className="text-sm font-medium text-typography-900">{t.title}</span>
          <button
            className="text-sm text-primary-500 hover:underline disabled:opacity-50"
            onClick={() => startCreate({ empty: true })}
            disabled={isCreating}
          >
            {t.newVersion}
          </button>
        </div>

        {/* Inline create row (blank or branch) — no modal. */}
        {createMode && (
          <div className="px-4 py-3 border-b border-border-light bg-secondary-50">
            <p className="text-[11px] text-typography-500 mb-1.5">
              {createMode.empty
                ? t.newBlankTitle
                : t.branchingFrom(branchFrom ? formatVersionLabel(branchFrom) : "")}
            </p>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={draftName}
                maxLength={120}
                onChange={e => setDraftName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleCreateVersion();
                  if (e.key === "Escape") cancelCreate();
                }}
                placeholder={t.namePlaceholder}
                className={nameInputClass}
              />
              <button
                className={iconBtnClass}
                onClick={handleCreateVersion}
                disabled={isCreating}
                title={t.create}
              >
                <Tick />
              </button>
              <button className={iconBtnClass} onClick={cancelCreate} title={t.cancel}>
                <Close />
              </button>
            </div>
          </div>
        )}

        {isFetching && versions.length === 0 ? (
          <p className="text-sm text-typography-500 px-4 py-4">{t.loading}</p>
        ) : versions.length === 0 && !createMode ? (
          <p className="text-sm text-typography-500 px-4 py-4">{t.empty}</p>
        ) : (
          <ul className="divide-y divide-border-light">
            {versions.map(version => {
              // No selected version means the editor is on the live scenario,
              // which the `isLive` version stands for — so it's the active row.
              const isActive = activeVersionId ? version.id === activeVersionId : !!version.isLive;
              const isPublished = version.status === ScenarioVersionStatus.PUBLISHED;
              const isRenamingThis = renamingId === version.id;
              return (
                <li
                  key={version.id}
                  className={`group px-4 py-3 ${isActive ? "bg-secondary-50" : "hover:bg-secondary-50"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {isRenamingThis ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          type="text"
                          autoFocus
                          value={renameValue}
                          maxLength={120}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleRename(version);
                            if (e.key === "Escape") cancelRename();
                          }}
                          placeholder={t.namePlaceholder}
                          className={nameInputClass}
                        />
                        <button
                          className={iconBtnClass}
                          onClick={() => handleRename(version)}
                          disabled={isRenaming}
                          title={t.save}
                        >
                          <Tick />
                        </button>
                        <button className={iconBtnClass} onClick={cancelRename} title={t.cancel}>
                          <Close />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-2 text-left min-w-0"
                        onClick={() => onEditVersion(version)}
                        title={t.openTooltip}
                      >
                        <span className="text-sm font-medium text-typography-900 truncate group-hover:underline">
                          {formatVersionLabel(version)}
                        </span>
                        <StatusPill status={version.status} />
                        {isActive && (
                          <span className="text-[11px] text-typography-500 shrink-0">
                            {t.editing}
                          </span>
                        )}
                      </button>
                    )}
                    {!isRenamingThis && (
                      <span className="text-[11px] text-typography-500 shrink-0">
                        {formatDate(version.createdAt)}
                      </span>
                    )}
                  </div>
                  {!isRenamingThis && (
                    <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className={rowActionBtnClass}
                        onClick={() => startRename(version)}
                        title={t.rename}
                        aria-label={t.rename}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className={rowActionBtnClass}
                        onClick={() => startCreate({ fromVersionId: version.id })}
                        title={t.branch}
                        aria-label={t.branch}
                      >
                        <Branch className="w-3.5 h-3.5" />
                      </button>
                      {/* The live-mirroring version is the editor's handle on
                          the live scenario; deleting it would strand that
                          content (the server refuses it too). */}
                      {!isPublished && !version.isLive && (
                        <button
                          className={`${rowActionBtnClass} hover:text-destructive-500`}
                          onClick={() => setDeleteTarget(version)}
                          title={t.delete}
                          aria-label={t.delete}
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {deleteTarget && (
        <ActionConfirmationPopup
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title={t.deleteTitle}
          titleItalic={formatVersionLabel(deleteTarget)}
          description={t.deleteDescription}
          primaryButton={{
            label: t.delete,
            onClick: handleDelete,
            variant: ButtonVariant.DESTRUCTIVE,
          }}
          secondaryButton={{
            label: t.cancel,
            onClick: () => setDeleteTarget(null),
            variant: ButtonVariant.SECONDARY,
          }}
        />
      )}
    </>
  );
};
