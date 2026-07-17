import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  Tenant,
  TenantParams,
  UsersParams,
  GetTenantResponse,
  GetUsersResponse,
  CreateUserBody,
  BulkAddUsersBody,
  BulkAddUsersResponse,
  CreateTenantBody,
  EditUserBody,
  UserRoles,
  GetCreditResponse,
  AddCreditBody,
  disableSuccessResponse,
  GetLogoUrlRequest,
  GetLogoUrlResponse,
  DeleteLogoRequest,
  ScribeSettingsListResponse,
  UpdateSummarySectionsBody,
  UpdateSummaryFieldsBody,
  GetAdminTenantsResponse,
  AssignAdminTenantsBody,
  RemoveAdminTenantsBody,
  CustomFieldDefinition,
  CreateCustomFieldDefinitionInput,
  UpdateCustomFieldDefinitionInput,
} from "@types";

const userManagementAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getTenants: builder.query<GetTenantResponse, TenantParams>({
      query: params => ({
        url: ApiEndpoints.USER_MANAGEMENT.TENANTS,
        params,
      }),
      providesTags: [TAG_TYPES.TENANTS],
    }),

    getTenantById: builder.query<Tenant, string>({
      query: (id: string, includeUserCount: boolean = true) => ({
        url: `${ApiEndpoints.USER_MANAGEMENT.TENANTS_BY_ID(id)}`,
        params: {
          includeUserCount,
        },
      }),
    }),

    createTenant: builder.mutation<Tenant, CreateTenantBody>({
      query: body => ({
        url: ApiEndpoints.USER_MANAGEMENT.TENANTS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.TENANTS],
    }),

    updateTenant: builder.mutation<Tenant, { id: string; data: Partial<CreateTenantBody> }>({
      query: ({ id, data }) => ({
        url: `${ApiEndpoints.USER_MANAGEMENT.TENANTS}/${id}`,
        method: HttpMethod.PATCH,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.TENANTS],
    }),

    deleteUser: builder.mutation<{ success: boolean }, { userId: number }>({
      query: ({ userId }) => ({
        url: `${ApiEndpoints.USER_MANAGEMENT.USERS}/${userId}`,
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.USERS],
    }),

    updateUserStatus: builder.mutation<{ success: boolean }, { userId: number; status: string }>({
      query: ({ userId, status }) => ({
        url: `${ApiEndpoints.USER_MANAGEMENT.USERS}/${userId}/status`,
        method: HttpMethod.PATCH,
        body: { status },
      }),
      invalidatesTags: [TAG_TYPES.USERS],
    }),

    changeRole: builder.mutation<{ success: boolean }, { userId: number; groupIds: number[] }>({
      query: body => ({
        url: ApiEndpoints.AUTHORIZATION.CHANGE_USER_ROLES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.USERS],
    }),

    getUsers: builder.query<GetUsersResponse, UsersParams>({
      query: params => ({
        url: ApiEndpoints.USER_MANAGEMENT.USERS,
        params,
      }),
      providesTags: [TAG_TYPES.USERS],
    }),

    addUser: builder.mutation<{ id: number }, CreateUserBody>({
      query: body => ({
        url: ApiEndpoints.USER_MANAGEMENT.ADD_USER,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.USERS],
    }),

    bulkAddUsers: builder.mutation<BulkAddUsersResponse, BulkAddUsersBody>({
      query: body => ({
        url: ApiEndpoints.USER_MANAGEMENT.BULK_ADD_USERS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.USERS],
    }),

    editUser: builder.mutation<{ success: boolean }, EditUserBody>({
      query: ({ id, data }) => ({
        url: `${ApiEndpoints.USER_MANAGEMENT.USERS}/${id}`,
        method: HttpMethod.PATCH,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.USERS],
    }),

    getRole: builder.query<UserRoles[], void>({
      query: () => ({
        url: ApiEndpoints.AUTHORIZATION.GET_ROLES,
      }),
      providesTags: [TAG_TYPES.USERS],
    }),

    getSimulationCredits: builder.query<GetCreditResponse, number>({
      query: id => ({
        url: `${ApiEndpoints.USER_MANAGEMENT.SIMULATION_CREDITS}/${id}`,
      }),
    }),

    addSimulationCreditLimit: builder.mutation<{ success: boolean }, AddCreditBody>({
      query: body => ({
        url: `${ApiEndpoints.USER_MANAGEMENT.SIMULATION_CREDITS}`,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.USERS],
    }),

    enableSimulation: builder.mutation<
      { success: boolean },
      { tenantId: string; scenarioIds: number[] }
    >({
      query: ({ tenantId, scenarioIds }) => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.SIMULATION_TENANT_VISIBILITY(tenantId)}`,
        method: HttpMethod.POST,
        body: { scenarioIds },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),

    disableSimulation: builder.mutation<
      disableSuccessResponse,
      { tenantId: string; scenarioIds: number[] }
    >({
      query: ({ tenantId, scenarioIds }) => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.SIMULATION_TENANT_VISIBILITY(tenantId)}`,
        method: HttpMethod.DELETE,
        body: { scenarioIds },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),

    enableCase: builder.mutation<{ success: boolean }, { tenantId: string; caseIds: number[] }>({
      query: ({ tenantId, caseIds }) => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.CASE_TENANT_VISIBILITY(tenantId)}`,
        method: HttpMethod.POST,
        body: { caseIds },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_CASES],
    }),

    disableCase: builder.mutation<disableSuccessResponse, { tenantId: string; caseIds: number[] }>({
      query: ({ tenantId, caseIds }) => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.CASE_TENANT_VISIBILITY(tenantId)}`,
        method: HttpMethod.DELETE,
        body: { caseIds },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_CASES],
    }),

    enablePath: builder.mutation<
      { success: boolean },
      { tenantId: string; scenarioPathIds: number[] }
    >({
      query: ({ tenantId, scenarioPathIds }) => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.PATH_TENANT_VISIBILITY(tenantId)}`,
        method: HttpMethod.POST,
        body: { scenarioPathIds },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_PATHS],
    }),

    disablePath: builder.mutation<
      disableSuccessResponse,
      { tenantId: string; scenarioPathIds: number[] }
    >({
      query: ({ tenantId, scenarioPathIds }) => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.PATH_TENANT_VISIBILITY(tenantId)}`,
        method: HttpMethod.DELETE,
        body: { scenarioPathIds },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_PATHS],
    }),

    postLogoUrl: builder.mutation<GetLogoUrlResponse, GetLogoUrlRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.POST_LOGO_URL,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /**
     * Delete cover image from S3
     */
    deleteLogo: builder.mutation<boolean, DeleteLogoRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DELETE_LOGO,
        method: HttpMethod.DELETE,
        body,
      }),
    }),

    getSummarySections: builder.query<ScribeSettingsListResponse, string>({
      query: tenantId => ({
        url: ApiEndpoints.USER_MANAGEMENT.SUMMARY_SECTIONS,
        params: { tenantId },
      }),
      providesTags: [TAG_TYPES.SUMMARY_SECTIONS],
    }),

    updateSummarySections: builder.mutation<{ success: boolean }, UpdateSummarySectionsBody>({
      query: ({ tenantId, hiddenSections }) => ({
        url: ApiEndpoints.USER_MANAGEMENT.SUMMARY_SECTIONS,
        method: HttpMethod.PUT,
        body: {
          tenantId,
          hiddenSections,
        },
      }),
      invalidatesTags: [TAG_TYPES.SUMMARY_SECTIONS],
    }),

    getDashboardSettingsAll: builder.query<any, void>({
      query: () => ({
        url: ApiEndpoints.USER_MANAGEMENT.DASHBOARD_SETTINGS_ALL,
      }),
    }),

    updateSummaryFields: builder.mutation<{ success: boolean }, UpdateSummaryFieldsBody>({
      query: ({ tenantId, hiddenFields }) => ({
        url: ApiEndpoints.USER_MANAGEMENT.SUMMARY_FIELDS,
        method: HttpMethod.PUT,
        body: {
          tenantId,
          hiddenFields,
        },
      }),
      invalidatesTags: [TAG_TYPES.SUMMARY_SECTIONS],
    }),

    getCustomFieldTypes: builder.query<string[], string>({
      query: tenantId => ({
        url: ApiEndpoints.USER_MANAGEMENT.CUSTOM_FIELD_TYPES,
        params: { tenantId },
      }),
      providesTags: [TAG_TYPES.CUSTOM_FIELD_TYPES],
    }),

    updateCustomFieldTypes: builder.mutation<
      { success: boolean },
      { tenantId: string; enabledTypes: string[] }
    >({
      query: ({ tenantId, enabledTypes }) => ({
        url: ApiEndpoints.USER_MANAGEMENT.CUSTOM_FIELD_TYPES,
        method: HttpMethod.PUT,
        body: { tenantId, enabledTypes },
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELD_TYPES],
    }),

    getCustomFieldsEnabled: builder.query<boolean, string>({
      query: tenantId => ({
        url: ApiEndpoints.USER_MANAGEMENT.CUSTOM_FIELDS_ENABLED,
        params: { tenantId },
      }),
      providesTags: [TAG_TYPES.CUSTOM_FIELDS_ENABLED],
    }),

    updateCustomFieldsEnabled: builder.mutation<
      { success: boolean },
      { tenantId: string; enabled: boolean }
    >({
      query: ({ tenantId, enabled }) => ({
        url: ApiEndpoints.USER_MANAGEMENT.CUSTOM_FIELDS_ENABLED,
        method: HttpMethod.PUT,
        body: { tenantId, enabled },
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELDS_ENABLED],
    }),

    getScribeNoteCreationEnabled: builder.query<boolean, string>({
      query: tenantId => ({
        url: ApiEndpoints.USER_MANAGEMENT.SCRIBE_NOTE_CREATION_ENABLED,
        params: { tenantId },
      }),
      providesTags: [TAG_TYPES.SCRIBE_NOTE_CREATION_ENABLED],
    }),

    updateScribeNoteCreationEnabled: builder.mutation<
      { success: boolean },
      { tenantId: string; enabled: boolean }
    >({
      query: ({ tenantId, enabled }) => ({
        url: ApiEndpoints.USER_MANAGEMENT.SCRIBE_NOTE_CREATION_ENABLED,
        method: HttpMethod.PUT,
        body: { tenantId, enabled },
      }),
      invalidatesTags: [TAG_TYPES.SCRIBE_NOTE_CREATION_ENABLED],
    }),

    getScribeVoiceNoteEnabled: builder.query<boolean, string>({
      query: tenantId => ({
        url: ApiEndpoints.USER_MANAGEMENT.SCRIBE_VOICE_NOTE_ENABLED,
        params: { tenantId },
      }),
      providesTags: [TAG_TYPES.SCRIBE_VOICE_NOTE_ENABLED],
    }),

    updateScribeVoiceNoteEnabled: builder.mutation<
      { success: boolean },
      { tenantId: string; enabled: boolean }
    >({
      query: ({ tenantId, enabled }) => ({
        url: ApiEndpoints.USER_MANAGEMENT.SCRIBE_VOICE_NOTE_ENABLED,
        method: HttpMethod.PUT,
        body: { tenantId, enabled },
      }),
      invalidatesTags: [TAG_TYPES.SCRIBE_VOICE_NOTE_ENABLED],
    }),

    getCustomFieldDefinitions: builder.query<CustomFieldDefinition[], string>({
      query: tenantId => ({
        url: ApiEndpoints.USER_MANAGEMENT.CUSTOM_FIELD_DEFINITIONS,
        params: { tenantId },
      }),
      providesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    createCustomFieldDefinition: builder.mutation<
      CustomFieldDefinition,
      CreateCustomFieldDefinitionInput
    >({
      query: body => ({
        url: ApiEndpoints.USER_MANAGEMENT.CUSTOM_FIELD_DEFINITIONS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    updateCustomFieldDefinition: builder.mutation<
      CustomFieldDefinition,
      UpdateCustomFieldDefinitionInput
    >({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.USER_MANAGEMENT.CUSTOM_FIELD_DEFINITION_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    deleteCustomFieldDefinition: builder.mutation<
      { success: boolean },
      { id: string; tenantId: string }
    >({
      query: ({ id, tenantId }) => ({
        url: ApiEndpoints.USER_MANAGEMENT.CUSTOM_FIELD_DEFINITION_BY_ID(id),
        method: HttpMethod.DELETE,
        params: { tenantId },
      }),
      invalidatesTags: [TAG_TYPES.CUSTOM_FIELD_DEFINITIONS],
    }),

    getAdminTenants: builder.query<GetAdminTenantsResponse, number>({
      query: userId => ({
        url: ApiEndpoints.USER_MANAGEMENT.USER_ADMIN_TENANTS(userId),
      }),
      providesTags: [TAG_TYPES.ADMIN_TENANTS],
    }),

    assignAdminTenants: builder.mutation<{ success: boolean }, AssignAdminTenantsBody>({
      query: body => ({
        url: ApiEndpoints.USER_MANAGEMENT.ADMIN_TENANTS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.ADMIN_TENANTS],
    }),

    removeAdminTenants: builder.mutation<{ success: boolean }, RemoveAdminTenantsBody>({
      query: body => ({
        url: ApiEndpoints.USER_MANAGEMENT.ADMIN_TENANTS,
        method: HttpMethod.DELETE,
        body,
      }),
      invalidatesTags: [TAG_TYPES.ADMIN_TENANTS],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetTenantByIdQuery,
  useLazyGetTenantByIdQuery,
  useGetTenantsQuery,
  useLazyGetUsersQuery,
  useLazyGetTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useDeleteUserMutation,
  useUpdateUserStatusMutation,
  useAddUserMutation,
  useBulkAddUsersMutation,
  useEditUserMutation,
  useChangeRoleMutation,
  useGetRoleQuery,
  useGetSimulationCreditsQuery,
  useAddSimulationCreditLimitMutation,
  useDisableSimulationMutation,
  useEnableSimulationMutation,
  useEnablePathMutation,
  useDisablePathMutation,
  usePostLogoUrlMutation,
  useDeleteLogoMutation,
  useGetSummarySectionsQuery,
  useUpdateSummarySectionsMutation,
  useUpdateSummaryFieldsMutation,
  useGetDashboardSettingsAllQuery,
  useEnableCaseMutation,
  useDisableCaseMutation,
  useGetAdminTenantsQuery,
  useLazyGetAdminTenantsQuery,
  useAssignAdminTenantsMutation,
  useRemoveAdminTenantsMutation,
  useGetCustomFieldTypesQuery,
  useUpdateCustomFieldTypesMutation,
  useGetCustomFieldsEnabledQuery,
  useUpdateCustomFieldsEnabledMutation,
  useGetScribeNoteCreationEnabledQuery,
  useUpdateScribeNoteCreationEnabledMutation,
  useGetScribeVoiceNoteEnabledQuery,
  useUpdateScribeVoiceNoteEnabledMutation,
  useGetCustomFieldDefinitionsQuery,
  useCreateCustomFieldDefinitionMutation,
  useUpdateCustomFieldDefinitionMutation,
  useDeleteCustomFieldDefinitionMutation,
} = userManagementAPI;
