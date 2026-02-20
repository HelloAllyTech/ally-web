import { ReportGenerationStatus } from "@constants/reportGeneration";
import { en } from "@src/constants";

import { ReportUpload } from "./types";

export const getUploadHeader = (uploads: ReportUpload[]) => {
  const uploadsInProgress = uploads.filter(
    upload =>
      upload.status === ReportGenerationStatus.IN_PROGRESS ||
      upload.status === ReportGenerationStatus.STARTED,
  )?.length;
  if (uploadsInProgress) return `${uploadsInProgress} ${en.simulation.reportGenerationInProgress}`;
  const uploadsCancelled = uploads.filter(
    upload => upload.status === ReportGenerationStatus.CANCELLED,
  )?.length;
  if (uploadsCancelled) return `${uploadsCancelled} ${en.simulation.reportGenerationCancelled}`;
  const uploadsCompleted = uploads.filter(
    upload => upload.status === ReportGenerationStatus.COMPLETED,
  )?.length;
  if (uploadsCompleted) return `${uploadsCompleted} ${en.simulation.reportGenerationComplete}`;
  return en.simulation.noReportGeneration;
};
