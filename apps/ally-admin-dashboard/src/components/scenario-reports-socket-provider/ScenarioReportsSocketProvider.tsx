import { FC, ReactNode, useEffect, useRef } from "react";

import { useDispatch } from "react-redux";

import {
  MAX_PROGRESS_BEFORE_COMPLETE,
  PROGRESS_INCREMENT_MAX,
  PROGRESS_UPDATE_INTERVAL_MS,
  ReportGenerationStatus,
} from "@constants/reportGeneration";
import { useScenarioReportsSocket } from "@hooks/useScenarioReportsSocket";
import { addUpload } from "@reducer/reportUploadReducer";
import { store } from "@store";
import { ReportsUpdatedPayload } from "@types";

interface ScenarioReportsSocketProviderProps {
  children: ReactNode;
}

const getFinalStatuses = (): ReportGenerationStatus[] => [
  ReportGenerationStatus.COMPLETED,
  ReportGenerationStatus.FAILED,
  ReportGenerationStatus.CANCELLED,
];

const normalizeStatus = (status: string): ReportGenerationStatus => {
  if (status === ReportGenerationStatus.COMPLETED) return ReportGenerationStatus.COMPLETED;
  if (status === ReportGenerationStatus.FAILED) return ReportGenerationStatus.FAILED;
  if (status === ReportGenerationStatus.CANCELLED) return ReportGenerationStatus.CANCELLED;
  return ReportGenerationStatus.IN_PROGRESS;
};

const isFinalStatus = (status: ReportGenerationStatus): boolean =>
  getFinalStatuses().includes(status);

const calculateProgress = (
  status: ReportGenerationStatus,
  existingProgress: number,
  isRegenerating: boolean,
): number => {
  if (status === ReportGenerationStatus.COMPLETED) return 100;
  if (
    status === ReportGenerationStatus.FAILED ||
    status === ReportGenerationStatus.CANCELLED ||
    isRegenerating
  )
    return 0;
  return existingProgress;
};

export const ScenarioReportsSocketProvider: FC<ScenarioReportsSocketProviderProps> = ({
  children,
}) => {
  const dispatch = useDispatch();
  const isConnectedRef = useRef(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { connect, disconnect, joinUserReportsRoom } = useScenarioReportsSocket({
    onConnected: () => joinUserReportsRoom(),
    onError: () => {},
    onReportsUpdated: (payload: ReportsUpdatedPayload) => {
      const { reportUpload } = store.getState();
      const { currentScenarioId, uploads: existingUploads } = reportUpload;

      payload.data.forEach(report => {
        const reportScenarioId = String(report.scenarioId);
        const currentScenarioIdStr = currentScenarioId ? String(currentScenarioId) : null;

        // Skip reports from other scenarios
        if (currentScenarioIdStr && reportScenarioId !== currentScenarioIdStr) return;

        const existingUpload = existingUploads.find(u => u.reportId === report.id);
        const status = normalizeStatus(report.status);

        // Preserve final statuses and skip new final status uploads
        if (existingUpload && isFinalStatus(existingUpload.status)) return;
        if (!existingUpload && isFinalStatus(status)) return;

        const isRegenerating =
          existingUpload &&
          isFinalStatus(existingUpload.status) &&
          status === ReportGenerationStatus.IN_PROGRESS;
        const progress = calculateProgress(status, existingUpload?.progress ?? 0, isRegenerating);

        dispatch(
          addUpload({
            fileName: `Report ${report.id}`,
            status,
            progress,
            reportId: report.id,
            scenarioId: report.scenarioId,
          }),
        );
      });
    },
  });

  // Simulate progress for in-progress uploads (continues even when user navigates away)
  useEffect(() => {
    const updateProgress = () => {
      const { uploads } = store.getState().reportUpload;
      const inProgress = uploads.filter(
        u =>
          u.status === ReportGenerationStatus.IN_PROGRESS ||
          u.status === ReportGenerationStatus.STARTED,
      );

      inProgress.forEach(upload => {
        const currentProgress = upload.progress ?? 0;
        if (currentProgress < MAX_PROGRESS_BEFORE_COMPLETE) {
          const newProgress = Math.min(
            currentProgress + Math.random() * PROGRESS_INCREMENT_MAX,
            MAX_PROGRESS_BEFORE_COMPLETE,
          );
          dispatch(
            addUpload({
              fileName: upload.fileName,
              status: upload.status,
              progress: newProgress,
              reportId: upload.reportId,
              scenarioId: upload.scenarioId,
            }),
          );
        }
      });
    };

    updateProgress();
    progressIntervalRef.current = setInterval(updateProgress, PROGRESS_UPDATE_INTERVAL_MS);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [dispatch]);

  useEffect(() => {
    if (!isConnectedRef.current) {
      connect();
      isConnectedRef.current = true;
    }
    return () => {
      disconnect();
      isConnectedRef.current = false;
    };
  }, [connect, disconnect]);

  return <>{children}</>;
};
