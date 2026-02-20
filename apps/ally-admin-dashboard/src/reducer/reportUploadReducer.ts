import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";

import { ReportUpload } from "@components/report-upload-progress-dialog/types";
import { ReportGenerationStatus } from "@constants/reportGeneration";
import { RootState } from "@store";

export interface ReportUploadState {
  uploads: ReportUpload[];
  currentScenarioId?: string;
}

const getFinalStatuses = (): ReportGenerationStatus[] => [
  ReportGenerationStatus.COMPLETED,
  ReportGenerationStatus.FAILED,
  ReportGenerationStatus.CANCELLED,
];

const initialState: ReportUploadState = {
  uploads: [],
  currentScenarioId: undefined,
};

const reportUploadSlice = createSlice({
  name: "reportUpload",
  initialState,
  reducers: {
    addUpload(state, action: PayloadAction<ReportUpload>) {
      const index = state.uploads.findIndex(u => u.reportId === action.payload.reportId);
      if (index >= 0) {
        state.uploads[index] = action.payload;
      } else {
        state.uploads.push(action.payload);
      }
    },
    updateUpload(
      state,
      action: PayloadAction<{ reportId: string; updates: Partial<ReportUpload> }>,
    ) {
      const index = state.uploads.findIndex(u => u.reportId === action.payload.reportId);
      if (index >= 0) {
        state.uploads[index] = { ...state.uploads[index], ...action.payload.updates };
      }
    },
    removeUpload(state, action: PayloadAction<string>) {
      state.uploads = state.uploads.filter(u => u.reportId !== action.payload);
    },
    clearAllUploads(state) {
      state.uploads = [];
    },
    cancelUpload(state, action: PayloadAction<string>) {
      const upload = state.uploads.find(u => u.reportId === action.payload);
      if (upload) {
        upload.status = ReportGenerationStatus.CANCELLED;
      }
    },
    cancelAllInProgressUploads(state) {
      state.uploads.forEach(upload => {
        if (
          upload.status === ReportGenerationStatus.IN_PROGRESS ||
          upload.status === ReportGenerationStatus.STARTED
        ) {
          upload.status = ReportGenerationStatus.CANCELLED;
        }
      });
    },
    setAllUploads(state, action: PayloadAction<ReportUpload[]>) {
      const existingMap = new Map(state.uploads.map(u => [u.reportId, u]));
      const finalStatuses = getFinalStatuses();

      state.uploads = action.payload.map(newUpload => {
        const existing = existingMap.get(newUpload.reportId);
        // Preserve final status if API tries to overwrite it with non-final status
        if (
          existing &&
          finalStatuses.includes(existing.status) &&
          !finalStatuses.includes(newUpload.status)
        ) {
          return { ...newUpload, status: existing.status, progress: existing.progress };
        }
        return newUpload;
      });

      // Update currentScenarioId from new uploads if available
      const newScenarioId = action.payload.find(u => u.scenarioId)?.scenarioId;
      if (newScenarioId) {
        state.currentScenarioId = newScenarioId;
      }
    },
    setCurrentScenarioId(state, action: PayloadAction<string | undefined>) {
      if (action.payload === state.currentScenarioId) return;

      state.currentScenarioId = action.payload;
      state.uploads = action.payload
        ? state.uploads.filter(u => !u.scenarioId || u.scenarioId === action.payload)
        : [];
    },
  },
});

export const {
  addUpload,
  updateUpload,
  removeUpload,
  clearAllUploads,
  cancelUpload,
  cancelAllInProgressUploads,
  setAllUploads,
  setCurrentScenarioId,
} = reportUploadSlice.actions;

// Selectors
const selectReportUploadState = (state: RootState) => state.reportUpload || initialState;
const selectAllUploads = createSelector([selectReportUploadState], s => s?.uploads || []);
const selectCurrentScenarioId = createSelector(
  [selectReportUploadState],
  s => s?.currentScenarioId,
);

export const selectUploads = createSelector(
  [selectAllUploads, selectCurrentScenarioId],
  (uploads, currentScenarioId) =>
    !currentScenarioId
      ? uploads
      : uploads.filter(u => !u.scenarioId || String(u.scenarioId) === String(currentScenarioId)),
);

export const selectUploadsInProgress = createSelector([selectUploads], uploads =>
  uploads.filter(
    u =>
      u.status === ReportGenerationStatus.IN_PROGRESS ||
      u.status === ReportGenerationStatus.STARTED,
  ),
);

export default reportUploadSlice;
