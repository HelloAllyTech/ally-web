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
  {
    key: "keyEvents",
    label: "Key Events",
    type: FeedbackSectionType.TABLE,
    columns: [
      {
        key: "time",
        header: "Time",
        style: { width: "15%", border: "1px solid #D2D2D2", height: "50px" },
      },
      {
        key: "event",
        header: "Event",
        style: { width: "75%", border: "1px solid #D2D2D2", height: "50px" },
      },
      {
        key: "score",
        header: "Score",
        style: { width: "10%", border: "1px solid #D2D2D2", height: "50px" },
      },
    ],
  },
];
