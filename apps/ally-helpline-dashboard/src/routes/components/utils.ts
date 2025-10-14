import { AudioUpload, UploadStatus } from "@types";

export const getUploadHeader = (uploads: AudioUpload[]) => {
  const uploadsInProgress = uploads.filter(
    upload => upload.status === UploadStatus.IN_PROGRESS,
  )?.length;
  if (uploadsInProgress)
    return `${uploadsInProgress} upload${uploadsInProgress > 1 ? "s" : ""} in progress`;
  const uploadsCancelled = uploads.filter(
    upload => upload.status === UploadStatus.CANCELLED,
  )?.length;
  if (uploadsCancelled)
    return `${uploadsCancelled} upload${uploadsCancelled > 1 ? "s" : ""} cancelled`;
  const uploadsCompleted = uploads.filter(
    upload => upload.status === UploadStatus.COMPLETED,
  )?.length;
  if (uploadsCompleted)
    return `${uploadsCompleted} upload${uploadsCompleted > 1 ? "s" : ""} completed`;
  return "No uploads";
};
