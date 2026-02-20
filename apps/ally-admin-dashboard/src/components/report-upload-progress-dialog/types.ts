import { ReportGenerationStatus } from "@constants/reportGeneration";

export interface ReportUpload {
  fileName: string;
  status: ReportGenerationStatus;
  progress: number;
  reportId: string;
  scenarioId?: string;
}

export interface UploadProgressHeaderProps {
  expanded: boolean;
  onClose: () => void;
  onToggle: () => void;
  uploads: ReportUpload[];
}

export interface ProgressCircleProps {
  progress: number;
}
