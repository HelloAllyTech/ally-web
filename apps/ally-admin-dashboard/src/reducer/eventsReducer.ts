import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "@store";

export interface AvailableEvent {
  id: string;
  name: string;
  eventCode?: string;
}

export interface EventsState {
  availableEvents: AvailableEvent[];
}

const initialState: EventsState = {
  availableEvents: [],
};

const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    setAvailableEvents(state, action: PayloadAction<AvailableEvent[]>) {
      state.availableEvents = action.payload;
    },
    clearAvailableEvents(state) {
      state.availableEvents = [];
    },
  },
});

export const { setAvailableEvents, clearAvailableEvents } = eventsSlice.actions;

// Selectors
export const selectAvailableEvents = (state: RootState) => state.events.availableEvents;

export default eventsSlice;
