export const ApiEndpoints = {
  AUTH: {
    SIGNUP: "/v1/auth/signup",
    LOGIN: "/v1/auth/login",
    DEV_LOGIN: "/v1/auth/dev-login",
    GET_USER: "/v1/users/me",
    GENERATE_OTP: "/v2/auth/generate-otp",
    VERIFY_OTP: "/v2/auth/verify-otp",
    MAGIC_LINK_VERIFY: "/v1/auth/magic-link/verify",
    REFRESH: "/v1/auth/refresh",
    TERMS_AND_AGREEMENT: "/v1/users/terms-and-agreement-status",
    GOOGLE_SIGN_IN: "/v1/auth/google",
    PROFILE_IMAGE_URL: "/v1/users/profile-image-url",
    PROFILE_IMAGE: "/v1/users/profile-image",
    LOGO_URL: "/v1/users/tenant",
  },
  AUTHORIZATION: {
    GET_PERMISSIONS: "/v1/authorization/permissions",
  },
  ANALYTICS: {
    GET_DASHBOARD: "/v1/analytics/dashboard",
    GET_COUNSELLOR_STATS: "/v1/analytics/counselor-stats",
  },
  AUDIO_CALL: {
    GET_WAITING_CLIENTS: "/v1/users/waiting-list",
    GET_CLIENT_CHAT: "/v1/chats/my-chat",
    GET_COUNSELLOR_CHAT: "/v1/chats/counsellor-chat",
    GET_NUDGE_STATUS: "/v1/settings/nudge-status",
    // Template functions for dynamic endpoints
    CANCEL_CHAT: (chatId: number) => `/v1/chats/${chatId}/cancel`,
    END_CHAT: (chatId: number) => `/v1/chats/${chatId}/end`,
    MESSAGE_FEEDBACK: (messageId: number) => `/v1/chats/messages/${messageId}/feedback`,
    UPDATE_FEEDBACK: (feedbackId: number) => `/v1/chats/messages/feedback/${feedbackId}`,
  },
  CALLS: {
    GET_CALL_LOGS: "/v1/chats/call-logs",
    GET_ADMIN_CALL_LOGS: "/v1/chats/call-logs-summary",
    GET_COUNSELLORS: "/v1/chats/counselors",
    GET_CALL_TAGS: "/v1/chats/tags",
    GET_CHAT_TYPES: "/v1/settings/chat-types",
    GET_AUDIO_UPLOAD_URL: "/v1/chats/upload-url",
    CANCEL_AUDIO_UPLOAD: "/v1/chats/cancel-upload",
    PROCESS_AUDIO_UPLOAD: "/v1/chats/process-audio-upload",
    DELETE_CALL_LOG: (chatId: number) => `/v1/chats/${chatId}`,
    ARCHIVE_CALL_LOG: (chatId: number) => `/v1/chats/call-logs/${chatId}/archive`,
  },
  CALL_SUMMARY: {
    GET_SUMMARY_FIELDS: "/v1/settings/summary-fields",
    GET_CALL_SUMMARY: "/v1/chats",
    ENHANCE_CONTENT: "/v1/chats/enhance",
    GET_TAG_POSITIVITY_RATINGS: "/v1/chats/summary/tag-positivity-ratings",
    GET_LOCATIONS: "/v1/places",
    SEARCH_LOCATIONS: "/v1/places/search",
    UPDATE_CALL_INFO: (chatId: number) => `/v1/chats/${chatId}/call-info`,
    UPDATE_CALL_SUMMARY: (chatId: number) => `/v1/chats/${chatId}/call-details`,
    EXPORT_CALL_SUMMARY: (chatId: number) => `/v1/chats/${chatId}/export-summary`,
    GET_TRANSCRIPT: (chatId: number) => `/v1/chats/${chatId}/messages`,
    UPDATE_CALL_SUMMARY_NOTES: (chatId: string) => `/v1/chats/${chatId}/notes`,
    SUBMIT_FEEDBACK: (chatId: string) => `/v1/chats/${chatId}/summary-feedback`,
    SUMMARY_FIELDS: "/v1/settings/summary-fields",
  },
  SEARCH: {
    GET_CATEGORIES: "/v1/reference-document/categories",
    GET_SEARCH_RESULTS: "/v1/reference-document/search",
  },
  LEARN: {
    END_SIMULATION: (sessionId: string) => `/v1/learn/scenario-session/${sessionId}/end`,
    START_SIMULATION: "/v1/learn/scenario-session-start",
    GET_SCENARIOS: "/v1/learn/scenarios/public",
    GET_SCENARIOS_PRIVATE: "/v2/learn/scenarios",
    GET_SCENARIO: (scenarioId: number) => `/v1/learn/scenarios/${scenarioId}`,
    GET_SCENARIO_PUBLIC: (scenarioId: number) => `/v1/learn/scenarios/${scenarioId}/public`,
    GET_SCENARIO_PATHWAYS: "/v1/learn/scenario-paths",
    GET_SCENARIO_PATHWAY_DETAILS: (pathwayId: string) => `/v1/learn/scenario-paths/${pathwayId}`,
    GET_SIMULATION_LOGS: "/v1/learn/scenario-sessions",
    GET_ADMIN_SIMULATION_LOGS: "/v1/learn/admin-scenario-sessions",
    GET_SIMULATION_SUMMARY: (sessionId: string) => `/v1/learn/scenario-session/${sessionId}`,
    SUBMIT_SIMULATION_FEEDBACK: (sessionId: string) =>
      `/v1/learn/scenario-session/${sessionId}/feedback`,
    GET_SIMULATION_TRANSCRIPT: (sessionId: string) =>
      `/v1/learn/scenario-session/${sessionId}/messages`,
    GET_UP_COMING_SIMULATION: (sessionId: string) =>
      `/v1/learn/scenario-paths/${sessionId}/upcoming-scenario`,
    START_PATHWAY_SIMULATION: (pathwayId: string) =>
      `/v1/learn/scenario-paths/${pathwayId}/create-session`,
    SCENARIO_SESSION_BY_PATH_ITEM: (pathSessionItemId: string) =>
      `/v1/learn/scenario-session/scenario-path-session-item/${pathSessionItemId}`,
    GET_AVAILABLE_LANGUAGES: "/v1/learn/scenario-languages",
    GET_SCENARIO_CASES: "/v1/learn/cases",
    GET_SCENARIO_CASE_DETAILS: (caseId: string) => `/v1/learn/cases/${caseId}`,
    SCENARIO_SESSION_BY_CASE_ITEM: (caseSessionItemId: string) =>
      `/v1/learn/scenario-session/case-session-item/${caseSessionItemId}`,
    START_CASE_SIMULATION: (caseId: string) => `/v1/learn/cases/${caseId}/create-session`,
    GET_UP_COMING_CASE_SIMULATION: (caseSessionItemId: string) =>
      `/v1/learn/cases/${caseSessionItemId}/upcoming-scenario`,
    REFLECTION_PROMPTS: (sessionId: string) =>
      `/v1/learn/scenario-session/${sessionId}/reflection-prompts`,
    UPDATE_REFLECTION_PROMPT: (sessionId: string, reflectionPromptId: string) =>
      `/v1/learn/scenario-session/${sessionId}/reflection-prompts/${reflectionPromptId}`,
    GET_SIMULATION_CHECKLIST: (sessionId: string) =>
      `/v1/learn/scenario-session/${sessionId}/event-checklist`,
    GET_SIMULATION_SKILLS: (sessionId: string) => `/v1/learn/scenario-session/${sessionId}/skills`,
    CHAT_STREAM: (sessionId: string) => `/v1/learn/scenario-sessions/${sessionId}/chat/stream`,
    CHAT_HISTORY: (sessionId: string) => `/v1/learn/scenario-sessions/${sessionId}/chat/history`,
    GET_AUDIO_URL: (sessionId: string) => `/v1/learn/scenario-session/${sessionId}/recording`,
  },
  SIMULATION: {
    SIMULATION_CREDITS: "/v1/simulation-credits",
  },
  USER: {
    UPDATE_USER_PREFERENCES: "/v1/users/preferences",
    GET_USER_PREFERENCES: "/v1/users/me/preferences",
  },
  LEADERBOARD: {
    GET_LEADERBOARD: "/v1/community/leaderboard",
    GET_CURRENT_USER: "/v1/community/leaderboard/my-rank",
  },
  REVIEWS: {
    GET_REVIEWS: "/v1/scenario-session-reviews",
    GET_SCRIBE_REVIEWS: "/v1/scribe-session-reviews",
    GET_GENERAL_COMMENTS: (reviewId: string) => `/v1/scenario-session-reviews/${reviewId}/comments`,
    GET_SCRIBE_GENERAL_COMMENTS: (reviewId: string) =>
      `/v1/scribe-session-reviews/${reviewId}/comments`,
    GET_GENERAL_COMMENTS_OVERVIEW: (reviewId: string) =>
      `/v1/scenario-session-reviews/${reviewId}/comments-overview`,
    GET_SCRIBE_GENERAL_COMMENTS_OVERVIEW: (reviewId: string) =>
      `/v1/scribe-session-reviews/${reviewId}/comments-overview`,
    GET_REVIEW_BY_ID: (reviewId: string) => `/v1/scenario-session-reviews/${reviewId}`,
    GET_SCRIBE_REVIEW_BY_ID: (reviewId: string) => `/v1/scribe-session-reviews/${reviewId}`,
    GET_REVIEW_DETAILS_AND_MESSAGES: (reviewId: string) =>
      `/v1/scenario-session-reviews/${reviewId}/messages`,
    GET_SCRIBE_REVIEW_DETAILS_AND_MESSAGES: (reviewId: string) =>
      `/v1/scribe-session-reviews/${reviewId}/messages`,
    CREATE_REVIEW: `/v1/scenario-session-reviews`,
    CREATE_SCRIBE_REVIEW: `/v1/scribe-session-reviews`,
    UPDATE_REVIEW: (reviewId: string) => `/v1/scenario-session-reviews/${reviewId}`,
    UPDATE_SCRIBE_REVIEW: (scribeSessionId: number) =>
      `/v1/scribe-session-reviews/${scribeSessionId}`,
    CREATE_COMMENT: (reviewId: string) => `/v1/scenario-session-reviews/${reviewId}/comments`,
    CREATE_SCRIBE_COMMENT: (reviewId: string) => `/v1/scribe-session-reviews/${reviewId}/comments`,
    GET_REVIEW_THREADS: (reviewId: string) => `/v1/scenario-session-reviews/${reviewId}/threads`,
    GET_SCRIBE_REVIEW_THREADS: (reviewId: string) =>
      `/v1/scribe-session-reviews/${reviewId}/threads`,
    ADD_REACTION: (reviewId: string) => `/v1/scenario-session-reviews/${reviewId}/reactions`,
    ADD_SCRIBE_REACTION: (reviewId: string) => `/v1/scribe-session-reviews/${reviewId}/reactions`,
    GET_REVIEW_REACTIONS: (reviewId: string) =>
      `/v1/scenario-session-reviews/${reviewId}/reactions`,
    GET_SCRIBE_REVIEW_REACTIONS: (reviewId: string) =>
      `/v1/scribe-session-reviews/${reviewId}/reactions`,
    GET_REVIEW_REACTIONS_COUNT: (reviewId: string) =>
      `/v1/scenario-session-reviews/${reviewId}/reactions/count`,
    GET_SCRIBE_REVIEW_REACTIONS_COUNT: (reviewId: string) =>
      `/v1/scribe-session-reviews/${reviewId}/reactions/count`,
    ADD_COMMENT_REACTION: (commentId: string) =>
      `/v1/scenario-session-reviews/comments/${commentId}/reactions`,
    ADD_SCRIBE_COMMENT_REACTION: (commentId: string) =>
      `/v1/scribe-session-reviews/comments/${commentId}/reactions`,
    TOGGLE_COMMENT_VISIBILITY: (commentId: string) =>
      `/v1/scenario-session-reviews/comments/${commentId}/visibility`,
    TOGGLE_SCRIBE_COMMENT_VISIBILITY: (commentId: string) =>
      `/v1/scribe-session-reviews/comments/${commentId}/visibility`,
    EDIT_COMMENT: (commentId: string) => `/v1/scenario-session-reviews/comments/${commentId}`,
    EDIT_SCRIBE_COMMENT: (commentId: string) => `/v1/scribe-session-reviews/comments/${commentId}`,
    DELETE_COMMENT: (commentId: string) => `/v1/scenario-session-reviews/comments/${commentId}`,
    DELETE_SCRIBE_COMMENT: (commentId: string) =>
      `/v1/scribe-session-reviews/comments/${commentId}`,
    GET_COMMENT_REPLIES: (commentId: string) =>
      `/v1/scenario-session-reviews/comments/${commentId}/replies`,
    GET_SCRIBE_COMMENT_REPLIES: (commentId: string) =>
      `/v1/scribe-session-reviews/comments/${commentId}/replies`,
    GET_REVIEW_THREAD_COMMENTS: (threadId: string) =>
      `/v1/scenario-session-reviews/threads/${threadId}/comments`,
    GET_SCRIBE_REVIEW_THREAD_COMMENTS: (threadId: string) =>
      `/v1/scribe-session-reviews/threads/${threadId}/comments`,
    GET_UNREAD_COUNT: "/v1/scenario-session-reviews/unread-count",
    GET_SCRIBE_UNREAD_COUNT: "/v1/scribe-session-reviews/unread-count",
    MARK_READ: (reviewId: string) => `/v1/scenario-session-reviews/${reviewId}/mark-read`,
    MARK_SCRIBE_READ: (reviewId: string) => `/v1/scribe-session-reviews/${reviewId}/mark-read`,
  },
  BADGES: {
    GET_AVAILABLE_BADGES: "/v1/badges/me/available",
    GET_MY_BADGES: "/v1/badges/me",
    GET_BADGES_COUNT: "/v1/badges/me/count",
    UPDATE_BADGE_VIEW_STATUS: (badgeId: string) => `/v1/badges/me/${badgeId}/viewed`,
  },
  CUSTOM_FIELDS: {
    GET_DEFINITIONS: "/v1/custom-fields/definitions",
    CREATE_DEFINITION: "/v1/custom-fields/definitions",
    REORDER_DEFINITIONS: "/v1/custom-fields/definitions/reorder",
    UPDATE_DEFINITION: (id: string) => `/v1/custom-fields/definitions/${id}`,
    DELETE_DEFINITION: (id: string) => `/v1/custom-fields/definitions/${id}`,
    GET_VALUES: (chatId: number) => `/v1/custom-fields/values/${chatId}`,
    UPSERT_VALUES: (chatId: number) => `/v1/custom-fields/values/${chatId}`,
  },
  SETTINGS: {
    GET_SUMMARY_SECTIONS: "/v1/settings/summary-sections",
    GET_CUSTOM_FIELD_TYPES: "/v1/settings/custom-field-types",
    GET_CUSTOM_FIELDS_ENABLED: "/v1/settings/custom-fields-enabled",
  },
  TOOLTIPS: {
    GET_ACTIVE_TOOLTIPS: "/v1/tooltips/active",
  },
};
