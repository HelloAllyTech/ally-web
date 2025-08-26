import { createSlice } from "@reduxjs/toolkit";

import { CALL_LOGS_PAGINATION_LIMIT } from "@pages/calls/constants";
import { CallsState } from "@types";

/*
  This reducer is used to manage the state of the calls page.
  It is used to store the filters for the calls page.
  It is used to store the page number for the calls page.
  It is used to store the filters for the calls page.
*/
const initialState: CallsState = {
  filters: {
    offset: 0,
    limit: CALL_LOGS_PAGINATION_LIMIT,
  },
};

const callsSlice = createSlice({
  name: "calls",
  initialState,
  reducers: {
    updatePage: (state, action) => {
      state.filters.page = action.payload;
    },
    updateFilters: (state, action) => {
      state.filters = { ...action.payload };
    },
  },
});

export const { updatePage, updateFilters } = callsSlice.actions;

export default callsSlice;
