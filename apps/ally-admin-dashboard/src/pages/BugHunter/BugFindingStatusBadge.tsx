import React from "react";

import { en } from "@constants";
import { BugFindingStatus } from "@types";

const STYLES: Record<BugFindingStatus, string> = {
  [BugFindingStatus.NEW]: "bg-neutral-100 text-typography-700 border-border-light",
  [BugFindingStatus.PENDING_APPROVAL]: "bg-amber-50 text-amber-700 border-amber-200",
  [BugFindingStatus.APPROVED]: "bg-blue-50 text-blue-700 border-blue-200",
  [BugFindingStatus.FIXING]: "bg-amber-50 text-amber-700 border-amber-200",
  [BugFindingStatus.NEEDS_INPUT]: "bg-orange-50 text-orange-700 border-orange-200",
  [BugFindingStatus.PR_OPENED]: "bg-blue-50 text-blue-700 border-blue-200",
  [BugFindingStatus.MERGED]: "bg-green-50 text-green-700 border-green-200",
  [BugFindingStatus.DISMISSED]: "bg-neutral-100 text-typography-600 border-border-light",
  [BugFindingStatus.REJECTED]: "bg-neutral-100 text-typography-600 border-border-light",
  [BugFindingStatus.FAILED]: "bg-destructive-50 text-destructive-700 border-destructive-200",
};

const LABELS: Record<BugFindingStatus, string> = {
  [BugFindingStatus.NEW]: en.bugHunter.findingStatusNew,
  [BugFindingStatus.PENDING_APPROVAL]: en.bugHunter.findingStatusPendingApproval,
  [BugFindingStatus.APPROVED]: en.bugHunter.findingStatusApproved,
  [BugFindingStatus.FIXING]: en.bugHunter.findingStatusFixing,
  [BugFindingStatus.NEEDS_INPUT]: en.bugHunter.findingStatusNeedsInput,
  [BugFindingStatus.PR_OPENED]: en.bugHunter.findingStatusPrOpened,
  [BugFindingStatus.MERGED]: en.bugHunter.findingStatusMerged,
  [BugFindingStatus.DISMISSED]: en.bugHunter.findingStatusDismissed,
  [BugFindingStatus.REJECTED]: en.bugHunter.findingStatusRejected,
  [BugFindingStatus.FAILED]: en.bugHunter.findingStatusFailed,
};

export const BugFindingStatusBadge: React.FC<{ status: BugFindingStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STYLES[status]}`}
  >
    {LABELS[status]}
  </span>
);
