/**
 * This module provides the foundational API setup for the Ally Helpline Dashboard application.
 * It includes automatic token refresh, authentication headers, and centralized error handling.
 *
 * Key Features:
 * - Automatic Bearer token authentication
 * - Token refresh on 401 errors
 * - Centralized logout handling
 * - RTK Query cache management
 */

import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

import { logger } from "@ally-ui-mono/ui-shared";
import { ApiEndpoints, HttpMethod, LOCAL_STORAGE_KEYS, ROUTES, TAG_TYPES } from "@constants";
import { RefreshResponse } from "@types";

// Environment variables for API configuration
const API_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Where to send the learner back to once they sign in again. Captured from
 * the current URL at the moment logout fires, so a session expiry mid-quiz
 * or mid-simulation lands them back on the same item instead of the
 * dashboard home. Never points at the login page itself.
 */
export const buildReturnTo = (): string | null => {
  const { pathname, search } = window.location;
  if (pathname === ROUTES.LOGIN) return null;
  return `${pathname}${search}`;
};

/**
 * Handles user logout by clearing tokens, cache, and redirecting to login.
 *
 * This is a hard `window.location.href` redirect (not a router navigation),
 * which is a full reload that drops all in-memory React/Redux state — so
 * every caller reaches this from a place where that state is already
 * unrecoverable (the refresh token itself was rejected). What it can still
 * do is tell the learner *why* they landed back on the login screen instead
 * of silently reloading there, and hand the login page a `returnTo` so a
 * successful re-login sends them back to what they were doing rather than
 * the dashboard home. (Component-level state, e.g. a quiz attempt in
 * progress, needs its own recovery — see the sessionStorage snapshot in
 * `QuizItemPlayer`/`AnnotationItemPlayer` via `itemProgressStorage`.)
 *
 * @function handleLogout
 * @returns {void}
 */
export const handleLogout = () => {
  // Clear tokens
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);

  const params = new URLSearchParams();
  params.set("sessionExpired", "1");
  const returnTo = buildReturnTo();
  if (returnTo) params.set("returnTo", returnTo);

  // Redirect to login. Login.tsx reads `sessionExpired` to toast an
  // explanation and `returnTo` to navigate there after a successful sign-in.
  window.location.href = `${ROUTES.LOGIN}?${params.toString()}`;
};

/**
 * Automatically adds Bearer token to all API requests if available in localStorage.
 * The base URL is constructed from environment variables.
 */
export const baseQuery = fetchBaseQuery({
  baseUrl: API_URL + "/api",
  prepareHeaders: headers => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * Holds the in-flight token refresh so concurrent 401s share one call instead
 * of each racing the backend with the same refresh token. The backend rotates
 * refresh tokens on use, so without this, the surfaces that mount together
 * (e.g. the practice-streak bar and the nav pill on /learn) each fire their
 * own refresh the moment an access token expires: the first one to land
 * rotates the token and succeeds, but every other concurrent refresh call is
 * still holding the now-stale token and gets rejected — logging out a session
 * that had just been renewed.
 */
let refreshPromise: Promise<RefreshResponse | null> | null = null;

const refreshTokens = async (
  store: Parameters<BaseQueryFn>[1],
  extraOptions: Parameters<BaseQueryFn>[2],
): Promise<RefreshResponse | null> => {
  const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) return null;

  const refreshResult = await baseQuery(
    { url: ApiEndpoints.AUTH.REFRESH, method: HttpMethod.POST, body: { refreshToken } },
    store,
    extraOptions,
  );

  if (!refreshResult.data) return null;

  const tokens = refreshResult.data as RefreshResponse;
  localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  return tokens;
};

/**
 * This function wraps the base query to handle authentication token refresh.
 * When a 401 error is received, it attempts to refresh the access token using
 * the refresh token. If successful, it retries the original request.
 *
 * @function baseQueryWithReauth
 * @param {string | FetchArgs} args - The query arguments
 * @param {any} store - The Redux store
 * @param {any} extraOptions - Additional options for the query
 * @returns {Promise<any>} The query result
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, store, extraOptions) => {
  try {
    let result;
    try {
      result = await baseQuery(args, store, extraOptions);
    } catch (error) {
      logger.info(`Error in baseQuery:, ${error}`);
      throw error;
    }

    // Handle 401 Unauthorized errors with token refresh
    if (result.error && result.error.status === 401) {
      const accessToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);

      // If there is no access token or refresh token, return the error
      if (!accessToken || !refreshToken) {
        handleLogout();
        return result;
      }

      try {
        // Join the in-flight refresh if one is already running instead of
        // starting a second one with the same (about-to-be-rotated) token.
        if (!refreshPromise) {
          refreshPromise = refreshTokens(store, extraOptions).finally(() => {
            refreshPromise = null;
          });
        }
        const tokens = await refreshPromise;

        if (!tokens) {
          handleLogout();
          throw new Error("No refresh data received");
        }

        // Retry the original query with new token
        try {
          result = await baseQuery(args, store, extraOptions);
        } catch (error) {
          logger.info(`Error retrying original query after refresh:, ${error}`);
          throw error;
        }
      } catch (error) {
        // Handle refresh token failure (e.g., both tokens expired)
        handleLogout();
        logger.info(`Token refresh failed:, ${error}`);
        return result;
      }
    }

    return result;
  } catch (error) {
    logger.info(`API request failed:, ${error}`);
    return { error: { status: "FETCH_ERROR", error: String(error) } };
  }
};

export const baseAPI = createApi({
  reducerPath: "baseAPI",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    TAG_TYPES.CALL_SUMMARY,
    TAG_TYPES.CALL_LOGS,
    TAG_TYPES.SIMULATION_LOGS,
    TAG_TYPES.SCENARIOS,
    TAG_TYPES.SIMULATION_CREDITS,
    TAG_TYPES.USER,
    TAG_TYPES.USER_PREFERENCES,
    TAG_TYPES.SCENARIO_PATHWAY_DETAILS,
    TAG_TYPES.SIMULATION_SUMMARY,
    TAG_TYPES.REVIEW,
    TAG_TYPES.CUSTOM_FIELD_DEFINITIONS,
    TAG_TYPES.CUSTOM_FIELD_VALUES,
    TAG_TYPES.TOOLTIPS,
    TAG_TYPES.SETTINGS,
    // Org. Settings screen (own tenant) resources
    TAG_TYPES.OWN_TENANT,
    TAG_TYPES.SUMMARY_SECTIONS,
    TAG_TYPES.CUSTOM_FIELD_TYPES,
    TAG_TYPES.CUSTOM_FIELDS_ENABLED,
    TAG_TYPES.SCRIBE_NOTE_CREATION_ENABLED,
    // Was missing while its sibling above was registered, which is exactly the
    // trap the PRACTICE_STREAK note below describes: organizationSettings.ts
    // declared providesTags/invalidatesTags for it, RTK Query silently dropped
    // the unknown tag, and flipping the voice-note toggle never invalidated the
    // read. The org-settings switch only looked correct because it keeps its own
    // optimistic local state; a remount inside the 60s cache window showed the
    // stale value back.
    TAG_TYPES.SCRIBE_VOICE_NOTE_ENABLED,
    TAG_TYPES.ORG_SCENARIOS,
    TAG_TYPES.ORG_SCENARIO_PATHS,
    TAG_TYPES.ORG_CASES,
    TAG_TYPES.ORG_BADGES,
    // Track 2.0 learner resources
    TAG_TYPES.LEARN_TRACKS,
    TAG_TYPES.LEARN_TRACK_DETAIL,
    TAG_TYPES.LEARN_TRACK_NEXT,
    TAG_TYPES.CHARACTER_LIBRARY,
    // Practice streak. Must be registered here as well as used in
    // providesTags/invalidatesTags — RTK Query silently ignores tags that are
    // not declared on the API, so an unregistered tag makes the invalidation
    // dead code rather than an error.
    TAG_TYPES.PRACTICE_STREAK,
    // Learner progress (XP/level). Registered here as well as used in providesTags —
    // RTK Query silently ignores tags that are not declared on the API.
    TAG_TYPES.PROGRESS,
  ],
  endpoints: () => ({}),
});
