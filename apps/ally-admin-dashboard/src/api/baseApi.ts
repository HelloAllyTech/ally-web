import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";

import { ApiEndpoints, HttpMethod, LOCAL_STORAGE_KEYS, ROUTES, TAG_TYPES, en } from "@constants";
import { RefreshResponse } from "@types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const handleLogout = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED);

  window.location.href = ROUTES.LOGIN;
};

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/api`,
  prepareHeaders: headers => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * This function wraps the base query to handle authentication token refresh.
 * When a 401 error is received, it attempts to refresh the access token using
 * the refresh token. If successful, it retries the original request.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  store,
  extraOptions,
) => {
  try {
    let result;
    try {
      result = await baseQuery(args, store, extraOptions);
    } catch (error) {
      toast.error(`${en.error.apiRequestFailed}: ${error}`);
      throw error;
    }

    if (result.error && result.error.status === 401) {
      const accessToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);

      if (!accessToken || !refreshToken) {
        handleLogout();
        return result;
      }

      try {
        const refreshResult = await baseQuery(
          { url: ApiEndpoints.AUTH.REFRESH, method: HttpMethod.POST, body: { refreshToken } },
          store,
          extraOptions,
        );

        if (!refreshResult.data) {
          handleLogout();
          throw new Error(en.error.noRefreshDataReceived);
        }

        const tokens = refreshResult.data as RefreshResponse;

        localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, tokens.accessToken);
        localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, tokens.refreshToken);

        try {
          result = await baseQuery(args, store, extraOptions);
        } catch (error) {
          toast.error(`${en.error.tokenRefreshFailed}: ${error}`);
          throw error;
        }
      } catch (error) {
        toast.error(`${en.error.tokenRefreshFailed}: ${error}`);
        handleLogout();
        return result;
      }
    }

    return result;
  } catch (error) {
    toast.error(`${en.error.apiRequestFailed}: ${error}`);
    return { error: { status: "FETCH_ERROR", error: String(error) } };
  }
};

export const baseAPI = createApi({
  reducerPath: "baseAPI",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    TAG_TYPES.USERS,
    TAG_TYPES.TENANTS,
    TAG_TYPES.SESSION_EVENTS,
    TAG_TYPES.SESSION_EVENT_TAGS,
    TAG_TYPES.SIMULATION,
    TAG_TYPES.SCENARIO_VERSIONS,
    TAG_TYPES.SIMULATION_EVENTS,
    TAG_TYPES.SIMULATION_PATHS,
    TAG_TYPES.SCENARIO_PATHS,
    TAG_TYPES.EACH_SESSION,
    TAG_TYPES.TRIGGER_WARNINGS,
    TAG_TYPES.HELPER_TAGS,
    TAG_TYPES.FILLER_TAGS,
    TAG_TYPES.COMPETENCIES,
    TAG_TYPES.COMPETENCY_BEHAVIOURS,
    TAG_TYPES.AGENT_TEST_CASES,
    TAG_TYPES.ADMIN_TENANTS,
    TAG_TYPES.CUSTOM_FIELD_TYPES,
    TAG_TYPES.CUSTOM_FIELDS_ENABLED,
    TAG_TYPES.SCRIBE_NOTE_CREATION_ENABLED,
    TAG_TYPES.I18N_TRANSLATIONS,
    TAG_TYPES.SETTINGS,
    TAG_TYPES.USER_PREFERENCES,
    TAG_TYPES.ROLEPLAY_SESSION_LOGS,
    TAG_TYPES.ROLEPLAY_SPECS,
    TAG_TYPES.ROLEPLAY_SPEC_VERSIONS,
    TAG_TYPES.ROLEPLAY_REHEARSALS,
    TAG_TYPES.ROLEPLAY_IMPROVEMENTS,
    TAG_TYPES.ROLEPLAY_COPILOT_SESSIONS,
    TAG_TYPES.COMFORT_AUDIO_LIBRARY,
    TAG_TYPES.TRACKS_V2,
    TAG_TYPES.BLOGS,
    TAG_TYPES.IMAGE_LIBRARY,
    TAG_TYPES.SUPER_DUPER_ADMINS,
  ],
  endpoints: () => ({}),
});

export { baseQuery, baseQueryWithReauth };
