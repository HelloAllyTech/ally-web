/**
 * Text helpline — public + guest endpoints for the anonymous talker page
 * (ally-be docs/text-helpline.md §5.1, §5.2).
 *
 * WHY A SEPARATE createApi. The app's `baseAPI` treats a 401 with no user
 * tokens as an expired session and hard-redirects to /login. A talker has no
 * user session at all, so an expired or revoked guest token (a normal event —
 * erasure revokes it) would bounce someone who reached out for help onto a
 * staff sign-in page. This slice uses a plain `fetchBaseQuery`: a 401 is just
 * an error the talker page handles by clearing the token and starting over.
 *
 * It also never sends the user's access token: the Authorization header is the
 * guest token for this helpline, read from sessionStorage at request time.
 * Its reducer is not persisted (redux-persist only whitelists the user slice).
 */
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { ApiEndpoints, HttpMethod } from "@constants";
import type {
  CreateGuestSessionBody,
  GuestChatResponse,
  GuestFeedbackBody,
  GuestSessionResponse,
  GuestTokenResponse,
  PublicStatusDto,
} from "@types";
import { readGuestToken } from "@utils/helplineGuestToken";

export interface GuestArg {
  tenantCode: string;
}

const guestHeaders = (tenantCode: string): Record<string, string> => {
  const stored = readGuestToken(tenantCode);
  return stored ? { Authorization: `Bearer ${stored.token}` } : {};
};

export const helplineGuestAPI = createApi({
  reducerPath: "helplineGuestAPI",
  // No baseUrl: each endpoint builds its URL from apiRoot() when the request
  // is made, so nothing is read at module load (see CLAUDE.md gotchas).
  baseQuery: fetchBaseQuery({ baseUrl: "" }),
  // Nothing on the talker page should be served from a stale cache entry.
  keepUnusedDataFor: 0,
  endpoints: builder => ({
    getPublicStatus: builder.query<PublicStatusDto, { tenantCode: string; lang?: string }>({
      query: ({ tenantCode, lang }) => ({
        url: `${apiRoot()}${ApiEndpoints.HELPLINE.PUBLIC_STATUS(tenantCode)}`,
        params: lang ? { lang } : undefined,
      }),
    }),

    /** 403 HELPLINE_DISABLED · 409 HELPLINE_CLOSED · 503 HELPLINE_QUEUE_FULL · 400 CONSENT_OUTDATED · 403 TALKER_BLOCKED. */
    createGuestSession: builder.mutation<
      GuestSessionResponse,
      GuestArg & { body: CreateGuestSessionBody }
    >({
      query: ({ tenantCode, body }) => ({
        url: `${apiRoot()}${ApiEndpoints.HELPLINE.PUBLIC_SESSION(tenantCode)}`,
        method: HttpMethod.POST,
        body,
      }),
    }),

    getGuestChat: builder.query<GuestChatResponse, GuestArg & { afterId?: number }>({
      query: ({ tenantCode, afterId }) => ({
        url: `${apiRoot()}${ApiEndpoints.HELPLINE.GUEST_CHAT}`,
        params: afterId !== undefined ? { afterId } : undefined,
        headers: guestHeaders(tenantCode),
      }),
    }),

    refreshGuestToken: builder.mutation<GuestTokenResponse, GuestArg>({
      query: ({ tenantCode }) => ({
        url: `${apiRoot()}${ApiEndpoints.HELPLINE.GUEST_REFRESH}`,
        method: HttpMethod.POST,
        headers: guestHeaders(tenantCode),
      }),
    }),

    endGuestChat: builder.mutation<{ chat: GuestChatResponse["chat"] }, GuestArg>({
      query: ({ tenantCode }) => ({
        url: `${apiRoot()}${ApiEndpoints.HELPLINE.GUEST_END}`,
        method: HttpMethod.POST,
        headers: guestHeaders(tenantCode),
      }),
    }),

    eraseGuestChat: builder.mutation<void, GuestArg>({
      query: ({ tenantCode }) => ({
        url: `${apiRoot()}${ApiEndpoints.HELPLINE.GUEST_ERASE}`,
        method: HttpMethod.POST,
        headers: guestHeaders(tenantCode),
      }),
    }),

    submitGuestFeedback: builder.mutation<void, GuestArg & { body: GuestFeedbackBody }>({
      query: ({ tenantCode, body }) => ({
        url: `${apiRoot()}${ApiEndpoints.HELPLINE.GUEST_FEEDBACK}`,
        method: HttpMethod.POST,
        body,
        headers: guestHeaders(tenantCode),
      }),
    }),
  }),
});

/** `${VITE_API_BASE_URL}/api`, read when a request is built. */
export function apiRoot(): string {
  return `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;
}

/**
 * Best-effort end for Quick exit: the page is about to be replaced, so an RTK
 * request would be cancelled with it. `keepalive` lets the browser finish the
 * POST after navigation (sendBeacon can't carry an Authorization header).
 */
export const endGuestChatOnExit = (token: string) => {
  try {
    void fetch(`${apiRoot()}${ApiEndpoints.HELPLINE.GUEST_END}`, {
      method: HttpMethod.POST,
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Leaving matters more than telling the server.
  }
};

export const {
  useGetPublicStatusQuery,
  useLazyGetPublicStatusQuery,
  useCreateGuestSessionMutation,
  useLazyGetGuestChatQuery,
  useRefreshGuestTokenMutation,
  useEndGuestChatMutation,
  useEraseGuestChatMutation,
  useSubmitGuestFeedbackMutation,
} = helplineGuestAPI;
