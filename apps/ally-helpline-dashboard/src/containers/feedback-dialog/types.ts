import { SessionType } from "@types";

export interface FeedbackDialogProps {
  id: number | string;
  open: boolean;
  onClose: () => void;
  onSubmitComplete?: () => void;
  sessionType: SessionType;
  initialRating?: number;
  initialComment?: string;
  initialTags?: string[];
}

export interface FeedbackSectionProps {
  id: number | string;
  onSubmitComplete: () => void;
  initialRating?: number;
  initialComment?: string;
  initialTags?: string[];
}
