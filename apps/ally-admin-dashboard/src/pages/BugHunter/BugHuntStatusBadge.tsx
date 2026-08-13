import React from "react";

import { en } from "@constants";
import { BugHuntRunStatus } from "@types";

const STYLES: Record<BugHuntRunStatus, string> = {
  [BugHuntRunStatus.RUNNING]: "bg-amber-50 text-amber-700 border-amber-200",
  [BugHuntRunStatus.COMPLETED]: "bg-green-50 text-green-700 border-green-200",
  [BugHuntRunStatus.FAILED]: "bg-destructive-50 text-destructive-700 border-destructive-200",
  [BugHuntRunStatus.SKIPPED_DISABLED]: "bg-neutral-100 text-typography-600 border-border-light",
};

const LABELS: Record<BugHuntRunStatus, string> = {
  [BugHuntRunStatus.RUNNING]: en.bugHunter.statusRunning,
  [BugHuntRunStatus.COMPLETED]: en.bugHunter.statusCompleted,
  [BugHuntRunStatus.FAILED]: en.bugHunter.statusFailed,
  [BugHuntRunStatus.SKIPPED_DISABLED]: en.bugHunter.statusSkippedDisabled,
};

export const BugHuntStatusBadge: React.FC<{ status: BugHuntRunStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STYLES[status]}`}
  >
    {LABELS[status]}
  </span>
);
