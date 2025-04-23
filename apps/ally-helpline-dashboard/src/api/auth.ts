import { baseAPI } from "@/api/baseAPI";
import { User } from "@/types/user";

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
    })
  }),
});

export const { useLoginMutation, useLazyGetUserQuery, useSignupMutation } = authAPI;
