/**
 * All PostHog event names used in ally-helpline-dashboard.
 *
 * Naming convention:  <noun>_<past_tense_verb>
 * Keep names lowercase with underscores — PostHog is case-sensitive.
 */
export const ANALYTICS_EVENTS = {
  // Auth
  USER_LOGGED_IN: "user_logged_in",
  USER_LOGGED_OUT: "user_logged_out",
  USER_LOGIN_FAILED: "user_login_failed",

  // Navigation
  PAGE_VIEWED: "page_viewed",

  // Calls
  CALL_STARTED: "call_started",
  CALL_ENDED: "call_ended",
  CALL_FEEDBACK_SUBMITTED: "call_feedback_submitted",

  // Simulation
  SIMULATION_STARTED: "simulation_started",
  SIMULATION_COMPLETED: "simulation_completed",
  SIMULATION_CREDITS_USED: "simulation_credits_used",
  // Diagnostic: how long after the agent joins can the learner actually hear it.
  // Splits the wait into "we were told about the track" vs "we subscribed to it",
  // so a silent-agent report can be attributed instead of guessed at.
  SIMULATION_AGENT_AUDIO_TIMING: "simulation_agent_audio_timing",

  // Audio
  AUDIO_UPLOADED: "audio_uploaded",
  AUDIO_PLAYBACK_STARTED: "audio_playback_started",

  // AI / Enhance
  AI_ENHANCEMENT_TRIGGERED: "ai_enhancement_triggered",
  AI_ENHANCEMENT_COMPLETED: "ai_enhancement_completed",

  // Search
  SEARCH_PERFORMED: "search_performed",
  SEARCH_RESULT_CLICKED: "search_result_clicked",

  // Analytics Page
  ANALYTICS_REPORT_VIEWED: "analytics_report_viewed",
  ANALYTICS_FILTER_APPLIED: "analytics_filter_applied",

  // Settings
  SETTINGS_UPDATED: "settings_updated",

  // Learn
  LEARN_MODULE_OPENED: "learn_module_opened",
  PATHWAY_STARTED: "pathway_started",

  // Errors
  API_ERROR_OCCURRED: "api_error_occurred",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Shared property keys sent alongside events.
 * Using constants prevents key-name drift across callers.
 */
export const ANALYTICS_PROPS = {
  // User context
  USER_ROLE: "user_role",
  USER_ID: "user_id",

  // Call context
  CALL_ID: "call_id",
  CALL_DURATION_SEC: "call_duration_seconds",
  CALL_TYPE: "call_type",

  // Simulation context
  SIMULATION_ID: "simulation_id",
  SCENARIO_ID: "scenario_id",
  CREDITS_CONSUMED: "credits_consumed",

  // Page context
  PAGE_PATH: "page_path",
  PAGE_TITLE: "page_title",

  // Search
  SEARCH_QUERY: "search_query",
  RESULT_COUNT: "result_count",

  // Error context
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
  ENDPOINT: "endpoint",
} as const;
