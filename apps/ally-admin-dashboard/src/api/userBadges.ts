import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  AddBadgesToTenantRequest,
  AddBadgesToTenantResponse,
  CreateBadgeRequest,
  CreateBadgeResponse,
  DeleteBadgeIconRequest,
  DeleteBadgeIconResponse,
  DeleteBadgeRequest,
  DeleteBadgeResponse,
  GetBadgesTenantVisibilityRequest,
  GetBadgesTenantVisibilityResponse,
  GetUserBadgesRequest,
  GetUserBadgesResponse,
  RemoveBadgesFromTenantRequest,
  RemoveBadgesFromTenantResponse,
  UpdateBadgeRequest,
  UpdateBadgeResponse,
  UploadBadgeIconRequest,
  UploadBadgeIconResponse,
} from "@types";

const userBadgesAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getUserBadges: builder.query<GetUserBadgesResponse, GetUserBadgesRequest>({
      query: params => ({
        url: ApiEndpoints.USER_BADGES.GET_BADGES,
        params,
      }),
      providesTags: [TAG_TYPES.USER_BADGES],
    }),
    uploadBadgeIcon: builder.mutation<UploadBadgeIconResponse, UploadBadgeIconRequest>({
      query: body => ({
        url: ApiEndpoints.USER_BADGES.UPLOAD_BADGE_ICON,
        method: HttpMethod.POST,
        body,
      }),
    }),
    deleteBadgeIcon: builder.mutation<DeleteBadgeIconResponse, DeleteBadgeIconRequest>({
      query: body => ({
        url: ApiEndpoints.USER_BADGES.DELETE_BADGE_ICON,
        method: HttpMethod.DELETE,
        body,
      }),
    }),
    createBadge: builder.mutation<CreateBadgeResponse, CreateBadgeRequest>({
      query: body => ({
        url: ApiEndpoints.USER_BADGES.CREATE_BADGE,
        method: HttpMethod.POST,
        body,
      }),
    }),
    updateBadge: builder.mutation<UpdateBadgeResponse, UpdateBadgeRequest>({
      query: ({ id, data }) => ({
        url: ApiEndpoints.USER_BADGES.UPDATE_BADGE(id),
        method: HttpMethod.PATCH,
        body: data,
      }),
    }),
    deleteBadge: builder.mutation<DeleteBadgeResponse, DeleteBadgeRequest>({
      query: ({ id }) => ({
        url: ApiEndpoints.USER_BADGES.DELETE_BADGE(id),
        method: HttpMethod.DELETE,
      }),
    }),
    batchDeleteBadges: builder.mutation<void, string[]>({
      query: badgeIds => ({
        url: ApiEndpoints.USER_BADGES.BATCH_DELETE_BADGES,
        method: HttpMethod.DELETE,
        body: { badgeIds },
      }),
    }),
    getBadgesTenantVisibility: builder.query<
      GetBadgesTenantVisibilityResponse,
      GetBadgesTenantVisibilityRequest
    >({
      query: ({ tenantId, ...params }) => ({
        url: ApiEndpoints.USER_BADGES.BADGES_TENANT_VISIBILITY(tenantId),
        params,
      }),
    }),
    addBadgesToTenant: builder.mutation<AddBadgesToTenantResponse, AddBadgesToTenantRequest>({
      query: body => ({
        url: ApiEndpoints.USER_BADGES.ADD_BADGES_TO_TENANT,
        method: HttpMethod.POST,
        body,
      }),
    }),
    removeBadgesFromTenant: builder.mutation<
      RemoveBadgesFromTenantResponse,
      RemoveBadgesFromTenantRequest
    >({
      query: body => ({
        url: ApiEndpoints.USER_BADGES.REMOVE_BADGES_FROM_TENANT,
        method: HttpMethod.DELETE,
        body,
      }),
    }),
  }),
});

export const {
  useGetUserBadgesQuery,
  useUploadBadgeIconMutation,
  useDeleteBadgeIconMutation,
  useCreateBadgeMutation,
  useUpdateBadgeMutation,
  useDeleteBadgeMutation,
  useBatchDeleteBadgesMutation,
  useGetBadgesTenantVisibilityQuery,
  useAddBadgesToTenantMutation,
  useRemoveBadgesFromTenantMutation,
} = userBadgesAPI;
