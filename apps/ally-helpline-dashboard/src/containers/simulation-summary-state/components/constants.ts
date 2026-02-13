import { FeedbackSectionType } from "@types";

type Translator = (key: string) => string;

export const getFeedbackSections = (t: Translator) => [
  {
    key: "positives",
    label: t("summary.feedback.positives"),
    type: FeedbackSectionType.BULLET_TEXT,
  },
  {
    key: "improvements",
    label: t("summary.feedback.improvements"),
    type: FeedbackSectionType.BULLET_TEXT,
  },
  {
    key: "keyEvents",
    label: t("summary.feedback.keyEvents"),
    type: FeedbackSectionType.TABLE,
    columns: [
      {
        key: "time",
        header: t("summary.feedback.columns.time"),
        style: { width: "15%", border: "1px solid #D2D2D2", height: "50px" },
      },
      {
        key: "event",
        header: t("summary.feedback.columns.event"),
        style: { width: "75%", border: "1px solid #D2D2D2", height: "50px" },
      },
      {
        key: "score",
        header: t("summary.feedback.columns.score"),
        style: { width: "10%", border: "1px solid #D2D2D2", height: "50px" },
      },
    ],
  },
];
