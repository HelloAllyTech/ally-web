import React, { useEffect, useRef, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import {
  useCreateRoleplayCopilotSessionMutation,
  useLazyGetRoleplayCopilotSessionQuery,
} from "@api";
import { EmptyState } from "@components";
import { en, LOCAL_STORAGE_KEYS } from "@constants";
import { useCopilotStream } from "@hooks/useCopilotStream";
import { selectRoleplaySpecState, setCopilotSessionId, setInterviewPhase } from "@reducer";
import { logger } from "@utils";

import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";

const sessionStorageKey = (specId: string) =>
  `${LOCAL_STORAGE_KEYS.ROLEPLAY_COPILOT_SESSION_PREFIX}:${specId}`;

/**
 * Left pane of the interview step: bootstraps (or resumes) the copilot
 * session for the current spec, renders the streamed chat feed, and pins the
 * composer. Spec patches streamed by the copilot land in the spec slice via
 * useCopilotStream, so the SpecPanel on the right updates live.
 */
export const CopilotChatPanel: React.FC = () => {
  const strings = en.roleplayStudio.copilot;
  const dispatch = useDispatch();
  const { specId, copilotSessionId, interviewPhase } = useSelector(selectRoleplaySpecState);

  const [createSession] = useCreateRoleplayCopilotSessionMutation();
  const [getSession] = useLazyGetRoleplayCopilotSessionQuery();

  const { messages, isStreaming, sendMessage, stop, hydrateMessages } = useCopilotStream({
    sessionId: copilotSessionId,
  });

  const [isBooting, setIsBooting] = useState(true);
  const bootedForSpecRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Bootstrap: resume the stored session for this spec (refresh recovery via
  // GET session), else create a fresh one.
  useEffect(() => {
    if (!specId || bootedForSpecRef.current === specId) return;
    bootedForSpecRef.current = specId;

    (async () => {
      setIsBooting(true);
      const storedSessionId = copilotSessionId ?? localStorage.getItem(sessionStorageKey(specId));

      if (storedSessionId) {
        try {
          const session = await getSession(storedSessionId).unwrap();
          dispatch(setCopilotSessionId(session.id));
          dispatch(setInterviewPhase(session.phase ?? null));
          hydrateMessages(session.messages ?? [], session.phase);
          setIsBooting(false);
          return;
        } catch (error) {
          logger.warn(`[Roleplay Copilot] Resume failed, starting fresh: ${error}`);
        }
      }

      try {
        const session = await createSession(specId).unwrap();
        localStorage.setItem(sessionStorageKey(specId), session.id);
        dispatch(setCopilotSessionId(session.id));
        dispatch(setInterviewPhase(session.phase ?? null));
      } catch {
        toast.error(strings.startFailed);
      } finally {
        setIsBooting(false);
      }
    })();
  }, [specId, copilotSessionId, createSession, dispatch, getSession, hydrateMessages]);

  // Keep the feed pinned to the latest message.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const handleSend = (text: string) => void sendMessage(text);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between pb-3 shrink-0">
        <h2 className="text-base font-medium text-typography-900">{strings.title}</h2>
        {interviewPhase && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-typography-700">
            {interviewPhase}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1"
        data-testid="copilot-chat-feed"
      >
        {isBooting ? (
          <div className="flex flex-col gap-3 animate-pulse pt-2">
            <div className="h-12 w-2/3 rounded-2xl bg-neutral-100" />
            <div className="h-12 w-1/2 self-end rounded-2xl bg-neutral-100" />
            <div className="h-12 w-3/4 rounded-2xl bg-neutral-100" />
          </div>
        ) : messages.length === 0 ? (
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
                onAnswerQuestion={handleSend}
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
        />
      </div>
    </div>
  );
};
