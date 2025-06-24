import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { logger } from "@ally-ui-mono/ui-shared";

const API_URL = import.meta.env.VITE_API_BASE_URL;
const VITE_API_VERSION = import.meta.env.VITE_API_VERSION;

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

const handleLogout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.location.href = "/login";
};

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL + "/api/" + VITE_API_VERSION,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

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
    if (result.error && result.error.status === 401) {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      // If there is no access token or refresh token, return the error

      if (!accessToken || !refreshToken) {
        handleLogout();
        return result;
      }

      try {
        // Try to refresh the token
        const refreshResult = await baseQuery(
          { url: "/auth/refresh", method: "POST", body: { refreshToken } },
          store,
          extraOptions
        );

        if (!refreshResult.data) {
          throw new Error("No refresh data received");
        }

        const tokens = refreshResult.data as RefreshResponse;
        
        // Store the new tokens
        localStorage.setItem("accessToken", tokens.accessToken);
        localStorage.setItem("refreshToken", tokens.refreshToken);

        // Retry the original query
        result = await baseQuery(args, store, extraOptions);
        try {
          result = await baseQuery(args, store, extraOptions);
        } catch (error) {
          logger.info(`Error retrying original query after refresh:, ${error}`);
          throw error;
        }
      } catch (error) {
        // Handle refresh token failure (e.g., both tokens expired)
        // handleLogout();
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
  tagTypes: ["CallSummary"],
  endpoints: () => ({}),
});
