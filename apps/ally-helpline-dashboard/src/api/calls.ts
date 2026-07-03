/**
 * This module provides all call-related API endpoints including:
 * - Call logs retrieval (user and admin views)
 * - Counsellor information
 * - Call tags and categorization
 * - Chat type definitions
 */

import { CallType, ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
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
  ProcessAudioUploadInput,
  ProcessAudioUploadResponse,
  CreateNoteResponse,
  GenerateNoteFromAudioInput,
  GenerateNoteFromAudioResponse,
  SaveNoteTranscriptInput,
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
      providesTags: ["CallLogs", TAG_TYPES.CALL_LOGS],
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
     * Creates an empty manual scribe note (a DICTATION-mode chat with no audio)
     * and returns its id + auto-generated name, so org custom fields can be attached.
     * @returns {Promise<CreateNoteResponse>} The new note's chatId and name
     */
    createNote: builder.mutation<CreateNoteResponse, void>({
      query: () => ({
        url: ApiEndpoints.CALLS.CREATE_NOTE,
        method: HttpMethod.POST,
      }),
      invalidatesTags: ["CallLogs", TAG_TYPES.CALL_LOGS],
    }),

    /**
     * Transcribes a dictated audio recording and extracts scribe-note field
     * values from it. The audio is processed server-side in memory and never
     * stored. Sent as multipart/form-data; fetchBaseQuery passes the FormData
     * body through untouched so the browser sets the multipart boundary.
     * @param {GenerateNoteFromAudioInput} params - Audio blob + target field specs
     * @returns {Promise<GenerateNoteFromAudioResponse>} Transcript + extracted values
     */
    generateNoteFromAudio: builder.mutation<
      GenerateNoteFromAudioResponse,
      GenerateNoteFromAudioInput
    >({
      query: ({ audio, fields, languageHint }) => {
        // Name the part with an extension matching the recorded container so
        // the server-side STT (which infers format from the filename) accepts
        // it — Safari records audio/mp4, Chromium audio/webm.
        const extByType: Record<string, string> = {
          "audio/webm": "webm",
          "audio/ogg": "ogg",
          "audio/mp4": "mp4",
          "audio/mpeg": "mp3",
          "audio/wav": "wav",
        };
        const base = (audio.type || "audio/webm").split(";")[0];
        const ext = extByType[base] ?? "webm";
        const formData = new FormData();
        formData.append("audio", audio, `dictation.${ext}`);
        formData.append("fields", JSON.stringify(fields));
        if (languageHint) formData.append("languageHint", languageHint);
        return {
          url: ApiEndpoints.CALLS.GENERATE_NOTE_FROM_AUDIO,
          method: HttpMethod.POST,
          body: formData,
        };
      },
    }),

    /**
     * Saves a manual scribe note's dictated transcript so it appears in the
     * note's Transcript view later. Replaces any previously stored transcript
     * for the note (the drawer re-sends the full accumulated dictation), so it
     * is safe to call after every generation.
     * @param {SaveNoteTranscriptInput} params - chatId + full transcript text
     * @returns {Promise<{ success: boolean }>} Save confirmation
     */
    saveNoteTranscript: builder.mutation<{ success: boolean }, SaveNoteTranscriptInput>({
      query: ({ chatId, transcript }) => ({
        url: ApiEndpoints.CALLS.SAVE_NOTE_TRANSCRIPT(chatId),
        method: HttpMethod.PUT,
        body: { transcript },
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
     * Initiate processing of the uploaded audio file.
     * @param {ProcessAudioUploadInput} params - Object with audio s3Key
     * @returns {Promise<ProcessAudioUploadResponse>} Confirmation message
     */
    processAudioUpload: builder.mutation<ProcessAudioUploadResponse, ProcessAudioUploadInput>({
      query: params => ({
        url: ApiEndpoints.CALLS.PROCESS_AUDIO_UPLOAD,
        method: HttpMethod.POST,
        body: params,
      }),
    }),

    /**
     * Permanently deletes a call log by id. This action is irreversible and
     * should typically be restricted to admin roles.
     * @param {number} chatId - The id of the call/chat to delete
     * @returns {Promise<string>} Success message
     */
    deleteCallLog: builder.mutation<string, number>({
      query: chatId => ({
        url: ApiEndpoints.CALLS.DELETE_CALL_LOG(chatId),
        method: HttpMethod.DELETE,
      }),
    }),

    /**
     * Archives or unarchives a call log by id.
     * @param {Object} params - Archive parameters
     * @param {number} params.chatId - The id of the call/chat to archive/unarchive
     * @param {boolean} params.archive - true to archive, false to unarchive
     * @returns {Promise<any>} Success response
     */
    archiveCallLog: builder.mutation<any, { chatId: number; archive: boolean }>({
      query: ({ chatId, archive }) => ({
        url: ApiEndpoints.CALLS.ARCHIVE_CALL_LOG(chatId),
        method: HttpMethod.PATCH,
        body: { archive: archive },
      }),
      invalidatesTags: ["CallLogs", "CallSummary"],
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
  useCreateNoteMutation,
  useGenerateNoteFromAudioMutation,
  useSaveNoteTranscriptMutation,
  useCancelAudioUploadMutation,
  useDeleteCallLogMutation,
  useProcessAudioUploadMutation,
  useArchiveCallLogMutation,
} = callsAPI;
