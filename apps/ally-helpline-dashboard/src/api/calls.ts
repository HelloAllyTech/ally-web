/**
 * This module provides all call-related API endpoints including:
 * - Call logs retrieval (user and admin views)
 * - Counsellor information
 * - Call tags and categorization
 * - Chat type definitions
 */

import { baseAPI } from "@api/baseAPI";
import { CallType, ApiEndpoints } from "@constants";
import {
  GetCallLogsInput,
  GetCallLogsResponse,
  GetCounsellorsResponse,
  GetTagsResponse,
  GetCounsellorsInput,
  GetTagsInput,
} from "@types";

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
  }),
});

export const {
  useGetCallLogsQuery,
  useGetAdminCallLogsQuery,
  useGetCounsellorsQuery,
  useGetCallTagsQuery,
  useGetChatTypesQuery,
} = callsAPI;
