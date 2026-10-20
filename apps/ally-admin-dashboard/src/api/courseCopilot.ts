import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CourseBlueprint,
  CourseCopilotBlueprintResponse,
  CourseCopilotBudget,
  CourseCopilotSessionDetail,
  CourseCopilotSessionSummary,
  TrackLandingPageDraftResponse,
} from "@types";

import { baseAPI } from "./baseApi";

/**
 * Course Copilot's non-streaming surface: sessions, blueprint edits and approval, the build's
 * retry/cancel, and the budget. The interview turn itself is an SSE stream driven by
 * `useCourseCopilotStream` — RTK Query cannot consume one — and anything a turn changes
 * server-side is picked up by the page refetching the session on `done`.
 *
 * Tags: the list is `COURSE_COPILOT_SESSIONS`, one session is `COURSE_COPILOT_SESSION:<id>`.
 * Every mutation that moves a session's status (approve, retry, cancel, archive) invalidates
 * both, because the list shows the status Tag.
 */
export const courseCopilotAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Creates a session — or, with `trackId`, returns the caller's existing active EDIT session
     * bound to that course (the server dedupes). 409 `{message}` when the caller already holds two
     * active sessions; the message is server-written and shown as is.
     */
    createCourseCopilotSession: builder.mutation<
      CourseCopilotSessionSummary,
      { trackId?: string } | void
    >({
      query: body => ({
        url: ApiEndpoints.COURSE_COPILOT.SESSIONS,
        method: HttpMethod.POST,
        body: body && body.trackId ? { trackId: body.trackId } : {},
      }),
      invalidatesTags: [TAG_TYPES.COURSE_COPILOT_SESSIONS],
    }),

    /** The caller's non-archived sessions, newest first. */
    getCourseCopilotSessions: builder.query<CourseCopilotSessionSummary[], void>({
      query: () => ({
        url: ApiEndpoints.COURSE_COPILOT.SESSIONS,
        method: HttpMethod.GET,
      }),
      transformResponse: (
        response: CourseCopilotSessionSummary[] | { data: CourseCopilotSessionSummary[] },
      ) => (Array.isArray(response) ? response : (response?.data ?? [])),
      providesTags: [TAG_TYPES.COURSE_COPILOT_SESSIONS],
    }),

    /**
     * One session with its transcript, jobs, outline and budget.
     *
     * The page's own cache entry is the FULL detail (`{ id }`, no `afterSeq`) — a refetch replaces
     * everything, so `messages`, `jobs`, `outline` and `budget` can never drift apart. `afterSeq`
     * is exposed for callers that only want the events after a seq (server caps at 200); it keys
     * a separate cache entry, so use it through the lazy hook, not by changing the page's arg.
     */
    getCourseCopilotSession: builder.query<
      CourseCopilotSessionDetail,
      { id: string; afterSeq?: number }
    >({
      query: ({ id, afterSeq }) => ({
        url: ApiEndpoints.COURSE_COPILOT.SESSION_BY_ID(id),
        method: HttpMethod.GET,
        params: afterSeq !== undefined ? { afterSeq } : undefined,
      }),
      providesTags: (result, error, { id }) => [{ type: TAG_TYPES.COURSE_COPILOT_SESSION, id }],
    }),

    /**
     * Saves the edited blueprint. `version` is the one that was edited — a stale one is a 409, and
     * the caller reloads rather than overwriting someone else's (or the copilot's) newer edit.
     */
    updateCourseCopilotBlueprint: builder.mutation<
      CourseCopilotBlueprintResponse,
      { id: string; blueprint: CourseBlueprint; version: number }
    >({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.COURSE_COPILOT.SESSION_BLUEPRINT(id),
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: TAG_TYPES.COURSE_COPILOT_SESSION, id }],
    }),

    /** Approve and start the build: status → BUILDING. 400 `{message}` lists what blocks it. */
    approveCourseCopilotBlueprint: builder.mutation<
      CourseCopilotSessionDetail,
      { id: string; version: number }
    >({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.COURSE_COPILOT.SESSION_BLUEPRINT_APPROVE(id),
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: TAG_TYPES.COURSE_COPILOT_SESSION, id },
        TAG_TYPES.COURSE_COPILOT_SESSIONS,
      ],
    }),

    /** Retry failed/skipped jobs — all of them when `jobIds` is omitted. */
    retryCourseCopilotBuild: builder.mutation<
      CourseCopilotSessionDetail,
      { id: string; jobIds?: string[] }
    >({
      query: ({ id, jobIds }) => ({
        url: ApiEndpoints.COURSE_COPILOT.SESSION_BUILD_RETRY(id),
        method: HttpMethod.POST,
        body: jobIds?.length ? { jobIds } : {},
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: TAG_TYPES.COURSE_COPILOT_SESSION, id },
        TAG_TYPES.COURSE_COPILOT_SESSIONS,
      ],
    }),

    /** Queued jobs → skipped, running ones finish; status → EDITING. Nothing already built is lost. */
    cancelCourseCopilotBuild: builder.mutation<CourseCopilotSessionDetail, string>({
      query: id => ({
        url: ApiEndpoints.COURSE_COPILOT.SESSION_BUILD_CANCEL(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (result, error, id) => [
        { type: TAG_TYPES.COURSE_COPILOT_SESSION, id },
        TAG_TYPES.COURSE_COPILOT_SESSIONS,
      ],
    }),

    /**
     * Live spend and the ceiling.
     *
     * Untagged, like Builder's: it moves between invalidations (that is when the number is
     * interesting), and hanging it on the session tag would refetch it for every unrelated
     * mutation without ever refreshing it in between.
     */
    getCourseCopilotBudget: builder.query<CourseCopilotBudget, string>({
      query: id => ({
        url: ApiEndpoints.COURSE_COPILOT.SESSION_BUDGET(id),
        method: HttpMethod.GET,
      }),
    }),

    /** Raise the ceiling (0 = uncapped; must exceed spend). Releases any held jobs. */
    raiseCourseCopilotBudget: builder.mutation<
      CourseCopilotBudget,
      { id: string; budgetUsd: number }
    >({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.COURSE_COPILOT.SESSION_BUDGET(id),
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: TAG_TYPES.COURSE_COPILOT_SESSION, id }],
    }),

    /** Closes the conversation. Never deletes the course. */
    archiveCourseCopilotSession: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.COURSE_COPILOT.SESSION_ARCHIVE(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (result, error, id) => [
        { type: TAG_TYPES.COURSE_COPILOT_SESSION, id },
        TAG_TYPES.COURSE_COPILOT_SESSIONS,
      ],
    }),

    /**
     * Drafts the story fields of a SAVED course's landing page from its sections, items and
     * roleplay summaries. A POST because it spends a model call, but it writes nothing: the
     * caller merges the draft into the form's empty fields and the author saves as usual.
     * 404 when the course does not exist; a readable `{message}` when the model's output could
     * not be parsed.
     */
    draftTrackLandingPage: builder.mutation<TrackLandingPageDraftResponse, string>({
      query: trackId => ({
        url: ApiEndpoints.COURSE_COPILOT.TRACK_LANDING_PAGE_DRAFT(trackId),
        method: HttpMethod.POST,
      }),
    }),
  }),
});

export const {
  useCreateCourseCopilotSessionMutation,
  useGetCourseCopilotSessionsQuery,
  useGetCourseCopilotSessionQuery,
  useLazyGetCourseCopilotSessionQuery,
  useUpdateCourseCopilotBlueprintMutation,
  useApproveCourseCopilotBlueprintMutation,
  useRetryCourseCopilotBuildMutation,
  useCancelCourseCopilotBuildMutation,
  useGetCourseCopilotBudgetQuery,
  useRaiseCourseCopilotBudgetMutation,
  useArchiveCourseCopilotSessionMutation,
  useDraftTrackLandingPageMutation,
} = courseCopilotAPI;
