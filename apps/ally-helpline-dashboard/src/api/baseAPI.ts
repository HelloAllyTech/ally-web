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
import { ApiEndpoints, HttpMethod, LOCAL_STORAGE_KEYS, TAG_TYPES } from "@constants";
import { RefreshResponse } from "@types";

// Environment variables for API configuration
const API_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Handles user logout by clearing tokens, cache, and redirecting to login
 *
 * @function handleLogout
 * @returns {void}
 */
const handleLogout = () => {
  // Clear tokens
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);

  // Redirect to login
  window.location.href = "/login";
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
        // Try to refresh the token
        const refreshResult = await baseQuery(
          { url: ApiEndpoints.AUTH.REFRESH, method: HttpMethod.POST, body: { refreshToken } },
          store,
          extraOptions,
        );

        if (!refreshResult.data) {
          handleLogout();
          throw new Error("No refresh data received");
        }

        const tokens = refreshResult.data as RefreshResponse;

        // Store the new tokens
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
        localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);

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
    TAG_TYPES.SIMULATION_CREDITS,
    TAG_TYPES.USER,
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
    TAG_TYPES.ORG_SCENARIOS,
    TAG_TYPES.ORG_SCENARIO_PATHS,
    TAG_TYPES.ORG_CASES,
    TAG_TYPES.ORG_BADGES,
    // Track 2.0 learner resources
    TAG_TYPES.LEARN_TRACKS,
    TAG_TYPES.LEARN_TRACK_DETAIL,
    TAG_TYPES.LEARN_TRACK_NEXT,
  ],
  endpoints: () => ({}),
});
