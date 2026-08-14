import { FC, useState } from "react";

import { toast } from "sonner";

import { Button, SidePanel, TextArea } from "@ally-ui-mono/ui-shared";
import {
  useAnswerBugFindingMutation,
  useApproveBugFindingMutation,
  useGetBugFindingQuery,
  useRejectBugFindingMutation,
} from "@api";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { en } from "@constants";
import { BugFindingStatus } from "@types";
import { formatDate } from "@utils";

import { BUG_FINDING_SEVERITY_LABELS, BUG_FINDING_SOURCE_LABELS } from "./bugFindingLabels";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";
import { BUG_HUNT_EVENT_STAGE_LABELS } from "./bugHuntEventLabels";

interface BugFindingDrawerProps {
  id: string;
  onClose: () => void;
}

/**
 * The comprehensive table's row detail: full description/evidence, its event
 * timeline across however many runs touched it, and — the only place any of
 * this happens — the Manual-mode approve/reject decision and the answer to
 * an open escalation question.
 */
export const BugFindingDrawer: FC<BugFindingDrawerProps> = ({ id, onClose }) => {
  const { data: finding, isLoading, isError } = useGetBugFindingQuery(id);
  const [approve, { isLoading: isApproving }] = useApproveBugFindingMutation();
  const [reject, { isLoading: isRejecting }] = useRejectBugFindingMutation();
  const [answer, { isLoading: isAnswering }] = useAnswerBugFindingMutation();

  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [answerText, setAnswerText] = useState("");

  const handleDecision = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction === "approve") await approve(id).unwrap();
      else await reject(id).unwrap();
    } catch {
      toast.error(en.bugHunter.drawerDecisionFailed);
    } finally {
      setConfirmAction(null);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) return;
    try {
      await answer({ id, answer: answerText.trim() }).unwrap();
      setAnswerText("");
    } catch {
      toast.error(en.bugHunter.drawerAnswerFailed);
    }
  };

  return (
    <SidePanel open onClose={onClose} title={finding?.title ?? "…"} className="w-[32rem]">
      {isLoading ? (
        <p className="text-sm text-typography-600">…</p>
      ) : isError || !finding ? (
        <p className="text-sm text-destructive-600">{en.bugHunter.drawerLoadFailed}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <BugFindingStatusBadge status={finding.status} />
            <span className="text-xs text-typography-600">
              {BUG_FINDING_SOURCE_LABELS[finding.source]}
            </span>
            {finding.repo && <span className="text-xs text-typography-600">· {finding.repo}</span>}
            {finding.severity && (
              <span className="text-xs text-typography-600">
                · {BUG_FINDING_SEVERITY_LABELS[finding.severity]}
              </span>
            )}
          </div>

          {finding.source === "reported_bug" && finding.status === BugFindingStatus.NEW && (
            <p className="text-xs text-typography-500 italic">
              {en.bugHunter.drawerReportedBugNotice}
            </p>
          )}
          {finding.touchesGuardedPath && (
            <p className="text-xs text-destructive-600">{en.bugHunter.drawerGuardedPathNotice}</p>
          )}

          <div>
            <h3 className="text-xs font-semibold text-typography-700 mb-1">
              {en.bugHunter.drawerDescriptionTitle}
            </h3>
            <p className="text-sm text-typography-900 whitespace-pre-wrap">{finding.description}</p>
          </div>

          {finding.evidence && (
            <div>
              <h3 className="text-xs font-semibold text-typography-700 mb-1">
                {en.bugHunter.drawerEvidenceTitle}
              </h3>
              <pre className="text-xs bg-neutral-50 border border-border-light rounded p-2 whitespace-pre-wrap overflow-x-auto">
                {finding.evidence}
              </pre>
            </div>
          )}

          {finding.prUrl && (
            <a
              href={finding.prUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary-600 underline"
            >
              {en.bugHunter.viewPr}
            </a>
          )}

          {finding.status === BugFindingStatus.PENDING_APPROVAL && (
            <div className="flex gap-2">
              <Button
                size="sm"
                kind="primary"
                disabled={isApproving}
                onClick={() => setConfirmAction("approve")}
              >
                {en.bugHunter.drawerApprove}
              </Button>
              <Button
                size="sm"
                kind="danger--tertiary"
                disabled={isRejecting}
                onClick={() => setConfirmAction("reject")}
              >
                {en.bugHunter.drawerReject}
              </Button>
            </div>
          )}

          {finding.decidedBy != null && (
            <p className="text-xs text-typography-500">
              {en.bugHunter.drawerDecidedBy.replace("{userId}", String(finding.decidedBy))}
              {finding.decidedAt ? ` · ${formatDate(finding.decidedAt)}` : ""}
            </p>
          )}

          {finding.escalationQuestion && (
            <div className="border border-orange-200 bg-orange-50 rounded p-3">
              <h3 className="text-xs font-semibold text-typography-700 mb-1">
                {en.bugHunter.drawerEscalationQuestionTitle}
              </h3>
              <p className="text-sm text-typography-900 mb-3">{finding.escalationQuestion}</p>

              {finding.escalationAnswer ? (
                <div>
                  <p className="text-sm text-typography-900 whitespace-pre-wrap">
                    {finding.escalationAnswer}
                  </p>
                  {finding.escalationAnsweredBy != null && (
                    <p className="text-xs text-typography-500 mt-1">
                      {en.bugHunter.drawerAnsweredBy.replace(
                        "{userId}",
                        String(finding.escalationAnsweredBy),
                      )}
                      {finding.escalationAnsweredAt
                        ? ` · ${formatDate(finding.escalationAnsweredAt)}`
                        : ""}
                    </p>
                  )}
                </div>
              ) : finding.status === BugFindingStatus.NEEDS_INPUT ? (
                <div className="flex flex-col gap-2">
                  <TextArea
                    id={`bug-finding-answer-${finding.id}`}
                    labelText={en.bugHunter.drawerAnswerLabel}
                    hideLabel
                    placeholder={en.bugHunter.drawerAnswerPlaceholder}
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    rows={3}
                  />
                  <Button
                    size="sm"
                    kind="primary"
                    disabled={isAnswering || !answerText.trim()}
                    onClick={handleSubmitAnswer}
                    className="self-start"
                  >
                    {en.bugHunter.drawerAnswerSubmit}
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-typography-700 mb-2">
              {en.bugHunter.drawerTimelineTitle}
            </h3>
            {finding.events.length === 0 ? (
              <p className="text-sm text-typography-500">{en.bugHunter.drawerTimelineEmpty}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {finding.events.map(event => (
                  <li key={event.id} className="text-sm text-typography-800 flex gap-2">
                    <span className="text-typography-500 whitespace-nowrap tabular-nums">
                      {formatDate(event.createdAt)}
                    </span>
                    <span className="font-medium text-typography-700 whitespace-nowrap">
                      {BUG_HUNT_EVENT_STAGE_LABELS[event.stage]}
                    </span>
                    <span>{event.summary}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {confirmAction && (
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
          primaryButton={{
            label:
              confirmAction === "approve" ? en.bugHunter.drawerApprove : en.bugHunter.drawerReject,
            onClick: handleDecision,
          }}
          secondaryButton={{ label: en.bugHunter.cancel, onClick: () => setConfirmAction(null) }}
        />
      )}
    </SidePanel>
  );
};
