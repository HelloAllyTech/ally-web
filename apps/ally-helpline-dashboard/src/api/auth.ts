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
  GetProfileUrlRequest,
  GetProfileUrlResponse,
  profileUrlRequest,
  logoUrlResponse,
} from "@types";

import { baseAPI } from "./baseAPI";

const ALLOWED_ROLES = [UserRole.COUNSELLOR, UserRole.ADMIN, UserRole.LEARNER, UserRole.REVIEWER];

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
} = authAPI;
