import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { GetSuperDuperAdminsResponse, PromoteSuperDuperAdminBody } from "@types";

const superDuperAdminsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getSuperDuperAdmins: builder.query<
      GetSuperDuperAdminsResponse,
      { search?: string } | undefined
    >({
      query: params => ({
        url: ApiEndpoints.SUPER_DUPER_ADMINS.LIST,
        params,
      }),
      providesTags: [TAG_TYPES.SUPER_DUPER_ADMINS],
    }),

    getEligibleSuperDuperAdmins: builder.query<
      GetSuperDuperAdminsResponse,
      { search?: string } | undefined
    >({
      query: params => ({
        url: ApiEndpoints.SUPER_DUPER_ADMINS.ELIGIBLE,
        params,
      }),
      providesTags: [TAG_TYPES.SUPER_DUPER_ADMINS],
    }),

    promoteSuperDuperAdmin: builder.mutation<{ success: boolean }, PromoteSuperDuperAdminBody>({
      query: body => ({
        url: ApiEndpoints.SUPER_DUPER_ADMINS.PROMOTE,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SUPER_DUPER_ADMINS, TAG_TYPES.USERS],
    }),

    demoteSuperDuperAdmin: builder.mutation<{ success: boolean }, number>({
      query: userId => ({
        url: ApiEndpoints.SUPER_DUPER_ADMINS.DEMOTE(userId),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.SUPER_DUPER_ADMINS, TAG_TYPES.USERS],
    }),

    getSuperAdmins: builder.query<GetSuperDuperAdminsResponse, { search?: string } | undefined>({
      query: params => ({
        url: ApiEndpoints.SUPER_DUPER_ADMINS.SUPER_ADMINS_LIST,
        params,
      }),
      providesTags: [TAG_TYPES.SUPER_DUPER_ADMINS],
    }),

    getSuperAdminCandidates: builder.query<
      GetSuperDuperAdminsResponse,
      { search?: string } | undefined
    >({
      query: params => ({
        url: ApiEndpoints.SUPER_DUPER_ADMINS.SUPER_ADMINS_ELIGIBLE,
        params,
      }),
      providesTags: [TAG_TYPES.SUPER_DUPER_ADMINS],
    }),

    promoteSuperAdmin: builder.mutation<{ success: boolean }, PromoteSuperDuperAdminBody>({
      query: body => ({
        url: ApiEndpoints.SUPER_DUPER_ADMINS.SUPER_ADMINS_PROMOTE,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SUPER_DUPER_ADMINS, TAG_TYPES.USERS],
    }),

    removeSuperAdmin: builder.mutation<{ success: boolean }, number>({
      query: userId => ({
        url: ApiEndpoints.SUPER_DUPER_ADMINS.SUPER_ADMINS_REMOVE(userId),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.SUPER_DUPER_ADMINS, TAG_TYPES.USERS],
    }),
  }),
});

export const {
  useGetSuperDuperAdminsQuery,
  useGetEligibleSuperDuperAdminsQuery,
  usePromoteSuperDuperAdminMutation,
  useDemoteSuperDuperAdminMutation,
  useGetSuperAdminsQuery,
  useGetSuperAdminCandidatesQuery,
  usePromoteSuperAdminMutation,
  useRemoveSuperAdminMutation,
} = superDuperAdminsAPI;
