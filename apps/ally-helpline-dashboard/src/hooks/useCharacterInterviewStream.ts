import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import {
  ApiEndpoints,
  characterInterviewStrings as strings,
  HttpMethod,
  LOCAL_STORAGE_KEYS,
} from "@constants";
import {
  CharacterDraftEvent,
  CharacterInterviewChatMessage,
  CharacterInterviewDoneEvent,
  CharacterInterviewQuestionEvent,
  CharacterInterviewServerMessage,
  CharacterInterviewStreamEvent,
  CharacterInterviewStructuredAnswer,
  RefreshResponse,
} from "@types";

/**
 * Ported from ally-admin-dashboard's `src/hooks/useCharacterInterviewStream.ts`.
 * The only real change from that version is `fetchStreamWithReauth`, which
 * uses this app's own token storage keys (`accessToken`/`refreshToken`) and
 * refresh endpoint instead of admin-dashboard's admin-specific ones — the two
 * apps do not share a session.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let messageIdCounter = 0;
/** Collision-proof client message id. */
const nextMessageId = () => {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `msg_${uuid}`;
  return `msg_${Date.now().toString(36)}_${++messageIdCounter}`;
};

/**
 * Parses SSE frames out of `buffer`. Returns the parsed events plus the
 * unconsumed remainder (a partial frame that is still streaming in).
 * Exported for unit tests.
 */
export const parseSseBuffer = (
  buffer: string,
): { events: CharacterInterviewStreamEvent[]; rest: string } => {
  const events: CharacterInterviewStreamEvent[] = [];
  const frames = buffer.split(/\r?\n\r?\n/);
  const rest = frames.pop() ?? "";

  for (const frame of frames) {
    let eventName = "";
    const dataLines: string[] = [];
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      // Comments (":") and other fields (id:, retry:) are ignored.
    }
    if (!eventName || dataLines.length === 0) continue;
    try {
      const data = JSON.parse(dataLines.join("\n"));
      events.push({ type: eventName, data } as CharacterInterviewStreamEvent);
    } catch {
      logger.warn(`[Character Interview] Dropping malformed SSE frame for event "${eventName}"`);
    }
  }

  return { events, rest };
};

const ANSWER_PREFIX_RE = /^\[answers question [^\]]+\]\s*/i;

/**
 * Rebuilds the chat feed from persisted character_interview_messages rows —
 * the resume path. Question cards are reconstructed from the assistant row's
 * metadata and marked answered via later user rows' metadata.questionId.
 * Pure; exported for unit tests.
 */
export const mapServerMessagesToFeed = (
  rows: CharacterInterviewServerMessage[],
): CharacterInterviewChatMessage[] => {
  const answeredQuestions = new Map<string, string>();
  const answeredAnswers = new Map<string, CharacterInterviewStructuredAnswer>();
  for (const row of rows) {
    if (row.role !== "user") continue;
    const questionId = row.metadata?.questionId;
    if (questionId) {
      answeredQuestions.set(String(questionId), (row.content ?? "").replace(ANSWER_PREFIX_RE, ""));
      if (row.metadata?.answer) {
        answeredAnswers.set(String(questionId), row.metadata.answer);
      }
    }
  }

  const feed: CharacterInterviewChatMessage[] = [];
  rows.forEach((row, index) => {
    const baseId = row.id ?? `srv_${row.seq ?? index}`;
    const metadata = row.metadata ?? {};
    const content = row.content ?? "";

    if (row.role === "user") {
      feed.push({
        id: baseId,
        role: "user",
        content: content.replace(ANSWER_PREFIX_RE, ""),
      });
      return;
    }

    if (content) {
      feed.push({ id: baseId, role: "assistant", content });
    }
    for (const question of metadata.questions ?? []) {
      feed.push({
        id: `${baseId}_q_${question.id}`,
        role: "assistant",
        content: question.prompt,
        question,
        answeredWith: answeredQuestions.get(question.id),
        answeredAnswer: answeredAnswers.get(question.id),
      });
    }
  });
  return feed;
};

const scheduleFrame: (cb: () => void) => number | ReturnType<typeof setTimeout> =
  typeof requestAnimationFrame === "function"
    ? cb => requestAnimationFrame(cb)
    : cb => setTimeout(cb, 16);

const cancelFrame = (handle: number | ReturnType<typeof setTimeout>) => {
  if (typeof cancelAnimationFrame === "function" && typeof handle === "number") {
    cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  }
};

/** Per-message options accepted by `sendMessage` (forwarded in the POST body). */
export interface CharacterInterviewSendOptions {
  questionId?: string;
  answer?: CharacterInterviewStructuredAnswer;
}

interface UseCharacterInterviewStreamOptions {
  sessionId: string | null;
  /** Fired when the agent completes the profile (save_character_draft). */
  onCharacterDraft?: (draft: CharacterDraftEvent["draft"]) => void;
  onDone?: (done: CharacterInterviewDoneEvent) => void;
  /**
   * Called when a turn fails because the server session no longer exists (SSE
   * `error` with code `session_not_found`). Should create a fresh session and
   * resolve with its id; the turn is then transparently replayed against it.
   */
  onSessionInvalid?: () => Promise<string | null>;
}

/**
 * Drives the interview agent's SSE stream (POST .../messages/stream) with the
 * same bearer + one-shot 401-refresh-retry flow as baseAPI. Token deltas are
 * batched per animation frame; a `character_draft` frame hands the finished
 * profile to the caller, which opens it in the character form for review.
 */
export const useCharacterInterviewStream = ({
  sessionId,
  onCharacterDraft,
  onDone,
  onSessionInvalid,
}: UseCharacterInterviewStreamOptions) => {
  const [messages, setMessages] = useState<CharacterInterviewChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const pendingTokensRef = useRef("");
  const frameRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const currentAssistantIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
      if (frameRef.current !== null) cancelFrame(frameRef.current);
    };
  }, []);

  const patchAssistantMessage = useCallback(
    (
      id: string,
      patch:
        | Partial<CharacterInterviewChatMessage>
        | ((m: CharacterInterviewChatMessage) => CharacterInterviewChatMessage),
    ) => {
      setMessages(prev =>
        prev.map(message => {
          if (message.id !== id) return message;
          return typeof patch === "function" ? patch(message) : { ...message, ...patch };
        }),
      );
    },
    [],
  );

  /** Flushes any buffered token deltas into the current assistant message. */
  const flushTokens = useCallback(() => {
    if (frameRef.current !== null) {
      cancelFrame(frameRef.current);
      frameRef.current = null;
    }
    const delta = pendingTokensRef.current;
    if (!delta) return;
    pendingTokensRef.current = "";
    const id = currentAssistantIdRef.current;
    if (!id) return;
    patchAssistantMessage(id, message => ({ ...message, content: message.content + delta }));
  }, [patchAssistantMessage]);

  const queueToken = useCallback(
    (delta: string) => {
      pendingTokensRef.current += delta;
      if (frameRef.current !== null) return;
      frameRef.current = scheduleFrame(() => {
        frameRef.current = null;
        flushTokens();
      });
    },
    [flushTokens],
  );

  const appendToolNote = useCallback(
    (note: string) => {
      const id = currentAssistantIdRef.current;
      if (!id) return;
      patchAssistantMessage(id, message => ({
        ...message,
        toolNotes: [...(message.toolNotes ?? []), note],
      }));
    },
    [patchAssistantMessage],
  );

  const handleEvent = useCallback(
    (event: CharacterInterviewStreamEvent) => {
      switch (event.type) {
        case "token":
          queueToken(event.data.delta ?? "");
          break;
        case "tool_call":
          flushTokens();
          // The agent's tools are internal plumbing (ask_question,
          // get_voices, save_character_draft) — narrate the two that take
          // real time, and stay silent about the question itself, which the
          // card already shows.
          if (event.data.name === "get_voices") {
            appendToolNote(strings.toolLookingUpVoices);
          } else if (event.data.name === "save_character_draft") {
            appendToolNote(strings.toolBuildingProfile);
          }
          break;
        case "tool_result":
          flushTokens();
          break;
        case "question": {
          flushTokens();
          const question = event.data as CharacterInterviewQuestionEvent;
          setMessages(prev => [
            ...prev,
            {
              id: nextMessageId(),
              role: "assistant",
              content: question.prompt,
              question,
            },
          ]);
          break;
        }
        case "character_draft":
          flushTokens();
          onCharacterDraft?.((event.data as CharacterDraftEvent).draft);
          break;
        case "error": {
          flushTokens();
          const id = currentAssistantIdRef.current;
          if (id) patchAssistantMessage(id, { error: event.data.message, streaming: false });
          if (event.data.code === "turn_in_progress") {
            toast.error(strings.turnInProgress);
          } else {
            toast.error(event.data.message || strings.streamFailed);
          }
          break;
        }
        case "ping":
          // Server heartbeat during long generations — keep-alive only.
          break;
        case "done":
          flushTokens();
          onDone?.(event.data as CharacterInterviewDoneEvent);
          break;
        default:
          break;
      }
    },
    [appendToolNote, flushTokens, onCharacterDraft, onDone, patchAssistantMessage, queueToken],
  );

  /** One 401 -> refresh -> retry, mirroring baseAPI's reauth flow. */
  const fetchStreamWithReauth = useCallback(
    async (url: string, body: unknown, signal: AbortSignal): Promise<Response> => {
      const request = (token: string | null) =>
        fetch(url, {
          method: HttpMethod.POST,
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
          signal,
        });

      let response = await request(localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN));
      if (response.status !== 401) return response;

      const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return response;

      const refreshResponse = await fetch(`${API_BASE_URL}/api${ApiEndpoints.AUTH.REFRESH}`, {
        method: HttpMethod.POST,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal,
      });
      if (!refreshResponse.ok) return response;

      const tokens = (await refreshResponse.json()) as RefreshResponse;
      localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);

      response = await request(tokens.accessToken);
      return response;
    },
    [],
  );

  /**
   * Streams one turn against `activeSessionId`, appending a user + assistant
   * bubble. A `session_not_found` error frame is NOT surfaced here — it's
   * reported back via the return so the caller can recover.
   */
  const runStream = useCallback(
    async (
      text: string,
      activeSessionId: string,
      opts?: CharacterInterviewSendOptions,
      /** Bootstrap turn: the kickoff message isn't shown as a user bubble. */
      hideUserBubble = false,
    ): Promise<{
      userMsgId: string | null;
      assistantId: string;
      sessionLost: boolean;
      aborted: boolean;
    }> => {
      const userMsgId = hideUserBubble ? null : nextMessageId();
      const assistantId = nextMessageId();
      currentAssistantIdRef.current = assistantId;
      setMessages(prev => [
        ...prev,
        ...(userMsgId ? [{ id: userMsgId, role: "user" as const, content: text }] : []),
        { id: assistantId, role: "assistant" as const, content: "", streaming: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      let sessionLost = false;

      try {
        const url = `${API_BASE_URL}/api${ApiEndpoints.CHARACTER_LIBRARY.INTERVIEW_SESSION_STREAM(activeSessionId)}`;
        const response = await fetchStreamWithReauth(
          url,
          {
            message: text,
            ...(opts?.questionId ? { questionId: opts.questionId } : {}),
            ...(opts?.answer ? { answer: opts.answer } : {}),
          },
          controller.signal,
        );

        if (!response.ok || !response.body) {
          throw new Error(`Stream request failed (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseSseBuffer(buffer);
          buffer = rest;
          for (const event of events) {
            if (event.type === "error" && event.data.code === "session_not_found") {
              sessionLost = true; // handled by sendMessage; don't toast the raw error
              continue;
            }
            handleEvent(event);
          }
        }
        flushTokens();
        patchAssistantMessage(assistantId, { streaming: false });
      } catch (error) {
        flushTokens();
        if (controller.signal.aborted) {
          // Keep the partial text, marked interrupted.
          patchAssistantMessage(assistantId, { streaming: false, interrupted: true });
        } else if (!sessionLost) {
          logger.error(`[Character Interview] ${error}`);
          patchAssistantMessage(assistantId, {
            streaming: false,
            error: strings.streamFailed,
          });
          toast.error(strings.streamFailed);
        }
      } finally {
        abortRef.current = null;
        currentAssistantIdRef.current = null;
        if (isMountedRef.current) setIsStreaming(false);
      }

      return { userMsgId, assistantId, sessionLost, aborted: controller.signal.aborted };
    },
    [fetchStreamWithReauth, flushTokens, handleEvent, patchAssistantMessage],
  );

  const sendMessage = useCallback(
    async (text: string, opts?: CharacterInterviewSendOptions, hideUserBubble = false) => {
      const trimmed = text.trim();
      if (!trimmed || !sessionId || abortRef.current) return;

      const first = await runStream(trimmed, sessionId, opts, hideUserBubble);
      if (!first.sessionLost || first.aborted) return;

      // The server session is gone (e.g. a local DB reset dropped it).
      // Re-create one and replay the turn once so the admin never sees the
      // raw error. One recovery attempt is the ceiling.
      setMessages(prev => prev.filter(m => m.id !== first.userMsgId && m.id !== first.assistantId));
      const freshId = onSessionInvalid ? await onSessionInvalid() : null;
      if (!freshId) {
        toast.error(strings.streamFailed);
        return;
      }
      const retry = await runStream(trimmed, freshId, opts, hideUserBubble);
      if (retry.sessionLost && !retry.aborted) {
        patchAssistantMessage(retry.assistantId, {
          streaming: false,
          error: strings.streamFailed,
        });
        toast.error(strings.streamFailed);
      }
    },
    [onSessionInvalid, patchAssistantMessage, runStream, sessionId],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** Seeds the feed from a resumed session (GET .../interview/sessions/:id). */
  const hydrateMessages = useCallback((serverMessages: CharacterInterviewServerMessage[]) => {
    setMessages(mapServerMessagesToFeed(serverMessages));
  }, []);

  /** Clears the feed (starting a new interview in place). */
  const resetMessages = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, sendMessage, stop, hydrateMessages, resetMessages };
};
