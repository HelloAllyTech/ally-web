import { CALL_LOGS_PAGINATION_LIMIT } from "@/pages/calls/constants";
import { createSlice } from "@reduxjs/toolkit";

interface CallsState {
  filters: {
    page?: number;
    offset?: number;
    limit?: number;
    sortBy?: string;
    order?: "ASC" | "DESC";
    counselorName?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    minDuration?: number;
    maxDuration?: number;
    minQualityScore?: number;
    maxQualityScore?: number;
    tags?: string;
  };
  totalCallsCount: number;
}

const initialState: CallsState = {
  filters: {
    offset: 0,
    limit: CALL_LOGS_PAGINATION_LIMIT,
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
    updateFilters: (state, action) => {
      state.filters = { ...action.payload };
    },
  },
});

export const { updatePage, updateTotalCallsCount, updateFilters } = callsSlice.actions;

export default callsSlice;
