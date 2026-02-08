import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  ConversationalGuardrail,
  ConversationalGuardrailTranslation,
  CreateConversationalGuardrailInput,
  UpdateConversationalGuardrailInput,
  GetGuardrailsResponse,
  GetGuardrailsQueryParams,
  CreateGuardrailTranslationInput,
  UpdateGuardrailTranslationInput,
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

    getGuardrailById: builder.query<ConversationalGuardrail, string>({
      query: id => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS}/${id}`,
        method: HttpMethod.GET,
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

    createGuardrails: builder.mutation<ConversationalGuardrail[], CreateConversationalGuardrailInput[]>({
      query: body => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS}/bulk`,
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

    deleteGuardrail: builder.mutation<void, string>({
      query: id => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS}/${id}`,
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.CONVERSATIONAL_GUARDRAILS],
    }),

    deleteGuardrails: builder.mutation<void, { ids: string[] }>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS,
        method: HttpMethod.DELETE,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CONVERSATIONAL_GUARDRAILS],
    }),

    getGuardrailTranslations: builder.query<ConversationalGuardrailTranslation[], string>({
      query: guardrailId => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS}/${guardrailId}/translations`,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.CONVERSATIONAL_GUARDRAILS],
    }),

    createGuardrailTranslation: builder.mutation<
      ConversationalGuardrailTranslation,
      CreateGuardrailTranslationInput
    >({
      query: body => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS}/translations`,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CONVERSATIONAL_GUARDRAILS],
    }),

    updateGuardrailTranslation: builder.mutation<
      ConversationalGuardrailTranslation,
      { id: string; translation: UpdateGuardrailTranslationInput }
    >({
      query: ({ id, translation }) => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS}/translations/${id}`,
        method: HttpMethod.PUT,
        body: translation,
      }),
      invalidatesTags: [TAG_TYPES.CONVERSATIONAL_GUARDRAILS],
    }),

    deleteGuardrailTranslation: builder.mutation<void, string>({
      query: id => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.CONVERSATIONAL_GUARDRAILS}/translations/${id}`,
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.CONVERSATIONAL_GUARDRAILS],
    }),
  }),
});

export const {
  useGetGuardrailsQuery,
  useGetGuardrailByIdQuery,
  useCreateGuardrailMutation,
  useCreateGuardrailsMutation,
  useUpdateGuardrailMutation,
  useDeleteGuardrailMutation,
  useDeleteGuardrailsMutation,
  useGetGuardrailTranslationsQuery,
  useCreateGuardrailTranslationMutation,
  useUpdateGuardrailTranslationMutation,
  useDeleteGuardrailTranslationMutation,
} = guardrailsApi;
