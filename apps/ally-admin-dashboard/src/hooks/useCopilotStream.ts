import { useCallback, useEffect, useRef, useState } from "react";

import { useDispatch } from "react-redux";
import { toast } from "sonner";

import { ApiEndpoints, en, HttpMethod, LOCAL_STORAGE_KEYS } from "@constants";
import { applySpecPatches, setStreaming } from "@reducer";
import {
  CopilotBehaviourReviewEvent,
  CopilotChatMessage,
  CopilotDoneEvent,
  CopilotImprovementReadyPayload,
  CopilotImprovementUpdatePayload,
  CopilotQuestionEvent,
  CopilotSpecPatchEvent,
  CopilotStreamEvent,
  CopilotStructuredAnswer,
  RoleplayCopilotServerMessage,
} from "@src/types/roleplayStudio";
import { RefreshResponse } from "@types";
import { logger } from "@utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let messageIdCounter = 0;
const nextMessageId = () => `msg_${Date.now().toString(36)}_${++messageIdCounter}`;

/**
 * Parses SSE frames out of `buffer`. Returns the parsed events plus the
 * unconsumed remainder (a partial frame that is still streaming in).
 * Exported for unit tests.
 */
export const parseSseBuffer = (buffer: string): { events: CopilotStreamEvent[]; rest: string } => {
  const events: CopilotStreamEvent[] = [];
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
      events.push({ type: eventName, data } as CopilotStreamEvent);
    } catch {
      logger.warn(`[Copilot Stream] Dropping malformed SSE frame for event "${eventName}"`);
    }
  }

  return { events, rest };
};

const ANSWER_PREFIX_RE = /^\[answers question [^\]]+\]\s*/i;

/**
 * Rebuilds the full chat feed from persisted copilot_messages rows — the
 * resume path. Reconstructs question cards (marked answered via later user
 * rows' metadata.questionId), test-case suggestion cards (marked accepted via
 * test_cases_accepted marker rows), loop progress/ready cards, and tool notes.
 * Pure; exported for unit tests.
 */
export const mapServerMessagesToFeed = (
  rows: RoleplayCopilotServerMessage[],
): CopilotChatMessage[] => {
  const answeredQuestions = new Map<string, string>();
  const answeredAnswers = new Map<string, CopilotStructuredAnswer>();
  const acceptedSuggestionIds = new Set<string>();
  for (const row of rows) {
    if (row.role !== "user") continue;
    const questionId = row.metadata?.questionId;
    if (questionId) {
      answeredQuestions.set(String(questionId), (row.content ?? "").replace(ANSWER_PREFIX_RE, ""));
      if (row.metadata?.answer) {
        answeredAnswers.set(String(questionId), row.metadata.answer);
      }
    }
    if (row.metadata?.kind === "test_cases_accepted") {
      for (const suggestionId of row.metadata.suggestionIds ?? []) {
        acceptedSuggestionIds.add(String(suggestionId));
      }
    }
  }

  const feed: CopilotChatMessage[] = [];
  rows.forEach((row, index) => {
    const baseId = row.id ?? `srv_${row.seq ?? index}`;
    const metadata = row.metadata ?? {};
    const content = row.content ?? "";

    if (row.role === "user") {
      if (metadata.kind === "test_cases_accepted") {
        feed.push({ id: baseId, role: "user", content, systemNote: true });
        return;
      }
      feed.push({
        id: baseId,
        role: "user",
        content: content.replace(ANSWER_PREFIX_RE, ""),
      });
      return;
    }

    // Assistant rows: loop narration rows are dedicated cards.
    if (metadata.kind === "improvement_update") {
      feed.push({
        id: baseId,
        role: "assistant",
        content,
        improvementUpdate: metadata as unknown as CopilotImprovementUpdatePayload,
      });
      return;
    }
    if (metadata.kind === "improvement_ready") {
      feed.push({
        id: baseId,
        role: "assistant",
        content,
        improvementReady: metadata as unknown as CopilotImprovementReadyPayload,
      });
      return;
    }

    // Ordinary turn row: text bubble (+ tool notes), then its structured cards.
    const toolNotes = (row.toolResults ?? [])
      .map(result => {
        const summary = (result as { result?: { summary?: string } })?.result?.summary;
        return result?.name && typeof summary === "string" ? `${result.name}: ${summary}` : null;
      })
      .filter((note): note is string => Boolean(note));
    if (content || toolNotes.length > 0) {
      feed.push({
        id: baseId,
        role: "assistant",
        content,
        ...(toolNotes.length > 0 ? { toolNotes } : {}),
      });
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
    for (const review of metadata.behaviourReviews ?? []) {
      feed.push({
        id: `${baseId}_bhv_${review.id}`,
        role: "assistant",
        content: review.prompt,
        behaviourReview: review,
        answeredAnswer: answeredAnswers.get(review.id),
      });
    }
    const suggestions = metadata.testCaseSuggestions ?? [];
    if (suggestions.length > 0) {
      feed.push({
        id: `${baseId}_suggestions`,
        role: "assistant",
        content: "",
        testCaseSuggestions: suggestions,
        acceptedSuggestionIds: suggestions
          .map(suggestion => suggestion.id)
          .filter(id => acceptedSuggestionIds.has(id)),
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

interface UseCopilotStreamOptions {
  sessionId: string | null;
  onDone?: (done: CopilotDoneEvent) => void;
  /**
   * Called when a turn fails because the server session no longer exists (SSE
   * `error` with code `session_not_found` — e.g. the DB was reset). Should
   * create a fresh session (updating Redux + localStorage) and resolve with its
   * id; the turn is then transparently replayed against it. Resolve `null` if a
   * replacement can't be created.
   */
  onSessionInvalid?: () => Promise<string | null>;
}

/**
 * Drives the copilot's SSE stream (POST .../messages/stream) with the same
 * bearer + one-shot 401-refresh-retry flow as baseApi. Token deltas are
 * batched per animation frame; `spec_patch` frames dispatch straight into the
 * roleplaySpec slice (they're already persisted server-side, so autosave is
 * paused via `setStreaming` for the stream's duration).
 */
export const useCopilotStream = ({
  sessionId,
  onDone,
  onSessionInvalid,
}: UseCopilotStreamOptions) => {
  const dispatch = useDispatch();
  const [messages, setMessages] = useState<CopilotChatMessage[]>([]);
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
      dispatch(setStreaming(false));
    };
  }, [dispatch]);

  const patchAssistantMessage = useCallback(
    (
      id: string,
      patch: Partial<CopilotChatMessage> | ((m: CopilotChatMessage) => CopilotChatMessage),
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
    (event: CopilotStreamEvent) => {
      switch (event.type) {
        case "token":
          queueToken(event.data.delta ?? "");
          break;
        case "tool_call":
          flushTokens();
          appendToolNote(`${en.roleplayStudio.copilot.toolRunning}: ${event.data.name}`);
          break;
        case "tool_result":
          flushTokens();
          appendToolNote(`${event.data.name}: ${event.data.summary}`);
          break;
        case "spec_patch":
          flushTokens();
          dispatch(applySpecPatches(event.data as CopilotSpecPatchEvent));
          break;
        case "question": {
          flushTokens();
          const question = event.data as CopilotQuestionEvent;
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
        case "behaviour_review": {
          flushTokens();
          const review = event.data as CopilotBehaviourReviewEvent;
          setMessages(prev => [
            ...prev,
            {
              id: nextMessageId(),
              role: "assistant",
              content: review.prompt,
              behaviourReview: review,
            },
          ]);
          break;
        }
        case "test_case_suggestions": {
          flushTokens();
          const suggestions = event.data.suggestions ?? [];
          if (suggestions.length === 0) break;
          const id = currentAssistantIdRef.current;
          if (id) {
            patchAssistantMessage(id, message => ({
              ...message,
              testCaseSuggestions: [...(message.testCaseSuggestions ?? []), ...suggestions],
            }));
          } else {
            setMessages(prev => [
              ...prev,
              {
                id: nextMessageId(),
                role: "assistant",
                content: "",
                testCaseSuggestions: suggestions,
              },
            ]);
          }
          break;
        }
        case "error": {
          flushTokens();
          const id = currentAssistantIdRef.current;
          if (id) patchAssistantMessage(id, { error: event.data.message, streaming: false });
          toast.error(event.data.message || en.roleplayStudio.copilot.streamFailed);
          break;
        }
        case "done":
          flushTokens();
          onDone?.(event.data as CopilotDoneEvent);
          break;
        default:
          break;
      }
    },
    [appendToolNote, dispatch, flushTokens, onDone, patchAssistantMessage, queueToken],
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

  /**
   * Streams one turn against `activeSessionId`, appending a user + assistant
   * bubble. A `session_not_found` error frame is NOT surfaced to the user here
   * (no toast, no error on the bubble) — it's reported back via the return so
   * the caller can recover; every other failure is rendered inline as before.
   */
  const runStream = useCallback(
    async (
      text: string,
      activeSessionId: string,
      questionId?: string,
      answer?: CopilotStructuredAnswer,
    ): Promise<{
      userMsgId: string;
      assistantId: string;
      sessionLost: boolean;
      aborted: boolean;
    }> => {
      const userMsgId = nextMessageId();
      const assistantId = nextMessageId();
      currentAssistantIdRef.current = assistantId;
      setMessages(prev => [
        ...prev,
        { id: userMsgId, role: "user", content: text },
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      dispatch(setStreaming(true));

      let sessionLost = false;

      try {
        const url = `${API_BASE_URL}/api${ApiEndpoints.ROLEPLAY_STUDIO.COPILOT_SESSION_STREAM(activeSessionId)}`;
        const response = await fetchStreamWithReauth(
          url,
          {
            message: text,
            ...(questionId ? { questionId } : {}),
            ...(answer ? { answer } : {}),
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
          patchAssistantMessage(assistantId, {
            streaming: false,
            interrupted: true,
          });
        } else if (!sessionLost) {
          logger.error(`[Copilot Stream] ${error}`);
          patchAssistantMessage(assistantId, {
            streaming: false,
            error: en.roleplayStudio.copilot.streamFailed,
          });
          toast.error(en.roleplayStudio.copilot.streamFailed);
        }
      } finally {
        abortRef.current = null;
        currentAssistantIdRef.current = null;
        if (isMountedRef.current) setIsStreaming(false);
        dispatch(setStreaming(false));
      }

      return { userMsgId, assistantId, sessionLost, aborted: controller.signal.aborted };
    },
    [dispatch, fetchStreamWithReauth, flushTokens, handleEvent, patchAssistantMessage],
  );

  const sendMessage = useCallback(
    async (text: string, opts?: { questionId?: string; answer?: CopilotStructuredAnswer }) => {
      const trimmed = text.trim();
      if (!trimmed || !sessionId || abortRef.current) return;

      const first = await runStream(trimmed, sessionId, opts?.questionId, opts?.answer);
      if (!first.sessionLost || first.aborted) return;

      // The server session is gone (e.g. a local DB reset dropped it). Re-create
      // one and replay the turn once so the trainer never sees the raw error.
      setMessages(prev => prev.filter(m => m.id !== first.userMsgId && m.id !== first.assistantId));
      const freshId = onSessionInvalid ? await onSessionInvalid() : null;
      if (!freshId) {
        toast.error(en.roleplayStudio.copilot.streamFailed);
        return;
      }
      const retry = await runStream(trimmed, freshId, opts?.questionId, opts?.answer);
      // The fresh session vanished too (or a code bug) — surface it rather than
      // looping. One recovery attempt is the ceiling.
      if (retry.sessionLost && !retry.aborted) {
        patchAssistantMessage(retry.assistantId, {
          streaming: false,
          error: en.roleplayStudio.copilot.streamFailed,
        });
        toast.error(en.roleplayStudio.copilot.streamFailed);
      }
    },
    [onSessionInvalid, patchAssistantMessage, runStream, sessionId],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** Seeds the feed from a resumed session (GET .../copilot/sessions/:id). */
  const hydrateMessages = useCallback((serverMessages: RoleplayCopilotServerMessage[]) => {
    setMessages(mapServerMessagesToFeed(serverMessages));
  }, []);

  /**
   * Full-replace refresh from the server transcript — used when the
   * improvement loop appends narration rows out-of-band. Skipped while a
   * stream is in flight (the post-`done` refetch picks the rows up instead).
   */
  const replaceFeed = useCallback((serverMessages: RoleplayCopilotServerMessage[]) => {
    if (abortRef.current) return;
    setMessages(mapServerMessagesToFeed(serverMessages));
  }, []);

  return { messages, isStreaming, sendMessage, stop, hydrateMessages, replaceFeed };
};
