/**
 * Track 2.0 learner APIs (multi-component learning tracks).
 *
 * Caching strategy: mutations invalidate detail + list + next EXCEPT
 * `reportVideoProgress`, which fires every ~10s — that one optimistically
 * patches the cached track detail and only invalidates when the response
 * flips `completed: true`.
 */
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  AnnotationAttemptResult,
  AnnotationMarkInput,
  EnrollTrackResponse,
  GetLearnTracksResponse,
  GetNextTrackItemResponse,
  QuizAnswerInput,
  QuizAttemptResult,
  StartTrackItemResponse,
  TrackDetail,
  TrackItemCompletionResult,
  TrackItemStatus,
  VideoProgressResult,
} from "@types";

import { baseAPI } from "./baseAPI";

const ALL_TRACK_TAGS = [
  TAG_TYPES.LEARN_TRACKS,
  TAG_TYPES.LEARN_TRACK_DETAIL,
  TAG_TYPES.LEARN_TRACK_NEXT,
];

/**
 * Applies a completion result to a cached TrackDetail draft in place:
 * marks the item COMPLETED, unlocks the ids the server reported and bumps
 * the enrollment counters. Keeps the player responsive between refetches.
 */
export const applyCompletionToDetailDraft = (
  draft: TrackDetail,
  itemId: string,
  result: TrackItemCompletionResult,
): void => {
  if (!result.completed) return;
  for (const section of draft.sections) {
    for (const item of section.items) {
      if (item.id === itemId && item.status !== TrackItemStatus.COMPLETED) {
        item.status = TrackItemStatus.COMPLETED;
        item.completedAt = item.completedAt ?? new Date().toISOString();
        draft.completedItems = Math.min(draft.totalItems, draft.completedItems + 1);
      } else if (
        result.unlockedItemIds?.includes(item.id) &&
        item.status === TrackItemStatus.LOCKED
      ) {
        item.status = TrackItemStatus.UNLOCKED;
      }
    }
  }
  if (result.trackCompleted) {
    draft.completedAt = draft.completedAt ?? new Date().toISOString();
  }
};

const tracksAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /** List Track 2.0 tracks visible to the learner (with progress). */
    getLearnTracks: builder.query<GetLearnTracksResponse, void>({
      query: () => ({
        url: ApiEndpoints.TRACKS.GET_TRACKS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.LEARN_TRACKS],
    }),

    /** Full track detail: sections + items with per-item progress status. */
    getLearnTrackDetail: builder.query<TrackDetail, { trackId: string }>({
      query: ({ trackId }) => ({
        url: ApiEndpoints.TRACKS.GET_TRACK_DETAIL(trackId),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.LEARN_TRACK_DETAIL],
    }),

    /** Next unlocked-but-incomplete item for deep-linking into the player. */
    getNextTrackItem: builder.query<GetNextTrackItemResponse, { trackId: string }>({
      query: ({ trackId }) => ({
        url: ApiEndpoints.TRACKS.GET_NEXT_ITEM(trackId),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.LEARN_TRACK_NEXT],
    }),

    /** Idempotent enrollment — creates all progress rows server-side. */
    enrollTrack: builder.mutation<EnrollTrackResponse, { trackId: string }>({
      query: ({ trackId }) => ({
        url: ApiEndpoints.TRACKS.ENROLL(trackId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: ALL_TRACK_TAGS,
    }),

    /**
     * Start (or resume) a track item. Returns the type-discriminated content
     * payload. 400s when the item is still locked.
     */
    startTrackItem: builder.mutation<StartTrackItemResponse, { itemId: string }>({
      query: ({ itemId }) => ({
        url: ApiEndpoints.TRACKS.START_ITEM(itemId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: ALL_TRACK_TAGS,
    }),

    /** Mark an article read (completes the item when criteria are met). */
    markArticleRead: builder.mutation<TrackItemCompletionResult, { itemId: string }>({
      query: ({ itemId }) => ({
        url: ApiEndpoints.TRACKS.ARTICLE_READ(itemId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: ALL_TRACK_TAGS,
    }),

    /**
     * Throttled video watch reporting (~10s cadence). Never blanket-
     * invalidates: optimistically patches the cached detail and only
     * invalidates the track tags when the response flips `completed`.
     */
    reportVideoProgress: builder.mutation<
      VideoProgressResult,
      { itemId: string; trackId: string; watchedPct: number }
    >({
      query: ({ itemId, watchedPct }) => ({
        url: ApiEndpoints.TRACKS.VIDEO_PROGRESS(itemId),
        method: HttpMethod.POST,
        body: { watchedPct },
      }),
      onQueryStarted: async ({ itemId, trackId, watchedPct }, { dispatch, queryFulfilled }) => {
        // Optimistic patch of the item's maxWatchedPct in the cached detail.
        const patch = dispatch(
          tracksAPI.util.updateQueryData("getLearnTrackDetail", { trackId }, draft => {
            for (const section of draft.sections) {
              for (const item of section.items) {
                if (item.id === itemId) {
                  item.maxWatchedPct = Math.max(item.maxWatchedPct ?? 0, watchedPct);
                }
              }
            }
          }),
        );
        try {
          const { data } = await queryFulfilled;
          if (data.completed) {
            dispatch(baseAPI.util.invalidateTags(ALL_TRACK_TAGS));
          }
        } catch {
          patch.undo();
        }
      },
    }),

    /** Submit a full quiz attempt (single-shot answers payload). */
    submitQuizAttempt: builder.mutation<
      QuizAttemptResult,
      { itemId: string; answers: QuizAnswerInput[] }
    >({
      query: ({ itemId, answers }) => ({
        url: ApiEndpoints.TRACKS.QUIZ_ATTEMPTS(itemId),
        method: HttpMethod.POST,
        body: { answers },
      }),
      invalidatesTags: ALL_TRACK_TAGS,
    }),

    /** Re-run grading for a PENDING_GRADING attempt (LLM grader retry). */
    regradeQuizAttempt: builder.mutation<QuizAttemptResult, { itemId: string; attemptId: string }>({
      query: ({ itemId, attemptId }) => ({
        url: ApiEndpoints.TRACKS.QUIZ_REGRADE(itemId, attemptId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: ALL_TRACK_TAGS,
    }),

    /**
     * Journal draft autosave (debounced ~1s upstream). Like
     * reportVideoProgress this must not thrash the caches — a draft save
     * changes no progress state, so it invalidates nothing.
     */
    saveJournalDraft: builder.mutation<
      { success: boolean },
      { itemId: string; responses: { promptId: string; response: string }[] }
    >({
      query: ({ itemId, responses }) => ({
        url: ApiEndpoints.TRACKS.JOURNAL_DRAFT(itemId),
        method: HttpMethod.POST,
        body: { responses },
      }),
    }),

    /** Submit the journal (400 when required prompts are unanswered). */
    submitJournal: builder.mutation<TrackItemCompletionResult, { itemId: string }>({
      query: ({ itemId }) => ({
        url: ApiEndpoints.TRACKS.JOURNAL_SUBMIT(itemId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: ALL_TRACK_TAGS,
    }),

    /**
     * Submit annotation marks. Graded synchronously server-side (pure set
     * comparison — no LLM), so the result comes back on this response and
     * there is no regrade counterpart.
     */
    submitAnnotationAttempt: builder.mutation<
      AnnotationAttemptResult,
      { itemId: string; marks: AnnotationMarkInput[] }
    >({
      query: ({ itemId, marks }) => ({
        url: ApiEndpoints.TRACKS.ANNOTATION_ATTEMPTS(itemId),
        method: HttpMethod.POST,
        body: { marks },
      }),
      invalidatesTags: ALL_TRACK_TAGS,
    }),
  }),
});

export const {
  useGetLearnTracksQuery,
  useGetLearnTrackDetailQuery,
  useGetNextTrackItemQuery,
  useLazyGetNextTrackItemQuery,
  useEnrollTrackMutation,
  useStartTrackItemMutation,
  useMarkArticleReadMutation,
  useReportVideoProgressMutation,
  useSubmitQuizAttemptMutation,
  useRegradeQuizAttemptMutation,
  useSaveJournalDraftMutation,
  useSubmitJournalMutation,
  useSubmitAnnotationAttemptMutation,
} = tracksAPI;

export { tracksAPI };
