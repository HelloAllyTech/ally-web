import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

import { LOCAL_STORAGE_KEYS } from "@src/constants";

const API_URL = import.meta.env.VITE_AI_API_BASE_URL;

const handleLogout = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
  window.location.href = "/login";
};

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL + "/api",
  prepareHeaders: headers => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
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
  const result = await baseQuery(args, store, extraOptions);

  if (result.error && result.error.status === 401) {
    handleLogout();
  }

  return result;
};

const aiAPI = createApi({
  reducerPath: "aiAPI",
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});

export { aiAPI };
