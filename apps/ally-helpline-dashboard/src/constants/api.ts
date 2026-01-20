export const ApiEndpoints = {
  AUTH: {
    SIGNUP: "/v1/auth/signup",
    LOGIN: "/v1/auth/login",
    GET_USER: "/v1/users/me",
    GENERATE_OTP: "/v2/auth/generate-otp",
    VERIFY_OTP: "/v2/auth/verify-otp",
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
    DELETE_CALL_LOG: (chatId: number) => `/v1/chats/${chatId}`,
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
};
