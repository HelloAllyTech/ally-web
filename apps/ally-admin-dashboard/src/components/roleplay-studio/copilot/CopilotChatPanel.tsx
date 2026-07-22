import React, { useCallback, useEffect, useRef, useState } from "react";

import clsx from "clsx";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { SkeletonPlaceholder } from "@ally-ui-mono/ui-shared";
import {
  useCreateRoleplayCopilotSessionMutation,
  useLazyGetRoleplayCopilotSessionQuery,
  useLazyGetRoleplayCopilotSessionsBySpecQuery,
  useSetRoleplayCopilotSessionModeMutation,
} from "@api";
import { EmptyState } from "@components";
import { en, LOCAL_STORAGE_KEYS } from "@constants";
import { useCopilotStream } from "@hooks/useCopilotStream";
import { selectRoleplaySpecState, setCopilotSessionId } from "@reducer";
import { CopilotSessionMode } from "@src/types/roleplayStudio";
import { logger } from "@utils";

import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";
import { CopilotAnswerPayload } from "./QuestionCard";

const sessionStorageKey = (specId: string) =>
  `${LOCAL_STORAGE_KEYS.ROLEPLAY_COPILOT_SESSION_PREFIX}:${specId}`;

interface CopilotModeToggleProps {
  mode: CopilotSessionMode;
  /** Iterate is unlocked once the spec has been built (has states). */
  canIterate: boolean;
  disabled: boolean;
  onChange: (mode: CopilotSessionMode) => void;
}

/**
 * Build ⇄ Iterate segmented control. Iterate stays locked until the spec has
 * a state machine — you can only refine a roleplay that has been built.
 */
const CopilotModeToggle: React.FC<CopilotModeToggleProps> = ({
  mode,
  canIterate,
  disabled,
  onChange,
}) => {
  const strings = en.roleplayStudio.copilot;
  const baseBtn = "rounded-md px-3 py-1 text-xs font-medium transition-colors";
  const active = "bg-white text-typography-900 shadow-sm";
  const inactive = "text-typography-500 hover:text-typography-700";

  return (
    <div className="inline-flex items-center rounded-lg bg-secondary-50 p-0.5">
      <button
        type="button"
        onClick={() => onChange("BUILDING")}
        disabled={disabled}
        title={strings.modeBuildHint}
        className={clsx(baseBtn, mode === "BUILDING" ? active : inactive)}
      >
        {strings.modeBuild}
      </button>
      <button
        type="button"
        onClick={() => onChange("ITERATING")}
        disabled={disabled || !canIterate}
        title={canIterate ? strings.modeIterateHint : strings.modeIterateLockedHint}
        className={clsx(
          baseBtn,
          mode === "ITERATING" ? active : inactive,
          !canIterate && "cursor-not-allowed opacity-50",
        )}
      >
        {strings.modeIterate}
      </button>
    </div>
  );
};

/**
 * Left pane of the chat screen: bootstraps (or resumes) the copilot session
 * for the current spec, renders the streamed chat feed, and pins the
 * composer. Resume prefers the pinned session (redux/localStorage) and falls
 * back to the caller's latest server-side session, so the chat survives
 * reloads AND browser changes with full card fidelity.
 */
export const CopilotChatPanel: React.FC = () => {
  const strings = en.roleplayStudio.copilot;
  const dispatch = useDispatch();
  const { specId, copilotSessionId, spec } = useSelector(selectRoleplaySpecState);

  const [createSession] = useCreateRoleplayCopilotSessionMutation();
  const [getSession] = useLazyGetRoleplayCopilotSessionQuery();
  const [getSessionsBySpec] = useLazyGetRoleplayCopilotSessionsBySpecQuery();
  const [setSessionMode, { isLoading: isSwitchingMode }] =
    useSetRoleplayCopilotSessionModeMutation();

  const [mode, setModeState] = useState<CopilotSessionMode>("BUILDING");
  // Iterate is only meaningful once the copilot has built a state machine.
  const canIterate = (spec?.stateMachine?.states?.length ?? 0) >= 1;

  // Create a fresh session for the current spec and pin it (Redux + localStorage).
  // Used both to bootstrap and to recover when the server session disappears.
  const recreateSession = useCallback(async (): Promise<string | null> => {
    if (!specId) return null;
    try {
      const session = await createSession(specId).unwrap();
      localStorage.setItem(sessionStorageKey(specId), session.id);
      dispatch(setCopilotSessionId(session.id));
      setModeState(session.mode ?? "BUILDING");
      return session.id;
    } catch {
      toast.error(strings.startFailed);
      return null;
    }
  }, [createSession, dispatch, specId, strings.startFailed]);

  const { messages, isStreaming, sendMessage, stop, hydrateMessages } = useCopilotStream({
    sessionId: copilotSessionId,
    onSessionInvalid: recreateSession,
  });

  const [isBooting, setIsBooting] = useState(true);
  const bootedForSpecRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
          setModeState(session.mode ?? "BUILDING");
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
          setModeState(session.mode ?? "BUILDING");
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

  // Keep the feed pinned to the latest message.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const handleSend = (text: string) => void sendMessage(text);
  const handleAnswerQuestion = (payload: CopilotAnswerPayload) =>
    void sendMessage(payload.message, {
      questionId: payload.questionId,
      answer: payload.answer,
    });

  // Optimistically flip the toggle, then persist; revert on failure.
  const handleModeChange = useCallback(
    async (next: CopilotSessionMode) => {
      if (!copilotSessionId || next === mode || isStreaming) return;
      const previous = mode;
      setModeState(next);
      try {
        await setSessionMode({ sessionId: copilotSessionId, mode: next }).unwrap();
      } catch {
        setModeState(previous);
        toast.error(strings.modeSwitchFailed);
      }
    },
    [copilotSessionId, mode, isStreaming, setSessionMode, strings.modeSwitchFailed],
  );

  const isIterating = mode === "ITERATING";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between pb-3 shrink-0">
        <h2 className="text-base font-medium text-typography-900">{strings.title}</h2>
        <CopilotModeToggle
          mode={mode}
          canIterate={canIterate}
          disabled={isBooting || !copilotSessionId || isStreaming || isSwitchingMode}
          onChange={handleModeChange}
        />
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
        ) : messages.length === 0 ? (
          <EmptyState
            title={isIterating ? strings.iterationEmptyTitle : strings.emptyTitle}
            subtitle={isIterating ? strings.iterationEmptySubtitle : strings.emptySubtitle}
            hideActionButton
          />
        ) : (
          <div className="flex flex-col gap-3 pb-2">
            {messages.map(message => (
              <ChatMessage
                key={message.id}
                message={message}
                onAnswerQuestion={handleAnswerQuestion}
                disabled={isStreaming}
              />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 pt-1">
        <ChatComposer
          onSend={handleSend}
          onStop={stop}
          isStreaming={isStreaming}
          disabled={isBooting || !copilotSessionId}
          placeholder={isIterating ? strings.iterationPlaceholder : undefined}
        />
      </div>
    </div>
  );
};
