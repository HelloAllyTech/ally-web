import { Carousel1, Carousel4, Carousel3, Carousel2 } from "@assets";
import { CarouselSlideType } from "@components";

export const ALLY_URL = "https://www.helloally.ai";
export const ALLY_TERMS_URL = "https://www.helloally.ai/terms";
export const ALLY_PRIVACY_POLICY_URL = "https://www.helloally.ai/policy";
export const ALLY_DATA_POLICY_URL = "https://www.helloally.ai/privacy";

export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export enum MediaRecorderState {
  INACTIVE = "inactive",
  RECORDING = "recording",
  PAUSED = "paused",
}

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
  USER_STATUS: "userStatus",
  ROOM_DATA: "roomData",
};

export const SESSION_STORAGE_KEYS = {
  TRANSCRIPTION_GENERATION_VIDEO_SEEN: "transcription-generation-video-seen",
};

export const AUTH_RETRY_CONFIG = {
  MAX_ATTEMPTS: 4,
  RETRY_DELAY_MS: 1000,
} as const;

export const ApiEndpoints = {
  AUTH: {
    SIGNUP: "/auth/signup",
    LOGIN: "/auth/login",
    GET_USER: "/users/me",
    GET_PERMISSIONS: "/auth/permissions",
    GENERATE_OTP: "/auth/generate-otp",
    VERIFY_OTP: "/auth/verify-otp",
    REFRESH: "/auth/refresh",
  },
  ANALYTICS: {
    GET_DASHBOARD: "/analytics/dashboard",
    GET_COUNSELLOR_STATS: "/analytics/counselor-stats",
  },
  AUDIO_CALL: {
    GET_WAITING_CLIENTS: "/users/waiting-list",
    REQUEST_CALL: "/chats/request",
    GET_CLIENT_CHAT: "/chats/my-chat",
    GET_COUNSELLOR_CHAT: "/chats/counsellor-chat",
    GET_NUDGE_STATUS: "/settings/nudge-status",
    // Template functions for dynamic endpoints
    CANCEL_CHAT: (chatId: number) => `/chats/${chatId}/cancel`,
    ACCEPT_CHAT: (chatId: number) => `/chats/${chatId}/accept`,
    END_CHAT: (chatId: number) => `/chats/${chatId}/end`,
    MESSAGE_FEEDBACK: (messageId: number) => `chats/messages/${messageId}/feedback`,
    UPDATE_FEEDBACK: (feedbackId: number) => `chats/messages/feedback/${feedbackId}`,
  },
  CALLS: {
    GET_CALL_LOGS: "/chats/call-logs",
    GET_ADMIN_CALL_LOGS: "/chats/call-logs-summary",
    GET_COUNSELLORS: "/chats/counselors",
    GET_CALL_TAGS: "/chats/tags",
    GET_CHAT_TYPES: "/settings/chat-types",
    GET_AUDIO_UPLOAD_URL: "/chats/upload-url",
    CANCEL_AUDIO_UPLOAD: "/chats/cancel-upload",
    DELETE_CALL_LOG: (chatId: number) => `/chats/${chatId}`,
  },
  CALL_SUMMARY: {
    GET_SUMMARY_FIELDS: "/settings/summary-fields",
    GET_CALL_SUMMARY: "/chats",
    ENHANCE_CONTENT: "/chats/enhance",
    GET_TAG_POSITIVITY_RATINGS: "/chats/summary/tag-positivity-ratings",
    GET_LOCATIONS: "/places",
    SEARCH_LOCATIONS: "/places/search",
    // Template functions for dynamic endpoints
    UPDATE_CALL_INFO: (chatId: number) => `/chats/${chatId}/call-info`,
    UPDATE_CALL_SUMMARY: (chatId: number) => `/chats/${chatId}/call-details`,
    EXPORT_CALL_SUMMARY: (chatId: number) => `/chats/${chatId}/export-summary`,
    GET_TRANSCRIPT: (chatId: number) => `/chats/${chatId}/messages`,
    UPDATE_CALL_SUMMARY_NOTES: (chatId: string) => `/chats/${chatId}/notes`,
    SUBMIT_FEEDBACK: (chatId: string) => `/chats/${chatId}/summary-feedback`,
  },
  SEARCH: {
    GET_CATEGORIES: "/reference-document/categories",
    GET_SEARCH_RESULTS: "/reference-document/search",
  },
  LEARN: {
    END_SIMULATION: (sessionId: string) => `/learn/scenario-session/${sessionId}/end`,
    START_SIMULATION: "/learn/scenario-session-start",
    GET_SCENARIOS: "/learn/scenarios",
    GET_SCENARIO: (scenarioId: number) => `/learn/scenarios/${scenarioId}`,
    GET_SIMULATION_LOGS: "/learn/scenario-sessions",
    GET_ADMIN_SIMULATION_LOGS: "/learn/admin-scenario-sessions",
    GET_SIMULATION_SUMMARY: (sessionId: string) => `/learn/scenario-session/${sessionId}`,
    SUBMIT_SIMULATION_FEEDBACK: (sessionId: string) =>
      `/learn/scenario-session/${sessionId}/feedback`,
    GET_SIMULATION_TRANSCRIPT: (sessionId: string) =>
      `/learn/scenario-session/${sessionId}/messages`,
  },
};

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
