import { FC, useState } from "react";

import { toast } from "sonner";

import { Button, TextArea } from "@ally-ui-mono/ui-shared";
import {
  useAnswerBugFindingMutation,
  useApproveBugFindingMutation,
  useRejectBugFindingMutation,
} from "@api";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { en } from "@constants";
import { BugFinding, BugFindingStatus } from "@types";

import { BUG_FINDING_SEVERITY_LABELS, BUG_FINDING_SOURCE_LABELS } from "./bugFindingLabels";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";

export interface NeedsYouCardProps {
  finding: BugFinding;
  /** Opens the full drawer for this bug — every card offers it as the way out to more detail. */
  onOpen: (id: string) => void;
}

/**
 * One blocked bug, with its decision on it.
 *
 * ## Why the decision is here and not only in the drawer
 *
 * Approving a bug used to cost a scroll past a 700px profile card, a scan of a
 * date-sorted table for which of seventeen status pills meant "you", a click to
 * open a drawer, a read of the whole drawer, and then the click. Five steps of
 * which one was the decision. The page could say "4 bugs are waiting on your
 * call" in three places and offer no way to act on any of them.
 *
 * The confirmation dialog is deliberately kept. What was expensive about
 * approving was the hunting, not the confirming — and rejecting still says
 * "I'll never pick it up. This can't be undone", which is worth a beat. So the
 * guard stays and the search is what goes.
 *
 * ## Why FAILED and RELEASE_FAILED get a link rather than a retry button
 *
 * Both are in this queue because a human decides what happens next, but
 * neither decision can be made from a card. Retrying a fix session spends real
 * compute, and the useful question first is "what went wrong last time" — which
 * is the drawer's work log. Retrying a release *deploys to production*, and the
 * facts that make it safe (the release target, the blocked reason, which tag
 * went red) only exist on `BugFindingDetail`. A one-click "Retry" here would be
 * a button whose consequences are off-screen.
 */
export const NeedsYouCard: FC<NeedsYouCardProps> = ({ finding, onOpen }) => {
  const [approve, { isLoading: isApproving }] = useApproveBugFindingMutation();
  const [reject, { isLoading: isRejecting }] = useRejectBugFindingMutation();
  const [answer, { isLoading: isAnswering }] = useAnswerBugFindingMutation();

  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answerText, setAnswerText] = useState("");

  const isPendingApproval = finding.status === BugFindingStatus.PENDING_APPROVAL;
  const needsAnswer = finding.status === BugFindingStatus.NEEDS_INPUT;
  const isProblem =
    finding.status === BugFindingStatus.FAILED ||
    finding.status === BugFindingStatus.RELEASE_FAILED;

  const handleDecision = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction === "approve") await approve(finding.id).unwrap();
      else await reject(finding.id).unwrap();
    } catch {
      toast.error(en.bugHunter.drawerDecisionFailed);
    } finally {
      setConfirmAction(null);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) return;
    try {
      await answer({ id: finding.id, answer: answerText.trim() }).unwrap();
      setAnswerText("");
      setAnswerOpen(false);
    } catch {
      toast.error(en.bugHunter.drawerAnswerFailed);
    }
  };

  // Repo, severity and source as one quiet line. Every one of them is
  // frequently null on a bug a human reported as free text, and three "—"
  // placeholders in a row is worse than a shorter line, so absent facts are
  // dropped rather than dashed.
  const meta = [
    finding.repo,
    finding.severity ? BUG_FINDING_SEVERITY_LABELS[finding.severity] : null,
    BUG_FINDING_SOURCE_LABELS[finding.source],
  ].filter(Boolean);

  return (
    <li
      className={`border rounded-lg p-4 bg-white ${
        isProblem ? "border-destructive-200" : "border-orange-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BugFindingStatusBadge status={finding.status} />
            <span className="text-xs text-typography-600">{meta.join(" · ")}</span>
          </div>
          {/* The full title, wrapped over as many lines as it needs. The bugs
              table truncates to keep its columns aligned; a queue of at most a
              few cards has no column to protect, and the title is the whole
              basis for the decision being asked for. */}
          <p className="text-sm font-medium text-typography-900 mt-2">{finding.title}</p>
        </div>

        <Button size="sm" kind="ghost" onClick={() => onOpen(finding.id)}>
          {en.bugHunter.queueOpen}
        </Button>
      </div>

      {/* Bug Hunter's actual question, verbatim, on the card. Reading it is the
          whole task — routing to a drawer to find out what was even asked is
          what made "Needs input" the easiest status on the page to ignore. */}
      {needsAnswer && finding.escalationQuestion && (
        <div className="mt-3 border-l-2 border-orange-300 pl-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-typography-600">
            {en.bugHunter.drawerEscalationQuestionTitle}
          </p>
          <p className="text-sm text-typography-900 mt-1">{finding.escalationQuestion}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isPendingApproval && (
          <>
            <Button
              size="sm"
              kind="primary"
              disabled={isApproving || isRejecting}
              onClick={() => setConfirmAction("approve")}
            >
              {en.bugHunter.drawerApprove}
            </Button>
            <Button
              size="sm"
              kind="tertiary"
              disabled={isApproving || isRejecting}
              onClick={() => setConfirmAction("reject")}
            >
              {en.bugHunter.drawerReject}
            </Button>
          </>
        )}

        {needsAnswer && !answerOpen && (
          <Button size="sm" kind="primary" onClick={() => setAnswerOpen(true)}>
            {en.bugHunter.queueAnswer}
          </Button>
        )}

        {/* Deliberately not a retry button — see the module docblock. */}
        {isProblem && (
          <Button size="sm" kind="tertiary" onClick={() => onOpen(finding.id)}>
            {en.bugHunter.queueSeeWhatHappened}
          </Button>
        )}
      </div>

      {needsAnswer && answerOpen && (
        <div className="mt-3">
          <TextArea
            id={`needs-you-answer-${finding.id}`}
            labelText={en.bugHunter.drawerAnswerLabel}
            placeholder={en.bugHunter.drawerAnswerPlaceholder}
            rows={3}
            value={answerText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswerText(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              kind="primary"
              disabled={isAnswering || !answerText.trim()}
              onClick={handleSubmitAnswer}
            >
              {en.bugHunter.drawerAnswerSubmit}
            </Button>
            <Button
              size="sm"
              kind="ghost"
              onClick={() => {
                setAnswerOpen(false);
                setAnswerText("");
              }}
            >
              {en.bugHunter.cancel}
            </Button>
          </div>
        </div>
      )}

      {confirmAction !== null && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => setConfirmAction(null)}
          title={
            confirmAction === "approve"
              ? en.bugHunter.drawerApproveConfirmTitle
              : en.bugHunter.drawerRejectConfirmTitle
          }
          description={
            confirmAction === "approve"
              ? en.bugHunter.drawerApproveConfirmBody
              : en.bugHunter.drawerRejectConfirmBody
          }
          primaryButton={{ label: en.bugHunter.modeConfirm, onClick: handleDecision }}
          secondaryButton={{
            label: en.bugHunter.cancel,
            onClick: () => setConfirmAction(null),
          }}
        />
      )}
    </li>
  );
};
