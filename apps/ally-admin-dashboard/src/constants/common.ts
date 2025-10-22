export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
};

export const ApiEndpoints = {
  AUTH: {
    SIGNUP: "/auth/signup",
    LOGIN: "/auth/login",
    GET_USER: "/users/me",
    GENERATE_OTP: "/auth/generate-otp",
    VERIFY_OTP: "/auth/verify-otp",
    REFRESH: "/auth/refresh",
  },
  USER_MANAGEMENT: {
    USERS: "/users",
    TENANT: "/tenant",
    TENANTS: "/tenants",
    ADD_USER: "/users",
    GET_ROLES: "/authorization/roles",
    CHANGE_USER_ROLES: "/authorization/change-roles",
    SIMULATION_CREDITS: "/simulation-credits",
  },
  AUTHORIZATION: {
    GET_PERMISSIONS: "/authorization/permissions",
  },
};

export const ROUTES = {
  LOGIN: "/login",
  SIMULATION_STUDIO: "/simulation-studio",
  USER_MANAGEMENT: "/user-management",
};

export const LOCAL_STORAGE_KEYS = {
  ADMIN_ACCESS_TOKEN: "adminAccessToken",
  ADMIN_REFRESH_TOKEN: "adminRefreshToken",
  ADMIN_USER_STATUS: "adminUserStatus",
  ADMIN_IS_AUTHENTICATED: "adminIsAuthenticated",
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

export const NAVIGATION_ITEM_IDS = {
  SIMULATION_STUDIO: "simulation-studio",
  USER_MANAGEMENT: "user-management",
};

export const NAVIGATION_ITEM_PERMISSIONS = {
  SIMULATION_STUDIO: "edit:scenario", // TODO: change when scenario studio is implemented
  USER_MANAGEMENT: "edit:user",
  TENANT_MANAGEMENT: "edit:tenant",
};

export const TAG_TYPES = {
  USERS: "users",
  TENANTS: "tenants",
};
