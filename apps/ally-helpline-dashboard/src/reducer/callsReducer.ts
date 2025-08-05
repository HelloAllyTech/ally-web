import { CALL_LOGS_PAGINATION_LIMIT } from "@/pages/calls/constants";
import { createSlice } from "@reduxjs/toolkit";

interface CallsState {
  filters: {
    page?: number;
    offset?: number;
    limit?: number;
    sortBy?: string;
    order?: "ASC" | "DESC";
    counsellorName?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    minDuration?: number;
    maxDuration?: number;
    minQualityScore?: number;
    maxQualityScore?: number;
    tags?: string;
  };
}

export type { CallsState };

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
