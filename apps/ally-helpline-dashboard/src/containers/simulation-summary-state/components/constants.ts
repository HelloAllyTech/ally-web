import { BulbIcon, KeyEvents, ThumbUp } from "@assets/icons";
import { FeedbackSectioonType } from "@types";

import { FeedbackSectionProps } from "./types";

// TODO: update keys based on api response
export const feedbackDemographics = [
  {
    key: "duration",
    label: "Session Duration",
    getValue: (summary: FeedbackSectionProps) => {
      if (!summary.startedAt || !summary.endedAt) return "--";

      const startTime = new Date(summary.startedAt).getTime();
      const endTime = new Date(summary.endedAt).getTime();
      const durationMs = endTime - startTime;

      const totalSeconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return `${minutes}m ${seconds}s`;
    },
  },
  {
    key: "score",
    label: "Total Score",
    getValue: (summary: FeedbackSectionProps) => summary?.score ?? "--",
  },
];

export const feedbackSections = [
  {
    icon: {
      icon: KeyEvents,
      alt: "key-events",
    },
    key: "keyEvents",
    label: "Key Events",
    type: FeedbackSectioonType.TABLE,
    columns: [
      { key: "time", header: "Time", style: { width: "15%", border: "1px solid #D2D2D2" } },
      { key: "event", header: "Event", style: { width: "75%", border: "1px solid #D2D2D2" } },
      { key: "score", header: "Score", style: { width: "10%", border: "1px solid #D2D2D2" } },
    ],
  },
  {
    icon: {
      icon: ThumbUp,
      alt: "what-went-well",
    },
    key: "whatWentWell",
    label: "What Went Well",
    type: FeedbackSectioonType.BULLET_TEXT,
  },
  {
    icon: {
      icon: BulbIcon,
      alt: "improvement-tips",
    },
    key: "improvementTips",
    label: "Improvement Tips",
    type: FeedbackSectioonType.BULLET_TEXT,
  },
];
