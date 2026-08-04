/**
 * This module provides all authentication-related API endpoints including:
 * - User registration and login
 * - OTP generation and verification
 * - User profile and permissions retrieval
 */

import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  User,
  VerifyOTPRequest,
  VerifyOTPResponse,
  GenerateOTPRequest,
  GenerateOTPResponse,
  UserRole,
  AppType,
  GetProfileUrlRequest,
  GetProfileUrlResponse,
  profileUrlRequest,
  logoUrlResponse,
} from "@types";

import { baseAPI, baseQuery } from "./baseAPI";

const ALLOWED_ROLES = [
  UserRole.COUNSELLOR,
  UserRole.ADMIN,
  UserRole.LEARNER,
  UserRole.SIMULATION_REVIEWER,
  UserRole.SCRIBE_REVIEWER,
  // Ally staff. Included so an INTERNAL-only account can sign in here and
  // reach the admin console at /admin; it carries none of this app's
  // permissions, so such an account sees an empty consumer experience.
  UserRole.INTERNAL,
];

const authAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Creates a new user account with the provided registration data.
     * @param {any} data - User registration data (email, password, etc.)
     * @returns {Promise<any>} Registration response
     */
    signup: builder.mutation({
      query: data => ({
        url: ApiEndpoints.AUTH.SIGNUP,
        method: HttpMethod.POST,
        body: data,
      }),
    }),

    /**
     * Authenticates user credentials and returns access/refresh tokens.
     * @param {any} data - Login credentials (email, password)
     * @returns {Promise<any>} Login response with tokens
     */
    login: builder.mutation({
      query: data => ({
        url: ApiEndpoints.AUTH.LOGIN,
        method: HttpMethod.POST,
        body: data,
      }),
    }),

    /**
     * Retrieves the authenticated user's profile information.
     * @returns {Promise<User>} User profile data
     */
    getUser: builder.query<User, void>({
      query: () => ApiEndpoints.AUTH.GET_USER,
      providesTags: [TAG_TYPES.USER],
    }),

    /**
     * Retrieves the list of permissions assigned to the current user.
     * Used for role-based access control.
     * @returns {Promise<string[]>} Array of permission strings
     */
    getPermissions: builder.query<string[], void>({
      query: () => ApiEndpoints.AUTHORIZATION.GET_PERMISSIONS,
    }),

    /**
     * Sends a one-time password to the specified phone number or email address.
     * @param {GenerateOTPRequest} data - Contains phone and/or email
     * @returns {Promise<GenerateOTPResponse>} OTP generation response
     */
    generateOTP: builder.mutation<GenerateOTPResponse, GenerateOTPRequest>({
      query: ({ phone, email }) => ({
        url: ApiEndpoints.AUTH.GENERATE_OTP,
        method: HttpMethod.POST,
        body: {
          phone,
          email,
          allowedRoles: ALLOWED_ROLES,
          appType: AppType.APP,
        },
      }),
    }),

    /**
     * Validates the one-time password sent to the user's phone or email.
     * @param {VerifyOTPRequest} data - Contains phone, OTP, and email
     * @returns {Promise<VerifyOTPResponse>} OTP verification response
     */
    verifyOTP: builder.mutation<VerifyOTPResponse, VerifyOTPRequest>({
      query: ({ phone, otp, email }) => ({
        url: ApiEndpoints.AUTH.VERIFY_OTP,
        method: HttpMethod.POST,
        body: {
          phone,
          otp,
          email,
          allowedRoles: ALLOWED_ROLES,
        },
      }),
    }),
    googleSignIn: builder.mutation<VerifyOTPResponse, any>({
      query: (data = {}) => ({
        url: ApiEndpoints.AUTH.GOOGLE_SIGN_IN,
        method: HttpMethod.POST,
        body: {
          ...data,
          allowedRoles: ALLOWED_ROLES,
        },
      }),
    }),

    getProfileImageUrl: builder.mutation<GetProfileUrlResponse, GetProfileUrlRequest>({
      query: body => ({
        url: ApiEndpoints.AUTH.PROFILE_IMAGE_URL,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /**
     * Delete cover image from S3
     */
    deleteProfileImage: builder.mutation<boolean, profileUrlRequest>({
      query: body => ({
        url: ApiEndpoints.AUTH.PROFILE_IMAGE,
        method: HttpMethod.DELETE,
        body,
      }),
      invalidatesTags: [TAG_TYPES.USER],
    }),

    uploadProfileImage: builder.mutation<boolean, profileUrlRequest>({
      query: body => ({
        url: ApiEndpoints.AUTH.PROFILE_IMAGE,
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.USER],
    }),

    getLogoUrl: builder.query<logoUrlResponse, void>({
      query: () => ({
        url: ApiEndpoints.AUTH.LOGO_URL,
      }),
    }),

    /**
     * Completes the current user's profile on first login (bulk-created
     * accounts). Invalidates the USER tag so the gate clears on refetch.
     */
    completeProfile: builder.mutation<{ success: boolean }, { name: string; phone?: string }>({
      query: body => ({
        url: ApiEndpoints.AUTH.COMPLETE_PROFILE,
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.USER],
    }),

    /**
     * Verifies magic link token and authenticates user.
     * @param {string} token - Magic link token from URL
     * @returns {Promise<VerifyOTPResponse>} Authentication response with tokens
     */
    verifyMagicLink: builder.mutation<VerifyOTPResponse, { token: string }>({
      queryFn: async ({ token }, api, extraOptions) => {
        const result = await baseQuery(
          {
            url: ApiEndpoints.AUTH.MAGIC_LINK_VERIFY,
            method: HttpMethod.POST,
            body: { token, allowedRoles: ALLOWED_ROLES },
          },
          api,
          extraOptions,
        );
        if (result.error) {
          return { error: result.error };
        }
        return { data: result.data as VerifyOTPResponse };
      },
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
  useGoogleSignInMutation,
  useUploadProfileImageMutation,
  useDeleteProfileImageMutation,
  useGetProfileImageUrlMutation,
  useGetLogoUrlQuery,
  useVerifyMagicLinkMutation,
  useCompleteProfileMutation,
} = authAPI;
