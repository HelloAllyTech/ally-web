import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChatMessage {
  role: string;
  content: string;
}

interface SessionState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: boolean;
  lastFailedMessage: string | null;
}

interface ChatState {
  sessions: Record<string, SessionState>;
}

const initialState: ChatState = {
  sessions: {},
};

const getOrCreateSession = (state: ChatState, sessionId: string): SessionState => {
  if (!state.sessions[sessionId]) {
    state.sessions[sessionId] = {
      messages: [],
      isStreaming: false,
      error: false,
      lastFailedMessage: null,
    };
  }
  return state.sessions[sessionId];
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<{ sessionId: string; message: ChatMessage }>) => {
      const session = getOrCreateSession(state, action.payload.sessionId);
      session.messages.push(action.payload.message);
    },
    appendToLastMessage: (state, action: PayloadAction<{ sessionId: string; text: string }>) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session) return;
      const last = session.messages[session.messages.length - 1];
      if (last) last.content += action.payload.text;
    },
    setStreaming: (state, action: PayloadAction<{ sessionId: string; isStreaming: boolean }>) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session) return; // Session may have been cleared (e.g. user closed during stream)
      session.isStreaming = action.payload.isStreaming;
    },
    setError: (state, action: PayloadAction<{ sessionId: string; message: string }>) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session) return;
      const last = session.messages[session.messages.length - 1];
      if (last?.role === "assistant") {
        session.messages.pop();
      }
      session.error = true;
      session.lastFailedMessage = action.payload.message;
    },
    clearError: (state, action: PayloadAction<{ sessionId: string }>) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session) return;
      session.error = false;
      session.lastFailedMessage = null;
    },
    initSession: (state, action: PayloadAction<{ sessionId: string; messages: ChatMessage[] }>) => {
      state.sessions[action.payload.sessionId] = {
        messages: action.payload.messages,
        isStreaming: false,
        error: false,
        lastFailedMessage: null,
      };
    },
    clearSession: (state, action: PayloadAction<string>) => {
      delete state.sessions[action.payload];
    },
  },
});

export const {
  addMessage,
  appendToLastMessage,
  setStreaming,
  setError,
  clearError,
  initSession,
  clearSession,
} = chatSlice.actions;
export default chatSlice.reducer;
