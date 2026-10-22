import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { ApiEndpoints, en, HttpMethod, LOCAL_STORAGE_KEYS } from "@constants";
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
import { logger } from "@utils";

import { normalizeAgentReceipt } from "../utils/agentReceipt";
import { userTurnText } from "../utils/userTurnText";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let messageIdCounter = 0;
/** Collision-proof client message id: Date.now() collides under fast sends. */
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

/** The newest question card in the feed for `questionId` — the one an answer to it is for. */
const latestCardFor = (
  messages: CharacterInterviewChatMessage[],
  questionId: string,
): CharacterInterviewChatMessage | undefined => {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].question?.id === questionId) return messages[index];
  }
  return undefined;
};

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
  /** Questions that will be drawn as their own card in this feed. */
  const renderedQuestionIds = new Set<string>();
  for (const row of rows) {
    const questions = row.metadata?.questions;
    if (Array.isArray(questions)) {
      for (const question of questions) renderedQuestionIds.add(question.id);
    }
    if (row.role !== "user") continue;
    const questionId = row.metadata?.questionId;
    if (questionId) {
      answeredQuestions.set(String(questionId), userTurnText(row.content));
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
      // An answer is drawn once, on the card it answers — as the live feed
      // draws it. Only when that card is actually in this feed: an answer whose
      // question isn't here has nothing else to show it, and dropping it would
      // lose what the admin said.
      const questionId = metadata.questionId;
      if (questionId && renderedQuestionIds.has(String(questionId))) return;
      feed.push({
        id: baseId,
        role: "user",
        content: userTurnText(content),
      });
      return;
    }

    // A turn that died mid-flight leaves a row with no prose at all. It used to
    // render as nothing, so after a reload the admin saw their own message
    // answered by silence — indistinguishable from the agent still thinking.
    const errored = Boolean(metadata.errored);
    const errorText = errored
      ? (metadata.errorMessage ?? en.characterInterview.streamFailed)
      : undefined;
    const receipt = normalizeAgentReceipt(metadata.receipt);
    if (content || errored || receipt) {
      feed.push({
        id: baseId,
        role: "assistant",
        content,
        ...(errorText ? { error: errorText } : {}),
        ...(receipt ? { receipt } : {}),
      });
    }
    for (const question of Array.isArray(metadata.questions) ? metadata.questions : []) {
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
 * same bearer + one-shot 401-refresh-retry flow as baseApi. Token deltas are
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
      const strings = en.characterInterview;
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
        case "receipt": {
          // What the turn did, built by the server; it replaces the notes the turn showed while
          // it ran, as a reload of the row would.
          flushTokens();
          const receipt = normalizeAgentReceipt(event.data);
          const id = currentAssistantIdRef.current;
          if (receipt && id) patchAssistantMessage(id, { receipt, toolNotes: undefined });
          break;
        }
        case "error": {
          flushTokens();
          const id = currentAssistantIdRef.current;
          if (id)
            patchAssistantMessage(id, {
              error: event.data.message || en.characterInterview.streamFailed,
              isStreaming: false,
            });
          toast.error(event.data.message || strings.streamFailed);
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
   * Streams one turn against `activeSessionId`, appending an assistant bubble
   * and either the admin's bubble or — for an answer — the answer on its card.
   * A `session_not_found` error frame is NOT surfaced here — it's reported back
   * via the return so the caller can recover.
   */
  const runStream = useCallback(
    async (
      text: string,
      activeSessionId: string,
      opts?: CharacterInterviewSendOptions,
      /** Bootstrap turn: the kickoff message isn't shown as an admin bubble. */
      hideUserBubble = false,
    ): Promise<{
      userMsgId: string | null;
      assistantId: string;
      /** The question this turn answered, if it answered one. */
      questionId: string | null;
      sessionLost: boolean;
      /** The server refused the turn outright — nothing of it was recorded. */
      refused: boolean;
      aborted: boolean;
    }> => {
      const userMsgId = hideUserBubble ? null : nextMessageId();
      const assistantId = nextMessageId();
      currentAssistantIdRef.current = assistantId;
      // An answer belongs on the card it answers, and the card is already in
      // the feed — so mark it rather than appending a bubble that says the same
      // thing underneath it, which reads like a click that fired twice (Builder
      // and Course Copilot draw an answer once for the same reason). Marking the
      // card is also what lets the voice shortlist strip show the chosen voice
      // without a reload. Ids are minted outside the updater, which React may
      // run twice.
      setMessages(prev => {
        const assistant: CharacterInterviewChatMessage = {
          id: assistantId,
          role: "assistant",
          content: "",
          isStreaming: true,
        };
        const card = opts?.questionId ? latestCardFor(prev, opts.questionId) : undefined;
        if (card) {
          return [
            ...prev.map(message =>
              message.id === card.id
                ? { ...message, answeredWith: text, answeredAnswer: opts?.answer }
                : message,
            ),
            assistant,
          ];
        }
        if (!userMsgId) return [...prev, assistant];
        return [...prev, { id: userMsgId, role: "user" as const, content: text }, assistant];
      });

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      let sessionLost = false;
      let refused = false;

      try {
        const url = `${API_BASE_URL}/api${ApiEndpoints.CHARACTERS.INTERVIEW_SESSION_STREAM(activeSessionId)}`;
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
            // The session's turn mutex was still held, so the server never
            // read this message: no transcript row, no reply coming. It is a
            // refusal, not a failed turn — sendMessage rolls the bubbles back
            // so the answer can simply be given again.
            if (event.type === "error" && event.data.code === "turn_in_progress") {
              refused = true;
              continue;
            }
            handleEvent(event);
          }
        }
        flushTokens();
        patchAssistantMessage(assistantId, { isStreaming: false });
      } catch (error) {
        flushTokens();
        if (controller.signal.aborted) {
          // Keep the partial text, marked interrupted.
          patchAssistantMessage(assistantId, { isStreaming: false, interrupted: true });
        } else if (!sessionLost && !refused) {
          logger.error(`[Character Interview] ${error}`);
          patchAssistantMessage(assistantId, {
            isStreaming: false,
            error: en.characterInterview.streamFailed,
          });
          toast.error(en.characterInterview.streamFailed);
        }
      } finally {
        abortRef.current = null;
        currentAssistantIdRef.current = null;
        if (isMountedRef.current) setIsStreaming(false);
      }

      return {
        userMsgId,
        assistantId,
        questionId: opts?.questionId ?? null,
        sessionLost,
        refused,
        aborted: controller.signal.aborted,
      };
    },
    [fetchStreamWithReauth, flushTokens, handleEvent, patchAssistantMessage],
  );

  /**
   * Takes a turn's bubbles back out, and unmarks the card it answered.
   *
   * The card is found again here, by question, rather than remembered from
   * `runStream`: the update that marked it runs when React renders, which can
   * be after a refusal has already come back — a card id captured inside it
   * would still be empty, and the card would stay locked on an answer nobody
   * received. Updates run in order, so this one always sees the card marked.
   */
  const rollBackTurn = useCallback(
    (turn: { userMsgId: string | null; assistantId: string; questionId: string | null }) => {
      setMessages(prev => {
        const card = turn.questionId ? latestCardFor(prev, turn.questionId) : undefined;
        return prev
          .filter(message => message.id !== turn.userMsgId && message.id !== turn.assistantId)
          .map(message =>
            message === card
              ? { ...message, answeredWith: undefined, answeredAnswer: undefined }
              : message,
          );
      });
    },
    [],
  );

  /**
   * Sends one turn. Resolves `false` when the turn was refused and nothing was
   * recorded — the caller can offer the same answer again as if it had never
   * been given (a question card unlocks itself on that).
   */
  const sendMessage = useCallback(
    async (
      text: string,
      opts?: CharacterInterviewSendOptions,
      hideUserBubble = false,
    ): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || !sessionId || abortRef.current) return false;

      const first = await runStream(trimmed, sessionId, opts, hideUserBubble);
      if (first.refused) {
        // Nothing of this turn exists server-side, so leaving the bubbles up
        // (or the card marked) would show an answer the interview never
        // received. Take them back out and say what to do.
        rollBackTurn(first);
        toast.error(en.characterInterview.turnInProgress);
        return false;
      }
      // Anything else reached the server and is in the transcript — including
      // a turn the admin stopped half-way, which is why Stop doesn't unlock
      // the card either.
      if (!first.sessionLost || first.aborted) return true;

      // The server session is gone (e.g. a local DB reset dropped it).
      // Re-create one and replay the turn once so the admin never sees the
      // raw error. One recovery attempt is the ceiling.
      rollBackTurn(first);
      const freshId = onSessionInvalid ? await onSessionInvalid() : null;
      if (!freshId) {
        toast.error(en.characterInterview.streamFailed);
        return false;
      }
      const retry = await runStream(trimmed, freshId, opts, hideUserBubble);
      if (retry.refused) {
        rollBackTurn(retry);
        toast.error(en.characterInterview.turnInProgress);
        return false;
      }
      if (retry.sessionLost && !retry.aborted) {
        patchAssistantMessage(retry.assistantId, {
          isStreaming: false,
          error: en.characterInterview.streamFailed,
        });
        toast.error(en.characterInterview.streamFailed);
        return false;
      }
      return true;
    },
    [onSessionInvalid, patchAssistantMessage, rollBackTurn, runStream, sessionId],
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
