/**
 * This module provides all audio call-related API endpoints including:
 * - Call request and acceptance
 * - Call session management
 * - Client and counsellor chat data
 * - Feedback management
 * - Call status monitoring
 */

import { baseAPI } from "@api/baseAPI";
import { ApiEndpoints, HttpMethod } from "@constants";
import { GetWaitingClientsResponse, Chat, FeedbackInput, FeedbackResponse } from "@types";

const audioCallAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Get waiting clients
     * @returns {Promise<GetWaitingClientsResponse>} List of waiting clients
     */
    getWaitingClients: builder.query<GetWaitingClientsResponse, void>({
      query: () => ApiEndpoints.AUDIO_CALL.GET_WAITING_CLIENTS,
    }),

    /**
     * Initiates a call request to connect with a counsellor.
     * Used by clients to start the call process.
     * @returns {Promise<any>} Call request response
     */
    requestCall: builder.mutation<any, void>({
      query: () => ({
        url: ApiEndpoints.AUDIO_CALL.REQUEST_CALL,
        method: HttpMethod.POST,
      }),
    }),

    /**
     * Cancels an active call request before it is accepted.
     * Used by clients to withdraw their call request.
     * @param {Object} data - Cancel request parameters
     * @param {number} data.chatId - Unique identifier for the chat session
     * @returns {Promise<any>} Cancel request response
     */
    cancelRequest: builder.mutation<any, { chatId: number }>({
      query: ({ chatId }) => ({
        url: ApiEndpoints.AUDIO_CALL.CANCEL_CHAT(chatId),
        method: HttpMethod.POST,
      }),
    }),

    /**
     * Accepts an incoming call request from a client.
     * Used by counsellors to start a call session.
     * @param {Object} data - Accept call parameters
     * @param {number} data.chatId - Unique identifier for the chat session
     * @returns {Promise<any>} Accept call response
     */
    acceptCall: builder.mutation<any, { chatId: number }>({
      query: ({ chatId }) => ({
        url: ApiEndpoints.AUDIO_CALL.ACCEPT_CHAT(chatId),
        method: HttpMethod.POST,
      }),
    }),

    /**
     * Retrieves chat information and data for the counsellor's view
     * of the current call session.
     * @returns {Promise<Chat>} Counsellor chat data
     */
    getCounsellorChat: builder.query<Chat, void>({
      query: () => ApiEndpoints.AUDIO_CALL.GET_COUNSELLOR_CHAT,
    }),

    /**
     * Get client chat data
     * Retrieves chat information and data for the client's view
     * of the current call session.
     * @returns {Promise<Chat>} Client chat data
     */
    getClientChat: builder.query<Chat, void>({
      query: () => ApiEndpoints.AUDIO_CALL.GET_CLIENT_CHAT,
    }),

    /**
     * Terminates an active call session.
     * Used by either counsellor or client to end the call.
     * @param {Object} data - End call parameters
     * @param {number} data.chatId - Unique identifier for the chat session
     * @returns {Promise<any>} End call response
     */
    endCall: builder.mutation<any, { chatId: number }>({
      query: ({ chatId }) => ({
        url: ApiEndpoints.AUDIO_CALL.END_CHAT(chatId),
        method: HttpMethod.POST,
      }),
    }),

    /**
     * Adds feedback (positive/negative) to a specific message
     * in the chat session for quality monitoring.
     * @param {Object} data - Feedback parameters
     * @param {number} data.id - Message ID to add feedback to
     * @param {FeedbackInput} data.feedback - Feedback data
     * @returns {Promise<FeedbackResponse>} Feedback response
     */
    addFeedback: builder.mutation<FeedbackResponse, { id: number; feedback: FeedbackInput }>({
      query: ({ id, feedback }) => ({
        url: ApiEndpoints.AUDIO_CALL.MESSAGE_FEEDBACK(id),
        method: HttpMethod.POST,
        body: feedback,
      }),
    }),

    /**
     * Updates feedback that was previously added to a message.
     * Allows users to modify their feedback.
     * @param {Object} data - Update feedback parameters
     * @param {number} data.feedbackId - ID of the feedback to update
     * @param {FeedbackInput} data.feedback - Updated feedback data
     * @returns {Promise<FeedbackResponse>} Updated feedback response
     */
    updateFeedback: builder.mutation<
      FeedbackResponse,
      { feedbackId: number; feedback: FeedbackInput }
    >({
      query: ({ feedbackId, feedback }) => ({
        url: ApiEndpoints.AUDIO_CALL.UPDATE_FEEDBACK(feedbackId),
        method: HttpMethod.PATCH,
        body: feedback,
      }),
    }),

    /**
     * Retrieves the current status of nudges/reminders
     * for the active call session.
     * @returns {Promise<boolean>} Nudge status (true if active, false otherwise)
     */
    getNudgeStatus: builder.query<boolean, void>({
      query: () => ApiEndpoints.AUDIO_CALL.GET_NUDGE_STATUS,
    }),
  }),
});

export const {
  useGetWaitingClientsQuery,
  useRequestCallMutation,
  useAcceptCallMutation,
  useLazyGetCounsellorChatQuery,
  useGetClientChatQuery,
  useLazyGetClientChatQuery,
  useEndCallMutation,
  useCancelRequestMutation,
  useAddFeedbackMutation,
  useUpdateFeedbackMutation,
  useGetNudgeStatusQuery,
} = audioCallAPI;

export default audioCallAPI;
