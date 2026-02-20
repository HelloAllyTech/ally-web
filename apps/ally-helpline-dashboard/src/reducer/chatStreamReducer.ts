import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { ChatMessagePayload } from "@types";

export interface StreamSessionState {
  streamingMessage: ChatMessagePayload | null;
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
        isStreaming: true,
      };
    },
    appendStreamingChunk: (state, action: PayloadAction<{ sessionId: string; text: string }>) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session?.streamingMessage) return;
      session.streamingMessage.content += action.payload.text;
    },
    finishStreaming: (state, action: PayloadAction<{ sessionId: string }>) => {
      const session = state.sessions[action.payload.sessionId];
      if (!session) return;
      session.streamingMessage = null;
      session.isStreaming = false;
    },
    clearStreamSession: (state, action: PayloadAction<string>) => {
      delete state.sessions[action.payload];
    },
  },
});

export const { startStreaming, appendStreamingChunk, finishStreaming, clearStreamSession } =
  chatStreamSlice.actions;

export default chatStreamSlice;
