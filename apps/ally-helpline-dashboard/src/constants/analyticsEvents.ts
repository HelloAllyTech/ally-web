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
  // Dot-namespaced on purpose — these three are defined by the product analytics
  // spec and must match it verbatim, not the <noun>_<verb> convention above.
  LEARN_PAGE_VIEWED: "learn.page_viewed",
  LEARN_TAB_SWITCHED: "learn.tab_switched",
  CASE_OPENED: "case.opened",
  SIMULATION_OPENED: "simulation.opened",
  PATHWAY_OPENED: "pathway.opened",
  ROLEPLAY_START_CLICKED: "roleplay.start_clicked",

  // Roleplay summary (post-session)
  ROLEPLAY_SUMMARY_TAB_VIEWED: "roleplay_summary.tab_viewed",
  ROLEPLAY_SUMMARY_SHARE_TOGGLED: "roleplay_summary.share_toggled",
  ROLEPLAY_SUMMARY_RATED: "roleplay_summary.rated",
  BADGE_UNLOCKED: "badge.unlocked",

  // Review
  REVIEW_FILTER_CHANGED: "review.filter_changed",
  REVIEW_CONVERSATION_OPENED: "review.conversation_opened",
  REVIEW_COMMENT_ADDED: "review.comment_added",
  REVIEW_RECORDING_PLAYED: "review.recording_played",

  // Community
  COMMUNITY_PERIOD_CHANGED: "community.period_changed",
  ACHIEVEMENTS_OPENED: "achievements.opened",
  ACHIEVEMENTS_FILTER_CHANGED: "achievements.filter_changed",

  // Roleplay Logs
  ROLEPLAY_LOG_SUMMARY_VIEWED: "roleplay_log.summary_viewed",

  // Statistics
  STATISTICS_DATE_RANGE_CHANGED: "statistics.date_range_changed",

  // Account & global (sidebar account menu, language, streak history)
  PROFILE_SETTINGS_OPENED: "profile_settings.opened",
  PROFILE_UPDATED: "profile.updated",
  DATA_POLICY_VIEWED: "data_policy.viewed",
  // Distinct from the legacy `user_logged_out` above, which is still emitted by
  // useAnalytics().trackLogout — this is the account-menu logout the spec names.
  ACCOUNT_LOGGED_OUT: "user.logged_out",
  REPORT_PROBLEM_SUBMITTED: "report_problem.submitted",
  LANGUAGE_CHANGED: "language.changed",
  STREAK_HISTORY_EXPANDED: "streak.history_expanded",

  // Admin & Organization (upgrade / paywall)
  UPGRADE_PROMPT_SHOWN: "upgrade.prompt_shown",
  UPGRADE_CLICKED: "upgrade.clicked",

  // Errors
  API_ERROR_OCCURRED: "api_error_occurred",
} as const;

/**
 * `entry_point` values for `roleplay.start_clicked` — which surface the learner
 * pressed Start on. Shared across the three pages that can launch a roleplay,
 * so the strings cannot drift apart.
 */
export const ROLEPLAY_ENTRY_POINT = {
  CASE: "case",
  SIMULATION: "simulation",
  PATHWAY: "pathway",
  STREAK_WIDGET: "streak_widget",
} as const;

/** `tab` values for `roleplay_summary.tab_viewed`. */
export const ROLEPLAY_SUMMARY_TAB = {
  DEBRIEF: "debrief",
  SKILLS_DEMONSTRATED: "skills_demonstrated",
  ANNOTATED_TRANSCRIPT: "annotated_transcript",
  UP_NEXT: "up_next",
} as const;

/** `source` values for `review.recording_played`. */
export const REVIEW_RECORDING_SOURCE = {
  REVIEW_LIST: "review_list",
  CONVERSATION_DETAIL: "conversation_detail",
} as const;

/** `actor_type` values for `review.conversation_opened`. */
export const REVIEW_ACTOR_TYPE = {
  LEARNER: "learner",
  REVIEWER: "reviewer",
} as const;

/** `source` values for `language.changed`. */
export const LANGUAGE_CHANGE_SOURCE = {
  SIDEBAR: "sidebar",
  ROLEPLAY_CONFIRMATION_MODAL: "roleplay_confirmation_modal",
} as const;

/**
 * `period` values for `community.period_changed` — the leaderboard's own window
 * codes translated into the spec's calendar-length names.
 */
export const COMMUNITY_PERIOD: Record<string, string> = {
  LAST_WEEK: "last_7_days",
  LAST_MONTH: "last_28_days",
  LAST_YEAR: "last_364_days",
  ALL_TIME: "all_time",
};

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
  SIMULATION_NAME: "simulation_name",
  HAS_TRIGGER_WARNING: "has_trigger_warning",
  HAS_COMPLETED_BEFORE: "has_completed_before",
  SCENARIO_ID: "scenario_id",
  CREDITS_CONSUMED: "credits_consumed",

  // Page context
  PAGE_PATH: "page_path",
  PAGE_TITLE: "page_title",

  // Learn context
  INITIAL_TAB: "initial_tab",
  TAB: "tab",
  CASE_ID: "case_id",
  CASE_NAME: "case_name",
  ENTRY_POINT: "entry_point",
  ITEM_ID: "item_id",
  ITEM_NAME: "item_name",
  PATHWAY_ID: "pathway_id",
  PATHWAY_NAME: "pathway_name",
  SIMULATION_COUNT: "simulation_count",

  // Roleplay summary / review context
  SCENARIO_SESSION_ID: "scenario_session_id",
  ENABLED: "enabled",
  RATING: "rating",
  HAS_FEEDBACK_TEXT: "has_feedback_text",
  BADGE_NAME: "badge_name",
  BADGE_DESCRIPTION: "badge_description",
  REVIEW_ID: "review_id",
  REVIEWER_NAME: "reviewer_name",
  ACTOR_TYPE: "actor_type",
  COMMENT_LENGTH: "comment_length",
  FILTER: "filter",
  SOURCE: "source",

  // Community
  PERIOD: "period",
  UNLOCKED_COUNT: "unlocked_count",

  // Statistics
  RANGE: "range",

  // Account & global
  NAME_CHANGED: "name_changed",
  IMAGE_CHANGED: "image_changed",
  DESCRIPTION_LENGTH: "description_length",
  LANGUAGE: "language",
  VIEW: "view",

  // Search
  /**
   * ⚠️ DO NOT SEND. Declared only so nobody reintroduces it believing it was an
   * oversight.
   *
   * Helpline search terms describe whatever a caller is going through, so the
   * raw query is clinical detail about a third party and must not leave the
   * browser. `QUERY_LENGTH` plus `RESULT_COUNT` is what we capture instead: it
   * still shows that search is failing people on a route, which is what the
   * zero-result UX detector acts on, without recording what they typed.
   */
  SEARCH_QUERY: "search_query",
  QUERY_LENGTH: "query_length",
  RESULT_COUNT: "result_count",

  // Upgrade / paywall context
  ORG_ID: "org_id",
  TRIGGER_SOURCE: "trigger_source",
  CURRENT_PLAN: "current_plan",
  TARGET_PLAN: "target_plan",

  // Error context
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
  ENDPOINT: "endpoint",
} as const;
