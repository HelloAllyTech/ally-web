import { BulbIcon, ListIcon } from "@assets/icons";

// TODO: update keys based on api response
export const feedbackDemographics = [
  {
    key: "duration",
    label: "Session Duration",
  },
  {
    key: "questions",
    label: "Open-Ended Questions",
  },
  {
    key: "empathy",
    label: "Empathy & Validation",
  },
  {
    key: "activeListening",
    label: "Active Listening",
  },
];

export const feedbackSections = [
  {
    icon: {
      icon: ListIcon,
      alt: "key-events",
    },
    key: "keyEvents",
    label: "Key Events",
  },
  {
    icon: {
      icon: BulbIcon,
      alt: "improvement-tips",
    },
    key: "improvementTips",
    label: "Improvement Tips",
  },
];
