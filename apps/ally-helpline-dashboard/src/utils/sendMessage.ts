import { ApiEndpoints } from "@constants";
import { addMessage, appendToLastMessage } from "@reducer";

// sendMessage.ts
const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api`;
export const sendMessage = async (message, dispatch, sessionId) => {
  // add user message
  dispatch(addMessage({ role: "user", content: message }));

  // create empty assistant message
  dispatch(addMessage({ role: "assistant", content: "" }));

  const res = await fetch(`${API_BASE}${ApiEndpoints.LEARN.CHAT_STREAM(sessionId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ message }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    const text = decoder.decode(value);

    const lines = text.split("\n");

    lines.forEach(line => {
      if (line.startsWith("data: ")) {
        dispatch(appendToLastMessage(line.replace("data: ", "")));
      }
    });
  }
};
