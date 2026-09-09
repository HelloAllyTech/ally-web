import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CreateComponentTemplateInput,
  GetComponentTemplatesQueryParams,
  GetComponentTemplatesResponse,
  TrackComponentTemplate,
  UpdateComponentTemplateInput,
} from "@types";

/**
 * Component Library — global, cross-tenant Track/Course item templates.
 * Mirrors ally-be's `v1/learn/admin/component-templates` contract. Single
 * delete goes through the same bulk mutation with a one-element `ids` array
 * (matching how `useDeleteCharacterMutation` is called for both a single row
 * and a multi-select), rather than a separate DELETE_ONE mutation.
 */
const componentTemplatesApi = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getComponentTemplates: builder.query<
      GetComponentTemplatesResponse,
      GetComponentTemplatesQueryParams
    >({
      query: params => ({
        url: ApiEndpoints.COMPONENT_TEMPLATES.LIST,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.COMPONENT_LIBRARY],
    }),

    getComponentTemplate: builder.query<TrackComponentTemplate, string>({
      query: id => ({
        url: ApiEndpoints.COMPONENT_TEMPLATES.GET_BY_ID(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.COMPONENT_LIBRARY],
    }),

    createComponentTemplate: builder.mutation<TrackComponentTemplate, CreateComponentTemplateInput>(
      {
        query: body => ({
          url: ApiEndpoints.COMPONENT_TEMPLATES.CREATE,
          method: HttpMethod.POST,
          body,
        }),
        invalidatesTags: [TAG_TYPES.COMPONENT_LIBRARY],
      },
    ),

    updateComponentTemplate: builder.mutation<
      TrackComponentTemplate,
      { id: string; data: UpdateComponentTemplateInput }
    >({
      query: ({ id, data }) => ({
        url: ApiEndpoints.COMPONENT_TEMPLATES.UPDATE(id),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.COMPONENT_LIBRARY],
    }),

    deleteComponentTemplates: builder.mutation<{ success: boolean }, { ids: string[] }>({
      query: body => ({
        url: ApiEndpoints.COMPONENT_TEMPLATES.DELETE_BULK,
        method: HttpMethod.DELETE,
        body,
      }),
      invalidatesTags: [TAG_TYPES.COMPONENT_LIBRARY],
    }),
  }),
});

export const {
  useGetComponentTemplatesQuery,
  useGetComponentTemplateQuery,
  useCreateComponentTemplateMutation,
  useUpdateComponentTemplateMutation,
  useDeleteComponentTemplatesMutation,
} = componentTemplatesApi;
