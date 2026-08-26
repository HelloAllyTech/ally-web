import React, { useCallback, useEffect, useRef, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button, InlineNotification, SkeletonText, Tag } from "@ally-ui-mono/ui-shared";
import {
  useCancelBuilderSessionMutation,
  useGetBuilderSessionQuery,
  usePatchBuilderPrdMutation,
  useStartBuilderBuildMutation,
} from "@api";
import { BuildView, ChatComposer, ChatMessage, PrdDocPanel } from "@components/builder";
import type { BuilderAnswerPayload } from "@components/builder";
import { en, ROUTES } from "@constants";
import { useBuilderStream } from "@hooks";
import { BuilderPrdDocument, BuilderPrdReadiness, BuilderSessionStatus } from "@types";

import { BUILDER_STATUS_TAG_TYPE } from "./builderMotion";

/** The PRD is the build's source of truth while a run is reading it. */
const PRD_FROZEN: BuilderSessionStatus[] = ["BUILDING", "WAITING_FOR_INPUT"];

/**
 * One Builder session: the interview on the left, the living PRD on the right.
 *
 * The PRD and readiness are held in local state seeded from the server and
 * then advanced by SSE frames, rather than refetched per turn. The document is
 * already authoritative on the server by the time a frame arrives, and waiting
 * for a round-trip would make it lag the sentence that produced it — which is
 * the one thing this layout exists to show.
 */
export const BuilderSession: React.FC = () => {
  const strings = en.builder;
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    data: session,
    isLoading,
    isError,
  } = useGetBuilderSessionQuery(sessionId, {
    skip: !sessionId,
  });
  const [patchPrd] = usePatchBuilderPrdMutation();
  const [cancelSession, { isLoading: isCancelling }] = useCancelBuilderSessionMutation();
  const [startBuild, { isLoading: isStarting }] = useStartBuilderBuildMutation();

  const [prd, setPrd] = useState<BuilderPrdDocument | null>(null);
  const [readiness, setReadiness] = useState<BuilderPrdReadiness | null>(null);
  const [versionNumber, setVersionNumber] = useState(0);
  const [status, setStatus] = useState<BuilderSessionStatus | null>(null);

  const hydratedRef = useRef(false);
  const openingSentRef = useRef(false);

  const handlePrdDraft = useCallback((draft: BuilderPrdDocument, version: number) => {
    setPrd(draft);
    setVersionNumber(version);
  }, []);

  // `pendingQuestion` is deliberately not taken: an interview question renders
  // inline in the feed, and a mid-build pause belongs to BuildView.
  const { messages, isStreaming, sendMessage, stop, hydrateMessages } = useBuilderStream({
    sessionId: sessionId || null,
    onPrdDraft: handlePrdDraft,
    onReadiness: setReadiness,
    onDone: done => setStatus(done.sessionStatus),
  });

  // Seed once per session. Re-seeding on every refetch would clobber the
  // in-flight stream's state with an older server snapshot.
  useEffect(() => {
    if (!session || hydratedRef.current) return;
    hydratedRef.current = true;
    setPrd(session.prd);
    setReadiness(session.readiness);
    setVersionNumber(session.prdVersionNumber);
    setStatus(session.status);
    hydrateMessages(session.messages);
  }, [session, hydrateMessages]);

  // The sentence typed on mission control is the opening turn. Guarded by a
  // ref rather than a dependency list because a re-render must not replay it.
  useEffect(() => {
    const openingMessage = (location.state as { openingMessage?: string } | null)?.openingMessage;
    if (!openingMessage || !hydratedRef.current || openingSentRef.current) return;
    if (session?.messages.length) {
      openingSentRef.current = true;
      return;
    }
    openingSentRef.current = true;
    navigate(location.pathname, { replace: true, state: null });
    void sendMessage(openingMessage);
  }, [location, navigate, sendMessage, session]);

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

  const handleStartBuild = useCallback(async () => {
    try {
      await startBuild({ id: sessionId }).unwrap();
      setStatus("BUILDING");
    } catch (error) {
      // The backend refusals each name which control stopped the build — the
      // kill switch, the concurrency ceiling, the budget — so surface the
      // server's own message rather than a generic one.
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? strings.build.startFailed;
      toast.error(message);
    }
  }, [sessionId, startBuild, strings.build.startFailed]);

  const handleCancel = useCallback(async () => {
    try {
      const updated = await cancelSession(sessionId).unwrap();
      setStatus(updated.status);
    } catch {
      toast.error(strings.cancelFailed);
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
  const hasBuild =
    effectiveStatus === "BUILDING" ||
    effectiveStatus === "WAITING_FOR_INPUT" ||
    Boolean(session.currentStage);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button kind="ghost" size="sm" onClick={() => navigate(ROUTES.BUILDER)}>
            ←
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-typography-900">
              {prd.title?.trim() || session.title}
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
          {!isTerminal && (
            <Button
              kind="danger--tertiary"
              size="sm"
              disabled={isCancelling}
              onClick={() => void handleCancel()}
            >
              {strings.cancelSession}
            </Button>
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
              <BuildView
                sessionId={sessionId}
                status={effectiveStatus}
                currentStage={session.currentStage}
              />
            </section>
            <aside className="hidden w-[38%] min-w-[340px] max-w-[520px] flex-col lg:flex">
              <PrdDocPanel
                prd={prd}
                readiness={readiness}
                versionNumber={versionNumber}
                editable={prdEditable}
                onSaveSection={handleSaveSection}
              />
            </aside>
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

              {/* No pinned question here: a mid-build pause renders inside
              BuildView, which owns that whole state. This branch only runs
              during the interview, where questions live inline in the feed. */}
              <ChatComposer
                onSend={text => void sendMessage(text)}
                onStop={stop}
                isStreaming={isStreaming}
                disabled={isTerminal}
              />
            </section>

            <aside className="hidden w-[42%] min-w-[380px] max-w-[560px] flex-col lg:flex">
              <PrdDocPanel
                prd={prd}
                readiness={readiness}
                versionNumber={versionNumber}
                editable={prdEditable}
                onSaveSection={handleSaveSection}
              />
              {/* Sits under the readiness ring it depends on, so the reason it is
              disabled is directly above the button. */}
              <div className="border-t border-neutral-200 p-3">
                <Button
                  kind="primary"
                  size="md"
                  className="w-full"
                  disabled={!readiness.ready || isStarting || isTerminal}
                  onClick={() => void handleStartBuild()}
                >
                  {en.builder.readiness.startBuild}
                </Button>
                {!readiness.ready && (
                  <p className="mt-1.5 text-center text-xs text-typography-500">
                    {en.builder.readiness.startBuildDisabledHint}
                  </p>
                )}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
};
