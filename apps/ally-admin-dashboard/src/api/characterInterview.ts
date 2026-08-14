import { ApiEndpoints, HttpMethod } from "@constants";
import { CharacterInterviewSession } from "@types";

import { baseAPI } from "./baseApi";

/**
 * Character Library interview agent — the non-streaming surface (create /
 * resume a session). The turn itself is a raw SSE fetch in
 * useCharacterInterviewStream, not an RTK endpoint.
 *
 * Injected onto `baseAPI` rather than creating a new api, so no store change
 * is needed. No tags: sessions are read imperatively (lazy queries) at
 * bootstrap, so there is nothing cached for an invalidation to refresh — and
 * an unregistered tag would be silently ignored anyway (see baseApi.ts).
 */
const characterInterviewAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    createCharacterInterviewSession: builder.mutation<CharacterInterviewSession, void>({
      query: () => ({
        url: ApiEndpoints.CHARACTERS.INTERVIEW_SESSIONS,
        method: HttpMethod.POST,
        body: {},
      }),
    }),

    /** One session with its full transcript — the resume path. */
    getCharacterInterviewSession: builder.query<CharacterInterviewSession, string>({
      query: sessionId => ({
        url: ApiEndpoints.CHARACTERS.INTERVIEW_SESSION(sessionId),
        method: HttpMethod.GET,
      }),
    }),

    /** The caller's ACTIVE sessions, newest first — cross-browser resume. */
    getCharacterInterviewSessions: builder.query<CharacterInterviewSession[], void>({
      query: () => ({
        url: ApiEndpoints.CHARACTERS.INTERVIEW_SESSIONS,
        method: HttpMethod.GET,
      }),
      transformResponse: (
        response: CharacterInterviewSession[] | { data: CharacterInterviewSession[] },
      ) => (Array.isArray(response) ? response : (response?.data ?? [])),
    }),
  }),
});

export const {
  useCreateCharacterInterviewSessionMutation,
  useLazyGetCharacterInterviewSessionQuery,
  useLazyGetCharacterInterviewSessionsQuery,
} = characterInterviewAPI;
