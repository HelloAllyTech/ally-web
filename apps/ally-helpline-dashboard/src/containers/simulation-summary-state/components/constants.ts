import { FeedbackSectionType } from "@types";

export const feedbackSections = [
  {
    key: "positives",
    label: "What went well",
    type: FeedbackSectionType.BULLET_TEXT,
  },
  {
    key: "improvements",
    label: "Improvement tips",
    type: FeedbackSectionType.BULLET_TEXT,
  },
];
