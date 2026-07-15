import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CreateTrackResponse,
  GetTracksQueryParams,
  GetTracksResponse,
  TrackDetail,
  TrackMediaUploadUrlInput,
  TrackMediaUploadUrlResponse,
  TrackMetadataInput,
  TrackStructureInput,
  TrackTenantVisibilityInput,
  UpdateTrackInput,
} from "@types";

const tracksApi = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getTracks: builder.query<GetTracksResponse, GetTracksQueryParams>({
      query: (params: GetTracksQueryParams) => ({
        url: ApiEndpoints.TRACKS.LIST,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.TRACKS_V2],
    }),

    getTrackById: builder.query<TrackDetail, string>({
      query: id => ({
        url: ApiEndpoints.TRACKS.BY_ID(id),
        method: HttpMethod.GET,
      }),
    }),

    createTrack: builder.mutation<CreateTrackResponse, TrackMetadataInput>({
      query: body => ({
        url: ApiEndpoints.TRACKS.LIST,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.TRACKS_V2],
    }),

    updateTrackById: builder.mutation<CreateTrackResponse, { id: string; data: UpdateTrackInput }>({
      query: ({ id, data }) => ({
        url: ApiEndpoints.TRACKS.BY_ID(id),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.TRACKS_V2],
    }),

    updateTrackStructure: builder.mutation<
      { success: boolean },
      { id: string; data: TrackStructureInput }
    >({
      query: ({ id, data }) => ({
        url: ApiEndpoints.TRACKS.STRUCTURE(id),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.TRACKS_V2],
    }),

    deleteTrackById: builder.mutation<void, string>({
      query: id => ({
        url: ApiEndpoints.TRACKS.BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.TRACKS_V2],
    }),

    duplicateTrack: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.TRACKS.DUPLICATE(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.TRACKS_V2],
    }),

    addTracksToTenant: builder.mutation<{ success: boolean }, TrackTenantVisibilityInput>({
      query: ({ tenantId, trackIds }) => ({
        url: ApiEndpoints.TRACKS.TENANT_VISIBILITY(tenantId),
        method: HttpMethod.POST,
        body: { trackIds },
      }),
      invalidatesTags: [TAG_TYPES.TRACKS_V2],
    }),

    removeTracksFromTenant: builder.mutation<{ success: boolean }, TrackTenantVisibilityInput>({
      query: ({ tenantId, trackIds }) => ({
        url: ApiEndpoints.TRACKS.TENANT_VISIBILITY(tenantId),
        method: HttpMethod.DELETE,
        body: { trackIds },
      }),
      invalidatesTags: [TAG_TYPES.TRACKS_V2],
    }),

    getTrackMediaUploadUrl: builder.mutation<TrackMediaUploadUrlResponse, TrackMediaUploadUrlInput>(
      {
        query: body => ({
          url: ApiEndpoints.TRACKS.MEDIA_UPLOAD_URL,
          method: HttpMethod.POST,
          body,
        }),
      },
    ),

    deleteTrackMedia: builder.mutation<{ success: boolean }, { url: string }>({
      query: body => ({
        url: ApiEndpoints.TRACKS.MEDIA,
        method: HttpMethod.DELETE,
        body,
      }),
    }),
  }),
});

export const {
  useGetTracksQuery,
  useGetTrackByIdQuery,
  useLazyGetTrackByIdQuery,
  useCreateTrackMutation,
  useUpdateTrackByIdMutation,
  useUpdateTrackStructureMutation,
  useDeleteTrackByIdMutation,
  useDuplicateTrackMutation,
  useAddTracksToTenantMutation,
  useRemoveTracksFromTenantMutation,
  useGetTrackMediaUploadUrlMutation,
  useDeleteTrackMediaMutation,
} = tracksApi;
