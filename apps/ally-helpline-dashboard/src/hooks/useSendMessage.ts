import { useCallback } from "react";

import { useSelector } from "react-redux";

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
} from "@reducer";
import { RootState, store } from "@store";
import { ChatMessagePayload } from "@types";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const extractTextFromSSEData = (raw: string): string => {
  try {
    const parsed = JSON.parse(raw);
    return parsed.content ?? "";
  } catch {
    return raw;
  }
};

const getAccessToken = () => localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);

const refreshTokens = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) return null;
  const res = await fetch(`${API_BASE}/api${ApiEndpoints.AUTH.REFRESH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
  localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
  return data.accessToken;
};

const streamFetch = (url: string, body: string, token: string | null) =>
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

const fetchWithAuth = async (url: string, body: string): Promise<Response> => {
  const result = await streamFetch(url, body, getAccessToken());
  if (result.status !== 401) return result;

  const newToken = await refreshTokens();
  if (!newToken) return result;
  return streamFetch(url, body, newToken);
};

/**
 * Module-level streaming function — runs independently of React lifecycle.
 * Dispatches directly to the Redux store so an in-flight stream keeps
 * updating its session even after the originating component unmounts.
 */
const processStream = async (sessionId: string, message: string, isRetry: boolean) => {
  const { dispatch, getState } = store;

  if (!isRetry) {
    dispatch(addMessage({ sessionId, message: { role: "user", content: message } }));
  } else {
    dispatch(clearError({ sessionId }));
  }

  dispatch(startStreaming({ sessionId }));

  try {
    const url = `${API_BASE}/api${ApiEndpoints.LEARN.CHAT_STREAM(sessionId)}`;
    const result = await fetchWithAuth(url, JSON.stringify({ message }));

    if (!result.ok || !result.body) {
      dispatch(finishStreaming({ sessionId }));
      dispatch(setError({ sessionId, message }));
      return;
    }

    const reader = result.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

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
            if (raw === "[done]") {
              commitAndFinish(sessionId, getState);
              return;
            }
            const text = extractTextFromSSEData(raw);
            if (text) dispatch(appendStreamingChunk({ sessionId, text }));
          }
        }
      }
    }

    if (buffer.trim()) {
      for (const line of buffer.split("\n")) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6);
          if (raw !== "[DONE]") {
            const text = extractTextFromSSEData(raw);
            if (text) dispatch(appendStreamingChunk({ sessionId, text }));
          }
        }
      }
    }

    commitAndFinish(sessionId, getState);
  } catch {
    dispatch(finishStreaming({ sessionId }));
    dispatch(setError({ sessionId, message }));
  }
};

/** Move the completed streaming message into the history slice and clear the stream. */
const commitAndFinish = (sessionId: string, getState: () => RootState) => {
  const { dispatch } = store;
  const streamSession = getState().chatStream.sessions[sessionId];
  if (streamSession?.streamingMessage) {
    dispatch(commitStreamingMessage({ sessionId, message: streamSession.streamingMessage }));
  }
  dispatch(finishStreaming({ sessionId }));
  dispatch(clearStreamSession(sessionId));
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
