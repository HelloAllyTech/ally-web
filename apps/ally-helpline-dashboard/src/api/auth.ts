import { User } from "@/types/user";
import { baseAPI } from "@/api/baseAPI";

const authAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    signup: builder.mutation({
      query: (data) => ({
        url: "/auth/signup",
        method: "POST",
        body: data,
      }),
    }),
    login: builder.mutation({
      query: (data) => ({
        url: "/auth/login",
        method: "POST",
        body: data,
      }),
    }),
    getUser: builder.query<User, void>({
      query: () => "/users/me",
    }),
    getPermissions: builder.query<string[], void>({
      query: () => "/auth/permissions",
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useLazyGetUserQuery,
  useLazyGetPermissionsQuery,
} = authAPI;
