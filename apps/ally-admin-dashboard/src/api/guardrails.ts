import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  ConversationalGuardrail,
  CreateConversationalGuardrailInput,
  UpdateConversationalGuardrailInput,
  GetGuardrailsResponse,
  GetGuardrailsQueryParams,
} from "@types";

import { baseAPI } from "./baseApi";

const guardrailsApi = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getGuardrails: builder.query<GetGuardrailsResponse, GetGuardrailsQueryParams>({
      query: params => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.CONVERSATIONAL_GUARDRAILS],
    }),

    createGuardrail: builder.mutation<ConversationalGuardrail, CreateConversationalGuardrailInput>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CONVERSATIONAL_GUARDRAILS],
    }),

    updateGuardrail: builder.mutation<
      ConversationalGuardrail,
      { id: string; guardrail: UpdateConversationalGuardrailInput }
    >({
      query: ({ id, guardrail }) => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS}/${id}`,
        method: HttpMethod.PUT,
        body: guardrail,
      }),
      invalidatesTags: [TAG_TYPES.CONVERSATIONAL_GUARDRAILS],
    }),
  }),
});

export const { useGetGuardrailsQuery, useCreateGuardrailMutation, useUpdateGuardrailMutation } =
  guardrailsApi;
