import { FC, useEffect, useState } from "react";

import { toast } from "sonner";

import { Button, DropdownField, SidePanel, TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useAnswerBugFindingMutation,
  useApproveBugFindingMutation,
  useGetBugFindingQuery,
  useRejectBugFindingMutation,
  useReleaseBugFindingMutation,
  useStartBugFixSessionMutation,
} from "@api";
import { TooltipIcon } from "@assets";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { en } from "@constants";
import {
  BUG_FINDING_FIX_SESSION_START_STATUSES,
  BUG_FIX_SESSION_REPOS,
  BugFindingStatus,
} from "@types";
import { formatDate } from "@utils";

import { BUG_FINDING_SEVERITY_LABELS, BUG_FINDING_SOURCE_LABELS } from "./bugFindingLabels";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";
import { BUG_HUNT_EVENT_STAGE_LABELS } from "./bugHuntEventLabels";

interface BugFindingDrawerProps {
  id: string;
  onClose: () => void;
}

/** Statuses where something is in flight and the drawer should poll rather than sit stale. */
const IN_FLIGHT_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.QUEUED,
  BugFindingStatus.FIXING,
  BugFindingStatus.RELEASING,
  BugFindingStatus.COORDINATING,
];

/**
 * The comprehensive table's row detail: full description/evidence, its event
 * timeline across however many runs touched it, the Manual-mode approve/reject
 * decision, the answer to an open escalation question — and the two on-demand
 * actions that take one bug from here to production.
 *
 * Those two are deliberately separate buttons rather than one. "Start fix
 * session" is autonomous: an agent writes a failing test, fixes it, keeps the
 * suite green and merges. "Release to production" deploys — for the backend
 * that means a production database migration and an ECS rollout — so it stays
 * a human decision, made after the fix is visibly merged. See ally-be's
 * BugFixSessionService for the full reasoning.
 */
export const BugFindingDrawer: FC<BugFindingDrawerProps> = ({ id, onClose }) => {
  // A dispatched session or release is reconciled server-side minutes later,
  // and there is no push channel for a single finding — the SSE stream is
  // per-run, and a release outlives its run entirely. So the drawer polls, but
  // only while something is actually in flight; a settled bug's drawer makes
  // no repeat requests at all.
  const [pollingInterval, setPollingInterval] = useState(0);
  const {
    data: finding,
    isLoading,
    isError,
  } = useGetBugFindingQuery(id, { pollingInterval, skipPollingIfUnfocused: true });
  const [approve, { isLoading: isApproving }] = useApproveBugFindingMutation();
  const [reject, { isLoading: isRejecting }] = useRejectBugFindingMutation();
  const [answer, { isLoading: isAnswering }] = useAnswerBugFindingMutation();
  const [startFixSession, { isLoading: isStartingSession }] = useStartBugFixSessionMutation();
  const [release, { isLoading: isReleasing }] = useReleaseBugFindingMutation();

  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | "fixSession" | "release" | null
  >(null);
  const [answerText, setAnswerText] = useState("");
  const [sessionRepo, setSessionRepo] = useState<string | null>(null);

  // Both arrays are defaulted rather than read straight off the response. A
  // backend one release behind this build omits `steps` entirely, and reading
  // `.some` off that undefined threw during render — which, with no error
  // boundary above this drawer, blanked the whole admin console on every row.
  // An absent array means the same thing as an empty one here, so treat it so.
  const steps = finding?.steps ?? [];
  const events = finding?.events ?? [];

  const inFlight = finding
    ? IN_FLIGHT_STATUSES.includes(finding.status) ||
      // A coordinating parent's own status doesn't change between steps, but
      // its steps do — so poll while any of them is still moving.
      steps.some(step => IN_FLIGHT_STATUSES.includes(step.status))
    : false;
  useEffect(() => {
    setPollingInterval(inFlight ? 15_000 : 0);
  }, [inFlight]);

  const canStartSession = finding
    ? BUG_FINDING_FIX_SESSION_START_STATUSES.includes(finding.status)
    : false;
  // A bug nobody has matched to a codebase yet — the usual shape of a
  // team-reported one. The agent needs to be told where to work, and guessing
  // that from free text isn't a call to make on the admin's behalf.
  const needsRepoChoice = Boolean(finding && !finding.repo);
  const chosenRepo = finding?.repo ?? sessionRepo;

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

  const handleStartFixSession = async () => {
    try {
      await startFixSession({ id, repo: sessionRepo ?? undefined }).unwrap();
      setConfirmAction(null);
      setSessionRepo(null);
    } catch (error) {
      // The backend's own message is the useful one here — "Bug Hunter is
      // OFF", "not set up for fix sessions", a GitHub error verbatim — so it
      // is surfaced rather than replaced with a generic failure line. The
      // dialog stays open so the admin can act on it.
      toast.error(
        (error as { data?: { message?: string } })?.data?.message ??
          en.bugHunter.drawerFixSessionFailed,
      );
    }
  };

  const handleRelease = async () => {
    try {
      await release(id).unwrap();
      setConfirmAction(null);
    } catch (error) {
      toast.error(
        (error as { data?: { message?: string } })?.data?.message ??
          en.bugHunter.drawerReleaseFailed,
      );
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

          {/* ── The plan, when this bug needs more than one repo ────────────── */}
          {steps.length > 0 && (
            <div className="border border-border-light rounded p-3">
              <h3 className="text-xs font-semibold text-typography-900">
                {en.bugHunter.planTitle.replace("{count}", String(steps.length))}
              </h3>
              <p className="text-xs text-typography-600 mt-0.5 mb-3">{en.bugHunter.planSubtitle}</p>
              <ol className="flex flex-col gap-2">
                {steps.map(step => (
                  <li key={step.id} className="flex items-start gap-2">
                    <span className="text-xs text-typography-500 whitespace-nowrap mt-0.5 tabular-nums">
                      {en.bugHunter.planStepLabel.replace("{n}", String(step.stepIndex + 1))}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-typography-900">{step.repo}</span>
                        <BugFindingStatusBadge status={step.status} />
                        {step.releaseTag && (
                          <span className="text-xs text-typography-600">{step.releaseTag}</span>
                        )}
                      </div>
                      {step.stepSummary && (
                        <p className="text-xs text-typography-700 mt-0.5">{step.stepSummary}</p>
                      )}
                      <div className="flex gap-3 mt-0.5">
                        {step.prUrl && (
                          <a
                            href={step.prUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary-600 underline"
                          >
                            {en.bugHunter.viewPr}
                          </a>
                        )}
                        {step.sessionRunUrl && (
                          <a
                            href={step.sessionRunUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary-600 underline"
                          >
                            {en.bugHunter.drawerWatchSession}
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ── Release state: what happened, or is happening, to the deploy ── */}
          {finding.status === BugFindingStatus.RELEASING && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
              {en.bugHunter.drawerReleasingNotice.replace("{tag}", finding.releaseTag ?? "—")}
            </p>
          )}
          {finding.status === BugFindingStatus.RELEASED && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              {en.bugHunter.drawerReleasedNotice.replace("{tag}", finding.releaseTag ?? "—")}
            </p>
          )}
          {finding.status === BugFindingStatus.RELEASE_FAILED && (
            <p className="text-sm text-destructive-700 bg-destructive-50 border border-destructive-200 rounded p-3">
              {en.bugHunter.drawerReleaseFailedNotice.replace("{tag}", finding.releaseTag ?? "—")}
            </p>
          )}
          {finding.status === BugFindingStatus.QUEUED && (
            <p className="text-sm text-typography-600">{en.bugHunter.drawerFixSessionQueued}</p>
          )}

          {(finding.sessionRunUrl || finding.releaseRunUrl) && (
            <div className="flex gap-4">
              {finding.sessionRunUrl && (
                <a
                  href={finding.sessionRunUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary-600 underline"
                >
                  {en.bugHunter.drawerWatchSession}
                </a>
              )}
              {finding.releaseRunUrl && (
                <a
                  href={finding.releaseRunUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary-600 underline"
                >
                  {en.bugHunter.drawerViewReleaseRun}
                </a>
              )}
            </div>
          )}

          {/* ── The two on-demand actions ──────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            {finding.status === BugFindingStatus.PENDING_APPROVAL && (
              <>
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
              </>
            )}

            {canStartSession && (
              <>
                <Button
                  size="sm"
                  kind={
                    finding.status === BugFindingStatus.PENDING_APPROVAL ? "tertiary" : "primary"
                  }
                  disabled={isStartingSession}
                  onClick={() => setConfirmAction("fixSession")}
                >
                  {finding.status === BugFindingStatus.FAILED
                    ? en.bugHunter.drawerRetryFixSession
                    : en.bugHunter.drawerStartFixSession}
                </Button>
                <Tooltip label={en.bugHunter.drawerFixSessionTooltip} align="top">
                  <button type="button" className="cursor-pointer inline-flex items-center">
                    <TooltipIcon />
                  </button>
                </Tooltip>
              </>
            )}

            {finding.releasable && (
              <>
                <Button
                  size="sm"
                  kind="primary"
                  disabled={isReleasing}
                  onClick={() => setConfirmAction("release")}
                >
                  {finding.status === BugFindingStatus.RELEASE_FAILED
                    ? en.bugHunter.drawerReleaseRetry
                    : en.bugHunter.drawerRelease}
                </Button>
                <Tooltip label={en.bugHunter.drawerReleaseTooltip} align="top">
                  <button type="button" className="cursor-pointer inline-flex items-center">
                    <TooltipIcon />
                  </button>
                </Tooltip>
              </>
            )}
          </div>

          {/* Merged but not releasable from here — say why rather than just
              omitting the button the admin came looking for. */}
          {finding.releaseBlockedReason && (
            <div className="text-xs text-typography-600 border border-border-light rounded p-3">
              <span className="font-semibold">{en.bugHunter.drawerReleaseBlocked}: </span>
              {finding.releaseBlockedReason}
            </div>
          )}

          {finding.releasedBy != null && (
            <p className="text-xs text-typography-500">
              {en.bugHunter.drawerReleasedBy.replace("{userId}", String(finding.releasedBy))}
              {finding.releasedAt ? ` · ${formatDate(finding.releasedAt)}` : ""}
            </p>
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
            {events.length === 0 ? (
              <p className="text-sm text-typography-500">{en.bugHunter.drawerTimelineEmpty}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {events.map(event => (
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

      {(confirmAction === "approve" || confirmAction === "reject") && (
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

      {confirmAction === "fixSession" && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => {
            setConfirmAction(null);
            setSessionRepo(null);
          }}
          title={en.bugHunter.drawerFixSessionConfirmTitle}
          description={en.bugHunter.drawerFixSessionConfirmBody.replace(
            "{repo}",
            chosenRepo ?? "…",
          )}
          primaryButton={{
            label: en.bugHunter.drawerFixSessionStart,
            onClick: handleStartFixSession,
            // Without a repo there is nowhere to send the agent, so the
            // confirm stays inert until one is picked.
            disabled: isStartingSession || !chosenRepo,
          }}
          secondaryButton={{
            label: en.bugHunter.cancel,
            onClick: () => {
              setConfirmAction(null);
              setSessionRepo(null);
            },
          }}
        >
          {needsRepoChoice && (
            <div className="mt-4 text-left">
              <DropdownField
                label={sessionRepo ?? en.bugHunter.drawerFixSessionRepoLabel}
                value={sessionRepo ?? ""}
                options={[...BUG_FIX_SESSION_REPOS]}
                onChange={value => setSessionRepo(value)}
                hideSearch
              />
              <p className="text-xs text-typography-600 mt-1">
                {en.bugHunter.drawerFixSessionRepoHelp}
              </p>
            </div>
          )}
        </ActionConfirmationPopup>
      )}

      {confirmAction === "release" && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => setConfirmAction(null)}
          title={en.bugHunter.drawerReleaseConfirmTitle}
          description={en.bugHunter.drawerReleaseConfirmBody.replace(
            "{target}",
            finding?.releaseTarget ?? finding?.repo ?? "this service",
          )}
          primaryButton={{
            label: en.bugHunter.drawerReleaseConfirm,
            onClick: handleRelease,
            disabled: isReleasing,
          }}
          secondaryButton={{ label: en.bugHunter.cancel, onClick: () => setConfirmAction(null) }}
        />
      )}
    </SidePanel>
  );
};
