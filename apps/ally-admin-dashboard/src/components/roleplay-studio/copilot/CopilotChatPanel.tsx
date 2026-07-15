import React, { useCallback, useEffect, useRef, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { SkeletonPlaceholder } from "@ally-ui-mono/ui-shared";
import {
  baseAPI,
  useCancelImprovementRunMutation,
  useCreateRoleplayCopilotSessionMutation,
  useLazyGetRoleplayCopilotSessionQuery,
  useLazyGetRoleplayCopilotSessionsBySpecQuery,
  useLazyGetRoleplaySpecByIdQuery,
} from "@api";
import { EmptyState } from "@components";
import { en, LOCAL_STORAGE_KEYS, TAG_TYPES } from "@constants";
import { useCopilotStream } from "@hooks/useCopilotStream";
import { useImprovementLiveProgress } from "@hooks/useImprovementLiveProgress";
import { hydrateSpec, selectRoleplaySpecState, setCopilotSessionId } from "@reducer";
import { logger } from "@utils";
import { normalizeRoleplaySpec } from "@utils/roleplaySpec";

import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";
import { ImprovementLiveCard } from "./ImprovementLiveCard";
import { CopilotAnswerPayload } from "./QuestionCard";
import { useImprovementSocket } from "../improvement/useImprovementSocket";

const sessionStorageKey = (specId: string) =>
  `${LOCAL_STORAGE_KEYS.ROLEPLAY_COPILOT_SESSION_PREFIX}:${specId}`;

/**
 * Left pane of the chat screen: bootstraps (or resumes) the copilot session
 * for the current spec, renders the streamed chat feed, and pins the
 * composer. Resume prefers the pinned session (redux/localStorage) and falls
 * back to the caller's latest server-side session, so the chat survives
 * reloads AND browser changes with full card fidelity.
 *
 * While an auto-improve loop runs, its narration rows land out-of-band in
 * copilot_messages — the improvements socket triggers a transcript refetch so
 * progress appears live, and an ACCEPTED flip re-hydrates the (auto-updated)
 * draft spec.
 */
export const CopilotChatPanel: React.FC = () => {
  const strings = en.roleplayStudio.copilot;
  const dispatch = useDispatch();
  const { specId, copilotSessionId, revision, savedRevision, improvementRunning } =
    useSelector(selectRoleplaySpecState);

  const [createSession] = useCreateRoleplayCopilotSessionMutation();
  const [getSession] = useLazyGetRoleplayCopilotSessionQuery();
  const [getSessionsBySpec] = useLazyGetRoleplayCopilotSessionsBySpecQuery();
  const [fetchSpec] = useLazyGetRoleplaySpecByIdQuery();

  // Create a fresh session for the current spec and pin it (Redux + localStorage).
  // Used both to bootstrap and to recover when the server session disappears.
  const recreateSession = useCallback(async (): Promise<string | null> => {
    if (!specId) return null;
    try {
      const session = await createSession(specId).unwrap();
      localStorage.setItem(sessionStorageKey(specId), session.id);
      dispatch(setCopilotSessionId(session.id));
      return session.id;
    } catch {
      toast.error(strings.startFailed);
      return null;
    }
  }, [createSession, dispatch, specId, strings.startFailed]);

  const { messages, isStreaming, sendMessage, stop, hydrateMessages, replaceFeed } =
    useCopilotStream({
      sessionId: copilotSessionId,
      onSessionInvalid: recreateSession,
    });

  // Live auto-improve progress for the ephemeral in-feed card (only while a run
  // is RUNNING). Data is kept fresh by the improvements socket below + a
  // dedicated rehearsals socket inside the hook.
  const { activeRun, detail, currentRound, rehearsal } = useImprovementLiveProgress(specId);
  const [cancelRun, { isLoading: cancellingRun }] = useCancelImprovementRunMutation();
  const showLiveCard = Boolean(activeRun);

  const handleCancelRun = useCallback(async () => {
    if (!activeRun) return;
    try {
      await cancelRun(activeRun.id).unwrap();
    } catch {
      toast.error(en.roleplayStudio.improvement.cancelFailed);
    }
  }, [activeRun, cancelRun]);

  const [isBooting, setIsBooting] = useState(true);
  const bootedForSpecRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Deferred refresh: a loop update that lands mid-stream is picked up after done.
  const pendingRefreshRef = useRef(false);
  const isStreamingRef = useRef(false);
  isStreamingRef.current = isStreaming;

  // Bootstrap: resume the pinned session (redux/localStorage), else the
  // caller's latest server-side session for this spec, else create fresh.
  useEffect(() => {
    if (!specId || bootedForSpecRef.current === specId) return;
    bootedForSpecRef.current = specId;

    (async () => {
      setIsBooting(true);
      const storedSessionId = copilotSessionId ?? localStorage.getItem(sessionStorageKey(specId));

      if (storedSessionId) {
        try {
          const session = await getSession(storedSessionId).unwrap();
          localStorage.setItem(sessionStorageKey(specId), session.id);
          dispatch(setCopilotSessionId(session.id));
          hydrateMessages(session.messages ?? []);
          setIsBooting(false);
          return;
        } catch (error) {
          logger.warn(`[Roleplay Copilot] Pinned-session resume failed: ${error}`);
        }
      }

      // Cross-browser resume: the newest owned ACTIVE session on the server.
      try {
        const sessions = await getSessionsBySpec(specId).unwrap();
        const latest = sessions[0];
        if (latest) {
          const session = await getSession(latest.id).unwrap();
          localStorage.setItem(sessionStorageKey(specId), session.id);
          dispatch(setCopilotSessionId(session.id));
          hydrateMessages(session.messages ?? []);
          setIsBooting(false);
          return;
        }
      } catch (error) {
        logger.warn(`[Roleplay Copilot] Server-session lookup failed: ${error}`);
      }

      await recreateSession();
      setIsBooting(false);
    })();
  }, [
    specId,
    copilotSessionId,
    dispatch,
    getSession,
    getSessionsBySpec,
    hydrateMessages,
    recreateSession,
  ]);

  /** Pull freshly appended rows (loop narration) into the feed. */
  const refreshTranscript = useCallback(async () => {
    if (!copilotSessionId) return;
    if (isStreamingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }
    try {
      const session = await getSession(copilotSessionId).unwrap();
      replaceFeed(session.messages ?? []);
    } catch (error) {
      logger.warn(`[Roleplay Copilot] Transcript refresh failed: ${error}`);
    }
  }, [copilotSessionId, getSession, replaceFeed]);

  /** The loop may auto-accept into the draft — re-hydrate it when safe. */
  const refreshSpecIfClean = useCallback(async () => {
    if (!specId) return;
    // Belt-and-braces: editing is locked while a run is active, but never
    // clobber genuinely unsaved local edits.
    if (revision > savedRevision) return;
    try {
      const detail = await fetchSpec(specId).unwrap();
      dispatch(
        hydrateSpec({
          spec: normalizeRoleplaySpec(
            detail.activeVersion?.spec,
            detail.title || en.roleplayStudio.untitledRoleplay,
          ),
          specId: detail.id,
          versionId: detail.activeVersion?.id ?? "",
          updatedAt: detail.activeVersion?.updatedAt ?? null,
        }),
      );
    } catch (error) {
      logger.warn(`[Roleplay Copilot] Spec refresh failed: ${error}`);
    }
  }, [dispatch, fetchSpec, revision, savedRevision, specId]);

  // Loop progress lands out-of-band; the improvements socket is the doorbell.
  const onImprovementUpdate = useCallback(
    (data: unknown) => {
      // Refetch the runs list + active-run detail (drives the live card), then
      // pull any freshly-appended narration rows into the feed.
      dispatch(baseAPI.util.invalidateTags([TAG_TYPES.ROLEPLAY_IMPROVEMENTS]));
      void refreshTranscript();
      const entries = Array.isArray(data) ? data : [data];
      const hasResolvedRun = entries.some(entry => {
        const status = String((entry as { status?: string })?.status ?? "");
        return status === "ACCEPTED" || status === "AWAITING_REVIEW";
      });
      if (hasResolvedRun) void refreshSpecIfClean();
    },
    [dispatch, refreshSpecIfClean, refreshTranscript],
  );

  useImprovementSocket({ specId, onUpdate: onImprovementUpdate });

  // Flush a deferred transcript refresh once the stream finishes (narration
  // rows can also land mid-turn).
  useEffect(() => {
    if (!isStreaming && pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      void refreshTranscript();
    }
  }, [isStreaming, refreshTranscript]);

  // Keep the feed pinned to the latest message. Also scroll when the live card
  // appears or the current round's phase advances (not on every rehearsal tick,
  // to avoid yanking the view while the user reads).
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, activeRun?.id, currentRound?.status]);

  const handleSend = (text: string) => void sendMessage(text);
  const handleAnswerQuestion = (payload: CopilotAnswerPayload) =>
    void sendMessage(payload.message, {
      questionId: payload.questionId,
      answer: payload.answer,
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between pb-3 shrink-0">
        <h2 className="text-base font-medium text-typography-900">{strings.title}</h2>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1"
        data-testid="copilot-chat-feed"
      >
        {isBooting ? (
          <div className="flex flex-col gap-3 pt-2">
            <SkeletonPlaceholder className="!h-12 !w-2/3 rounded-2xl" />
            <SkeletonPlaceholder className="!h-12 !w-1/2 self-end rounded-2xl" />
            <SkeletonPlaceholder className="!h-12 !w-3/4 rounded-2xl" />
          </div>
        ) : messages.length === 0 && !showLiveCard ? (
          <EmptyState
            title={strings.emptyTitle}
            subtitle={strings.emptySubtitle}
            hideActionButton
          />
        ) : (
          <div className="flex flex-col gap-3 pb-2">
            {messages.map(message => (
              <ChatMessage
                key={message.id}
                message={message}
                sessionId={copilotSessionId}
                onAnswerQuestion={handleAnswerQuestion}
                disabled={isStreaming}
              />
            ))}
            {showLiveCard && activeRun && (
              <ImprovementLiveCard
                run={activeRun}
                detail={detail}
                currentRound={currentRound}
                rehearsal={rehearsal}
                onCancel={handleCancelRun}
                cancelling={cancellingRun}
              />
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 pt-1">
        {improvementRunning && (
          <div
            className="mb-2 flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2.5"
            role="status"
            aria-live="polite"
            data-testid="improvement-running-banner"
          >
            <span
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"
              aria-hidden
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-primary-700">
                {strings.improvement.running}
              </span>
              <span className="text-xs text-typography-600">{strings.improvement.runningHint}</span>
            </div>
          </div>
        )}
        <ChatComposer
          onSend={handleSend}
          onStop={stop}
          isStreaming={isStreaming}
          disabled={isBooting || !copilotSessionId}
        />
      </div>
    </div>
  );
};
