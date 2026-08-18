import React, { useEffect, useRef, useState } from "react";

import { en } from "@constants";
import { BugFindingStatus } from "@types";

/** Matches `fadeInOut`'s configured duration in tailwind.config.js — the class loops infinite, so the flash is capped to one cycle by removing it after this long. */
const STATUS_FLASH_DURATION_MS = 1500;

const STYLES: Record<BugFindingStatus, string> = {
  [BugFindingStatus.NEW]: "bg-neutral-100 text-typography-700 border-border-light",
  [BugFindingStatus.PENDING_APPROVAL]: "bg-amber-50 text-amber-700 border-amber-200",
  [BugFindingStatus.APPROVED]: "bg-blue-50 text-blue-700 border-blue-200",
  [BugFindingStatus.QUEUED]: "bg-amber-50 text-amber-700 border-amber-200",
  [BugFindingStatus.BLOCKED]: "bg-neutral-100 text-typography-600 border-border-light",
  [BugFindingStatus.COORDINATING]: "bg-amber-50 text-amber-700 border-amber-200",
  [BugFindingStatus.FIXING]: "bg-amber-50 text-amber-700 border-amber-200",
  [BugFindingStatus.NEEDS_INPUT]: "bg-orange-50 text-orange-700 border-orange-200",
  [BugFindingStatus.PR_OPENED]: "bg-blue-50 text-blue-700 border-blue-200",
  [BugFindingStatus.MERGED]: "bg-green-50 text-green-700 border-green-200",
  [BugFindingStatus.RELEASING]: "bg-amber-50 text-amber-700 border-amber-200",
  // The only status that means "users have this" — the one place in the table
  // worth a stronger colour than merged-but-not-shipped.
  [BugFindingStatus.RELEASED]: "bg-green-600 text-white border-green-600",
  [BugFindingStatus.RELEASE_FAILED]:
    "bg-destructive-50 text-destructive-700 border-destructive-200",
  [BugFindingStatus.DISMISSED]: "bg-neutral-100 text-typography-600 border-border-light",
  [BugFindingStatus.REJECTED]: "bg-neutral-100 text-typography-600 border-border-light",
  [BugFindingStatus.FAILED]: "bg-destructive-50 text-destructive-700 border-destructive-200",
};

const LABELS: Record<BugFindingStatus, string> = {
  [BugFindingStatus.NEW]: en.bugHunter.findingStatusNew,
  [BugFindingStatus.PENDING_APPROVAL]: en.bugHunter.findingStatusPendingApproval,
  [BugFindingStatus.APPROVED]: en.bugHunter.findingStatusApproved,
  [BugFindingStatus.QUEUED]: en.bugHunter.findingStatusQueued,
  [BugFindingStatus.BLOCKED]: en.bugHunter.findingStatusBlocked,
  [BugFindingStatus.COORDINATING]: en.bugHunter.findingStatusCoordinating,
  [BugFindingStatus.FIXING]: en.bugHunter.findingStatusFixing,
  [BugFindingStatus.NEEDS_INPUT]: en.bugHunter.findingStatusNeedsInput,
  [BugFindingStatus.PR_OPENED]: en.bugHunter.findingStatusPrOpened,
  [BugFindingStatus.MERGED]: en.bugHunter.findingStatusMerged,
  [BugFindingStatus.RELEASING]: en.bugHunter.findingStatusReleasing,
  [BugFindingStatus.RELEASED]: en.bugHunter.findingStatusReleased,
  [BugFindingStatus.RELEASE_FAILED]: en.bugHunter.findingStatusReleaseFailed,
  [BugFindingStatus.DISMISSED]: en.bugHunter.findingStatusDismissed,
  [BugFindingStatus.REJECTED]: en.bugHunter.findingStatusRejected,
  [BugFindingStatus.FAILED]: en.bugHunter.findingStatusFailed,
};

/**
 * The status pill, plus a one-cycle flash whenever `status` actually changes
 * (not on mount — a table full of badges shouldn't flash on first load, only
 * a row that just moved).
 */
export const BugFindingStatusBadge: React.FC<{ status: BugFindingStatus }> = ({ status }) => {
  const [flash, setFlash] = useState(false);
  const hasMountedRef = useRef(false);
  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevStatusRef.current = status;
      return undefined;
    }
    if (prevStatusRef.current === status) return undefined;
    prevStatusRef.current = status;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), STATUS_FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
        STYLES[status]
      } ${flash ? "animate-fadeInOut motion-reduce:animate-none" : ""}`}
    >
      {LABELS[status]}
    </span>
  );
};
