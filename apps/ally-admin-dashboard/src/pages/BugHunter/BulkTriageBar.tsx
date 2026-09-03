import { FC, useState } from "react";

import { toast } from "sonner";

import { Button, Tooltip } from "@ally-ui-mono/ui-shared";
import { useApproveBugFindingMutation, useRejectBugFindingMutation } from "@api";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { en } from "@constants";
import { BugFinding, BugFindingDecisionReason } from "@types";

import { canSubmitDecline, DeclineReasonPicker } from "./DeclineReasonPicker";
import { BulkOutcome, eligibleFor, MAX_NAMED_FAILURES, TriageAction } from "./triage";

/**
 * The bar that appears when rows are selected: approve or reject a whole
 * selection behind one confirmation.
 *
 * ## Where the throughput actually comes from
 *
 * Not from the keyboard, and not from the row buttons. Both of those still cost
 * one confirmation per bug, deliberately — approve and reject are both one-way
 * doors in ally-be's transition map (once a finding is `APPROVED` it can no
 * longer be rejected), so a single keystroke that silently spends one is the
 * wrong trade however fast it feels.
 *
 * This is where the cost collapses: twenty rejections behind one dialog instead
 * of twenty. A night's sweep in "Checks with you" mode lands every finding at
 * `PENDING_APPROVAL`, and the honest shape of that morning's work is "these
 * fourteen are noise, this one matters" — one gesture and one decision, not
 * fifteen.
 *
 * ## Approve and reject have different doors
 *
 * `approve` is legal only from `PENDING_APPROVAL`; `reject` also accepts `NEW`.
 * So the two buttons count different subsets of the same selection and each
 * states its own — a bar offering "Approve 52" over 52 `NEW` findings would
 * fire 52 requests and fail all of them. `triage.ts` owns those rules; this
 * component only renders what they return.
 *
 * ## Partial failure is the ordinary case
 *
 * A selection made fifteen seconds ago can hold a bug the nightly sweep has
 * since moved on. That request 403s while the rest succeed, so the summary
 * reports both halves and names the failures rather than counting them. A bulk
 * action that reported only its successes would leave a reader believing all
 * twenty landed.
 */

export interface BulkTriageBarProps {
  /** The selected findings, in the order they appear on screen. */
  selected: BugFinding[];
  onClear: () => void;
  /** Called once a batch settles, so the table can drop the ids it just acted on. */
  onSettled: (actedIds: string[]) => void;
}

const summarise = (action: TriageAction, outcome: BulkOutcome): string => {
  const strings = en.bugHunter;

  if (outcome.succeeded === 0) return strings.bulkAllFailed;

  if (outcome.failed === 0) {
    if (action === "approve") {
      return outcome.succeeded === 1
        ? strings.bulkApproveDoneOne
        : strings.bulkApproveDone.replace("{count}", String(outcome.succeeded));
    }
    return outcome.succeeded === 1
      ? strings.bulkRejectDoneOne
      : strings.bulkRejectDone.replace("{count}", String(outcome.succeeded));
  }

  const named = outcome.failedTitles.slice(0, MAX_NAMED_FAILURES);
  const rest = outcome.failedTitles.length - named.length;
  const titles = named.join(", ");

  return rest > 0
    ? strings.bulkPartialMore
        .replace("{done}", String(outcome.succeeded))
        .replace("{failed}", String(outcome.failed))
        .replace("{titles}", titles)
        .replace("{rest}", String(rest))
    : strings.bulkPartial
        .replace("{done}", String(outcome.succeeded))
        .replace("{failed}", String(outcome.failed))
        .replace("{titles}", titles);
};

export const BulkTriageBar: FC<BulkTriageBarProps> = ({ selected, onClear, onSettled }) => {
  const [approve] = useApproveBugFindingMutation();
  const [reject] = useRejectBugFindingMutation();

  const [confirming, setConfirming] = useState<TriageAction | null>(null);
  const [declineReason, setDeclineReason] = useState<BugFindingDecisionReason | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  /** `null` when idle; otherwise the batch in progress, for the "{done} of {total}" line. */
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const approvable = eligibleFor("approve", selected);
  const rejectable = eligibleFor("reject", selected);

  const run = async (action: TriageAction) => {
    const targets = action === "approve" ? approvable : rejectable;
    if (action === "reject" && !canSubmitDecline(declineReason, declineNote)) {
      toast.error(en.bugHunter.declineReasonRequired);
      return;
    }
    setConfirming(null);
    setProgress({ done: 0, total: targets.length });

    const outcome: BulkOutcome = { succeeded: 0, failed: 0, failedTitles: [] };

    // Sequential rather than parallel, for two reasons that both show up in the
    // UI: the progress line can only be honest if the requests actually finish
    // one at a time, and the failure list comes back in the order the reader
    // sees on screen rather than in whatever order the network settled.
    for (const finding of targets) {
      try {
        if (action === "approve") await approve(finding.id).unwrap();
        else {
          // One reason for the whole batch. This is what keeps the mandatory
          // reason affordable on the action that actually collapses the
          // cost: twenty rejections behind one dialog, and one answer to the
          // question rather than twenty.
          await reject({
            id: finding.id,
            reason: declineReason as BugFindingDecisionReason,
            note: declineNote,
          }).unwrap();
        }
        outcome.succeeded += 1;
      } catch {
        outcome.failed += 1;
        outcome.failedTitles.push(finding.title);
      }
      setProgress(current => (current ? { ...current, done: current.done + 1 } : null));
    }

    setProgress(null);
    // A run where nothing landed is a failure toast, not a neutral one — the
    // reader pressed a button and the world did not change.
    const message = summarise(action, outcome);
    if (outcome.succeeded === 0) toast.error(message);
    else toast.success(message);

    onSettled(targets.map(finding => finding.id));
  };

  const isBusy = progress !== null;

  return (
    <>
      <div
        // Sticks to the bottom of the page's scroll container while the table is
        // on screen, so a selection made at row 3 is still actionable at row 20
        // without scrolling back up. `z-30` clears the table's sticky header
        // without reaching the drawer's layer.
        className="sticky bottom-0 z-30 mt-3"
        role="region"
        aria-label={en.bugHunter.bulkBarLabel}
      >
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 shadow-sm">
          <span className="text-sm font-medium text-typography-900" aria-live="polite">
            {isBusy
              ? en.bugHunter.bulkProgress
                  .replace("{done}", String(progress.done))
                  .replace("{total}", String(progress.total))
              : selected.length === 1
                ? en.bugHunter.bulkSelectedOne
                : en.bugHunter.bulkSelected.replace("{count}", String(selected.length))}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Each action states the size of its own subset, which is often not
                the size of the selection — see the module doc. */}
            <Tooltip
              label={
                approvable.length === 0
                  ? en.bugHunter.bulkApproveNone
                  : en.bugHunter.bulkApproveScope
                      .replace("{eligible}", String(approvable.length))
                      .replace("{selected}", String(selected.length))
              }
              align="top"
            >
              <span className="inline-flex">
                <Button
                  size="sm"
                  kind="primary"
                  disabled={approvable.length === 0 || isBusy}
                  onClick={() => setConfirming("approve")}
                >
                  {en.bugHunter.bulkApprove.replace("{count}", String(approvable.length))}
                </Button>
              </span>
            </Tooltip>

            <Tooltip
              label={
                rejectable.length === 0
                  ? en.bugHunter.bulkRejectNone
                  : en.bugHunter.bulkRejectScope
                      .replace("{eligible}", String(rejectable.length))
                      .replace("{selected}", String(selected.length))
              }
              align="top"
            >
              <span className="inline-flex">
                <Button
                  size="sm"
                  kind="danger--tertiary"
                  disabled={rejectable.length === 0 || isBusy}
                  onClick={() => setConfirming("reject")}
                >
                  {en.bugHunter.bulkReject.replace("{count}", String(rejectable.length))}
                </Button>
              </span>
            </Tooltip>

            <Button size="sm" kind="ghost" onClick={onClear} disabled={isBusy}>
              {en.bugHunter.bulkClear}
            </Button>
          </div>
        </div>
      </div>

      {confirming === "approve" && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => setConfirming(null)}
          title={en.bugHunter.bulkApproveConfirmTitle.replace("{count}", String(approvable.length))}
          description={en.bugHunter.bulkApproveConfirmBody}
          primaryButton={{
            label: en.bugHunter.bulkApproveConfirm,
            onClick: () => void run("approve"),
          }}
          secondaryButton={{
            label: en.bugHunter.cancel,
            onClick: () => setConfirming(null),
          }}
        />
      )}

      {confirming === "reject" && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => setConfirming(null)}
          title={en.bugHunter.bulkRejectConfirmTitle.replace("{count}", String(rejectable.length))}
          description={en.bugHunter.bulkRejectConfirmBody}
          primaryButton={{
            label: en.bugHunter.bulkRejectConfirm,
            onClick: () => void run("reject"),
            disabled: !canSubmitDecline(declineReason, declineNote),
          }}
          secondaryButton={{
            label: en.bugHunter.cancel,
            onClick: () => setConfirming(null),
          }}
        >
          <DeclineReasonPicker
            idPrefix="bulk"
            reason={declineReason}
            onReasonChange={setDeclineReason}
            note={declineNote}
            onNoteChange={setDeclineNote}
            count={rejectable.length}
          />
        </ActionConfirmationPopup>
      )}
    </>
  );
};
