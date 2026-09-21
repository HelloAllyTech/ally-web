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
  CallLog,
} from "@types";

import { baseAPI } from "./baseAPI";

/**
 * The tag every query that renders *a page of call logs* carries, and the only
 * one a writer should invalidate when the page's membership changes — a note
 * created, a session archived. Row-level edits carry the row's own id instead.
 */
export const CALL_LOGS_LIST_TAG = { type: TAG_TYPES.CALL_LOGS, id: "LIST" } as const;

/**
 * `CallLogs` used to be a single coarse tag: the list provided it, five writers
 * invalidated it, and so every scribe-note autosave — one per 800ms debounce —
 * re-read the whole 25-row page and made ally-be decrypt all 25 `CallDetails`
 * again. Production saw 325 of those requests in under four hours, arriving in
 * runs of ~45 at a constant page size: one counsellor writing up one note.
 *
 * Tagging each row separately means a writer can name the row it touched, and
 * the queries that merely happened to share the coarse tag (counsellor names,
 * the tag vocabulary) stop refetching along with it. It does NOT by itself stop
 * the list refetching when the edited row is on screen — that one is fixed by
 * patching the cached row instead of invalidating it, see
 * `patchCachedCallLogRow`.
 */
const callLogListTags = (result?: GetCallLogsResponse) => [
  CALL_LOGS_LIST_TAG,
  ...(result?.data ?? []).map(({ id }) => ({ type: TAG_TYPES.CALL_LOGS, id })),
];

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
      providesTags: result => callLogListTags(result),
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
      providesTags: result => callLogListTags(result),
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
      // Not a call log, but it is refreshed by the same events that change the
      // list's membership, so it keeps the LIST tag — and only that, so a
      // row-level edit no longer drags it along.
      providesTags: [CALL_LOGS_LIST_TAG],
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
      // As with counsellor names: the tag vocabulary tracks the list as a
      // whole, never one row.
      providesTags: [CALL_LOGS_LIST_TAG],
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
      // A brand new row: the page's membership changed, so it has to be re-read.
      invalidatesTags: [CALL_LOGS_LIST_TAG],
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
      // Archiving moves the row out of (or back into) the list the counsellor is
      // looking at, which no in-place patch can express — re-read the page.
      invalidatesTags: [CALL_LOGS_LIST_TAG, TAG_TYPES.CALL_SUMMARY],
    }),
  }),
});

/**
 * The endpoints whose cache entries hold call-log rows. Both return the same
 * `{ data: CallLog[], count }` shape, so one patch covers the counsellor's own
 * list and the admin console's.
 */
type CallLogListEndpoint = "getCallLogs" | "getAdminCallLogs";

/**
 * The slice of RTK Query's mutation lifecycle API that `patchCachedCallLogRow`
 * needs. Declared structurally so callers can pass the `onQueryStarted` second
 * argument straight through.
 */
interface CacheApi {
  dispatch: (action: any) => any;
  getState: () => any;
}

/**
 * Apply an edit to one call-log row in every cached list that holds it, instead
 * of invalidating the list and making the server re-read — and re-decrypt —
 * every other row on the page.
 *
 * Use it for a write whose effect on the list is knowable from the write
 * itself: a summary save, a rename, a custom-field value. A write that changes
 * which rows belong on the page (create, archive) can't be expressed this way
 * and should invalidate `CALL_LOGS_LIST_TAG` instead.
 *
 * Call it *after* `queryFulfilled` — pessimistically. An optimistic patch would
 * have to be rolled back on failure, and the counsellor is already looking at
 * their own typing in the form; the list behind it is worth a few hundred
 * milliseconds of lag to keep honest.
 *
 * Rows the cache doesn't hold are skipped silently: `selectInvalidatedBy` only
 * returns entries that actually provide the row's tag, so a page the row isn't
 * on is never touched.
 */
export const patchCachedCallLogRow = (
  { dispatch, getState }: CacheApi,
  chatId: number,
  update: (row: CallLog) => void,
) => {
  const entries = baseAPI.util.selectInvalidatedBy(getState(), [
    { type: TAG_TYPES.CALL_LOGS, id: chatId },
  ]);

  entries.forEach(({ endpointName, originalArgs }) => {
    if (endpointName !== "getCallLogs" && endpointName !== "getAdminCallLogs") return;
    const patchRow = (draft: GetCallLogsResponse) => {
      const row = draft.data?.find(candidate => candidate.id === chatId);
      if (row) update(row);
    };
    dispatch(
      callsAPI.util.updateQueryData(
        endpointName as CallLogListEndpoint,
        originalArgs as GetCallLogsInput,
        patchRow,
      ),
    );
  });
};

/**
 * Upsert changed custom-field values into a row's denormalized copy, by
 * `fieldDefinitionId`. Mirrors what the backend stores, so the table cell shows
 * the saved value without a re-read.
 */
export const mergeRowCustomFieldValues = (
  existing: CallLog["customFieldValues"],
  changed: NonNullable<CallLog["customFieldValues"]>,
) => {
  const byField = new Map((existing ?? []).map(value => [value.fieldDefinitionId, value]));
  changed.forEach(value => byField.set(value.fieldDefinitionId, value));
  return Array.from(byField.values());
};

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
