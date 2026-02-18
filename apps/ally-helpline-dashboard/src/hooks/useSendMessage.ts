import { useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";

import { ApiEndpoints } from "@constants";
import { addMessage, appendToLastMessage, setStreaming } from "@reducer";
import { ChatMessage } from "@reducer/chatReducer";
import { RootState } from "@store";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;

const extractTextFromSSEData = (raw: string): string => {
  try {
    const parsed = JSON.parse(raw);
    return parsed.content ?? raw;
  } catch {
    return raw;
  }
};

export const useSendMessage = (sessionId: string) => {
  const dispatch = useDispatch();
  const session = useSelector((state: RootState) => state.chat.sessions[sessionId]);
  const messages: ChatMessage[] = session?.messages ?? [];
  const isStreaming = session?.isStreaming ?? false;

  const sendMessage = useCallback(
    async (message: string) => {
      dispatch(addMessage({ sessionId, message: { role: "user", content: message } }));
      dispatch(addMessage({ sessionId, message: { role: "assistant", content: "" } }));
      dispatch(setStreaming({ sessionId, isStreaming: true }));

      try {
        const url = `${API_BASE}${ApiEndpoints.LEARN.CHAT_STREAM(sessionId)}`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            Authorization: `Bearer ${ACCESS_TOKEN}`,
          },
          body: JSON.stringify({ message }),
        });

        if (!res.ok) {
          const errorBody = await res.text().catch(() => "");
          dispatch(
            appendToLastMessage({
              sessionId,
              text: `Error ${res.status}: ${res.statusText}. ${errorBody}`,
            }),
          );
          return;
        }

        if (!res.body) {
          dispatch(appendToLastMessage({ sessionId, text: "No response body received." }));
          return;
        }

        const reader = res.body.getReader();
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
                if (raw === "[DONE]") return;
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
      } finally {
        dispatch(setStreaming({ sessionId, isStreaming: false }));
      }
    },
    [dispatch, sessionId],
  );

  return { messages, isStreaming, sendMessage };
};
