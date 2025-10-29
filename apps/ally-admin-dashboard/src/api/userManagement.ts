import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  Tenant,
  TenantParams,
  UsersParams,
  GetTenantResponse,
  GetUsersResponse,
  CreateUserBody,
  CreateTenantBody,
  EditUserBody,
  UserRoles,
  GetCreditResponse,
  AddCreditBody,
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
        url: ApiEndpoints.USER_MANAGEMENT.CHANGE_USER_ROLES,
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
        url: ApiEndpoints.USER_MANAGEMENT.GET_ROLES,
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
  }),
});

export const {
  useGetUsersQuery,
  useGetTenantsQuery,
  useLazyGetUsersQuery,
  useLazyGetTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useDeleteUserMutation,
  useUpdateUserStatusMutation,
  useAddUserMutation,
  useEditUserMutation,
  useChangeRoleMutation,
  useGetRoleQuery,
  useGetSimulationCreditsQuery,
  useAddSimulationCreditLimitMutation,
} = userManagementAPI;
