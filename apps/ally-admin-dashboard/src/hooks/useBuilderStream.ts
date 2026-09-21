import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { ApiEndpoints, en, HttpMethod, LOCAL_STORAGE_KEYS } from "@constants";
import {
  BuilderChatMessage,
  BuilderDoneEvent,
  BuilderPrdDocument,
  BuilderPrdReadiness,
  BuilderQuestionEvent,
  BuilderServerMessage,
  BuilderStreamEvent,
  BuilderStructuredAnswer,
  RefreshResponse,
} from "@types";
import { logger } from "@utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let messageIdCounter = 0;
const nextMessageId = () => {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `bmsg_${uuid}`;
  return `bmsg_${Date.now().toString(36)}_${++messageIdCounter}`;
};

/**
 * Parses SSE frames out of `buffer`. Returns the parsed events plus the
 * unconsumed remainder (a partial frame still streaming in), and how many
 * frames failed to parse.
 *
 * `droppedCount` is surfaced rather than only logged: a dropped frame takes
 * its content — a token, a tool result, a whole PRD patch — out of the feed
 * with nothing to show the person reading it that anything went missing.
 */
export const parseSseBuffer = (
  buffer: string,
): { events: BuilderStreamEvent[]; rest: string; droppedCount: number } => {
  const events: BuilderStreamEvent[] = [];
  const frames = buffer.split(/\r?\n\r?\n/);
  const rest = frames.pop() ?? "";
  let droppedCount = 0;

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
      events.push({ type: eventName, data } as BuilderStreamEvent);
    } catch {
      logger.warn(`[Builder Stream] Dropping malformed SSE frame for event "${eventName}"`);
      droppedCount += 1;
    }
  }

  return { events, rest, droppedCount };
};

/** Strips the deterministic answer prefix the server adds to a user turn. */
const ANSWER_PREFIX_RE = /^\[answers question [^\]]+\]\s*/i;

/**
 * Rebuilds the chat feed from persisted rows, re-emitting the question cards
 * an assistant turn asked and marking them answered from the *later* user row
 * that references them — which is why the pass looks ahead rather than
 * rendering each row in isolation.
 */
export const mapServerMessagesToFeed = (
  serverMessages: BuilderServerMessage[],
): BuilderChatMessage[] => {
  const feed: BuilderChatMessage[] = [];
  const answersByQuestionId = new Map<string, { text: string; answer?: BuilderStructuredAnswer }>();

  for (const message of serverMessages) {
    const questionId = message.metadata?.questionId;
    if (message.role === "user" && questionId) {
      answersByQuestionId.set(questionId, {
        text: (message.content ?? "").replace(ANSWER_PREFIX_RE, ""),
        answer: message.metadata?.answer,
      });
    }
  }

  for (const message of serverMessages) {
    const content = (message.content ?? "").replace(ANSWER_PREFIX_RE, "");

    if (message.role === "user") {
      if (content) {
        feed.push({ id: `srv_${message.id}`, role: "user", content });
      }
      continue;
    }

    const toolNotes = (message.toolResults ?? []).map(result => result.name);
    // A turn that died mid-flight leaves a row with no prose and no tools. It
    // used to render as nothing at all, so after a reload the admin saw their
    // own message answered by silence and no way to tell a broken turn from
    // one still thinking. `errored` is what keeps the failure on screen.
    const errored = Boolean(message.metadata?.errored);
    const errorText = errored
      ? (message.metadata?.errorMessage ?? en.builder.chat.streamFailed)
      : undefined;
    if (content || toolNotes.length || errored) {
      feed.push({
        id: `srv_${message.id}`,
        role: "assistant",
        content,
        ...(toolNotes.length ? { toolNotes } : {}),
        ...(errorText ? { error: errorText } : {}),
      });
    }

    for (const question of message.metadata?.questions ?? []) {
      const answered = answersByQuestionId.get(question.id);
      feed.push({
        id: `srv_${message.id}_q_${question.id}`,
        role: "assistant",
        content: "",
        question,
        ...(answered ? { answeredWith: answered.text, answeredAnswer: answered.answer } : {}),
      });
    }
  }

  return feed;
};

const scheduleFrame = (callback: () => void): number => {
  if (typeof requestAnimationFrame === "function") return requestAnimationFrame(callback);
  return window.setTimeout(callback, 16);
};

const cancelFrame = (handle: number): void => {
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(handle);
  else window.clearTimeout(handle);
};

export interface BuilderSendOptions {
  questionId?: string;
  answer?: BuilderStructuredAnswer;
}

interface UseBuilderStreamOptions {
  sessionId: string | null;
  /** The PRD panel re-renders from this mid-turn, not after it. */
  onPrdDraft?: (draft: BuilderPrdDocument, versionNumber: number) => void;
  onReadiness?: (readiness: BuilderPrdReadiness) => void;
  onDone?: (done: BuilderDoneEvent) => void;
  /**
   * Called when a turn fails because the server session is gone (SSE `error`
   * with `session_not_found` — e.g. the DB was reset). Should create a
   * replacement and resolve its id; the turn is then replayed against it once.
   * Resolve `null` if none can be created.
   */
  onSessionInvalid?: () => Promise<string | null>;
}

/**
 * Drives the Builder interview's SSE stream with the same bearer +
 * one-shot-401-refresh flow as baseApi.
 *
 * Token deltas are batched per animation frame rather than setState-per-delta:
 * at streaming speed the per-delta version re-renders the whole feed dozens of
 * times a second, and the typing visibly stutters — which reads as the agent
 * struggling rather than as a rendering artifact.
 */
export const useBuilderStream = ({
  sessionId,
  onPrdDraft,
  onReadiness,
  onDone,
  onSessionInvalid,
}: UseBuilderStreamOptions) => {
  const [messages, setMessages] = useState<BuilderChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  /** Latest question awaiting an answer — pinned by the page when it matters. */
  const [pendingQuestion, setPendingQuestion] = useState<BuilderQuestionEvent | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const pendingTokensRef = useRef<string>("");
  const frameRef = useRef<number | null>(null);
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

  const patchAssistantMessage = useCallback((id: string, patch: Partial<BuilderChatMessage>) => {
    setMessages(prev =>
      prev.map(message => (message.id === id ? { ...message, ...patch } : message)),
    );
  }, []);

  const flushTokens = useCallback(() => {
    frameRef.current = null;
    const pending = pendingTokensRef.current;
    const assistantId = currentAssistantIdRef.current;
    if (!pending || !assistantId) return;
    pendingTokensRef.current = "";
    setMessages(prev =>
      prev.map(message =>
        message.id === assistantId ? { ...message, content: message.content + pending } : message,
      ),
    );
  }, []);

  const queueToken = useCallback(
    (delta: string) => {
      pendingTokensRef.current += delta;
      if (frameRef.current === null) {
        frameRef.current = scheduleFrame(flushTokens);
      }
    },
    [flushTokens],
  );

  const appendToolNote = useCallback((assistantId: string, note: string) => {
    setMessages(prev =>
      prev.map(message =>
        message.id === assistantId
          ? { ...message, toolNotes: [...(message.toolNotes ?? []), note] }
          : message,
      ),
    );
  }, []);

  const handleEvent = useCallback(
    (event: BuilderStreamEvent) => {
      const assistantId = currentAssistantIdRef.current;
      if (!assistantId) return;

      switch (event.type) {
        case "token":
          queueToken(event.data.delta);
          break;

        case "tool_call":
          appendToolNote(assistantId, event.data.name);
          break;

        case "tool_result":
          // Tool notes are appended on the call, not the result, so a
          // long-running lookup shows as soon as it starts rather than only
          // once it finishes.
          break;

        case "prd_draft":
          flushTokens();
          onPrdDraft?.(event.data.draft, event.data.versionNumber);
          break;

        case "readiness":
          onReadiness?.(event.data);
          break;

        case "question": {
          flushTokens();
          const question = event.data;
          setPendingQuestion(question);
          setMessages(prev => [
            ...prev,
            {
              id: `${assistantId}_q_${question.id}`,
              role: "assistant",
              content: "",
              question,
            },
          ]);
          break;
        }

        case "error":
          flushTokens();
          patchAssistantMessage(assistantId, { error: event.data.message });
          break;

        case "done":
          flushTokens();
          onDone?.(event.data);
          break;

        case "ping":
        default:
          break;
      }
    },
    [
      appendToolNote,
      flushTokens,
      onDone,
      onPrdDraft,
      onReadiness,
      patchAssistantMessage,
      queueToken,
    ],
  );

  /** One 401 -> refresh -> retry, mirroring baseApi's reauth flow. */
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

      let response = await request(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN));
      if (response.status !== 401) return response;

      const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
      if (!refreshToken) return response;

      const refreshResponse = await fetch(`${API_BASE_URL}/api${ApiEndpoints.AUTH.REFRESH}`, {
        method: HttpMethod.POST,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal,
      });
      if (!refreshResponse.ok) return response;

      const tokens = (await refreshResponse.json()) as RefreshResponse;
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, tokens.accessToken);
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, tokens.refreshToken);

      response = await request(tokens.accessToken);
      return response;
    },
    [],
  );

  const runStream = useCallback(
    async (
      targetSessionId: string,
      text: string,
      options: BuilderSendOptions | undefined,
      userMsgId: string,
      assistantId: string,
    ): Promise<{ sessionLost: boolean; aborted: boolean }> => {
      const controller = new AbortController();
      abortRef.current = controller;
      let sessionLost = false;
      let aborted = false;
      let droppedFrames = 0;

      try {
        const response = await fetchStreamWithReauth(
          `${API_BASE_URL}/api${ApiEndpoints.BUILDER.SESSION_MESSAGES_STREAM(targetSessionId)}`,
          {
            message: text,
            ...(options?.questionId ? { questionId: options.questionId } : {}),
            ...(options?.answer ? { answer: options.answer } : {}),
          },
          controller.signal,
        );

        if (!response.ok || !response.body) {
          throw new Error(`Stream failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest, droppedCount } = parseSseBuffer(buffer);
          buffer = rest;
          droppedFrames += droppedCount;
          for (const event of events) {
            if (event.type === "error" && event.data.code === "session_not_found") {
              // Handled by sendMessage's replay; don't surface the raw error.
              sessionLost = true;
              continue;
            }
            handleEvent(event);
          }
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          aborted = true;
          patchAssistantMessage(assistantId, { interrupted: true });
        } else {
          logger.error(
            `[Builder Stream] failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          patchAssistantMessage(assistantId, {
            error: en.builder.chat.streamFailed,
          });
        }
      } finally {
        flushTokens();
        abortRef.current = null;
        if (isMountedRef.current) {
          patchAssistantMessage(assistantId, { isStreaming: false });
          setIsStreaming(false);
        }
        if (droppedFrames > 0) {
          toast.warning(en.builder.chat.droppedFrames(droppedFrames));
        }
      }

      return { sessionLost, aborted };
    },
    [fetchStreamWithReauth, flushTokens, handleEvent, patchAssistantMessage],
  );

  const sendMessage = useCallback(
    async (text: string, options?: BuilderSendOptions) => {
      if (!sessionId || isStreaming) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      // Answering clears the pending card before the request goes out, so a
      // re-render mid-flight can't resurrect an answered question.
      if (options?.questionId) setPendingQuestion(null);

      const userMsgId = nextMessageId();
      const assistantId = nextMessageId();
      currentAssistantIdRef.current = assistantId;
      pendingTokensRef.current = "";

      setMessages(prev => [
        ...prev,
        { id: userMsgId, role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ]);
      setIsStreaming(true);

      const first = await runStream(sessionId, trimmed, options, userMsgId, assistantId);
      if (!first.sessionLost || !onSessionInvalid) return;

      // The server session vanished. Create a replacement and replay exactly
      // once — a loop here would hammer the API if creation also fails.
      const replacementId = await onSessionInvalid();
      if (!replacementId) return;

      setIsStreaming(true);
      patchAssistantMessage(assistantId, { isStreaming: true, error: undefined });
      await runStream(replacementId, trimmed, options, userMsgId, assistantId);
    },
    [isStreaming, onSessionInvalid, patchAssistantMessage, runStream, sessionId],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const hydrateMessages = useCallback((serverMessages: BuilderServerMessage[]) => {
    setMessages(mapServerMessagesToFeed(serverMessages));
    setPendingQuestion(null);
  }, []);

  return {
    messages,
    isStreaming,
    pendingQuestion,
    sendMessage,
    stop,
    hydrateMessages,
  };
};
