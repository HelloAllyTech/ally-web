import { BulbIcon, KeyEvents, ThumbUp } from "@assets/icons";
import { FeedbackSectioonType } from "@types";
import { convertSecondsToHMS, getSimulationScoreDisplay } from "@utils";

import { FeedbackSectionProps } from "./types";

export const feedbackDemographics = [
  {
    key: "duration",
    label: "Session Duration",
    getValue: (summary: FeedbackSectionProps) => {
      const createdAt = summary?.createdAt;
      const endedAt = summary?.endedAt;

      if (!createdAt || !endedAt) return "--";

      const startTime = new Date(createdAt).getTime();
      const endTime = new Date(endedAt).getTime();
      const durationInSeconds = Math.floor((endTime - startTime) / 1000);

      return convertSecondsToHMS(durationInSeconds);
    },
  },
  {
    key: "score",
    label: "Total Score",
    getValue: (summary: FeedbackSectionProps) => getSimulationScoreDisplay(summary?.score, true),
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
    key: "positives",
    label: "What Went Well",
    type: FeedbackSectioonType.BULLET_TEXT,
  },
  {
    icon: {
      icon: BulbIcon,
      alt: "improvement-tips",
    },
    key: "improvements",
    label: "Improvement Tips",
    type: FeedbackSectioonType.BULLET_TEXT,
  },
];
