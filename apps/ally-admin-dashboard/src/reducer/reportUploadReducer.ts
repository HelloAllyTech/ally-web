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
    /** Cancel in-progress uploads for a single scenario (e.g. when generation API fails). */
    cancelInProgressUploadsForScenario(state, action: PayloadAction<{ scenarioId: string }>) {
      const { scenarioId } = action.payload;
      state.uploads.forEach(upload => {
        if (
          upload.scenarioId != null &&
          String(upload.scenarioId) === String(scenarioId) &&
          (upload.status === ReportGenerationStatus.IN_PROGRESS ||
            upload.status === ReportGenerationStatus.STARTED)
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
    /** Set uploads for one scenario only; keeps uploads for all other scenarios (e.g. in-progress). */
    setUploadsForScenario(
      state,
      action: PayloadAction<{ scenarioId: string; uploads: ReportUpload[] }>,
    ) {
      const { scenarioId, uploads } = action.payload;
      const existingMap = new Map(state.uploads.map(u => [u.reportId, u]));
      const finalStatuses = getFinalStatuses();

      const otherScenarioUploads = state.uploads.filter(
        u => !u.scenarioId || String(u.scenarioId) !== String(scenarioId),
      );
      const inProgressForThisScenario = state.uploads.filter(
        u =>
          u.scenarioId != null &&
          String(u.scenarioId) === String(scenarioId) &&
          (u.status === ReportGenerationStatus.IN_PROGRESS ||
            u.status === ReportGenerationStatus.STARTED),
      );
      const newUploadsForScenario = uploads.map(newUpload => {
        const existing = existingMap.get(newUpload.reportId);
        if (
          existing &&
          finalStatuses.includes(existing.status) &&
          !finalStatuses.includes(newUpload.status)
        ) {
          return { ...newUpload, status: existing.status, progress: existing.progress };
        }
        return newUpload;
      });
      const reportIdsFromApi = new Set(newUploadsForScenario.map(u => u.reportId));
      const inProgressNotInApi = inProgressForThisScenario.filter(
        u => !reportIdsFromApi.has(u.reportId),
      );
      state.uploads = [...otherScenarioUploads, ...newUploadsForScenario, ...inProgressNotInApi];
    },
    setCurrentScenarioId(state, action: PayloadAction<string | undefined>) {
      if (action.payload === state.currentScenarioId) return;

      state.currentScenarioId = action.payload;
      // Keep all uploads in state so SimulationList can disable edit for every
      // simulation with report in progress. Filtering for display is done in selectUploads.
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
  cancelInProgressUploadsForScenario,
  setAllUploads,
  setUploadsForScenario,
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
  uploads => uploads,
);

export const selectUploadsInProgress = createSelector([selectUploads], uploads =>
  uploads.filter(
    u =>
      u.status === ReportGenerationStatus.IN_PROGRESS ||
      u.status === ReportGenerationStatus.STARTED,
  ),
);

/** All in-progress uploads across all scenarios (for simulation list disable-edit logic) */
export const selectAllUploadsInProgress = createSelector([selectAllUploads], uploads =>
  uploads.filter(
    u =>
      u.status === ReportGenerationStatus.IN_PROGRESS ||
      u.status === ReportGenerationStatus.STARTED,
  ),
);

export default reportUploadSlice;
