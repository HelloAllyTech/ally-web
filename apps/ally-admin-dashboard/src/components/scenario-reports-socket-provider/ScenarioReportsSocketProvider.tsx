import { FC, ReactNode, useCallback, useEffect, useRef } from "react";

import { useDispatch } from "react-redux";

import {
  MAX_PROGRESS_BEFORE_COMPLETE,
  PROGRESS_INCREMENT_MAX,
  PROGRESS_UPDATE_INTERVAL_MS,
  ReportGenerationStatus,
} from "@constants/reportGeneration";
import { REPORTS_LOOKBACK_MINUTES } from "@constants/socket";
import { useScenarioReportsSocket } from "@hooks/useScenarioReportsSocket";
import { setAllUploads } from "@reducer/reportUploadReducer";
import { store } from "@store";
import { ReportsUpdatedPayload } from "@types";

interface ScenarioReportsSocketProviderProps {
  children: ReactNode;
}

const FINAL_STATUSES = new Set<ReportGenerationStatus>([
  ReportGenerationStatus.COMPLETED,
  ReportGenerationStatus.FAILED,
  ReportGenerationStatus.CANCELLED,
]);

const STATUS_MAP: Record<string, ReportGenerationStatus> = {
  [ReportGenerationStatus.COMPLETED]: ReportGenerationStatus.COMPLETED,
  [ReportGenerationStatus.FAILED]: ReportGenerationStatus.FAILED,
  [ReportGenerationStatus.CANCELLED]: ReportGenerationStatus.CANCELLED,
};

const normalizeStatus = (status: string): ReportGenerationStatus =>
  STATUS_MAP[status] ?? ReportGenerationStatus.IN_PROGRESS;

const isFinalStatus = (status: ReportGenerationStatus): boolean => FINAL_STATUSES.has(status);

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

const IN_PROGRESS_STATUSES = [
  ReportGenerationStatus.IN_PROGRESS,
  ReportGenerationStatus.STARTED,
] as const;

const isInProgress = (
  status: ReportGenerationStatus,
): status is (typeof IN_PROGRESS_STATUSES)[number] =>
  IN_PROGRESS_STATUSES.includes(status as (typeof IN_PROGRESS_STATUSES)[number]);

export const ScenarioReportsSocketProvider: FC<ScenarioReportsSocketProviderProps> = ({
  children,
}) => {
  const dispatch = useDispatch();
  const isConnectedRef = useRef(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const onReportsUpdated = useCallback(
    (payload: ReportsUpdatedPayload) => {
      const { uploads: existingUploads } = store.getState().reportUpload;
      const payloadReportIds = new Set(payload.data.map(r => r.id));
      const existingByReportId = new Map(existingUploads.map(u => [u.reportId, u]));

      const mappedFromPayload = payload.data.map(report => {
        const existingUpload = existingByReportId.get(report.id);
        const status = normalizeStatus(report.status);
        const preserveFinal =
          existingUpload && isFinalStatus(existingUpload.status) && !isFinalStatus(status);
        const isRegenerating =
          existingUpload &&
          isFinalStatus(existingUpload.status) &&
          status === ReportGenerationStatus.IN_PROGRESS;
        const progress = calculateProgress(status, existingUpload?.progress ?? 0, isRegenerating);

        return {
          fileName: existingUpload?.fileName ?? `Report ${report.id}`,
          status: preserveFinal ? existingUpload.status : status,
          progress: preserveFinal ? existingUpload.progress : progress,
          reportId: report.id,
          scenarioId: report.scenarioId,
        };
      });

      const inProgressNotInPayload = existingUploads.filter(
        u => isInProgress(u.status) && !payloadReportIds.has(u.reportId),
      );

      dispatch(setAllUploads([...inProgressNotInPayload, ...mappedFromPayload]));
    },
    [dispatch],
  );

  const joinUserReportsRoomRef = useRef<(lookBackMinutes?: number) => void>(() => {});
  const onConnected = useCallback(() => {
    joinUserReportsRoomRef.current(REPORTS_LOOKBACK_MINUTES);
  }, []);

  const { connect, disconnect, joinUserReportsRoom } = useScenarioReportsSocket({
    onConnected,
    onError: useCallback(() => {}, []),
    onReportsUpdated,
  });
  joinUserReportsRoomRef.current = joinUserReportsRoom;

  // Simulate progress for in-progress uploads (single dispatch per tick)
  useEffect(() => {
    const updateProgress = () => {
      const { uploads } = store.getState().reportUpload;
      const inProgress = uploads.filter(u => isInProgress(u.status));
      if (inProgress.length === 0) return;

      let hasChanges = false;
      const updated = uploads.map(upload => {
        if (!isInProgress(upload.status)) return upload;
        const currentProgress = upload.progress ?? 0;
        if (currentProgress >= MAX_PROGRESS_BEFORE_COMPLETE) return upload;
        hasChanges = true;
        const newProgress = Math.min(
          currentProgress + Math.random() * PROGRESS_INCREMENT_MAX,
          MAX_PROGRESS_BEFORE_COMPLETE,
        );
        return { ...upload, progress: newProgress };
      });
      if (hasChanges) dispatch(setAllUploads(updated));
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
