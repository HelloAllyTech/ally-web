import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "@store";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

export interface LogsState {
  logs: LogEntry[];
  isVisible: boolean;
}

const initialState: LogsState = {
  logs: [],
  isVisible: true,
};

const logsSlice = createSlice({
  name: "logs",
  initialState,
  reducers: {
    addLog(state, action: PayloadAction<Omit<LogEntry, "id">>) {
      state.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        ...action.payload,
      });
      // Keep only last 500 logs to prevent memory issues
      if (state.logs.length > 500) {
        state.logs = state.logs.slice(-500);
      }
    },
    clearLogs(state) {
      state.logs = [];
    },
    toggleLogViewer(state) {
      state.isVisible = !state.isVisible;
    },
    setLogViewerVisible(state, action: PayloadAction<boolean>) {
      state.isVisible = action.payload;
    },
  },
});

export const { addLog, clearLogs, toggleLogViewer, setLogViewerVisible } = logsSlice.actions;

// Selectors
export const selectLogs = (state: RootState) => state.logs.logs;
export const selectLogViewerVisible = (state: RootState) => state.logs.isVisible;

export default logsSlice;
