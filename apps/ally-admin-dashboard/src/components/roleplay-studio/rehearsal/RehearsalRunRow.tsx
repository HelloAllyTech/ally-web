import React from "react";

import { StatusBadge } from "@components";
import { en } from "@constants";
import {
  RoleplayRehearsal,
  RoleplayRehearsalProgress,
  RoleplayRehearsalStatus,
} from "@src/types/roleplayStudio";
import { formatDate } from "@utils";

interface RehearsalRunRowProps {
  rehearsal: RoleplayRehearsal;
  /** Live socket progress overrides the fetched snapshot when present. */
  liveProgress?: RoleplayRehearsalProgress;
  liveStatus?: string;
  isSelected: boolean;
  onSelect: () => void;
  onCancel: () => void;
}

const isActiveStatus = (status: string) =>
  status === RoleplayRehearsalStatus.PENDING || status === RoleplayRehearsalStatus.RUNNING;

/** One rehearsal run: status badge, profiles, live progress bar, cancel. */
export const RehearsalRunRow: React.FC<RehearsalRunRowProps> = ({
  rehearsal,
  liveProgress,
  liveStatus,
  isSelected,
  onSelect,
  onCancel,
}) => {
  const strings = en.roleplayStudio.rehearsal;
  const status = liveStatus ?? String(rehearsal.status);
  const progress = liveProgress ?? rehearsal.progress;
  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
      : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border bg-white p-3 text-left transition-colors ${
        isSelected ? "border-primary-500" : "border-border-light hover:border-primary-300"
      }`}
      data-testid={`rehearsal-run-${rehearsal.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={status} />
          <span className="truncate text-sm text-typography-800">
            {(rehearsal.traineeProfiles ?? [])
              .map(profile => strings.profiles[profile] ?? profile)
              .join(", ")}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {rehearsal.createdAt && (
            <span className="text-xs text-typography-600">{formatDate(rehearsal.createdAt)}</span>
          )}
          {isActiveStatus(status) && (
            <span
              role="button"
              tabIndex={0}
              onClick={event => {
                event.stopPropagation();
                onCancel();
              }}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  event.stopPropagation();
                  onCancel();
                }
              }}
              className="text-xs text-typography-600 hover:text-destructive-500"
            >
              {strings.cancel}
            </span>
          )}
        </div>
      </div>
      {isActiveStatus(status) && percent !== null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-primary-400 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-xs text-typography-600">
            {progress?.completed}/{progress?.total}
          </span>
        </div>
      )}
    </button>
  );
};
