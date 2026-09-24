import React, { useCallback, useEffect, useRef, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button, InlineNotification, SkeletonText, Tag } from "@ally-ui-mono/ui-shared";
import {
  useCancelBuilderSessionMutation,
  useGetBuilderPullRequestsQuery,
  useGetBuilderSessionQuery,
  useGetBuilderSettingsQuery,
  usePatchBuilderPrdMutation,
} from "@api";
import {
  BuildView,
  ChatComposer,
  ChatMessage,
  ConfirmCancelDialog,
  CollapsibleAside,
  PrdDocPanel,
  ReadinessRing,
  StartBuildDialog,
  SteerComposer,
} from "@components/builder";
import type { BuilderAnswerPayload } from "@components/builder";
import { ErrorBoundary } from "@components/error-boundary";
import { en, ROUTES } from "@constants";
import { useBuilderStream } from "@hooks";
import { BuilderPrdDocument, BuilderPrdReadiness, BuilderSessionStatus } from "@types";
import { asAgentText } from "@utils";

import { BUILDER_STATUS_TAG_TYPE } from "./builderMotion";

/** The PRD is the build's source of truth while a run is reading it. */
const PRD_FROZEN: BuilderSessionStatus[] = ["BUILDING", "WAITING_FOR_INPUT"];

/**
 * Terminal states you can still build again from.
 *
 * CANCELLED belongs here and its absence was a dead end: stopping a build left
 * a session with no way forward at all. The start control lives in the
 * readiness panel, which stops rendering the moment a session has a build, and
 * the header offered its retry only on FAILED — so the one deliberate act a
 * person takes mid-build, pressing stop, was also the act that stranded the
 * session. The PRD was still there, the branch was still there, and the only
 * route back was to open a new session and re-run the interview.
 *
 * COMPLETED is deliberately NOT here. Its pull requests are open or merged, and
 * a second build of finished work opens a competing set against the same PRD.
 */
const RESTARTABLE: BuilderSessionStatus[] = ["FAILED", "CANCELLED"];

/**
 * One Builder session: the interview on the left, the living PRD on the right.
 *
 * The PRD and readiness are held in local state seeded from the server and
 * then advanced by SSE frames, rather than refetched per turn. The document is
 * already authoritative on the server by the time a frame arrives, and waiting
 * for a round-trip would make it lag the sentence that produced it — which is
 * the one thing this layout exists to show.
 */
interface BuilderSessionProps {
  /**
   * Renders this session instead of the one in the route. Set when the component is EMBEDDED —
   * today that is the roadmap's Builder drawer, which has an opportunity in the URL, not a
   * session. Omitted on the Builder route itself, where the param is the source of truth.
   */
  sessionId?: string;
  /**
   * The opening turn, for a session created moments ago with an empty transcript.
   *
   * Falls back to `location.state.openingMessage`, which is how Builder's own mission control
   * seeds a session. Both go through the same send-once guard below, so a caller cannot double
   * up an opening turn by supplying both.
   */
  openingMessage?: string;
  /**
   * Embedded mode: drop the page chrome that assumes a route — the back arrow becomes this
   * callback. Without it, the header's "←" navigates the whole admin app away from the roadmap
   * and the drawer takes the page with it.
   */
  onClose?: () => void;
}

export const BuilderSession: React.FC<BuilderSessionProps> = ({
  sessionId: sessionIdProp,
  openingMessage: openingMessageProp,
  onClose,
}) => {
  const strings = en.builder;
  const { sessionId: routeSessionId = "" } = useParams<{ sessionId: string }>();
  const sessionId = sessionIdProp ?? routeSessionId;
  const isEmbedded = sessionIdProp !== undefined;
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Whether the session row is still worth re-reading.
   *
   * Events stream over the socket, but `status`, `currentStage` and `error`
   * live on the session row itself and were read exactly once, at page load.
   * So watching a build meant a live transcript under a phase rail frozen at
   * whatever stage the run had reached when the tab was opened, and the
   * obvious remedy — refreshing — fixed it only until the next stage change.
   *
   * Starts true so a fresh load polls before it knows anything, and is turned
   * off once the session reaches a state it cannot leave on its own. A
   * finished session polled forever is a request every five seconds, per open
   * tab, for a row that will never change again.
   */
  const [sessionIsLive, setSessionIsLive] = useState(true);

  const {
    data: session,
    isLoading,
    isError,
  } = useGetBuilderSessionQuery(sessionId, {
    skip: !sessionId,
    pollingInterval: sessionIsLive ? 5000 : 0,
    skipPollingIfUnfocused: true,
  });

  const sessionStatus = session?.status;
  useEffect(() => {
    if (!sessionStatus) return;
    // CANCELLED and COMPLETED are final. FAILED is not: a retry moves the same
    // session back to BUILDING, and the poll has to be running to see it.
    setSessionIsLive(!["COMPLETED", "CANCELLED"].includes(sessionStatus));
    // Hand authority back to the row. `status` below is an optimistic overlay
    // that wins over the polled row, and without this it won a stale value
    // forever: seeded at hydration, never cleared, so a build that finished
    // server-side left the header reading "Building" under a phase rail that
    // had already reached the end — and only a refresh reconciled them. The
    // server having moved is exactly the moment the overlay stops being the
    // newer of the two.
    setStatus(null);
  }, [sessionStatus]);
  const { data: settings } = useGetBuilderSettingsQuery();
  // Read for one question only: did this session ship anything? See canRestart.
  const { data: pullRequests } = useGetBuilderPullRequestsQuery(sessionId, {
    skip: !sessionId,
  });
  const [patchPrd] = usePatchBuilderPrdMutation();
  const [cancelSession, { isLoading: isCancelling }] = useCancelBuilderSessionMutation();

  const [prd, setPrd] = useState<BuilderPrdDocument | null>(null);
  const [readiness, setReadiness] = useState<BuilderPrdReadiness | null>(null);
  const [versionNumber, setVersionNumber] = useState(0);
  // An optimistic overlay on the session row's own status, for the gap between
  // the interview stream saying it is done and the next poll confirming it.
  // Null means "the row is authoritative", which is the normal state — the
  // effect above restores it the moment the row moves.
  const [status, setStatus] = useState<BuilderSessionStatus | null>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Set when the server session vanishes mid-turn (SSE `session_not_found`,
  // e.g. a local DB reset) — the interview can't continue against an id that
  // no longer exists, so the composer is replaced by a "start over" state
  // rather than a turn that silently goes nowhere.
  const [sessionGone, setSessionGone] = useState(false);

  const hydratedRef = useRef(false);
  const openingSentRef = useRef(false);

  const handlePrdDraft = useCallback((draft: BuilderPrdDocument, version: number) => {
    setPrd(draft);
    setVersionNumber(version);
  }, []);

  // Deliberately does NOT create a replacement session and replay the turn —
  // that would swap the conversation out from under whoever is reading it.
  // Surfacing the loss and letting them start over on purpose is the safer
  // default for something this rare.
  const handleSessionInvalid = useCallback(async () => {
    setSessionGone(true);
    toast.error(strings.sessionGone);
    return null;
  }, [strings.sessionGone]);

  // `pendingQuestion` is deliberately not taken: an interview question renders
  // inline in the feed, and a mid-build pause belongs to BuildView.
  const { messages, isStreaming, sendMessage, stop, hydrateMessages } = useBuilderStream({
    sessionId: sessionId || null,
    onPrdDraft: handlePrdDraft,
    onReadiness: setReadiness,
    onDone: done => setStatus(done.sessionStatus),
    onSessionInvalid: handleSessionInvalid,
  });

  // Seed once per session. Re-seeding on every refetch would clobber the
  // in-flight stream's state with an older server snapshot.
  useEffect(() => {
    if (!session || hydratedRef.current) return;
    hydratedRef.current = true;
    setPrd(session.prd);
    setReadiness(session.readiness);
    setVersionNumber(session.prdVersionNumber);
    hydrateMessages(session.messages);
  }, [session, hydrateMessages]);

  // The sentence typed on mission control is the opening turn. Guarded by a
  // ref rather than a dependency list because a re-render must not replay it.
  useEffect(() => {
    const openingMessage =
      openingMessageProp ?? (location.state as { openingMessage?: string } | null)?.openingMessage;
    if (!openingMessage || !hydratedRef.current || openingSentRef.current) return;
    if (session?.messages.length) {
      openingSentRef.current = true;
      return;
    }
    openingSentRef.current = true;
    // Only the route-state form needs clearing; a prop is not replayed by a refetch, and
    // rewriting the URL here would strip the roadmap's own ?opportunity= param.
    if (!isEmbedded) navigate(location.pathname, { replace: true, state: null });
    void sendMessage(openingMessage);
  }, [isEmbedded, location, navigate, openingMessageProp, sendMessage, session]);

  const handleAnswer = useCallback(
    (payload: BuilderAnswerPayload) => {
      void sendMessage(payload.message, {
        questionId: payload.questionId,
        answer: payload.answer,
      });
    },
    [sendMessage],
  );

  const handleSaveSection = useCallback(
    async (path: string, value: string) => {
      try {
        const result = await patchPrd({
          id: sessionId,
          ops: [{ op: "replace", path, value }],
          changeSummary: `Edited ${path.replace("/", "")}`,
        }).unwrap();
        setPrd(result.prd);
        setReadiness(result.readiness);
        setVersionNumber(result.versionNumber);
      } catch {
        toast.error(strings.prd.saveFailed);
        throw new Error("save failed");
      }
    },
    [patchPrd, sessionId, strings.prd.saveFailed],
  );

  const handleCancel = useCallback(async () => {
    try {
      const updated = await cancelSession(sessionId).unwrap();
      setStatus(updated.status);
    } catch {
      toast.error(strings.cancelFailed);
    } finally {
      setShowCancelConfirm(false);
    }
  }, [cancelSession, sessionId, strings.cancelFailed]);

  if (isLoading || !prd || !readiness) {
    return (
      <div className="p-6">
        <SkeletonText paragraph lineCount={5} />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="p-6">
        <InlineNotification kind="error" lowContrast hideCloseButton title={strings.loadFailed} />
      </div>
    );
  }

  const effectiveStatus = status ?? session.status;
  const isTerminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(effectiveStatus);
  const prdEditable = !PRD_FROZEN.includes(effectiveStatus) && !isTerminal;
  // A session that ever reached a build shows the build view, including after
  // it finished: coming back to a completed session to read what happened is
  // the main reason to open one, and dropping back to the interview would
  // hide the whole outcome.
  // FAILED is in this list on its own account, not via `currentStage`. A run
  // can fail before it posts a single stage — a dispatch that never started, a
  // runner that could not put the repos on a working branch — and such a
  // session has no `currentStage` at all. That used to be survivable because a
  // banner under the header carried the error regardless of which layout
  // rendered. The failure now reads in the build feed, so a FAILED session
  // that fell through to the interview layout would state its failure
  // nowhere: status "Failed", a Retry button, and no reason on the page.
  const hasBuild =
    effectiveStatus === "BUILDING" ||
    effectiveStatus === "WAITING_FOR_INPUT" ||
    effectiveStatus === "FAILED" ||
    Boolean(session.currentStage);

  // The only way to reach this dialog while FAILED is the header's retry
  // button below — the PRD-only "no build yet" layout (with its own Start
  // build triggers) never renders once a session has a build at all, and a
  // FAILED session always does. So a FAILED session's own error is always the
  // right thing to show when the dialog is open, without threading a second
  // "why did I open this" flag through every trigger.
  const retryError = effectiveStatus === "FAILED" ? session.error : null;

  /**
   * "A session with no pull requests has shipped nothing, whatever its status"
   * — the API says so in as many words, and applies the same rule to whether a
   * build may start. A run whose agent claimed done and whose evidence said
   * otherwise settles the session green with an empty branch behind it, and
   * COMPLETED is otherwise not restartable, so the page would offer no way
   * onward from a success that did not happen.
   *
   * A completed session WITH pull requests stays closed to rebuilding: a
   * second build against the same PRD opens a competing set.
   */
  const shippedNothing = (pullRequests?.length ?? 0) === 0;
  const canRestart =
    RESTARTABLE.includes(effectiveStatus) || (effectiveStatus === "COMPLETED" && shippedNothing);

  const startBuildAction = (
    <Button
      kind="primary"
      size="md"
      className="w-full"
      // Terminal blocks a fresh start, except the states a person would
      // obviously want to build again from — see RESTARTABLE.
      disabled={isTerminal && !canRestart}
      onClick={() => setShowStartDialog(true)}
    >
      {effectiveStatus === "FAILED"
        ? strings.retryBuild
        : readiness.ready
          ? en.builder.readiness.startBuild
          : en.builder.readiness.startBuildEarly}
    </Button>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            kind="ghost"
            size="sm"
            onClick={() => (onClose ? onClose() : navigate(ROUTES.BUILDER))}
          >
            ←
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-typography-900">
              {asAgentText(prd.title).trim() || session.title}
            </h1>
            <p className="truncate text-xs text-typography-500">
              {session.repos?.length ? session.repos.join(", ") : strings.noReposYet}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tag type={BUILDER_STATUS_TAG_TYPE[effectiveStatus]} size="sm">
            {strings.status[effectiveStatus] ?? effectiveStatus}
          </Tag>
          {canRestart ? (
            <Button kind="primary" size="sm" onClick={() => setShowStartDialog(true)}>
              {strings.retryBuild}
            </Button>
          ) : (
            !isTerminal && (
              <Button
                kind="danger--tertiary"
                size="sm"
                disabled={isCancelling}
                onClick={() => setShowCancelConfirm(true)}
              >
                {strings.cancelSession}
              </Button>
            )
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Once a build exists the transcript is the main event and the PRD
            becomes reference — so the two swap places rather than the build
            being squeezed into the chat column it grew out of. */}
        {hasBuild ? (
          <>
            <section className="flex min-w-0 flex-1 flex-col border-r border-neutral-200">
              <ErrorBoundary variant="panel" resetKey={sessionId} className="m-4">
                <BuildView
                  sessionError={session.error}
                  sessionId={sessionId}
                  status={effectiveStatus}
                  currentStage={session.currentStage}
                />
                {/* Under the build feed, not beside the PRD: this is a thing
                    you reach for while watching a build go wrong, and the PRD
                    is frozen at that point anyway. Shown on a finished session
                    too, because a note left now is read by the next run. */}
                <SteerComposer sessionId={sessionId} live={effectiveStatus === "BUILDING"} />
              </ErrorBoundary>
            </section>
            {/* Folds to a rail. Once a build is running the PRD is frozen
                reference — worth reaching for, not worth 38% of the window for
                the whole time you are reading a transcript. During the
                interview it is the work itself, so that copy below does not
                fold. */}
            <CollapsibleAside
              label="PRD"
              storageKey="builder.prdAside"
              widthClassName="w-[38%] min-w-[340px] max-w-[520px]"
            >
              <ErrorBoundary variant="panel" resetKey={sessionId} className="m-4">
                <PrdDocPanel
                  prd={prd}
                  readiness={readiness}
                  versionNumber={versionNumber}
                  editable={prdEditable}
                  onSaveSection={handleSaveSection}
                  sessionTitle={session.title}
                  repos={session.repos ?? []}
                />
              </ErrorBoundary>
            </CollapsibleAside>
          </>
        ) : (
          <>
            <section className="flex min-w-0 flex-1 flex-col border-r border-neutral-200">
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="mt-8 text-center">
                    <p className="text-sm font-medium text-typography-800">
                      {strings.chat.emptyTitle}
                    </p>
                    <p className="mt-1 text-sm text-typography-600">{strings.chat.emptyBody}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((message, index) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        index={index}
                        onAnswer={handleAnswer}
                        disabled={isStreaming || isTerminal}
                      />
                    ))}
                  </div>
                )}
              </div>

              {sessionGone && (
                <div className="border-t border-neutral-200 p-3">
                  <InlineNotification
                    kind="error"
                    lowContrast
                    hideCloseButton
                    title={strings.sessionGone}
                  />
                  <Button
                    kind="tertiary"
                    size="sm"
                    className="mt-2"
                    onClick={() => (onClose ? onClose() : navigate(ROUTES.BUILDER))}
                  >
                    {strings.newSession}
                  </Button>
                </div>
              )}

              {/* No pinned question here: a mid-build pause renders inside
              BuildView, which owns that whole state. This branch only runs
              during the interview, where questions live inline in the feed. */}
              <ChatComposer
                onSend={text => void sendMessage(text)}
                onStop={stop}
                isStreaming={isStreaming}
                disabled={isTerminal || sessionGone}
              />

              {/* Below `lg` the PRD aside (and with it the readiness ring and
                  the only Start-build trigger) is hidden entirely — this is
                  the same action, reachable without it, so a narrow window is
                  never a dead end for starting a build. */}
              <div className="flex flex-col items-center gap-2 border-t border-neutral-200 p-3 lg:hidden">
                <ReadinessRing readiness={readiness} size={48} />
                {startBuildAction}
              </div>
            </section>

            <aside className="hidden w-[42%] min-w-[380px] max-w-[560px] flex-col lg:flex">
              {/* The PRD is the one part of this page written entirely by the
                  agent, so it is the part most likely to throw — and it used to
                  take the transcript beside it down with it. A panel boundary
                  keeps the interview readable when the document is not. */}
              <ErrorBoundary variant="panel" resetKey={sessionId} className="m-4">
                <PrdDocPanel
                  prd={prd}
                  readiness={readiness}
                  versionNumber={versionNumber}
                  editable={prdEditable}
                  onSaveSection={handleSaveSection}
                  sessionTitle={session.title}
                  repos={session.repos ?? []}
                />
              </ErrorBoundary>
              <div className="border-t border-neutral-200 p-3">{startBuildAction}</div>
            </aside>
          </>
        )}
      </div>

      <StartBuildDialog
        isOpen={showStartDialog}
        onClose={() => setShowStartDialog(false)}
        sessionId={sessionId}
        // The PRD already names every repo its technical plan touches, so
        // asking again is asking a question we answered during the interview —
        // and the wrong answer is worse than a slow one: a build that cannot
        // touch the repo it planned changes for fails late, after paying for a
        // plan and a coding pass. Still a selection, not a lock: the session's
        // own repos win when set, and the dialog remains editable.
        currentRepos={
          session.repos?.length
            ? session.repos
            : (prd?.technicalPlan?.repos ?? [])
                .map(plan => plan.repo)
                .filter((repo): repo is string => Boolean(repo))
        }
        initialBudgetUsd={session.budgetUsd}
        defaultBudgetUsd={settings?.defaultBudgetUsd}
        spentUsd={session.totalCostUsd}
        readiness={readiness}
        retryError={retryError}
        onStarted={() => setStatus("BUILDING")}
      />
      <ConfirmCancelDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => void handleCancel()}
        isLoading={isCancelling}
      />
    </div>
  );
};
