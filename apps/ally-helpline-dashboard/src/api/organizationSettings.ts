/**
 * Org. Settings APIs (helpline / consumer ADMIN).
 *
 * Powers the tabbed Org. Settings screen. Every endpoint here is scoped
 * server-side to the caller's OWN tenant — we never send a tenantId.
 *
 * Hook names are deliberately prefixed (Own / Org) to avoid colliding with the
 * read-only settings hooks already exported from ./customFields.ts through the
 * shared @api barrel.
 */
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  OwnTenant,
  UpdateOwnTenantSettingsBody,
  GetSummarySectionsResponse,
  CustomFieldDefinition,
  CreateCustomFieldDefinitionInput,
  UpdateCustomFieldDefinitionInput,
  OrgAccessListParams,
  OrgAccessListResponse,
  OrgScenario,
  OrgScenarioPath,
  OrgTenantBadgesParams,
  OrgTenantBadgesResponse,
  OrgBadgeTenantVisibilityBody,
} from "@types";

import { baseAPI } from "./baseAPI";

const organizationSettingsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    // --- Own tenant + feature toggles --------------------------------------
    getOwnTenant: builder.query<OwnTenant, void>({
      query: () => ApiEndpoints.TENANT.GET_SELF,
      providesTags: [TAG_TYPES.OWN_TENANT],
    }),

    updateOwnTenantSettings: builder.mutation<OwnTenant, UpdateOwnTenantSettingsBody>({
      query: body => ({
        url: ApiEndpoints.TENANT.UPDATE_SELF_SETTINGS,
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.OWN_TENANT],
    }),

    // --- Summary sections / fields -----------------------------------------
    getOwnSummarySections: builder.query<GetSummarySectionsResponse, void>({
      query: () => ApiEndpoints.SETTINGS.SUMMARY_SECTIONS,
      providesTags: [TAG_TYPES.SUMMARY_SECTIONS],
    }),

    updateOwnSummarySections: builder.mutation<{ success: boolean }, { hiddenSections: string[] }>({
      query: ({ hiddenSections }) => ({
        url: ApiEndpoints.SETTINGS.SUMMARY_SECTIONS,
        method: HttpMethod.PUT,
        body: { hiddenSections },
      }),
      invalidatesTags: [TAG_TYPES.SUMMARY_SECTIONS],
    }),

    updateOwnSummaryFields: builder.mutation<{ success: boolean }, { hiddenFields: string[] }>({
      query: ({ hiddenFields }) => ({
        url: ApiEndpoints.SETTINGS.SUMMARY_FIELDS,
        method: HttpMethod.PUT,
        body: { hiddenFields },
      }),
      invalidatesTags: [TAG_TYPES.SUMMARY_SECTIONS],
    }),

    // --- Custom field types -------------------------------------------------
    getOwnCustomFieldTypes: builder.query<string[], void>({
      query: () => ApiEndpoints.SETTINGS.CUSTOM_FIELD_TYPES,
      providesTags: [TAG_TYPES.CUSTOM_FIELD_TYPES],
    }),

    updateOwnCustomFieldTypes: builder.mutation<{ success: boolean }, { enabledTypes: string[] }>({
      query: ({ enabledTypes }) => ({
        url: ApiEndpoints.SETTINGS.CUSTOM_FIELD_TYPES,
        method: HttpMethod.PUT,
        body: { enabledTypes },
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELD_TYPES],
    }),

    // --- Custom fields enabled ---------------------------------------------
    getOwnCustomFieldsEnabled: builder.query<boolean, void>({
      query: () => ApiEndpoints.SETTINGS.CUSTOM_FIELDS_ENABLED,
      providesTags: [TAG_TYPES.CUSTOM_FIELDS_ENABLED],
    }),

    updateOwnCustomFieldsEnabled: builder.mutation<{ success: boolean }, { enabled: boolean }>({
      query: ({ enabled }) => ({
        url: ApiEndpoints.SETTINGS.CUSTOM_FIELDS_ENABLED,
        method: HttpMethod.PUT,
        body: { enabled },
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELDS_ENABLED],
    }),

    // --- Scribe note creation enabled --------------------------------------
    getOwnScribeNoteCreationEnabled: builder.query<boolean, void>({
      query: () => ApiEndpoints.SETTINGS.SCRIBE_NOTE_CREATION_ENABLED,
      providesTags: [TAG_TYPES.SCRIBE_NOTE_CREATION_ENABLED],
    }),

    updateOwnScribeNoteCreationEnabled: builder.mutation<
      { success: boolean },
      { enabled: boolean }
    >({
      query: ({ enabled }) => ({
        url: ApiEndpoints.SETTINGS.SCRIBE_NOTE_CREATION_ENABLED,
        method: HttpMethod.PUT,
        body: { enabled },
      }),
      invalidatesTags: [TAG_TYPES.SCRIBE_NOTE_CREATION_ENABLED],
    }),

    // --- Scribe voice note (mic dictation) enabled -------------------------
    getOwnScribeVoiceNoteEnabled: builder.query<boolean, void>({
      query: () => ApiEndpoints.SETTINGS.SCRIBE_VOICE_NOTE_ENABLED,
      providesTags: [TAG_TYPES.SCRIBE_VOICE_NOTE_ENABLED],
    }),

    updateOwnScribeVoiceNoteEnabled: builder.mutation<{ success: boolean }, { enabled: boolean }>({
      query: ({ enabled }) => ({
        url: ApiEndpoints.SETTINGS.SCRIBE_VOICE_NOTE_ENABLED,
        method: HttpMethod.PUT,
        body: { enabled },
      }),
      invalidatesTags: [TAG_TYPES.SCRIBE_VOICE_NOTE_ENABLED],
    }),

    // --- Custom field definitions (org-scoped CRUD) ------------------------
    // Distinct hook names from ./customFields.ts so both can co-exist in the
    // @api barrel; these invalidate the same CUSTOM_FIELD_DEFINITIONS tag.
    getOrgCustomFieldDefinitions: builder.query<CustomFieldDefinition[], void>({
      query: () => ApiEndpoints.CUSTOM_FIELDS.GET_DEFINITIONS,
      providesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    createOrgCustomFieldDefinition: builder.mutation<
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

    updateOrgCustomFieldDefinition: builder.mutation<
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

    deleteOrgCustomFieldDefinition: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.CUSTOM_FIELDS.DELETE_DEFINITION(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    // --- Access management: Simulations (scenarios) ------------------------
    // The `tenantId` is the caller's own tenant; the backend 403s any other.
    getOrgScenarios: builder.query<OrgAccessListResponse<OrgScenario>, OrgAccessListParams>({
      query: params => ({
        url: ApiEndpoints.ORG_ACCESS.GET_SCENARIOS,
        params,
      }),
      providesTags: [TAG_TYPES.ORG_SCENARIOS],
    }),

    enableOrgScenarios: builder.mutation<
      { success: boolean },
      { tenantId: string; scenarioIds: number[] }
    >({
      query: ({ tenantId, scenarioIds }) => ({
        url: ApiEndpoints.ORG_ACCESS.SCENARIO_TENANT_VISIBILITY(tenantId),
        method: HttpMethod.POST,
        body: { scenarioIds },
      }),
      invalidatesTags: [TAG_TYPES.ORG_SCENARIOS],
    }),

    disableOrgScenarios: builder.mutation<
      { success: boolean },
      { tenantId: string; scenarioIds: number[] }
    >({
      query: ({ tenantId, scenarioIds }) => ({
        url: ApiEndpoints.ORG_ACCESS.SCENARIO_TENANT_VISIBILITY(tenantId),
        method: HttpMethod.DELETE,
        body: { scenarioIds },
      }),
      invalidatesTags: [TAG_TYPES.ORG_SCENARIOS],
    }),

    // --- Access management: Scenario paths ---------------------------------
    getOrgScenarioPaths: builder.query<OrgAccessListResponse<OrgScenarioPath>, OrgAccessListParams>(
      {
        query: params => ({
          url: ApiEndpoints.ORG_ACCESS.GET_SCENARIO_PATHS,
          params,
        }),
        providesTags: [TAG_TYPES.ORG_SCENARIO_PATHS],
      },
    ),

    enableOrgScenarioPaths: builder.mutation<
      { success: boolean },
      { tenantId: string; scenarioPathIds: number[] }
    >({
      query: ({ tenantId, scenarioPathIds }) => ({
        url: ApiEndpoints.ORG_ACCESS.PATH_TENANT_VISIBILITY(tenantId),
        method: HttpMethod.POST,
        body: { scenarioPathIds },
      }),
      invalidatesTags: [TAG_TYPES.ORG_SCENARIO_PATHS],
    }),

    disableOrgScenarioPaths: builder.mutation<
      { success: boolean },
      { tenantId: string; scenarioPathIds: number[] }
    >({
      query: ({ tenantId, scenarioPathIds }) => ({
        url: ApiEndpoints.ORG_ACCESS.PATH_TENANT_VISIBILITY(tenantId),
        method: HttpMethod.DELETE,
        body: { scenarioPathIds },
      }),
      invalidatesTags: [TAG_TYPES.ORG_SCENARIO_PATHS],
    }),

    // --- Access management: Cases -----------------------------------------
    // Cases share the scenario-path row shape server-side.
    getOrgCases: builder.query<OrgAccessListResponse<OrgScenarioPath>, OrgAccessListParams>({
      query: params => ({
        url: ApiEndpoints.ORG_ACCESS.GET_CASES,
        params,
      }),
      providesTags: [TAG_TYPES.ORG_CASES],
    }),

    enableOrgCases: builder.mutation<{ success: boolean }, { tenantId: string; caseIds: number[] }>(
      {
        query: ({ tenantId, caseIds }) => ({
          url: ApiEndpoints.ORG_ACCESS.CASE_TENANT_VISIBILITY(tenantId),
          method: HttpMethod.POST,
          body: { caseIds },
        }),
        invalidatesTags: [TAG_TYPES.ORG_CASES],
      },
    ),

    disableOrgCases: builder.mutation<
      { success: boolean },
      { tenantId: string; caseIds: number[] }
    >({
      query: ({ tenantId, caseIds }) => ({
        url: ApiEndpoints.ORG_ACCESS.CASE_TENANT_VISIBILITY(tenantId),
        method: HttpMethod.DELETE,
        body: { caseIds },
      }),
      invalidatesTags: [TAG_TYPES.ORG_CASES],
    }),

    // --- Access management: Badges ----------------------------------------
    // The tenant-visibility list carries an `enabled` flag per badge; assign
    // and unassign both hit /v1/badges/tenants with { badgeId, tenantIds }.
    getOrgTenantBadges: builder.query<OrgTenantBadgesResponse, OrgTenantBadgesParams>({
      query: ({ tenantId, ...params }) => ({
        url: ApiEndpoints.ORG_ACCESS.GET_TENANT_BADGES(tenantId),
        params,
      }),
      providesTags: [TAG_TYPES.ORG_BADGES],
    }),

    assignOrgBadge: builder.mutation<{ message: string }, OrgBadgeTenantVisibilityBody>({
      query: body => ({
        url: ApiEndpoints.ORG_ACCESS.BADGES_TENANT_VISIBILITY,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.ORG_BADGES],
    }),

    unassignOrgBadge: builder.mutation<{ message: string }, OrgBadgeTenantVisibilityBody>({
      query: body => ({
        url: ApiEndpoints.ORG_ACCESS.BADGES_TENANT_VISIBILITY,
        method: HttpMethod.DELETE,
        body,
      }),
      invalidatesTags: [TAG_TYPES.ORG_BADGES],
    }),
  }),
});

export const {
  useGetOwnTenantQuery,
  useUpdateOwnTenantSettingsMutation,
  useGetOwnSummarySectionsQuery,
  useUpdateOwnSummarySectionsMutation,
  useUpdateOwnSummaryFieldsMutation,
  useGetOwnCustomFieldTypesQuery,
  useUpdateOwnCustomFieldTypesMutation,
  useGetOwnCustomFieldsEnabledQuery,
  useUpdateOwnCustomFieldsEnabledMutation,
  useGetOwnScribeNoteCreationEnabledQuery,
  useUpdateOwnScribeNoteCreationEnabledMutation,
  useGetOwnScribeVoiceNoteEnabledQuery,
  useUpdateOwnScribeVoiceNoteEnabledMutation,
  useGetOrgCustomFieldDefinitionsQuery,
  useCreateOrgCustomFieldDefinitionMutation,
  useUpdateOrgCustomFieldDefinitionMutation,
  useDeleteOrgCustomFieldDefinitionMutation,
  // Access management
  useGetOrgScenariosQuery,
  useEnableOrgScenariosMutation,
  useDisableOrgScenariosMutation,
  useGetOrgScenarioPathsQuery,
  useEnableOrgScenarioPathsMutation,
  useDisableOrgScenarioPathsMutation,
  useGetOrgCasesQuery,
  useEnableOrgCasesMutation,
  useDisableOrgCasesMutation,
  useGetOrgTenantBadgesQuery,
  useAssignOrgBadgeMutation,
  useUnassignOrgBadgeMutation,
} = organizationSettingsAPI;
