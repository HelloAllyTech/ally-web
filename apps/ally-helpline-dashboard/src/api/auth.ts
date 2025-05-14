import { baseAPI } from "@/api/baseAPI";
import { User } from "@/types/user";
import { GenerateOTPResponse, GenerateOTPRequest, VerifyOTPResponse, VerifyOTPRequest } from "@/types/auth";

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
    generateOTP: builder.mutation<GenerateOTPResponse, GenerateOTPRequest>({
      query: ({ phone }) => ({
        url: "/auth/generate-otp",
        method: "POST",
        body: { phone },
      }),
    }),
    verifyOTP: builder.mutation<VerifyOTPResponse, VerifyOTPRequest>({
      query: ({ phone, otp }) => ({
        url: "/auth/verify-otp",
        method: "POST",
        body: { phone, otp },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useLazyGetUserQuery,
  useLazyGetPermissionsQuery,
  useGenerateOTPMutation,
  useVerifyOTPMutation,
} = authAPI;
