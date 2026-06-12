export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
};

export const DASHBOARD_TABS = {
  ORG_ANALYTICS: "ORG_ANALYTICS",
  CALL_LOG_ANALYTICS: "CALL_LOG_ANALYTICS",
  SIMULATION_ANALYTICS: "SIMULATION_ANALYTICS",
};

export const ApiEndpoints = {
  AUTH: {
    SIGNUP: "/v1/auth/signup",
    LOGIN: "/v1/auth/login",
    GOOGLE_SIGN_IN: "/v1/auth/google",
    GET_USER: "/v1/users/me",
    GENERATE_OTP: "/v2/auth/generate-otp",
    VERIFY_OTP: "/v2/auth/verify-otp",
    MAGIC_LINK_VERIFY: "/v1/auth/magic-link/verify",
    REFRESH: "/v1/auth/refresh",
    PROFILE_IMAGE_URL: "/v1/users/profile-image-url",
    PROFILE_IMAGE: "/v1/users/profile-image",
    GET_USER_IMPERSONATED_TOKENS: "/v1/auth/impersonate",
  },
  AI: {
    GET_PREVIEW_VOICE: (voiceId: string) => `/v1/voice-preview/generate/${voiceId}`,
  },
  SIMULATION_STUDIO: {
    GET_SIMULATIONS: "/v1/learn/admin-scenarios",
    GET_ADMIN_SIMULATION_BY_ID: (id: string) => `/v1/learn/admin-scenarios/${id}`,
    CREATE_SIMULATION: "/v1/learn/scenarios",
    UPDATE_SIMULATION_BY_ID: (id: string | number) => `/v1/learn/scenarios/${id}`,
    SIMULATION_BY_ID: (id: string | number) => `/v1/learn/admin-scenarios/${id}`,
    START_SIMULATION: "/v1/learn/scenario-session-start",
    END_SIMULATION: (sessionId: string) => `/v1/learn/scenario-session/${sessionId}/end`,
    SCENARIO_VOICES: "/v1/learn/scenario-voices",
    CREATE_SCENARIO_VOICE: "/v1/learn/scenario-voices",
    UPDATE_SCENARIO_VOICE: (id: string | number) => `/v1/learn/scenario-voices/${id}`,
    SCENARIO_VOICE_LANGUAGES: "/v1/learn/scenario-voice-languages",
    SCENARIO_LANGUAGES: "/v1/learn/scenario-languages",
    GET_LANGUAGES: "/v1/language",
    CREATE_LANGUAGE: "/v1/language",
    UPDATE_LANGUAGE: (id: string | number) => `/v1/language/${id}`,
    SESSION_EVENTS: "/v1/session-events",
    GET_SESSION_EVENT_BY_ID: (eventId: string) => `/v1/session-events/events/${eventId}`,
    UPDATE_SESSION_EVENT: (eventId: string) => `/v1/session-events/events/${eventId}`,
    DELETE_SESSION_EVENTS: "/v1/session-events/events",
    GET_COVER_IMAGE_URL: "/v1/learn/scenarios/cover-image-url",
    DELETE_COVER_IMAGE: "/v1/learn/cover-image",
    GET_COVER_VIDEO_URL: "/v1/learn/scenarios/cover-video-url",
    DELETE_COVER_VIDEO: "/v1/learn/cover-video",
    MAP_SCENARIO_EVENTS: "/v1/learn/scenarios/map-events",
    GET_MAPPED_SCENARIO_EVENTS: (id: number | string) => `/v1/learn/scenarios/${id}/events`,
    SCENARIO_EVENTS: "/v1/learn/scenarios/events",
    SCENARIO_PREVIEW: "/v1/learn/scenarios/preview",
    DISPATCH_PREVIEW_AGENT: "/v1/learn/scenarios/preview/dispatch-agent",
    END_SCENARIO_PREVIEW: (sessionId: number | string) =>
      `/v1/learn/scenarios/preview/${sessionId}/end`,
    SIMULATION_TENANT_VISIBILITY: (tenantId: string) => `v1/learn/scenario/tenant/${tenantId}`,
    CASE_TENANT_VISIBILITY: (tenantId: string) => `v1/learn/admin/cases/tenant/${tenantId}`,
    SCENARIO_PATHS: "v1/learn/admin/scenario-paths",
    SCENARIO_PATH_BY_ID: (id: string | number) => `/v1/learn/admin/scenario-paths/${id}`,
    DUPLICATE_SCENARIO_PATH: (id: string | number) =>
      `/v1/learn/admin/scenario-paths/${id}/duplicate`,
    DUPLICATE_SIMULATION: (id: string | number) => `/v1/learn/scenarios/${id}/duplicate`,
    PATH_TENANT_VISIBILITY: (tenantId: string | number) =>
      `v1/learn/admin/scenario-paths/tenant/${tenantId}`,
    TRIGGER_WARNINGS: "/v1/learn/trigger-warnings",
    POST_LOGO_URL: "v1/tenants/logo-url",
    DELETE_LOGO: "v1/tenants/logo",
    DYNAMIC_BRANCHING_INSTRUCTIONS: "/v1/learn/branching-instruction-dynamic-shortcuts",
    SESSION_EVENT_TAGS: "/v1/session-events/tags",
    SCENARIO_CASES: "/v1/learn/admin/cases",
    SCENARIO_CASE_BY_ID: (id: string | number) => `/v1/learn/admin/cases/${id}`,
    DUPLICATE_SCENARIO_CASE: (id: string | number) => `/v1/learn/admin/cases/${id}/duplicate`,
    UPDATE_SIMULATION_CASE_BY_ID: (id: string | number) => `/v1/learn/admin/cases/${id}`,
    GET_PROMPTS: "/v1/prompts",
    GET_PROMPTS_BY_TYPE: (promptType: string) => `/v1/prompts/by-type/${promptType}`,
    CREATE_PROMPT: "/v1/prompts",
    UPDATE_PROMPT: (id: string | number) => `/v1/prompts/${id}`,
    DUPLICATE_PROMPT: (id: string | number) => `/v1/prompts/${id}/duplicate`,
    REVERT_PROMPT: (id: string | number) => `/v1/prompts/${id}/revert`,
    GET_PROMPT_USAGE: (id: string | number) => `/v1/prompts/${id}/usage`,
    GET_REPORT_BY_ID: (reportId: string) => `/v1/learn/scenarios/reports/${reportId}`,
    GET_REPORTS: (scenarioId: string) => `/v1/learn/scenarios/${scenarioId}/reports`,
    GENERATE_REPORT: (scenarioId: string) => `/v1/learn/scenarios/${scenarioId}/reports`,
    CANCEL_REPORT_GENERATION: (reportId: string) =>
      `/v1/learn/scenarios/reports/${reportId}/cancel`,
    GET_REPORT_TRANSCRIPT: (reportId: string) =>
      `/v1/learn/scenarios/reports/${reportId}/transcripts`,
    SCENARIO_COVER_IMAGE_LIBRARY: "/v1/scenario-cover-image-library",
    CONVERSATIONAL_GUARDRAILS: "/v1/learn/conversational-guardrails",
    HELPER_TAGS: "/v1/learn/scenario-behaviors",
    FILLER_TAGS: "/v1/learn/filler-tags",
    GET_AUTOFILL_MODELS: "/v1/learn/models",
    GENERATE_FIELD: "/v1/learn/scenarios/generate-field",
    COMPETENCIES: "/v1/learn/competencies",
  },

  CHARACTERS: {
    GET_CHARACTERS: "/v1/scenario-characters",
    CREATE_CHARACTER: "/v1/scenario-characters",
    GET_CHARACTER_BY_ID: (id: string) => `/v1/scenario-characters/${id}`,
    UPDATE_CHARACTER: (id: string) => `/v1/scenario-characters/${id}`,
    DELETE_CHARACTER: "/v1/scenario-characters",
  },

  USER_MANAGEMENT: {
    USERS: "/v1/users",
    TENANT: "/v1/tenant",
    TENANTS: "/v1/tenants",
    TENANTS_BY_ID: (id: string) => `/v1/tenants/${id}`,
    ADD_USER: "/v1/users",
    SIMULATION_CREDITS: "/v1/simulation-credits",
    SUMMARY_SECTIONS: `/v1/settings/summary-sections`,
    SUMMARY_FIELDS: `/v1/settings/summary-fields`,
    DASHBOARD_SETTINGS_ALL: `/v1/analytics/dashboard/all`,
    CUSTOM_FIELD_TYPES: `/v1/settings/custom-field-types`,
    CUSTOM_FIELDS_ENABLED: `/v1/settings/custom-fields-enabled`,
    CUSTOM_FIELD_DEFINITIONS: `/v1/custom-fields/definitions`,
    CUSTOM_FIELD_DEFINITION_BY_ID: (id: string) => `/v1/custom-fields/definitions/${id}`,
    USER_ADMIN_TENANTS: (userId: number) => `/v1/users/${userId}/admin-tenants`,
    ADMIN_TENANTS: "/v1/users/admin-tenants",
  },
  USER_BADGES: {
    GET_BADGES: "/v1/badges",
    UPLOAD_BADGE_ICON: "/v1/badges/badge-image-url",
    DELETE_BADGE_ICON: `/v1/badges/badge-image`,
    CREATE_BADGE: "/v1/badges",
    UPDATE_BADGE: (id: string) => `/v1/badges/${id}`,
    DELETE_BADGE: (id: string) => `/v1/badges/${id}`,
    BATCH_DELETE_BADGES: "/v1/badges/batch",
    BADGES_TENANT_VISIBILITY: (tenantId: string) => `/v1/badges/tenants/${tenantId}`,
    ADD_BADGES_TO_TENANT: "/v1/badges/tenants",
    REMOVE_BADGES_FROM_TENANT: "/v1/badges/tenants",
  },
  I18N: {
    STATUS: "/v1/i18n/status",
    TRANSLATIONS: "/v1/i18n/translations",
    DIFF: "/v1/i18n/diff",
    PUBLISH: "/v1/i18n/publish",
    ROLLBACK: "/v1/i18n/rollback",
    AUDIT_LOG: "/v1/i18n/audit-log",
  },
  TOOLTIPS: {
    GET_TOOLTIPS: "/v1/tooltips",
    CREATE_TOOLTIP: "/v1/tooltips",
    UPDATE_TOOLTIP: (id: string) => `/v1/tooltips/${id}`,
  },
  AUTHORIZATION: {
    GET_PERMISSIONS: "/v1/authorization/permissions",
    GET_ROLES: "/v1/authorization/roles",
    CHANGE_USER_ROLES: "/v1/authorization/change-roles",
  },
  ANALYTICS: {
    OVERVIEW: "/v1/analytics/overview",
    VOICE_LATENCY: "/v1/analytics/voice-latency",
  },
};

export const ROUTES = {
  LOGIN: "/login",
  MAGIC_VERIFY: "/auth/verify",
  SIMULATION_STUDIO: "/simulation-studio",
  USER_MANAGEMENT: "/user-management",
  MANAGE_EVENTS: "/manage-events",
  CHARACTER_LIBRARY: "/character-library",
  MANAGE_SCENARIO_VOICES: "/manage-scenario-voices",
  MANAGE_SCENARIO_LANGUAGES: "/manage-scenario-languages",
  MANAGE_PROMPTS: "/manage-prompts",
  CREATE_SIMULATION: "/create-simulation",
  SIMULATION_PREVIEW: (id: string | number) => `/simulation-preview/${id}`,
  EDIT_SIMULATION: (id: string | number) => `/create-simulation/edit/${id}`,
  ORGANIZATION_DETAIL: (id: string | number) => `/user-management/organization/${id}`,
  CREATE_PATH: "/create-path",
  EDIT_PATH: (id: string | number) => `/create-path/edit/${id}`,
  CREATE_CASE: "/create-case",
  USER_BADGES: "/user-badges",
  MANAGE_GUARDRAILS: "/manage-guardrails",
  EDIT_CASE: (id: string | number) => `/create-case/edit/${id}`,
  MANAGE_TRANSLATIONS: "/manage-translations",
  MANAGE_TOOLTIPS: "/manage-tooltips",
  ANALYTICS: "/analytics",
};

export const LOCAL_STORAGE_KEYS = {
  ADMIN_ACCESS_TOKEN: "adminAccessToken",
  ADMIN_REFRESH_TOKEN: "adminRefreshToken",
  ADMIN_USER_STATUS: "adminUserStatus",
  ADMIN_IS_AUTHENTICATED: "adminIsAuthenticated",
  PREVIEW_ROOM_DATA: "previewRoomData",
};

export enum KeyboardKeys {
  KEYDOWN = "keydown",
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

export const ALLY_URL = "https://www.helloally.ai";
export const ALLY_TERMS_URL = "https://www.helloally.ai/terms";
export const ALLY_PRIVACY_POLICY_URL = "https://www.helloally.ai/policy";
export const ALLY_DATA_POLICY_URL = "https://www.helloally.ai/policy";

export const SORT_BY = {
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
};

export const SORT_ORDER = {
  ASC: "ASC",
  DESC: "DESC",
};

export const INITIAL_EVENTS_LIMIT = 30;

export const TAG_TYPES = {
  USERS: "users",
  TENANTS: "tenants",
  SESSION_EVENTS: "sessionEvents",
  SESSION_EVENT_TAGS: "sessionEventTags",
  SIMULATION: "simulation",
  SIMULATION_EVENTS: "simulationEvents",
  SIMULATION_PATHS: "simulationPaths",
  SCENARIO_PATHS: "scenarioPaths",
  EACH_SESSION: "eachSession",
  SIMULATION_CASES: "simulationCases",
  TRIGGER_WARNINGS: "triggerWarnings",
  SCENARIO_VOICES: "scenarioVoices",
  SCENARIO_LANGUAGES: "scenarioLanguages",
  SUMMARY_SECTIONS: "summarySections",
  UPDATE_SUMMARY_SECTIONS: "updateSummarySections",
  CUSTOM_FIELD_TYPES: "customFieldTypes",
  CUSTOM_FIELDS_ENABLED: "customFieldsEnabled",
  CUSTOM_FIELD_DEFINITIONS: "customFieldDefinitions",
  CHARACTERS: "characters",
  PROMPTS: "prompts",
  CONVERSATIONAL_GUARDRAILS: "conversationalGuardrails",
  USER_BADGES: "userBadges",
  I18N_TRANSLATIONS: "i18nTranslations",
  TOOLTIPS: "tooltips",
  HELPER_TAGS: "helperTags",
  FILLER_TAGS: "fillerTags",
  COMPETENCIES: "competencies",
  ADMIN_TENANTS: "adminTenants",
};

export const CUSTOM_CHARACTER_ID = "custom";
