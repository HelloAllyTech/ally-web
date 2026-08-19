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
  TrackTranslationDetail,
  TrackTranslationFieldEdit,
  TrackTranslationFieldRef,
  TrackTranslationsResponse,
  TrackTranslationSummary,
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

    /* ---------------------------------------------------------------- *
     * Translations
     * ---------------------------------------------------------------- */

    getTrackTranslations: builder.query<TrackTranslationsResponse, string>({
      query: id => ({
        url: ApiEndpoints.TRACKS.TRANSLATIONS(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.TRACK_TRANSLATIONS],
    }),

    setTrackLanguages: builder.mutation<
      TrackTranslationSummary[],
      { id: string; languageIds: number[] }
    >({
      query: ({ id, languageIds }) => ({
        url: ApiEndpoints.TRACKS.TRANSLATIONS(id),
        method: HttpMethod.PUT,
        body: { languageIds },
      }),
      invalidatesTags: [TAG_TYPES.TRACK_TRANSLATIONS],
    }),

    translateTrack: builder.mutation<
      { jobId: string; languageIds: number[] },
      { id: string; languageIds?: number[] }
    >({
      query: ({ id, languageIds }) => ({
        url: ApiEndpoints.TRACKS.TRANSLATE(id),
        method: HttpMethod.POST,
        body: { languageIds },
      }),
      invalidatesTags: [TAG_TYPES.TRACK_TRANSLATIONS],
    }),

    getTrackTranslation: builder.query<TrackTranslationDetail, { id: string; languageId: number }>({
      query: ({ id, languageId }) => ({
        url: ApiEndpoints.TRACKS.TRANSLATION(id, languageId),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.TRACK_TRANSLATIONS],
    }),

    updateTrackTranslationFields: builder.mutation<
      { updated: number },
      { id: string; languageId: number; edits: TrackTranslationFieldEdit[] }
    >({
      query: ({ id, languageId, edits }) => ({
        url: ApiEndpoints.TRACKS.TRANSLATION_FIELDS(id, languageId),
        method: HttpMethod.PUT,
        body: { edits },
      }),
      invalidatesTags: [TAG_TYPES.TRACK_TRANSLATIONS],
    }),

    reviewTrackTranslation: builder.mutation<
      { reviewed: number },
      { id: string; languageId: number; fields?: TrackTranslationFieldRef[] }
    >({
      query: ({ id, languageId, fields }) => ({
        url: ApiEndpoints.TRACKS.TRANSLATION_REVIEW(id, languageId),
        method: HttpMethod.POST,
        body: { fields },
      }),
      invalidatesTags: [TAG_TYPES.TRACK_TRANSLATIONS],
    }),

    setTrackTranslationMedia: builder.mutation<
      { success: boolean },
      { id: string; languageId: number; trackItemId: string; url: string | null }
    >({
      query: ({ id, languageId, trackItemId, url }) => ({
        url: ApiEndpoints.TRACKS.TRANSLATION_MEDIA(id, languageId),
        method: HttpMethod.PUT,
        body: { trackItemId, url },
      }),
      invalidatesTags: [TAG_TYPES.TRACK_TRANSLATIONS],
    }),

    publishTrackTranslation: builder.mutation<
      TrackTranslationSummary,
      { id: string; languageId: number }
    >({
      query: ({ id, languageId }) => ({
        url: ApiEndpoints.TRACKS.TRANSLATION_PUBLISH(id, languageId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.TRACK_TRANSLATIONS],
    }),

    unpublishTrackTranslation: builder.mutation<
      { success: boolean },
      { id: string; languageId: number }
    >({
      query: ({ id, languageId }) => ({
        url: ApiEndpoints.TRACKS.TRANSLATION_UNPUBLISH(id, languageId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.TRACK_TRANSLATIONS],
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
  useGetTrackTranslationsQuery,
  useSetTrackLanguagesMutation,
  useTranslateTrackMutation,
  useGetTrackTranslationQuery,
  useUpdateTrackTranslationFieldsMutation,
  useReviewTrackTranslationMutation,
  useSetTrackTranslationMediaMutation,
  usePublishTrackTranslationMutation,
  useUnpublishTrackTranslationMutation,
} = tracksApi;
