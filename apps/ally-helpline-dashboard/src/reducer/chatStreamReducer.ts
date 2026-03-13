import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { ChatMessagePayload, Citation } from "@types";

export interface StreamSessionState {
  streamingMessage: ChatMessagePayload | null;
  citations: Citation[];
  isStreaming: boolean;
}

export interface ChatStreamState {
  sessions: Record<string, StreamSessionState>;
}

const streamInitialState: ChatStreamState = { sessions: {} };

const chatStreamSlice = createSlice({
  name: "chatStream",
  initialState: streamInitialState,
  reducers: {
    startStreaming: (state, action: PayloadAction<{ sessionId: string }>) => {
      state.sessions[action.payload.sessionId] = {
        streamingMessage: { role: "assistant", content: "" },
        citations: [],
        isStreaming: true,
      };
    },
    appendStreamingChunk: (state, action: PayloadAction<{ sessionId: string; text: string }>) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session?.streamingMessage) return;
      session.streamingMessage.content += action.payload.text;
    },
    setStreamingCitations: (
      state,
      action: PayloadAction<{ sessionId: string; citations: Citation[] }>,
    ) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session) return;
      session.citations = action.payload.citations;
      if (session.streamingMessage) {
        session.streamingMessage.citations = action.payload.citations;
      }
    },
    replaceStreamingContent: (
      state,
      action: PayloadAction<{ sessionId: string; content: string; citations?: Citation[] }>,
    ) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session?.streamingMessage) return;
      session.streamingMessage.content = action.payload.content;
      if (action.payload.citations) {
        session.streamingMessage.citations = action.payload.citations;
        session.citations = action.payload.citations;
      }
    },
    finishStreaming: (state, action: PayloadAction<{ sessionId: string }>) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session) return;
      session.streamingMessage = null;
      session.citations = [];
      session.isStreaming = false;
    },
    clearStreamSession: (state, action: PayloadAction<string>) => {
      delete state.sessions[action.payload];
    },
  },
});

export const {
  startStreaming,
  appendStreamingChunk,
  setStreamingCitations,
  replaceStreamingContent,
  finishStreaming,
  clearStreamSession,
} = chatStreamSlice.actions;

export default chatStreamSlice;
