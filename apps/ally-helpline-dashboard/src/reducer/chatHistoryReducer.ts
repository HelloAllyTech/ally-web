import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { ChatMessagePayload } from "@types";

export interface HistorySessionState {
  messages: ChatMessagePayload[];
  error: boolean;
  lastFailedMessage: string | null;
}

export interface ChatHistoryState {
  sessions: Record<string, HistorySessionState>;
}

const historyInitialState: ChatHistoryState = { sessions: {} };

const getOrCreateHistorySession = (
  state: ChatHistoryState,
  sessionId: string,
): HistorySessionState => {
  if (!state.sessions[sessionId]) {
    state.sessions[sessionId] = { messages: [], error: false, lastFailedMessage: null };
  }
  return state.sessions[sessionId];
};

const chatHistorySlice = createSlice({
  name: "chatHistory",
  initialState: historyInitialState,
  reducers: {
    addMessage: (
      state,
      action: PayloadAction<{ sessionId: string; message: ChatMessagePayload }>,
    ) => {
      const session = getOrCreateHistorySession(state, action.payload.sessionId);
      session.messages.push(action.payload.message);
    },
    setError: (state, action: PayloadAction<{ sessionId: string; message: string }>) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session) return;
      session.error = true;
      session.lastFailedMessage = action.payload.message;
    },
    clearError: (state, action: PayloadAction<{ sessionId: string }>) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session) return;
      session.error = false;
      session.lastFailedMessage = null;
    },
    commitStreamingMessage: (
      state,
      action: PayloadAction<{ sessionId: string; message: ChatMessagePayload }>,
    ) => {
      const session = getOrCreateHistorySession(state, action.payload.sessionId);
      session.messages.push(action.payload.message);
    },
    initSession: (
      state,
      action: PayloadAction<{ sessionId: string; messages: ChatMessagePayload[] }>,
    ) => {
      state.sessions[action.payload.sessionId] = {
        messages: action.payload.messages,
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
  setError,
  clearError,
  commitStreamingMessage,
  initSession,
  clearSession,
} = chatHistorySlice.actions;

export default chatHistorySlice;
