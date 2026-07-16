import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  LabSkill,
  LabVariable,
  LabValue,
  LabRun,
  LabListResponse,
  LabListQuery,
  LabValueListQuery,
  CreateLabSkillRequest,
  UpdateLabSkillRequest,
  CreateLabVariableRequest,
  UpdateLabVariableRequest,
  CreateLabValueRequest,
  UpdateLabValueRequest,
  CreateLabRunRequest,
} from "@types";

import { baseAPI } from "./baseApi";

export const aiLabAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    // ---- Skills ----
    getLabSkills: builder.query<LabListResponse<LabSkill>, LabListQuery | void>({
      query: params => ({
        url: ApiEndpoints.AI_LAB.SKILLS,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
      providesTags: [TAG_TYPES.AI_LAB_SKILLS],
    }),
    createLabSkill: builder.mutation<LabSkill, CreateLabSkillRequest>({
      query: body => ({
        url: ApiEndpoints.AI_LAB.SKILLS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.AI_LAB_SKILLS],
    }),
    updateLabSkill: builder.mutation<LabSkill, { id: string; data: UpdateLabSkillRequest }>({
      query: ({ id, data }) => ({
        url: ApiEndpoints.AI_LAB.SKILL_BY_ID(id),
        method: HttpMethod.PATCH,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.AI_LAB_SKILLS],
    }),
    deleteLabSkill: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.AI_LAB.SKILL_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.AI_LAB_SKILLS],
    }),

    // ---- Variables ----
    getLabVariables: builder.query<LabListResponse<LabVariable>, LabListQuery | void>({
      query: params => ({
        url: ApiEndpoints.AI_LAB.VARIABLES,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
      providesTags: [TAG_TYPES.AI_LAB_VARIABLES],
    }),
    createLabVariable: builder.mutation<LabVariable, CreateLabVariableRequest>({
      query: body => ({
        url: ApiEndpoints.AI_LAB.VARIABLES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.AI_LAB_VARIABLES],
    }),
    updateLabVariable: builder.mutation<
      LabVariable,
      { id: string; data: UpdateLabVariableRequest }
    >({
      query: ({ id, data }) => ({
        url: ApiEndpoints.AI_LAB.VARIABLE_BY_ID(id),
        method: HttpMethod.PATCH,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.AI_LAB_VARIABLES],
    }),
    deleteLabVariable: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.AI_LAB.VARIABLE_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      // Deleting a variable cascades to its values, so refresh both.
      invalidatesTags: [TAG_TYPES.AI_LAB_VARIABLES, TAG_TYPES.AI_LAB_VALUES],
    }),

    // ---- Values ----
    getLabValues: builder.query<LabListResponse<LabValue>, LabValueListQuery | void>({
      query: params => ({
        url: ApiEndpoints.AI_LAB.VALUES,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
      providesTags: [TAG_TYPES.AI_LAB_VALUES],
    }),
    createLabValue: builder.mutation<LabValue, CreateLabValueRequest>({
      query: body => ({
        url: ApiEndpoints.AI_LAB.VALUES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.AI_LAB_VALUES],
    }),
    updateLabValue: builder.mutation<LabValue, { id: string; data: UpdateLabValueRequest }>({
      query: ({ id, data }) => ({
        url: ApiEndpoints.AI_LAB.VALUE_BY_ID(id),
        method: HttpMethod.PATCH,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.AI_LAB_VALUES],
    }),
    deleteLabValue: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.AI_LAB.VALUE_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.AI_LAB_VALUES],
    }),

    // ---- Runs ----
    getLabRuns: builder.query<LabListResponse<LabRun>, LabListQuery | void>({
      query: params => ({
        url: ApiEndpoints.AI_LAB.RUNS,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
      providesTags: [TAG_TYPES.AI_LAB_RUNS],
    }),
    // Executes ONE skill. A multi-skill run fires this once per skill (the
    // caller shows progress + refetches the log when all settle), so the
    // mutation itself does not invalidate — the caller refetches on completion.
    createLabRun: builder.mutation<LabRun, CreateLabRunRequest>({
      query: body => ({
        url: ApiEndpoints.AI_LAB.RUNS,
        method: HttpMethod.POST,
        body,
      }),
    }),
    deleteLabRun: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.AI_LAB.RUN_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.AI_LAB_RUNS],
    }),
  }),
});

export const {
  useGetLabSkillsQuery,
  useCreateLabSkillMutation,
  useUpdateLabSkillMutation,
  useDeleteLabSkillMutation,
  useGetLabVariablesQuery,
  useCreateLabVariableMutation,
  useUpdateLabVariableMutation,
  useDeleteLabVariableMutation,
  useGetLabValuesQuery,
  useCreateLabValueMutation,
  useUpdateLabValueMutation,
  useDeleteLabValueMutation,
  useGetLabRunsQuery,
  useCreateLabRunMutation,
  useDeleteLabRunMutation,
} = aiLabAPI;
