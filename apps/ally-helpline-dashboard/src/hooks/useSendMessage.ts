import { useCallback } from "react";

import { useSelector } from "react-redux";

import { logger } from "@ally-ui-mono/ui-shared";
import { ApiEndpoints, LOCAL_STORAGE_KEYS } from "@constants";
import {
  addMessage,
  appendStreamingChunk,
  clearError,
  commitStreamingMessage,
  finishStreaming,
  clearStreamSession,
  setError,
  startStreaming,
  setStreamingCitations,
  replaceStreamingContent,
} from "@reducer";
import { RootState, store } from "@store";
import { ChatMessagePayload, Citation } from "@types";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/* ── Cross-tab streaming mirror via BroadcastChannel ── */
type StreamBroadcast =
  | { type: "add_message"; sessionId: string; message: ChatMessagePayload }
  | { type: "clear_error"; sessionId: string }
  | { type: "start_streaming"; sessionId: string }
  | { type: "chunk"; sessionId: string; text: string }
  | { type: "citations"; sessionId: string; citations: Citation[] }
  | { type: "done"; sessionId: string; content: string; citations: Citation[] }
  | { type: "commit"; sessionId: string; message: ChatMessagePayload }
  | { type: "finish"; sessionId: string }
  | { type: "error"; sessionId: string; failedMessage: string };

const streamChannel = new BroadcastChannel("chat_stream_sync");

const broadcast = (msg: StreamBroadcast) => {
  try {
    streamChannel.postMessage(msg);
  } catch {
    logger.info("Broadcast channel closed");
  }
};

streamChannel.addEventListener("message", (e: MessageEvent<StreamBroadcast>) => {
  const { dispatch } = store;
  const msg = e.data;
  switch (msg.type) {
    case "add_message":
      dispatch(addMessage({ sessionId: msg.sessionId, message: msg.message }));
      break;
    case "clear_error":
      dispatch(clearError({ sessionId: msg.sessionId }));
      break;
    case "start_streaming":
      dispatch(startStreaming({ sessionId: msg.sessionId }));
      break;
    case "chunk":
      dispatch(appendStreamingChunk({ sessionId: msg.sessionId, text: msg.text }));
      break;
    case "citations":
      dispatch(setStreamingCitations({ sessionId: msg.sessionId, citations: msg.citations }));
      break;
    case "done":
      dispatch(
        replaceStreamingContent({
          sessionId: msg.sessionId,
          content: msg.content,
          citations: msg.citations,
        }),
      );
      break;
    case "commit":
      dispatch(commitStreamingMessage({ sessionId: msg.sessionId, message: msg.message }));
      break;
    case "finish":
      dispatch(finishStreaming({ sessionId: msg.sessionId }));
      dispatch(clearStreamSession(msg.sessionId));
      break;
    case "error":
      dispatch(finishStreaming({ sessionId: msg.sessionId }));
      dispatch(setError({ sessionId: msg.sessionId, message: msg.failedMessage }));
      break;
  }
});

type ParsedSSE =
  | { type: "start" }
  | { type: "token"; text: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "done"; content: string; citations: Citation[] };

const parseSSEData = (raw: string): ParsedSSE => {
  try {
    const parsed = JSON.parse(raw);

    if (parsed.type === "start") {
      return { type: "start" };
    }

    if (parsed.type === "token") {
      return {
        type: "token",
        text: parsed.content != null ? String(parsed.content) : "",
      };
    }

    if (parsed.type === "citations") {
      return {
        type: "citations",
        citations: parsed.citations ?? [],
      };
    }

    if (parsed.type === "done") {
      return {
        type: "done",
        content: parsed.content ?? "",
        citations: parsed.citations ?? [],
      };
    }

    return { type: "token", text: "" };
  } catch {
    return { type: "token", text: raw };
  }
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE}/api${ApiEndpoints.AUTH.REFRESH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
    localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
};

const fetchWithAuth = async (url: string, body: string): Promise<Response> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  const makeRequest = (token: string | null) =>
    fetch(url, {
      method: "POST",
      headers: { ...headers, Authorization: `Bearer ${token}` },
      body,
    });

  const accessToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
  const result = await makeRequest(accessToken);

  if (result.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    return makeRequest(newToken);
  }

  return result;
};

const handleSSEEvent = (sessionId: string, parsed: ParsedSSE) => {
  const { dispatch } = store;

  switch (parsed.type) {
    case "start":
      break;

    case "token":
      if (parsed.text) {
        dispatch(appendStreamingChunk({ sessionId, text: parsed.text }));
        broadcast({ type: "chunk", sessionId, text: parsed.text });
      }
      break;

    case "citations":
      dispatch(setStreamingCitations({ sessionId, citations: parsed.citations }));
      broadcast({ type: "citations", sessionId, citations: parsed.citations });
      break;

    case "done":
      dispatch(
        replaceStreamingContent({
          sessionId,
          content: parsed.content,
          citations: parsed.citations,
        }),
      );
      broadcast({
        type: "done",
        sessionId,
        content: parsed.content,
        citations: parsed.citations,
      });
      commitAndFinish(sessionId);
      break;
  }
};

/**
 * Module-level streaming function — runs independently of React lifecycle.
 * Dispatches directly to the Redux store so an in-flight stream keeps
 * updating its session even after the originating component unmounts.
 *
 * Every dispatch is also broadcast to other tabs via BroadcastChannel so
 * they mirror the streaming message in real-time. The broadcast also keeps
 * isStreaming in sync across tabs, preventing duplicate streams.
 */
const processStream = async (sessionId: string, message: string, isRetry: boolean) => {
  const { dispatch, getState } = store;

  const streamSession = getState().chatStream.sessions[sessionId];
  if (streamSession?.isStreaming) return;

  if (!isRetry) {
    const userMsg: ChatMessagePayload = { role: "user", content: message };
    dispatch(addMessage({ sessionId, message: userMsg }));
    broadcast({ type: "add_message", sessionId, message: userMsg });
  } else {
    dispatch(clearError({ sessionId }));
    broadcast({ type: "clear_error", sessionId });
  }

  dispatch(startStreaming({ sessionId }));
  broadcast({ type: "start_streaming", sessionId });

  try {
    const url = `${API_BASE}/api${ApiEndpoints.LEARN.CHAT_STREAM(sessionId)}`;
    const result = await fetchWithAuth(url, JSON.stringify({ message }));

    if (!result.ok || !result.body) {
      dispatch(finishStreaming({ sessionId }));
      dispatch(setError({ sessionId, message }));
      broadcast({ type: "error", sessionId, failedMessage: message });
      return;
    }

    const reader = result.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedDone = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        for (const line of event.split("\n")) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            const parsed = parseSSEData(raw);
            handleSSEEvent(sessionId, parsed);
            if (parsed.type === "done") {
              receivedDone = true;
            }
          }
        }
      }

      if (receivedDone) return;
    }

    if (buffer.trim()) {
      for (const line of buffer.split("\n")) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6);
          const parsed = parseSSEData(raw);
          handleSSEEvent(sessionId, parsed);
          if (parsed.type === "done") {
            receivedDone = true;
          }
        }
      }
    }

    if (!receivedDone) {
      commitAndFinish(sessionId);
    }
  } catch {
    dispatch(finishStreaming({ sessionId }));
    dispatch(setError({ sessionId, message }));
    broadcast({ type: "error", sessionId, failedMessage: message });
  }
};

const commitAndFinish = (sessionId: string) => {
  const { dispatch, getState } = store;
  const session = getState().chatStream.sessions[sessionId];
  if (session?.streamingMessage) {
    dispatch(commitStreamingMessage({ sessionId, message: session.streamingMessage }));
    broadcast({ type: "commit", sessionId, message: session.streamingMessage });
  }
  dispatch(finishStreaming({ sessionId }));
  dispatch(clearStreamSession(sessionId));
  broadcast({ type: "finish", sessionId });
};

export const useSendMessage = (sessionId: string) => {
  const historySession = useSelector((state: RootState) => state.chatHistory.sessions[sessionId]);
  const streamSession = useSelector((state: RootState) => state.chatStream.sessions[sessionId]);

  const messages: ChatMessagePayload[] = historySession?.messages ?? [];
  const streamingMessage: ChatMessagePayload | null = streamSession?.streamingMessage ?? null;
  const isStreaming = streamSession?.isStreaming ?? false;
  const error = historySession?.error ?? false;

  const sendMessage = useCallback(
    (message: string) => {
      processStream(sessionId, message, false);
    },
    [sessionId],
  );

  const retryLastMessage = useCallback(() => {
    const lastFailed = historySession?.lastFailedMessage;
    if (!lastFailed) return;
    processStream(sessionId, lastFailed, true);
  }, [sessionId, historySession?.lastFailedMessage]);

  return { messages, streamingMessage, isStreaming, error, sendMessage, retryLastMessage };
};
