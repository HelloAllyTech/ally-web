import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CreateBadgeRequest,
  CreateBadgeResponse,
  DeleteBadgeIconRequest,
  DeleteBadgeIconResponse,
  DeleteBadgeRequest,
  DeleteBadgeResponse,
  GetUserBadgesRequest,
  GetUserBadgesResponse,
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
      invalidatesTags: [TAG_TYPES.USER_BADGES],
    }),
    updateBadge: builder.mutation<UpdateBadgeResponse, UpdateBadgeRequest>({
      query: ({ id, data }) => ({
        url: ApiEndpoints.USER_BADGES.UPDATE_BADGE(id),
        method: HttpMethod.PATCH,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.USER_BADGES],
    }),
    deleteBadge: builder.mutation<DeleteBadgeResponse, DeleteBadgeRequest>({
      query: ({ id }) => ({
        url: ApiEndpoints.USER_BADGES.DELETE_BADGE(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.USER_BADGES],
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
} = userBadgesAPI;
