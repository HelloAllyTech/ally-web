export enum UploadStatus {
  IN_PROGRESS = "IN_PROGRESS",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface AudioUpload {
  chatId: number;
  fileName: string;
  status: UploadStatus;
  progress: number;
}

export interface UploadProgressHeaderProps {
  expanded: boolean;
  onClose: () => void;
  onToggle: () => void;
  uploads: AudioUpload[];
}

export interface ProgressCircleProps {
  progress: number;
}
