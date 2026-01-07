export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
};

export const ApiEndpoints = {
  AUTH: {
    SIGNUP: "/v1/auth/signup",
    LOGIN: "/v1/auth/login",
    GOOGLE_SIGN_IN: "/v1/auth/google",
    GET_USER: "/v1/users/me",
    GENERATE_OTP: "/v2/auth/generate-otp",
    VERIFY_OTP: "/v2/auth/verify-otp",
    REFRESH: "/v1/auth/refresh",
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
    SCENARIO_VOICE_LANGUAGES: "/v1/learn/scenario-voice-languages",
    SCENARIO_LANGUAGES: "/v1/learn/scenario-languages",
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
    END_SCENARIO_PREVIEW: (sessionId: number | string) =>
      `/v1/learn/scenarios/preview/${sessionId}/end`,
    SIMULATION_TENANT_VISIBILITY: (tenantId: string) => `v1/learn/scenario/tenant/${tenantId}`,
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
  },

  USER_MANAGEMENT: {
    USERS: "/v1/users",
    TENANT: "/v1/tenant",
    TENANTS: "/v1/tenants",
    TENANTS_BY_ID: (id: string) => `/v1/tenants/${id}`,
    ADD_USER: "/v1/users",
    SIMULATION_CREDITS: "/v1/simulation-credits",
  },
  AUTHORIZATION: {
    GET_PERMISSIONS: "/v1/authorization/permissions",
    GET_ROLES: "/v1/authorization/roles",
    CHANGE_USER_ROLES: "/v1/authorization/change-roles",
  },
};

export const ROUTES = {
  LOGIN: "/login",
  SIMULATION_STUDIO: "/simulation-studio",
  USER_MANAGEMENT: "/user-management",
  MANAGE_EVENTS: "/manage-events",
  CREATE_SIMULATION: "/create-simulation",
  SIMULATION_PREVIEW: (id: string | number) => `/simulation-preview/${id}`,
  EDIT_SIMULATION: (id: string | number) => `/create-simulation/edit/${id}`,
  ORGANIZATION_DETAIL: (id: string | number) => `/user-management/organization/${id}`,
  CREATE_PATH: "/create-path",
  EDIT_PATH: (id: string | number) => `/create-path/edit/${id}`,
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
  SIMULATION: "simulation",
  SIMULATION_EVENTS: "simulationEvents",
  SIMULATION_PATHS: "simulationPaths",
  SCENARIO_PATHS: "scenarioPaths",
  EACH_SESSION: "eachSession",
  TRIGGER_WARNINGS: "triggerWarnings",
};
