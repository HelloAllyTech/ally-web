import { AudioUpload } from "@types";

export interface UploadProgressHeaderProps {
  expanded: boolean;
  onClose: () => void;
  onToggle: () => void;
  uploads: AudioUpload[];
}

export interface ProgressCircleProps {
  progress: number;
}
