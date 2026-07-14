import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  AddComfortAudioTrackRequest,
  ComfortAudioTrack,
  CreateComfortAudioUploadUrlRequest,
  CreateComfortAudioUploadUrlResponse,
  GetComfortAudioTracksQueryParams,
  GetComfortAudioTracksResponse,
  UpdateComfortAudioTrackRequest,
} from "@types";

import { baseAPI } from "./baseApi";

const comfortAudioAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * List comfort-audio tracks (shared library). Used by the superadmin
     * Settings screen and the Basic Settings track picker.
     */
    getComfortAudioTracks: builder.query<
      GetComfortAudioTracksResponse,
      GetComfortAudioTracksQueryParams | void
    >({
      query: (params?: GetComfortAudioTracksQueryParams) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMFORT_AUDIO_LIBRARY,
        method: HttpMethod.GET,
        params: {
          limit: params?.limit ?? 50,
          offset: params?.offset ?? 0,
          sortBy: params?.sortBy || "createdAt",
          sortOrder: params?.sortOrder || "desc",
          includeArchived: params?.includeArchived ?? false,
        },
      }),
      providesTags: [TAG_TYPES.COMFORT_AUDIO_LIBRARY],
    }),

    /** Superadmin: get a presigned URL to upload a comfort-audio file to S3. */
    createComfortAudioUploadUrl: builder.mutation<
      CreateComfortAudioUploadUrlResponse,
      CreateComfortAudioUploadUrlRequest
    >({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMFORT_AUDIO_UPLOAD_URL,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /** Superadmin: persist an uploaded track (name + S3 URL) into the library. */
    addComfortAudioTrack: builder.mutation<ComfortAudioTrack, AddComfortAudioTrackRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMFORT_AUDIO_LIBRARY,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.COMFORT_AUDIO_LIBRARY],
    }),

    /** Superadmin: rename and/or archive-toggle an existing track. */
    updateComfortAudioTrack: builder.mutation<ComfortAudioTrack, UpdateComfortAudioTrackRequest>({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMFORT_AUDIO_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.COMFORT_AUDIO_LIBRARY],
    }),

    /** Superadmin: delete a track from S3 + the library. */
    deleteComfortAudioTrack: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMFORT_AUDIO_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.COMFORT_AUDIO_LIBRARY],
    }),
  }),
});

export const {
  useGetComfortAudioTracksQuery,
  useCreateComfortAudioUploadUrlMutation,
  useAddComfortAudioTrackMutation,
  useUpdateComfortAudioTrackMutation,
  useDeleteComfortAudioTrackMutation,
} = comfortAudioAPI;

export { comfortAudioAPI };
