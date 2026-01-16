/**
 * This module provides all authentication-related API endpoints including:
 * - User registration and login
 * - OTP generation and verification
 * - User profile and permissions retrieval
 */

import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, Permissions, TAG_TYPES, UserRole } from "@constants";
import {
  VerifyOTPRequest,
  VerifyOTPResponse,
  GenerateOTPRequest,
  GenerateOTPResponse,
  User,
  GetProfileUrlResponse,
  GetProfileUrlRequest,
  profileUrlRequest,
} from "@types";

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
    }),

    /**
     * Retrieves the list of permissions assigned to the current user.
     * Used for role-based access control.
     * @returns {Promise<string[]>} Array of permission strings
     */
    getPermissions: builder.query<Permissions[], void>({
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
        body: { phone, email, allowedRoles: [UserRole.SUPER_ADMIN] },
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
        body: { phone, otp, email, allowedRoles: [UserRole.SUPER_ADMIN] },
      }),
    }),
    // /**
    //  * Authenticates user credentials and returns access/refresh tokens.
    //  * @param {any} data - idToken
    //  * @returns {Promise<any>} googleSignIn response with tokens
    //  */
    googleSignIn: builder.mutation<VerifyOTPResponse, any>({
      query: data => ({
        url: ApiEndpoints.AUTH.GOOGLE_SIGN_IN,
        method: HttpMethod.POST,
        body: { ...data, allowedRoles: [UserRole.SUPER_ADMIN] },
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
      invalidatesTags: [TAG_TYPES.USERS],
    }),

    uploadProfileImage: builder.mutation<boolean, profileUrlRequest>({
      query: body => ({
        url: ApiEndpoints.AUTH.PROFILE_IMAGE,
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.USERS],
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useGetUserQuery,
  useLazyGetUserQuery,
  useGetPermissionsQuery,
  useLazyGetPermissionsQuery,
  useGenerateOTPMutation,
  useVerifyOTPMutation,
  useGoogleSignInMutation,
  useUploadProfileImageMutation,
  useDeleteProfileImageMutation,
  useGetProfileImageUrlMutation,
} = authAPI;
