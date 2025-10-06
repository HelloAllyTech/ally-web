import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";

import { ApiEndpoints, HttpMethod, LOCAL_STORAGE_KEYS, ROUTES, en } from "@constants";
import { RefreshResponse } from "@types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_VERSION = import.meta.env.VITE_API_VERSION;

const handleLogout = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED);

  window.location.href = ROUTES.LOGIN;
};

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/api/${API_VERSION}`,
  prepareHeaders: headers => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    // Set common headers
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
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
  tagTypes: [],
  endpoints: () => ({}),
});

export { baseQuery, baseQueryWithReauth };
