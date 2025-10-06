export interface UploadProgressHeaderProps {
  total: number;
  expanded: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export interface ProgressCircleProps {
  progress: number;
}
