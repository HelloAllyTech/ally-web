import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "@store";

export enum SocketConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

export interface SocketStatusState {
  scenarioReportsSocket: {
    status: SocketConnectionStatus;
    connectionAttempts: number;
    lastError?: string;
    connectedAt?: string;
  };
}

const initialState: SocketStatusState = {
  scenarioReportsSocket: {
    status: SocketConnectionStatus.DISCONNECTED,
    connectionAttempts: 0,
  },
};

const socketStatusSlice = createSlice({
  name: "socketStatus",
  initialState,
  reducers: {
    setScenarioReportsSocketStatus(
      state,
      action: PayloadAction<{
        status: SocketConnectionStatus;
        connectionAttempts?: number;
        lastError?: string;
      }>,
    ) {
      state.scenarioReportsSocket.status = action.payload.status;
      if (action.payload.connectionAttempts !== undefined) {
        state.scenarioReportsSocket.connectionAttempts = action.payload.connectionAttempts;
      }
      if (action.payload.lastError) {
        state.scenarioReportsSocket.lastError = action.payload.lastError;
      }
      if (action.payload.status === SocketConnectionStatus.CONNECTED) {
        state.scenarioReportsSocket.connectedAt = new Date().toISOString();
        state.scenarioReportsSocket.connectionAttempts = 0;
        state.scenarioReportsSocket.lastError = undefined;
      }
    },
    resetScenarioReportsSocketStatus(state) {
      state.scenarioReportsSocket = initialState.scenarioReportsSocket;
    },
  },
});

export const { setScenarioReportsSocketStatus, resetScenarioReportsSocketStatus } =
  socketStatusSlice.actions;

// Selectors
export const selectScenarioReportsSocketStatus = (state: RootState) =>
  state.socketStatus.scenarioReportsSocket;

export default socketStatusSlice;
