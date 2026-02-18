// chatSlice.ts
import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: [],
  },
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    appendToLastMessage: (state, action) => {
      const last = state.messages[state.messages.length - 1];
      if (last) last.content += action.payload;
    },
  },
});

export const { addMessage, appendToLastMessage } = chatSlice.actions;
export default chatSlice.reducer;
