import { SessionType } from "@types";

export interface FeedbackDialogProps {
  id: number | string;
  open: boolean;
  onClose: () => void;
  sessionType: SessionType;
}

export interface FeedbackSectionProps {
  id: number | string;
  onSubmitComplete: () => void;
}
