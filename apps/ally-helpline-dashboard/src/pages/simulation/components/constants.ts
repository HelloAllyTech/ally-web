import { CircleConfig } from "./types";

export const circleList: CircleConfig[] = [
  { scale: 1, isStatic: true },
  { scale: 2, isStatic: true },
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
  GRADIENT: {
    START_COLOR: "45, 115, 186", // RGB for #2D73BA
    END_COLOR: "231, 244, 255", // RGB for #E7F4FF
    ANGLE: 180,
  },
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

export const MAX_SESSION_MINUTES = 600; // 10 mins
export const WARNING_THRESHOLD = 30; // 30 seconds before end
