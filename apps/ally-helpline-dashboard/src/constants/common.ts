import { Carousel1, Carousel4, Carousel3, Carousel2 } from "@assets";
import { CarouselSlideType } from "@components";

export const ALLY_URL = "https://www.helloally.ai";
// In-app legal pages (see ROUTES.TERMS / ROUTES.PRIVACY). Opened in a new tab
// via openLinkInNewTab, which resolves the relative path against this origin.
export const ALLY_TERMS_URL = "/terms";
export const ALLY_PRIVACY_POLICY_URL = "/privacy";
export const ALLY_DATA_POLICY_URL = "/privacy";

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
  // Pins an in-progress character-interview session across a page reload.
  CHARACTER_INTERVIEW_SESSION_ID: "characterInterviewSessionId",
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
  SCENARIOS: "Scenarios",
  SIMULATION_SUMMARY: "SimulationSummary",
  SCENARIO_PATHWAY_DETAILS: "ScenarioPathwayDetails",
  SCENARIO_CASE_DETAILS: "ScenarioCaseDetails",
  PRACTICE_STREAK: "PracticeStreak",
  SIMULATION_CREDITS: "SimulationCredits",
  USER: "User",
  REVIEW: "Review",
  UNREAD_REVIEW_COUNT: "UnreadReviewCount",
  BADGES: "Badges",
  GENERAL_COMMENTS: "GeneralComments",
  CUSTOM_FIELD_DEFINITIONS: "CustomFieldDefinitions",
  CUSTOM_FIELD_VALUES: "CustomFieldValues",
  TOOLTIPS: "Tooltips",
  SETTINGS: "Settings",
  // Org. Settings screen (own tenant) resources
  OWN_TENANT: "OwnTenant",
  SUMMARY_SECTIONS: "SummarySections",
  CUSTOM_FIELD_TYPES: "CustomFieldTypes",
  CUSTOM_FIELDS_ENABLED: "CustomFieldsEnabled",
  SCRIBE_NOTE_CREATION_ENABLED: "ScribeNoteCreationEnabled",
  SCRIBE_VOICE_NOTE_ENABLED: "ScribeVoiceNoteEnabled",
  // Org. Settings access-management tabs (own tenant scenario/path/case/badge)
  ORG_SCENARIOS: "OrgScenarios",
  ORG_SCENARIO_PATHS: "OrgScenarioPaths",
  ORG_CASES: "OrgCases",
  ORG_BADGES: "OrgBadges",
  ORG_TRACKS: "OrgTracks",
  // Cohorts (own tenant): the list, the member roster, and the per-content
  // restriction map. Restrictions are their own tag because a restriction edit
  // must refresh the content tab without refetching the whole user roster.
  ORG_COHORTS: "OrgCohorts",
  ORG_COHORT_MEMBERS: "OrgCohortMembers",
  ORG_COHORT_RESTRICTIONS: "OrgCohortRestrictions",
  // Track 2.0 learner resources
  LEARN_TRACKS: "LearnTracks",
  LEARN_TRACK_DETAIL: "LearnTrackDetail",
  LEARN_TRACK_NEXT: "LearnTrackNext",
  // Character Library (own-tenant list)
  CHARACTER_LIBRARY: "CharacterLibrary",
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

export enum TooltipLocation {
  LOGIN_BUTTON = "login_button",
  // Navigation sidebar tabs
  LEARN_TAB = "learn_tab",
  REVIEW_TAB = "review_tab",
  BADGES_TAB = "badges_tab",
  COMMUNITY_TAB = "community_tab",
  SESSIONS_TAB = "sessions_tab",
  STATISTICS_TAB = "statistics_tab",
  SEARCH_TAB = "search_tab",
  // Navigation sidebar footer
  PROFILE_MENU = "profile_menu",
  LOGOUT_BUTTON = "logout_button",
  LANGUAGE_SELECTOR = "language_selector",
  // Key page actions
  START_SIMULATION_BUTTON = "start_simulation_button",
  START_SESSION_BUTTON = "start_session_button",
  UPLOAD_AUDIO_BUTTON = "upload_audio_button",
  // Seeded disabled — review + enable in admin Manage Tooltips. Wrap the target
  // element with <AppTooltip location={...}> to make each render when enabled.
  CALLS_REFRESH_BUTTON = "calls_refresh_button",
  CALLS_SESSION_MENU_BUTTON = "calls_session_menu_button",
  REVIEW_EMOJI_REACTION_BUTTON = "review_emoji_reaction_button",
  COMMENT_EDIT_BUTTON = "comment_edit_button",
  COMMENT_DELETE_BUTTON = "comment_delete_button",
  COMMENT_VISIBILITY_TOGGLE = "comment_visibility_toggle",
  SESSION_STAR_RATING = "session_star_rating",
  CREDITS_DISPLAY_METER = "credits_display_meter",
  OVERALL_SCORE_METER = "overall_score_meter",
  SHARE_FOR_REVIEW_TOGGLE = "share_for_review_toggle",
  SCENARIO_BACK_BUTTON = "scenario_back_button",
  SEARCH_CATEGORY_FILTER = "search_category_filter",
  REVIEW_SHOW_REACTIONS_MODAL = "review_show_reactions_modal",
  CALLS_SESSION_SCORE_ICON = "calls_session_score_icon",
  CALLS_SUMMARY_STATUS_ICON = "calls_summary_status_icon",
  REVIEW_REACTION_COUNT_SUMMARY = "review_reaction_count_summary",
  LEARN_CREDITS_DISPLAY = "learn_credits_display",
  REVIEW_FILTER_TOGGLE_GROUP = "review_filter_toggle_group",
}
