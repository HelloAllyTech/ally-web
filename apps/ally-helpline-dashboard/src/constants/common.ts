import { Carousel1, Carousel4, Carousel3, Carousel2 } from "@assets";
import { CarouselSlideType } from "@components";

export const ALLY_URL = "https://www.helloally.ai";
export const ALLY_TERMS_URL = "https://www.helloally.ai/terms";
export const ALLY_PRIVACY_POLICY_URL = "https://www.helloally.ai/policy";
export const ALLY_DATA_POLICY_URL = "https://www.helloally.ai/policy";

export enum MediaRecorderState {
  INACTIVE = "inactive",
  RECORDING = "recording",
  PAUSED = "paused",
}

export const PLATFORM_EMOJIS = ["1f44d", "2764-fe0f", "1f604", "1f44f", "1f4a1", "1F44E"];

export enum KeyboardKeys {
  BACKSPACE = "Backspace",
  ARROW_LEFT = "ArrowLeft",
  ARROW_RIGHT = "ArrowRight",
  ARROW_UP = "ArrowUp",
  ARROW_DOWN = "ArrowDown",
  ENTER = "Enter",
  ESCAPE = "Escape",
  TAB = "Tab",
  DELETE = "Delete",
  SPACE = " ",
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SINGLE_DIGIT_REGEX = /^\d$/;

export enum LanguageMap {
  bn = "Bengali",
  en = "English",
  gu = "Gujarati",
  hi = "Hindi",
  kn = "Kannada",
  ml = "Malayalam",
  or = "Oriya",
  pa = "Punjabi",
  ta = "Tamil",
  te = "Telugu",
}

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

export const LOCAL_STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  ROOM_DATA: "roomData",
};

export const SESSION_STORAGE_KEYS = {
  TRANSCRIPTION_GENERATION_VIDEO_SEEN: "transcription-generation-video-seen",
};

export const AUTH_RETRY_CONFIG = {
  MAX_ATTEMPTS: 4,
  RETRY_DELAY_MS: 1000,
} as const;

export const CAROUSEL_SLIDES: CarouselSlideType[] = [
  {
    imageSrc: Carousel1,
    text: "We do not save audio recordings",
  },
  {
    imageSrc: Carousel2,
    text: "We do not use your client’s data to train our models",
  },
  {
    imageSrc: Carousel3,
    text: "Personal information of clients is automatically removed",
  },
  {
    imageSrc: Carousel4,
    text: "Data is encrypted",
  },
];

export const TOOLTIP_LIGHT_PROPS = {
  tooltip: {
    sx: {
      backgroundColor: "#FFFFFF",
      color: "#1D1B20",
      fontSize: "12px",
      maxWidth: "400px",
      zIndex: 1000,
    },
  },
};

export const TOOLTIP_DARK_PROPS = {
  tooltip: {
    sx: {
      backgroundColor: "#1C1B1F",
      color: "white",
      fontSize: "12px",
      maxWidth: "400px",
      zIndex: 1000,
    },
  },
};

export enum LoginSection {
  EMAIL = "Email",
  OTP = "OTP",
}

export const TAG_TYPES = {
  CALL_SUMMARY: "CallSummary",
  CALL_LOGS: "CallLogs",
  SIMULATION_LOGS: "SimulationLogs",
  SIMULATION_SUMMARY: "SimulationSummary",
  SCENARIO_PATHWAY_DETAILS: "ScenarioPathwayDetails",
  SCENARIO_CASE_DETAILS: "ScenarioCaseDetails",
  SIMULATION_CREDITS: "SimulationCredits",
  USER: "User",
  REVIEW: "Review",
  UNREAD_REVIEW_COUNT: "UnreadReviewCount",
  BADGES: "Badges",
  REFLECTION_PROMPTS: "ReflectionPrompts",
  GENERAL_COMMENTS: "GeneralComments",
  CUSTOM_FIELD_DEFINITIONS: "CustomFieldDefinitions",
  CUSTOM_FIELD_VALUES: "CustomFieldValues",
};

export const SORT_ORDER = {
  ASC: "ASC",
  DESC: "DESC",
};

export const toolTipStyles = {
  tooltip: {
    sx: {
      backgroundColor: "#000",
      color: "white",
      borderRadius: "5px",
      maxWidth: "250px",
      whiteSpace: "normal",
    },
  },
};
