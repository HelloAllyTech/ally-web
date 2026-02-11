import { Alarm, BulbIcon, DiamondShine, KeyEvents, ThumbUp } from "@assets/icons";
import { FeedbackSectionType } from "@types";
import { convertSecondsToHMS, getSimulationScoreDisplay } from "@utils";

import { FeedbackSectionProps } from "./types";

export const feedbackDemographics = [
  {
    key: "duration",
    label: "Session Duration",
    icon: Alarm,
    getValue: (summary: FeedbackSectionProps) => {
      const startedAt = summary?.startedAt;
      const endedAt = summary?.endedAt;

      if (!startedAt || !endedAt) return "--";

      const startTime = new Date(startedAt).getTime();
      const endTime = new Date(endedAt).getTime();
      const durationInSeconds = Math.floor((endTime - startTime) / 1000);

      return convertSecondsToHMS(durationInSeconds);
    },
  },
  {
    key: "score",
    label: "Total Score",
    icon: DiamondShine,
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
  {
    icon: {
      icon: ThumbUp,
      alt: "what-went-well",
    },
    key: "positives",
    label: "What Went Well",
    type: FeedbackSectionType.BULLET_TEXT,
  },
  {
    icon: {
      icon: BulbIcon,
      alt: "improvement-tips",
    },
    key: "improvements",
    label: "Improvement Tips",
    type: FeedbackSectionType.BULLET_TEXT,
  },
];
