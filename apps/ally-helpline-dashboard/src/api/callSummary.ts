/**
 * This module provides all call summary and transcript-related API endpoints including:
 * - Call summary retrieval and updates
 * - Content enhancement using AI
 * - Tag management and positivity ratings
 * - Location data and search
 * - Transcript retrieval and management
 * - Export functionality
 */

import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod } from "@constants";
import {
  EnhanceContentRequest,
  EnhanceContentResponse,
  ExportCallSummaryRequest,
  GetLocationsResponse,
  SummaryFieldKey,
  Tag,
  UpdateCallInfoRequest,
  GetTranscriptResponse,
  GetTranscriptRequest,
  UpdateCallSummaryNotesRequest,
} from "@types";

const callSummaryAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Retrieves the list of available fields that can be used
     * in call summaries for categorization and organization.
     * @returns {Promise<SummaryFieldKey[]>} Array of available summary field keys
     */
    getSummaryFields: builder.query<SummaryFieldKey[], void>({
      query: () => ApiEndpoints.CALL_SUMMARY.GET_SUMMARY_FIELDS,
    }),

    /**
     * Retrieves the complete summary data for a specific call session.
     * Provides tags for automatic cache invalidation.
     * @param {string} chatId - Unique identifier for the call session
     * @returns {Promise<any>} Call summary data
     */
    getCallSummary: builder.query({
      query: chatId => `${ApiEndpoints.CALL_SUMMARY.GET_CALL_SUMMARY}/${chatId}`,
      providesTags: ["CallSummary"],
    }),

    /**
     * Updates the summary data for a specific call session.
     * Invalidates related cache tags to ensure data consistency.
     * @param {Object} params - Update parameters
     * @param {string} params.chatId - Unique identifier for the call session
     * @param {any} params.data - Updated summary data
     * @returns {Promise<any>} Update response
     */
    updateCallSummary: builder.mutation({
      query: ({ chatId, data }) => ({
        url: ApiEndpoints.CALL_SUMMARY.UPDATE_CALL_SUMMARY(chatId),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: ["CallSummary", "CallLogs"],
    }),

    /**
     * Uses AI to improve and enhance the provided content,
     * typically used for improving call summaries or notes.
     * @param {EnhanceContentRequest} data - Content to be enhanced
     * @returns {Promise<EnhanceContentResponse>} Enhanced content response
     */
    enhanceContent: builder.mutation<EnhanceContentResponse, EnhanceContentRequest>({
      query: ({ content }) => ({
        url: ApiEndpoints.CALL_SUMMARY.ENHANCE_CONTENT,
        method: HttpMethod.POST,
        body: { content },
      }),
    }),

    /**
     * Retrieves positivity ratings for a list of tags,
     * used for sentiment analysis and call categorization.
     * @param {Object} data - Tag data
     * @param {string[]} data.tags - Array of tags to analyze
     * @returns {Promise<Tag[]>} Tag data with positivity ratings
     */
    getTags: builder.mutation<Tag[], { tags: string[] }>({
      query: body => ({
        url: ApiEndpoints.CALL_SUMMARY.GET_TAG_POSITIVITY_RATINGS,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /**
     * Updates metadata and information about a specific call session.
     * @param {UpdateCallInfoRequest} data - Call information update data
     * @returns {Promise<void>} Update response
     */
    updateCallInfo: builder.mutation<void, UpdateCallInfoRequest>({
      query: ({ chatId, callInfo }) => ({
        url: ApiEndpoints.CALL_SUMMARY.UPDATE_CALL_INFO(chatId),
        method: HttpMethod.PATCH,
        body: callInfo,
      }),
    }),

    /**
     * Generates and exports a call summary in various formats
     * @param {ExportCallSummaryRequest} data - Export parameters
     * @returns {Promise<void>} Export response
     */
    exportCallSummary: builder.query<void, ExportCallSummaryRequest>({
      query: ({ chatId }) => ApiEndpoints.CALL_SUMMARY.EXPORT_CALL_SUMMARY(chatId),
    }),

    /**
     * Retrieves the list of available locations for call categorization
     * and geographical analysis.
     * @returns {Promise<GetLocationsResponse>} Available locations data
     */
    getLocations: builder.query<GetLocationsResponse, void>({
      query: () => ApiEndpoints.CALL_SUMMARY.GET_LOCATIONS,
    }),

    /**
     * Searches for locations based on a query string,
     * used for location-based call filtering and analysis.
     * @param {Object} data - Search parameters
     * @param {string} data.query - Search query string
     * @returns {Promise<GetLocationsResponse>} Search results
     */
    searchLocations: builder.query<GetLocationsResponse, { query: string }>({
      query: ({ query }) => ({
        url: ApiEndpoints.CALL_SUMMARY.SEARCH_LOCATIONS,
        params: { query },
      }),
    }),

    /**
     * Retrieves the transcript data for a specific call session
     * with pagination and sorting options.
     * @param {GetTranscriptRequest} data - Transcript request parameters
     * @returns {Promise<GetTranscriptResponse>} Transcript data
     */
    getTranscript: builder.query<GetTranscriptResponse, GetTranscriptRequest>({
      query: ({ chatId, offset, limit, sortBy }) => ({
        url: ApiEndpoints.CALL_SUMMARY.GET_TRANSCRIPT(chatId),
        params: { offset, limit, sortOrder: "ASC", sortBy },
      }),
    }),

    /**
     * Updates the notes section of a call summary with new content.
     * @param {UpdateCallSummaryNotesRequest} data - Notes update data
     * @returns {Promise<void>} Update response
     */
    updateCallSummaryNotes: builder.mutation<void, UpdateCallSummaryNotesRequest>({
      query: ({ chatId, notes }) => ({
        url: ApiEndpoints.CALL_SUMMARY.UPDATE_CALL_SUMMARY_NOTES(chatId),
        method: HttpMethod.POST,
        body: { content: notes },
      }),
    }),
  }),
});

export const {
  useGetSummaryFieldsQuery,
  useGetCallSummaryQuery,
  useUpdateCallSummaryMutation,
  useEnhanceContentMutation,
  useGetTagsMutation,
  useUpdateCallInfoMutation,
  useLazyExportCallSummaryQuery,
  useGetLocationsQuery,
  useLazySearchLocationsQuery,
  useGetTranscriptQuery,
  useUpdateCallSummaryNotesMutation,
} = callSummaryAPI;
