import { CircleConfig } from "./types";

export const circleList: CircleConfig[] = [
  { scale: 3, isStatic: false },
  { scale: 4, isStatic: false },
];

export const circleStyles = {
  BASE_SIZE: 60,
  TRANSITION_MS: 200,
  MIN_SCALE: 1,
  BORDER: {
    WIDTH: 0.5,
    COLOR: "rgba(45, 115, 186, 0.3)",
  },
  BACKGROUND_COLOR: "#57585B",
} as const;

export const scoreLevels = [
  {
    level: "Very Low",
    meterClassname: "bg-[#FF5454]",
  },
  {
    level: "Low",
    meterClassname: "bg-[#FF8A8A]",
  },
  {
    level: "Neutral",
    meterClassname: "bg-[#E8E8E8]",
  },
  {
    level: "Good",
    meterClassname: "bg-[#BAD4B8]",
  },
  {
    level: "Very Good",
    meterClassname: "bg-[#26AF6C]",
  },
];

export const MAX_SESSION_MINUTES = 1800; // 30 mins
export const WARNING_THRESHOLD = 30; // 30 seconds before end

export const audioLevelConfig = {
  fftSize: 256,
  normalizationFactor: 128,
  threshold: 0.01,
} as const;
