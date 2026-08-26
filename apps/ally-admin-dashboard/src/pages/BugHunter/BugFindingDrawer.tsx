import { FC, useEffect, useState } from "react";

import { toast } from "sonner";

import { Button, SidePanel, TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useAnswerBugFindingMutation,
  useApproveBugFindingMutation,
  useCancelBugFixSessionMutation,
  useEditBugFindingDescriptionMutation,
  useGetBugFindingQuery,
  useRejectBugFindingMutation,
  useReleaseBugFindingMutation,
  useStartBugFixSessionMutation,
} from "@api";
import { TooltipIcon } from "@assets";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { AgentAvatar } from "@components/agent-avatar";
import { en } from "@constants";
import {
  BUG_FINDING_DESCRIPTION_EDITABLE_STATUSES,
  BUG_FINDING_DESCRIPTION_MAX_LENGTH,
  BUG_FINDING_FIX_SESSION_START_STATUSES,
  BugFindingStatus,
  BugHuntEventStage,
} from "@types";
import { formatDateTime, formatTimestamp } from "@utils";

import { BrailleSpinner } from "./BrailleSpinner";
import { BUG_FINDING_SEVERITY_LABELS, BUG_FINDING_SOURCE_LABELS } from "./bugFindingLabels";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";
import { BUG_HUNT_EVENT_STAGE_LABELS } from "./bugHuntEventLabels";
import { PipelineRail } from "./PipelineRail";
import { stageFromFindingStatus } from "./pipelineStage";

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
 * The rail's colour override for a finding stuck at the same stage for two
 * different reasons: an outright failure, or an open question it's waiting
 * on you to answer. Everything else stays plain "working" amber.
 */
const railVariantForStatus = (status: BugFindingStatus): "error" | "waiting" | undefined => {
  switch (status) {
    case BugFindingStatus.FAILED:
    case BugFindingStatus.RELEASE_FAILED:
      return "error";
    case BugFindingStatus.NEEDS_INPUT:
    case BugFindingStatus.PENDING_APPROVAL:
      return "waiting";
    default:
      return undefined;
  }
};

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
  const [cancelFixSession, { isLoading: isCancellingSession }] = useCancelBugFixSessionMutation();
  const [release, { isLoading: isReleasing }] = useReleaseBugFindingMutation();
  const [editDescription, { isLoading: isSavingDescription }] =
    useEditBugFindingDescriptionMutation();

  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | "fixSession" | "stopFixSession" | "release" | null
  >(null);
  const [answerText, setAnswerText] = useState("");
  // `null` is not editing. A string is the draft, which starts as the current
  // description rather than empty: this is a rewrite of an existing brief, and
  // an empty box would invite retyping what is already there.
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);
  const [showOriginalDescription, setShowOriginalDescription] = useState(false);

  /**
   * Copies the address bar, which now identifies this exact bug.
   *
   * The whole point of moving the open bug into `?bug=<id>` was that "take a
   * look at this one" becomes a link rather than a description of how to find a
   * row. This is that link, made reachable without teaching anyone that the
   * address bar changed.
   *
   * `navigator.clipboard` is unavailable on an insecure origin and can be
   * refused by permissions policy, so the failure is reported rather than
   * swallowed — a copy button that silently does nothing is worse than none.
   */
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(en.bugHunter.drawerCopyLinkDone);
    } catch {
      toast.error(en.bugHunter.drawerCopyLinkFailed);
    }
  };

  // Both arrays are defaulted rather than read straight off the response. A
  // backend one release behind this build omits `steps` entirely, and reading
  // `.some` off that undefined threw during render — which, with no error
  // boundary above this drawer, blanked the whole admin console on every row.
  // An absent array means the same thing as an empty one here, so treat it so.
  const steps = finding?.steps ?? [];
  const events = finding?.events ?? [];

  // A plain fix-session FAILED carries no reason field of its own — unlike
  // RELEASE_FAILED, which has a dedicated banner reading `releaseTag`, the
  // failure text only ever lands as an ERROR-stage timeline event (see
  // ally-be's BugFixSessionService). Events are returned oldest-first, so the
  // last ERROR entry is the one that actually explains this state.
  const latestFailureReason = [...events]
    .reverse()
    .find(event => event.stage === BugHuntEventStage.ERROR)?.summary;

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

  // Mirrors the backend's own gate (QUEUED or FIXING) so a stale click never
  // makes a round trip just to be told 403 — the same reasoning as
  // `canStartSession` above.
  const canStopSession = finding
    ? finding.status === BugFindingStatus.QUEUED || finding.status === BugFindingStatus.FIXING
    : false;

  // The description is the fix agent's whole brief (see ally-be's
  // `buildFixSessionPrompt`), so the edit is offered exactly where "Put me on
  // it" is and nowhere else — mirroring the backend's own gate so a stale
  // click never makes a round trip just to be told 403.
  const canEditDescription = finding
    ? BUG_FINDING_DESCRIPTION_EDITABLE_STATUSES.includes(finding.status)
    : false;

  const draftTooLong = (descriptionDraft?.trim().length ?? 0) > BUG_FINDING_DESCRIPTION_MAX_LENGTH;

  // An open draft closes the decisions below it. "Put me on it" would dispatch
  // a session reading the OLD description while the admin's rewrite sat
  // unsaved in the box above — the rewrite silently discarded and the fix
  // briefed on the text they had just decided was wrong. Approving has the
  // same shape: the next sweep would pick up the old words. So the actions
  // wait for the brief to be settled, and say why.
  const isDraftingDescription = descriptionDraft !== null;

  const handleSaveDescription = async () => {
    const next = descriptionDraft?.trim();
    if (!next || draftTooLong) return;
    try {
      await editDescription({ id, description: next }).unwrap();
      setDescriptionDraft(null);
    } catch (error) {
      // The backend's own refusal is the useful one — "is queued, its
      // description can't be changed from there" names the reason a generic
      // line would hide. The draft stays put so nothing typed is lost.
      toast.error(
        (error as { data?: { message?: string } })?.data?.message ??
          en.bugHunter.drawerDescriptionEditFailed,
      );
    }
  };

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
      await startFixSession({ id }).unwrap();
      setConfirmAction(null);
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

  const handleStopFixSession = async () => {
    try {
      await cancelFixSession(id).unwrap();
      setConfirmAction(null);
    } catch (error) {
      // Same reasoning as handleStartFixSession: the backend's own refusal
      // (e.g. the session already finished) is more useful than a generic line.
      toast.error(
        (error as { data?: { message?: string } })?.data?.message ??
          en.bugHunter.drawerStopFixSessionFailed,
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
            {IN_FLIGHT_STATUSES.includes(finding.status) && (
              <BrailleSpinner className="text-amber-600" />
            )}
            <span className="text-xs text-typography-600">
              {BUG_FINDING_SOURCE_LABELS[finding.source]}
            </span>
            {finding.repo && <span className="text-xs text-typography-600">· {finding.repo}</span>}
            {finding.severity && (
              <span className="text-xs text-typography-600">
                · {BUG_FINDING_SEVERITY_LABELS[finding.severity]}
              </span>
            )}

            {/* Pushed to the end of the row rather than given a place among the
                actions below: this is about the bug's address, not about its
                state, and it is safe to press at any point in the lifecycle. */}
            <div className="ml-auto">
              <Tooltip label={en.bugHunter.drawerCopyLinkTooltip} align="bottom">
                <span className="inline-flex">
                  <Button size="sm" kind="ghost" onClick={() => void copyLink()}>
                    {en.bugHunter.drawerCopyLink}
                  </Button>
                </span>
              </Tooltip>
            </div>
          </div>

          <PipelineRail
            stage={stageFromFindingStatus(finding.status)}
            variant={railVariantForStatus(finding.status)}
          />

          {finding.source === "reported_bug" && finding.status === BugFindingStatus.NEW && (
            <p className="text-xs text-typography-500 italic">
              {en.bugHunter.drawerReportedBugNotice}
            </p>
          )}
          {finding.touchesGuardedPath && (
            <p className="text-xs text-destructive-600">{en.bugHunter.drawerGuardedPathNotice}</p>
          )}

          {/* ── The brief ───────────────────────────────────────────────────
              Editable, because this text is not a record of the bug — it is
              the instruction a fix session runs on. See ally-be's
              BugFindingService.editDescription. */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xs font-semibold text-typography-700">
                {en.bugHunter.drawerDescriptionTitle}
              </h3>
              {canEditDescription && descriptionDraft === null && (
                <>
                  <Button
                    size="sm"
                    kind="ghost"
                    onClick={() => setDescriptionDraft(finding.description)}
                  >
                    {en.bugHunter.drawerDescriptionEdit}
                  </Button>
                  <Tooltip label={en.bugHunter.drawerDescriptionEditTooltip} align="bottom">
                    <button type="button" className="cursor-pointer inline-flex items-center">
                      <TooltipIcon />
                    </button>
                  </Tooltip>
                </>
              )}
            </div>

            {descriptionDraft === null ? (
              <p className="text-sm text-typography-900 whitespace-pre-wrap">
                {finding.description}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <TextArea
                  id={`bug-finding-description-${finding.id}`}
                  labelText={en.bugHunter.drawerDescriptionEditLabel}
                  placeholder={en.bugHunter.drawerDescriptionEditPlaceholder}
                  value={descriptionDraft}
                  onChange={e => setDescriptionDraft(e.target.value)}
                  rows={8}
                  invalid={draftTooLong}
                  invalidText={en.bugHunter.drawerDescriptionEditTooLong
                    .replace("{length}", String(descriptionDraft.trim().length))
                    .replace("{max}", String(BUG_FINDING_DESCRIPTION_MAX_LENGTH))}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    kind="primary"
                    disabled={isSavingDescription || !descriptionDraft.trim() || draftTooLong}
                    onClick={handleSaveDescription}
                  >
                    {en.bugHunter.drawerDescriptionEditSave}
                  </Button>
                  <Button size="sm" kind="ghost" onClick={() => setDescriptionDraft(null)}>
                    {en.bugHunter.drawerDescriptionEditCancel}
                  </Button>
                </div>
              </div>
            )}

            {/* What Bug Hunter originally found stays reachable once an admin
                has rewritten it — collapsed, because the current brief is what
                matters day to day, but never dropped: when a fix goes wrong the
                first question is whether the agent misread the bug or was
                handed a different one. */}
            {finding.originalDescription && descriptionDraft === null && (
              <div className="mt-2">
                <p className="text-xs text-typography-500">
                  {en.bugHunter.drawerDescriptionEditedBy.replace(
                    "{userId}",
                    String(finding.descriptionEditedBy ?? "—"),
                  )}
                  {finding.descriptionEditedAt
                    ? ` · ${formatDateTime(finding.descriptionEditedAt)}`
                    : ""}
                </p>
                <button
                  type="button"
                  className="text-xs text-primary-600 underline cursor-pointer mt-1"
                  onClick={() => setShowOriginalDescription(open => !open)}
                >
                  {showOriginalDescription
                    ? en.bugHunter.drawerDescriptionHideOriginal
                    : en.bugHunter.drawerDescriptionShowOriginal}
                </button>
                {showOriginalDescription && (
                  <div className="mt-1 border-l-2 border-border-light pl-3">
                    <p className="text-xs font-semibold text-typography-600">
                      {en.bugHunter.drawerDescriptionOriginalTitle}
                    </p>
                    <p className="text-sm text-typography-700 whitespace-pre-wrap">
                      {finding.originalDescription}
                    </p>
                  </div>
                )}
              </div>
            )}
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
                        {IN_FLIGHT_STATUSES.includes(step.status) && (
                          <BrailleSpinner className="text-amber-600" />
                        )}
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
          {/* A plain fix-session failure used to surface only as buried
              timeline text — promoted to the same dedicated-banner treatment
              RELEASE_FAILED gets, since both are "this needs a look" states. */}
          {finding.status === BugFindingStatus.FAILED && (
            <p className="text-sm text-destructive-700 bg-destructive-50 border border-destructive-200 rounded p-3">
              {latestFailureReason || en.bugHunter.drawerFixSessionFailedNotice}
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
                  disabled={isApproving || isDraftingDescription}
                  onClick={() => setConfirmAction("approve")}
                >
                  {en.bugHunter.drawerApprove}
                </Button>
                <Button
                  size="sm"
                  kind="danger--tertiary"
                  disabled={isRejecting || isDraftingDescription}
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
                  disabled={isStartingSession || isDraftingDescription}
                  onClick={() => setConfirmAction("fixSession")}
                >
                  {/* CANCELLED reads as a retry too — same story as FAILED,
                      just stopped on purpose rather than given up on. */}
                  {finding.status === BugFindingStatus.FAILED ||
                  finding.status === BugFindingStatus.CANCELLED
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

            {canStopSession && (
              <>
                <Button
                  size="sm"
                  kind="danger--tertiary"
                  disabled={isCancellingSession}
                  onClick={() => setConfirmAction("stopFixSession")}
                >
                  {en.bugHunter.drawerStopFixSession}
                </Button>
                <Tooltip label={en.bugHunter.drawerStopFixSessionTooltip} align="top">
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

          {isDraftingDescription && (
            <p className="text-xs text-typography-600">
              {en.bugHunter.drawerDescriptionSettleFirst}
            </p>
          )}

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
              {finding.releasedAt ? ` · ${formatDateTime(finding.releasedAt)}` : ""}
            </p>
          )}

          {finding.decidedBy != null && (
            <p className="text-xs text-typography-500">
              {en.bugHunter.drawerDecidedBy.replace("{userId}", String(finding.decidedBy))}
              {finding.decidedAt ? ` · ${formatDateTime(finding.decidedAt)}` : ""}
            </p>
          )}

          {finding.cancelledBy != null && (
            <p className="text-xs text-typography-500">
              {en.bugHunter.drawerCancelledBy.replace("{userId}", String(finding.cancelledBy))}
              {finding.cancelledAt ? ` · ${formatDateTime(finding.cancelledAt)}` : ""}
            </p>
          )}

          {finding.escalationQuestion && (
            <div className="border border-orange-200 bg-orange-50 rounded p-3">
              {/* Bug Hunter asked this, and it is blocked until you answer —
                  so it is signed, the way a message from a person would be. */}
              <div className="flex items-center gap-2 mb-1">
                <AgentAvatar size="sm" presence="waiting_on_you" label={en.bugHunter.agentName} />
                <h3 className="text-xs font-semibold text-typography-700">
                  {en.bugHunter.drawerEscalationQuestionTitle}
                </h3>
              </div>
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
                        ? ` · ${formatDateTime(finding.escalationAnsweredAt)}`
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
                      {formatTimestamp(event.createdAt)}
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
          onClose={() => setConfirmAction(null)}
          title={en.bugHunter.drawerFixSessionConfirmTitle}
          description={
            finding?.repo
              ? en.bugHunter.drawerFixSessionConfirmBody.replace("{repo}", finding.repo)
              : en.bugHunter.drawerFixSessionConfirmBodyUnknownRepo
          }
          primaryButton={{
            label: en.bugHunter.drawerFixSessionStart,
            onClick: handleStartFixSession,
            disabled: isStartingSession,
          }}
          secondaryButton={{ label: en.bugHunter.cancel, onClick: () => setConfirmAction(null) }}
        />
      )}

      {confirmAction === "stopFixSession" && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => setConfirmAction(null)}
          title={en.bugHunter.drawerStopFixSessionConfirmTitle}
          description={en.bugHunter.drawerStopFixSessionConfirmBody}
          primaryButton={{
            label: en.bugHunter.drawerStopFixSessionConfirm,
            onClick: handleStopFixSession,
            disabled: isCancellingSession,
          }}
          secondaryButton={{ label: en.bugHunter.cancel, onClick: () => setConfirmAction(null) }}
        />
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
