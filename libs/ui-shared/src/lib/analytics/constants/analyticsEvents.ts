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
  // A session the learner could not start: the connect failed, the browser
  // refused the microphone, or no agent joined. Carries failure_kind + the error.
  SIMULATION_CONNECTION_FAILED: "simulation_connection_failed",

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

  // Text helpline. NEVER send message text, display names, summaries, risk
  // signals or anything a talker or listener wrote — only the chat uuid and
  // coarse enums/counts. The talker page and the listener transcript also
  // carry `ph-no-capture`, so session replay and autocapture skip them.
  TALKER_SESSION_STARTED: "talker_session_started",
  TALKER_QUEUE_LEFT: "talker_queue_left",
  TALKER_CHAT_ENDED: "talker_chat_ended",
  TALKER_FEEDBACK_SUBMITTED: "talker_feedback_submitted",
  TALKER_CONVERSATION_DELETED: "talker_conversation_deleted",
  TALKER_QUICK_EXIT_USED: "talker_quick_exit_used",
  HELPLINE_CHAT_CLAIMED: "helpline_chat_claimed",
  HELPLINE_SUGGESTION_INSERTED: "helpline_suggestion_inserted",
  HELPLINE_RISK_ACKNOWLEDGED: "helpline_risk_acknowledged",
  HELPLINE_CHAT_ENDED_BY_LISTENER: "helpline_chat_ended_by_listener",
  HELPLINE_TRANSFER_REQUESTED: "helpline_transfer_requested",
  HELPLINE_CHAT_ASSIGNED: "helpline_chat_assigned",
  HELPLINE_CHAT_TAKEN_OVER: "helpline_chat_taken_over",
  HELPLINE_WHISPER_SENT: "helpline_whisper_sent",
  HELPLINE_TALKER_BLOCKED: "helpline_talker_blocked",
  HELPLINE_SUPERVISOR_ALERTED: "helpline_supervisor_alerted",
  HELPLINE_QA_VIEWED: "helpline_qa_viewed",

  // Conversational homepage at /v2 — public and signed out. Topics are coarse
  // enums. The ONLY free text is `question_text`, sent for a question Ally had
  // no answer for, scrubbed of emails, numbers and links first (see
  // `scrubQuestion`); a message that matched distress is never sent at all.
  HOME_V2_SUGGESTION_TAPPED: "home_v2_suggestion_tapped",
  HOME_V2_QUESTION_ASKED: "home_v2_question_asked",
  HOME_V2_PRACTICE_RESPONSE_CHOSEN: "home_v2_practice_response_chosen",
  HOME_V2_SUPPORT_SHOWN: "home_v2_support_shown",
  HOME_V2_SIGN_IN_STARTED: "home_v2_sign_in_started",

  // Course landing page (`/course/:trackId`), usually signed out. Sends the
  // course id and which reply was picked — never the reply text.
  COURSE_LANDING_FIRST_MOVE_CHOSEN: "course_landing_first_move_chosen",

  // Admin
  SIDEBAR_INTERACTION: "sidebar_interaction",
} as const;

/** `source` values for the /v2 homepage's `home_v2_*` events. */
export const HOME_V2_SOURCE = {
  HEADER: "header",
  SUGGESTION: "suggestion",
  TYPED: "typed",
  REMEMBERED: "remembered",
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
  HOME_V2: "home_v2",
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
  // simulation_connection_failed: connect | microphone | agent_absent
  FAILURE_KIND: "failure_kind",
  ERROR_NAME: "error_name",

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
  // VOICE | TEXT. Sent only on sessions where text chat was on offer.
  INTERACTION_MODE: "interaction_mode",
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

  // Text helpline context (no content — see the events above)
  HELPLINE_CHAT_ID: "chat_id",
  HELPLINE_SCREEN: "screen",
  HELPLINE_CHAT_STATUS: "chat_status",
  HELPLINE_RISK_LEVEL: "risk_level",
  HELPLINE_RISK_OUTCOME: "risk_outcome",
  HELPLINE_RISK_SOURCE: "risk_source",
  HELPLINE_SKILL_KEY: "skill_key",
  HELPLINE_SUGGESTION_INDEX: "suggestion_index",
  HELPLINE_HAS_DISPLAY_NAME: "has_display_name",
  HELPLINE_WAIT_SECONDS: "wait_seconds",
  HELPLINE_MESSAGE_COUNT: "message_count",
  HELPLINE_ACTOR: "actor",
  HELPLINE_HAS_TARGET: "has_target",
  HELPLINE_HAS_REASON: "has_reason",
  HELPLINE_HAS_NOTE: "has_note",
  HELPLINE_ALERTED_COUNT: "alerted_count",
  HELPLINE_QA_VIEWER: "viewer",

  // Homepage v2 context
  HOME_V2_TOPIC: "topic",
  HOME_V2_MATCHED: "matched",
  // Scrubbed, unmatched questions only — see the HOME_V2_* events above.
  HOME_V2_QUESTION_TEXT: "question_text",
  HOME_V2_PRACTICE_CHOICE: "practice_choice",
  HOME_V2_AUTH_METHOD: "auth_method",

  // Course landing page context
  COURSE_ID: "course_id",
  REPLY_INDEX: "reply_index",

  // Sidebar context
  ACTION: "action",
} as const;
