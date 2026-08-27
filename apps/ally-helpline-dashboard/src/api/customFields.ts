import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CustomFieldDefinition,
  CustomFieldValue,
  CreateCustomFieldDefinitionInput,
  UpdateCustomFieldDefinitionInput,
  UpsertCustomFieldValuesInput,
} from "@types";

import { baseAPI } from "./baseAPI";

const customFieldsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getCustomFieldDefinitions: builder.query<CustomFieldDefinition[], void>({
      query: () => ApiEndpoints.CUSTOM_FIELDS.GET_DEFINITIONS,
      providesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    createCustomFieldDefinition: builder.mutation<
      CustomFieldDefinition,
      CreateCustomFieldDefinitionInput
    >({
      query: body => ({
        url: ApiEndpoints.CUSTOM_FIELDS.CREATE_DEFINITION,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    reorderCustomFieldDefinitions: builder.mutation<{ success: boolean }, { ids: string[] }>({
      query: body => ({
        url: ApiEndpoints.CUSTOM_FIELDS.REORDER_DEFINITIONS,
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    updateCustomFieldDefinition: builder.mutation<
      CustomFieldDefinition,
      { id: string } & UpdateCustomFieldDefinitionInput
    >({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.CUSTOM_FIELDS.UPDATE_DEFINITION(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    deleteCustomFieldDefinition: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.CUSTOM_FIELDS.DELETE_DEFINITION(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    getCustomFieldValues: builder.query<CustomFieldValue[], number>({
      query: chatId => ApiEndpoints.CUSTOM_FIELDS.GET_VALUES(chatId),
      providesTags: (_result, _error, chatId) => [
        { type: TAG_TYPES.CUSTOM_FIELD_VALUES, id: chatId },
      ],
    }),

    upsertCustomFieldValues: builder.mutation<
      { success: boolean },
      { chatId: number } & UpsertCustomFieldValuesInput
    >({
      query: ({ chatId, values }) => ({
        url: ApiEndpoints.CUSTOM_FIELDS.UPSERT_VALUES(chatId),
        method: HttpMethod.PUT,
        body: { values },
      }),
      invalidatesTags: (_result, _error, { chatId }) => [
        { type: TAG_TYPES.CUSTOM_FIELD_VALUES, id: chatId },
        TAG_TYPES.CALL_LOGS,
      ],
    }),

    getSummarySections: builder.query<
      {
        sections: {
          id: string;
          label: string;
          enabled: boolean;
          fields: { id: string; label: string }[];
        }[];
      },
      void
    >({
      query: () => ApiEndpoints.SETTINGS.GET_SUMMARY_SECTIONS,
    }),

    getEnabledCustomFieldTypes: builder.query<string[], void>({
      query: () => ApiEndpoints.SETTINGS.GET_CUSTOM_FIELD_TYPES,
    }),

    getCustomFieldsEnabled: builder.query<boolean, void>({
      query: () => ApiEndpoints.SETTINGS.GET_CUSTOM_FIELDS_ENABLED,
    }),

    getScribeNoteCreationEnabled: builder.query<boolean, void>({
      query: () => ApiEndpoints.SETTINGS.GET_SCRIBE_NOTE_CREATION_ENABLED,
    }),

    getScribeVoiceNoteEnabled: builder.query<boolean, void>({
      query: () => ApiEndpoints.SETTINGS.GET_SCRIBE_VOICE_NOTE_ENABLED,
      // Same endpoint as organizationSettings.ts's own-tenant query, so it must
      // carry the same tag: for an account that is both admin and counsellor,
      // flipping the toggle in Org Settings has to reach the Create Note
      // drawer's copy too, not just the switch that was clicked.
      providesTags: [TAG_TYPES.SCRIBE_VOICE_NOTE_ENABLED],
    }),
  }),
});

export const {
  useGetCustomFieldDefinitionsQuery,
  useCreateCustomFieldDefinitionMutation,
  useReorderCustomFieldDefinitionsMutation,
  useUpdateCustomFieldDefinitionMutation,
  useDeleteCustomFieldDefinitionMutation,
  useGetCustomFieldValuesQuery,
  useUpsertCustomFieldValuesMutation,
  useGetSummarySectionsQuery,
  useGetEnabledCustomFieldTypesQuery,
  useGetCustomFieldsEnabledQuery,
  useGetScribeNoteCreationEnabledQuery,
  useGetScribeVoiceNoteEnabledQuery,
} = customFieldsAPI;
