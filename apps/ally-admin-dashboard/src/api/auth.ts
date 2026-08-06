/**
 * This module provides all authentication-related API endpoints including:
 * - User registration and login
 * - OTP generation and verification
 * - User profile and permissions retrieval
 */

import { baseAPI, baseQuery } from "@api";
import {
  ApiEndpoints,
  AppType,
  HttpMethod,
  Permissions,
  SUPER_ADMIN_ROLES,
  TAG_TYPES,
  UserRole,
  resolveAdminRole,
} from "@constants";
import {
  VerifyOTPRequest,
  VerifyOTPResponse,
  GenerateOTPRequest,
  GenerateOTPResponse,
  User,
  GetProfileUrlResponse,
  GetProfileUrlRequest,
  profileUrlRequest,
  ImpersonateResponse,
  UserPreferencesData,
} from "@types";

export const authAPI = baseAPI.injectEndpoints({
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
      // Re-resolve `role` from the full `roles` list before anything reads it,
      // so every existing `user.role` gate in this app sees the user's highest
      // admin tier rather than whichever role the backend's priority list
      // happened to collapse to. Normalising here (rather than at each call
      // site) covers both the RTK cache and the Redux mirror fed from it.
      transformResponse: (user: User) =>
        user ? { ...user, role: resolveAdminRole(user) ?? user.role } : user,
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
        body: {
          phone,
          email,
          allowedRoles: [...SUPER_ADMIN_ROLES, UserRole.MULTI_TENANT_ADMIN],
          appType: AppType.ADMIN,
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
          allowedRoles: [...SUPER_ADMIN_ROLES, UserRole.MULTI_TENANT_ADMIN],
        },
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
        body: { ...data, allowedRoles: [...SUPER_ADMIN_ROLES, UserRole.MULTI_TENANT_ADMIN] },
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
            body: { token, allowedRoles: [...SUPER_ADMIN_ROLES, UserRole.MULTI_TENANT_ADMIN] },
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

    getUserImpersonatedToken: builder.mutation<ImpersonateResponse, { email: string }>({
      query: data => ({
        url: ApiEndpoints.AUTH.GET_USER_IMPERSONATED_TOKENS,
        method: HttpMethod.POST,
        body: data,
      }),
    }),

    /**
     * Retrieves the current user's stored preferences (e.g. the admin sidebar
     * order). The backend responds with `{ data: {...} } | null`; we unwrap to
     * the inner blob and default to an empty object when none exists yet.
     */
    getUserPreferences: builder.query<UserPreferencesData, void>({
      query: () => ApiEndpoints.AUTH.GET_USER_PREFERENCES,
      transformResponse: (response: unknown) =>
        (response as { data?: UserPreferencesData } | null)?.data ?? {},
      providesTags: [TAG_TYPES.USER_PREFERENCES],
    }),

    /**
     * Upserts user preferences. The backend merges the provided keys into the
     * existing preferences blob, so callers only send the keys they own
     * (here: `admin_sidebar_order`) without clobbering others.
     */
    updateUserPreferences: builder.mutation<{ success: boolean }, Partial<UserPreferencesData>>({
      query: body => ({
        url: ApiEndpoints.AUTH.UPDATE_USER_PREFERENCES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.USER_PREFERENCES],
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
  useVerifyMagicLinkMutation,
  useGetUserImpersonatedTokenMutation,
  useGetUserPreferencesQuery,
  useLazyGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
} = authAPI;
