import { ApiEndpoints, HttpMethod } from "@constants";
import {
  AnalyticsAgentCatalogResponse,
  AskAnalyticsAgentRequest,
  AskAnalyticsAgentResponse,
} from "@types";

import { baseAPI } from "./baseApi";

/**
 * Analytics Agent endpoints.
 *
 * `ask` is a mutation even though it only reads: RTK Query caches queries by
 * argument, and two identical questions asked minutes apart must both run —
 * the second one is a deliberate re-ask against data that may have moved, not a
 * cache hit. A mutation also gives the composer the `isLoading` it needs per
 * send rather than per argument.
 */
export const analyticsAgentAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    askAnalyticsAgent: builder.mutation<AskAnalyticsAgentResponse, AskAnalyticsAgentRequest>({
      query: body => ({
        url: ApiEndpoints.ANALYTICS_AGENT.ASK,
        method: HttpMethod.POST,
        body,
      }),
    }),

    // The readable catalogue, for the "what can I ask about?" panel. Cached
    // normally: it changes on deploy, not per question.
    getAnalyticsAgentCatalog: builder.query<AnalyticsAgentCatalogResponse, void>({
      query: () => ({
        url: ApiEndpoints.ANALYTICS_AGENT.CATALOG,
        method: HttpMethod.GET,
      }),
    }),
  }),
});

export const { useAskAnalyticsAgentMutation, useGetAnalyticsAgentCatalogQuery } = analyticsAgentAPI;
