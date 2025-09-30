import { createSlice } from "@reduxjs/toolkit";

import { CALL_LOGS_PAGINATION_LIMIT } from "@pages/calls/constants";
import { CallsState, UploadStatus } from "@types";

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
  audioUpload: [],
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
    addAudioUpload: (state, action) => {
      state.audioUpload.push(action.payload);
    },
    removeAudioUpload: (state, action) => {
      state.audioUpload = state.audioUpload.filter(upload => upload.chatId !== action.payload);
    },
    updateUploadProgress: (state, action) => {
      state.audioUpload = state.audioUpload.map(upload =>
        upload.chatId === action.payload.chatId
          ? {
              ...upload,
              progress: action.payload.progress,
              status:
                action.payload.progress >= 100 ? UploadStatus.COMPLETED : UploadStatus.IN_PROGRESS,
            }
          : upload,
      );
    },
    updateAudioUploadStatus: (state, action) => {
      state.audioUpload = state.audioUpload.map(upload =>
        upload.chatId === action.payload.chatId
          ? { ...upload, status: action.payload.status }
          : upload,
      );
    },
    updateUploadError: (state, action) => {
      state.audioUpload = state.audioUpload.map(upload =>
        upload.chatId === action.payload.chatId
          ? { ...upload, error: action.payload.error, status: UploadStatus.FAILED }
          : upload,
      );
    },
    clearAudioUploads: state => {
      state.audioUpload = [];
    },
  },
});

export const {
  updatePage,
  updateFilters,
  addAudioUpload,
  removeAudioUpload,
  updateUploadProgress,
  updateUploadError,
  updateAudioUploadStatus,
  clearAudioUploads,
} = callsSlice.actions;

export default callsSlice;
