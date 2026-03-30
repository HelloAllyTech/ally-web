/**
 * This module provides all call-related API endpoints including:
 * - Call logs retrieval (user and admin views)
 * - Counsellor information
 * - Call tags and categorization
 * - Chat type definitions
 */

import { CallType, ApiEndpoints, HttpMethod } from "@constants";
import {
  GetCallLogsInput,
  GetCallLogsResponse,
  GetCounsellorsResponse,
  GetTagsResponse,
  GetCounsellorsInput,
  GetTagsInput,
  GetAudioUploadUrlInput,
  GetAudioUploadUrlResponse,
  CancelAudioUploadInput,
  CancelAudioUploadResponse,
} from "@types";

import { baseAPI } from "./baseAPI";

const callsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Retrieves paginated call logs with filtering options.
     * Provides tags for automatic cache invalidation.
     * @param {GetCallLogsInput} params - Query parameters for filtering and pagination
     * @returns {Promise<GetCallLogsResponse>} Paginated call logs data
     */
    getCallLogs: builder.query<GetCallLogsResponse, GetCallLogsInput>({
      query: params => ({
        url: ApiEndpoints.CALLS.GET_CALL_LOGS,
        params,
      }),
      providesTags: ["CallLogs"],
    }),

    /**
     * Retrieves call logs with admin-level access and permissions.
     * May include additional data not available to regular users.
     * @param {GetCallLogsInput} params - Query parameters for filtering and pagination
     * @returns {Promise<GetCallLogsResponse>} Admin call logs data
     */
    getAdminCallLogs: builder.query<GetCallLogsResponse, GetCallLogsInput>({
      query: params => ({
        url: ApiEndpoints.CALLS.GET_ADMIN_CALL_LOGS,
        params,
      }),
      providesTags: ["CallLogs"],
    }),

    /**
     * Retrieves list of counsellors with their availability status
     * and other relevant information.
     * @param {GetCounsellorsInput} params - Query parameters for filtering counsellors
     * @returns {Promise<GetCounsellorsResponse>} Counsellor data
     */
    getCounsellors: builder.query<GetCounsellorsResponse, GetCounsellorsInput>({
      query: params => ({
        url: ApiEndpoints.CALLS.GET_COUNSELLORS,
        params,
      }),
      providesTags: ["CallLogs"],
    }),

    /**
     * Retrieves available tags for categorizing and organizing calls.
     * Used for call classification and search functionality.
     * @param {GetTagsInput} params - Query parameters for tag filtering
     * @returns {Promise<GetTagsResponse>} Available tags data
     */
    getCallTags: builder.query<GetTagsResponse, GetTagsInput>({
      query: params => ({
        url: ApiEndpoints.CALLS.GET_CALL_TAGS,
        params,
      }),
      providesTags: ["CallLogs"],
    }),

    /**
     * Retrieves the different types of chat/call sessions available
     * in the system (e.g., audio, video, text).
     * @returns {Promise<CallType[]>} Array of available chat types
     */
    getChatTypes: builder.query<CallType[], void>({
      query: () => ApiEndpoints.CALLS.GET_CHAT_TYPES,
    }),

    /**
     * Requests a presigned S3 URL to upload an audio file and returns the
     * associated identifiers to track the upload.
     * @param {GetAudioUploadUrlInput} params - File metadata and context for signing
     * @returns {Promise<GetAudioUploadUrlResponse>} Presigned URL and chat id
     */
    getAudioUploadUrl: builder.mutation<GetAudioUploadUrlResponse, GetAudioUploadUrlInput>({
      query: params => ({
        url: ApiEndpoints.CALLS.GET_AUDIO_UPLOAD_URL,
        method: HttpMethod.POST,
        body: params,
      }),
    }),

    /**
     * Cancels a pending/active audio upload session by chat id.
     * Useful for aborting client-side uploads and cleaning server resources.
     * @param {CancelAudioUploadInput} params - Object with chatId to cancel
     * @returns {Promise<CancelAudioUploadResponse>} Confirmation message
     */
    cancelAudioUpload: builder.mutation<CancelAudioUploadResponse, CancelAudioUploadInput>({
      query: params => ({
        url: ApiEndpoints.CALLS.CANCEL_AUDIO_UPLOAD,
        method: HttpMethod.POST,
        body: params,
      }),
    }),

    /**
     * Permanently deletes a call log by id. This action is irreversible and
     * should typiclifeline be restricted to admin roles.
     * @param {number} chatId - The id of the call/chat to delete
     * @returns {Promise<string>} Success message
     */
    deleteCallLog: builder.mutation<string, number>({
      query: chatId => ({
        url: ApiEndpoints.CALLS.DELETE_CALL_LOG(chatId),
        method: HttpMethod.DELETE,
      }),
    }),
  }),
});

export const {
  useGetCallLogsQuery,
  useGetAdminCallLogsQuery,
  useGetCounsellorsQuery,
  useGetCallTagsQuery,
  useGetChatTypesQuery,
  useGetAudioUploadUrlMutation,
  useCancelAudioUploadMutation,
  useDeleteCallLogMutation,
} = callsAPI;
