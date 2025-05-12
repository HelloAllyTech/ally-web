import { createSlice } from "@reduxjs/toolkit";

interface CallsState {
  filters: {
    page: number;
  };
  totalCallsCount: number;
}

const initialState: CallsState = {
  filters: {
    page: 1,
  },
  totalCallsCount: 0,
};

const callsSlice = createSlice({
  name: "calls",
  initialState,
  reducers: {
    updatePage: (state, action) => {
      state.filters.page = action.payload;
    },
    updateTotalCallsCount: (state, action) => {
      state.totalCallsCount = action.payload;
    },
  },
});

export const { updatePage, updateTotalCallsCount } = callsSlice.actions;

export default callsSlice;
