import { AudioUpload, UploadStatus } from "@types";

export const getUploadHeader = (uploads: AudioUpload[], t: any) => {
  const uploadsInProgress = uploads.filter(
    upload => upload.status === UploadStatus.IN_PROGRESS,
  )?.length;
  if (uploadsInProgress) return t("calls.uploadProgress.inProgress", { count: uploadsInProgress });
  const uploadsCancelled = uploads.filter(
    upload => upload.status === UploadStatus.CANCELLED,
  )?.length;
  if (uploadsCancelled)
    return t("calls.uploadProgress.summaryCancelled", { count: uploadsCancelled });
  const uploadsCompleted = uploads.filter(
    upload => upload.status === UploadStatus.COMPLETED,
  )?.length;
  if (uploadsCompleted) return t("calls.uploadProgress.completed", { count: uploadsCompleted });
  return t("calls.uploadProgress.noUploads");
};
