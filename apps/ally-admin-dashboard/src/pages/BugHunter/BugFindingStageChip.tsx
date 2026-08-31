import React from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { BugFindingStage, BugFindingStatus } from "@types";

import { BUG_FINDING_STAGE_LABELS, BUG_FINDING_STATUS_LABELS } from "./bugFindingLabels";

const formatDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString() : "—");

/**
 * The coarse roadmap stage, rendered as a deliberately QUIET chip beside the
 * pipeline status badge.
 *
 * Two badges of equal weight on one row is two things to read where there should
 * be one (Stacks: "Balance Transparency with Cognitive Load in Agent UX" — enough
 * insight to feel confident, not every step of the process). So the pipeline
 * status keeps the coloured pill and its urgency signalling, and the stage is
 * plain muted text: available at a glance for anyone who thinks in roadmap
 * ladders, invisible to anyone who does not.
 *
 * For the same reason the chip carries no colour of its own. Colour here would
 * compete with the status badge, whose colour is doing real work — it is what
 * makes `needs_input` and `failed` stand out from a screen of quiet rows (Stacks:
 * "Dynamic visibility scaling tied to information urgency").
 *
 * The one thing it does emphasise is the PIN, because a pinned stage has stopped
 * tracking the pipeline and is the only case where the two can legitimately
 * disagree — a reader comparing them needs to know that before they read it as a
 * fault.
 */
export const BugFindingStageChip: React.FC<{
  stage: BugFindingStage;
  status: BugFindingStatus;
  isAuto: boolean;
  pinnedByName?: string | null;
  pinnedAt?: string | null;
}> = ({ stage, status, isAuto, pinnedByName, pinnedAt }) => {
  const label = BUG_FINDING_STAGE_LABELS[stage];

  const tooltip = isAuto
    ? en.bugHunter.findingStageAutoTooltip
        .replace("{stage}", label.toLowerCase())
        .replace("{status}", BUG_FINDING_STATUS_LABELS[status].toLowerCase())
    : en.bugHunter.findingStagePinnedTooltip
        .replace("{name}", pinnedByName ?? en.bugHunter.reporterUnknown)
        .replace("{date}", formatDate(pinnedAt ?? null));

  return (
    <Tooltip label={tooltip} align="top">
      <span className="inline-flex items-center gap-1 text-xs text-typography-600 whitespace-nowrap cursor-help">
        {label}
        {!isAuto && (
          <span className="text-[10px] uppercase tracking-wide text-typography-500">
            {en.bugHunter.findingStagePinned}
          </span>
        )}
      </span>
    </Tooltip>
  );
};
