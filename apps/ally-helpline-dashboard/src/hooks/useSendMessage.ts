import { useCallback } from "react";

import { useSelector } from "react-redux";

import { ApiEndpoints, LOCAL_STORAGE_KEYS } from "@constants";
import { addMessage, appendToLastMessage, clearError, setError, setStreaming } from "@reducer";
import { ChatMessage } from "@reducer/chatReducer";
import { RootState, store } from "@store";

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
  const { dispatch } = store;

  if (!isRetry) {
    dispatch(addMessage({ sessionId, message: { role: "user", content: message } }));
  } else {
    dispatch(clearError({ sessionId }));
  }

  dispatch(addMessage({ sessionId, message: { role: "assistant", content: "" } }));
  dispatch(setStreaming({ sessionId, isStreaming: true }));

  try {
    const url = `${API_BASE}/api${ApiEndpoints.LEARN.CHAT_STREAM(sessionId)}`;
    const result = await fetchWithAuth(url, JSON.stringify({ message }));

    if (!result.ok || !result.body) {
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
            if (raw === "[done]") return;
            const text = extractTextFromSSEData(raw);
            if (text) dispatch(appendToLastMessage({ sessionId, text }));
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
            if (text) dispatch(appendToLastMessage({ sessionId, text }));
          }
        }
      }
    }
  } catch {
    dispatch(setError({ sessionId, message }));
  } finally {
    dispatch(setStreaming({ sessionId, isStreaming: false }));
  }
};

export const useSendMessage = (sessionId: string) => {
  const session = useSelector((state: RootState) => state.chat.sessions[sessionId]);
  const messages: ChatMessage[] = session?.messages ?? [];
  const isStreaming = session?.isStreaming ?? false;
  const error = session?.error ?? false;

  const sendMessage = useCallback(
    (message: string) => {
      processStream(sessionId, message, false);
    },
    [sessionId],
  );

  const retryLastMessage = useCallback(() => {
    const lastFailed = session?.lastFailedMessage;
    if (!lastFailed) return;
    processStream(sessionId, lastFailed, true);
  }, [sessionId, session?.lastFailedMessage]);

  return { messages, isStreaming, error, sendMessage, retryLastMessage };
};
