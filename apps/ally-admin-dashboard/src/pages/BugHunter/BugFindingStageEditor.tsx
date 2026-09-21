import React, { useState } from "react";

import { toast } from "sonner";

import { Button, Select, SelectItem, Tooltip } from "@ally-ui-mono/ui-shared";
import { useSetBugFindingStageMutation } from "@api";
import { TooltipIcon } from "@assets";
import { en } from "@constants";
import { BugFindingStage } from "@types";

import { BUG_FINDING_STAGE_LABELS } from "./bugFindingLabels";

const STAGE_ORDER: BugFindingStage[] = [
  BugFindingStage.NEW,
  BugFindingStage.PRIORITISED,
  BugFindingStage.UNDER_DEVELOPMENT,
  BugFindingStage.RELEASED,
  BugFindingStage.ARCHIVED,
];

const formatDateTime = (iso: string): string => new Date(iso).toLocaleString();

/**
 * The coarse roadmap stage, and the one control that can override it.
 *
 * Normally there is nothing to do here: the stage is derived from the pipeline
 * status and follows it for free. The editor exists for the bug fixed OUTSIDE
 * Bug Hunter — a hand-written PR, a config change, a fix that rode along with
 * unrelated work — where the pipeline never ran, the status is still NEW, and
 * (since bugs are no longer on the roadmap board) no other screen would ever
 * show the correction.
 *
 * Two things the copy has to carry, because both are surprising:
 *  - pinning STOPS the stage following the pipeline, permanently;
 *  - that is reversible, via "Back to automatic".
 *
 * The default view is one line, not a form. Someone opening a drawer to triage a
 * bug is not here to adjust a stage, and a permanently-open select would read as
 * a field that wants filling in.
 */
export const BugFindingStageEditor: React.FC<{
  id: string;
  stage: BugFindingStage;
  isAuto: boolean;
  pinnedByName: string | null;
  pinnedAt: string | null;
  /** False for a SUPER_ADMIN, who can read the bug table but not act on it. */
  canEdit: boolean;
}> = ({ id, stage, isAuto, pinnedByName, pinnedAt, canEdit }) => {
  const [draft, setDraft] = useState<BugFindingStage | null>(null);
  const [setStage, { isLoading }] = useSetBugFindingStageMutation();

  const save = async (next: BugFindingStage | null) => {
    try {
      await setStage({ id, stage: next }).unwrap();
      setDraft(null);
      toast.success(en.bugHunter.stageSaved);
    } catch {
      toast.error(en.bugHunter.stageSaveFailed);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-xs font-semibold text-typography-700">
          {en.bugHunter.stageSectionTitle}
        </h3>
        {canEdit && draft === null && (
          <>
            <Button size="sm" kind="ghost" onClick={() => setDraft(stage)}>
              {en.bugHunter.stageEditLabel}
            </Button>
            <Tooltip label={en.bugHunter.stageEditHint} align="bottom">
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          </>
        )}
      </div>

      {draft === null ? (
        <div className="text-sm text-typography-900">
          {BUG_FINDING_STAGE_LABELS[stage]}
          {isAuto ? (
            <span className="text-xs text-typography-500"> · {en.bugHunter.stageAutoLabel}</span>
          ) : (
            <span className="text-xs text-typography-500">
              {" · "}
              {en.bugHunter.findingStagePinnedTooltip
                .replace("{name}", pinnedByName ?? en.bugHunter.reporterUnknown)
                .replace("{date}", pinnedAt ? formatDateTime(pinnedAt) : "—")}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Select
            id={`bug-finding-stage-${id}`}
            labelText={en.bugHunter.stageSelectLabel}
            value={draft}
            onChange={e => setDraft(e.target.value as BugFindingStage)}
          >
            {STAGE_ORDER.map(value => (
              <SelectItem key={value} value={value} text={BUG_FINDING_STAGE_LABELS[value]} />
            ))}
          </Select>
          <p className="text-xs text-typography-500">{en.bugHunter.stageEditHint}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" kind="primary" disabled={isLoading} onClick={() => void save(draft)}>
              {en.bugHunter.stageSave}
            </Button>
            {/* Offered only when a pin is actually in force. On a derived stage
                "Back to automatic" would be a button that does nothing, which is
                worse than no button. */}
            {!isAuto && (
              <Button size="sm" kind="ghost" disabled={isLoading} onClick={() => void save(null)}>
                {en.bugHunter.stageBackToAuto}
              </Button>
            )}
            <Button size="sm" kind="ghost" onClick={() => setDraft(null)}>
              {en.bugHunter.stageCancel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
