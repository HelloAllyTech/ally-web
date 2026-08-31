import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CurrentMobileVersionsResponse,
  MobileReleaseRun,
  TriggerMobileReleaseResponse,
} from "@types";

const mobileReleasesAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getMobileReleaseRuns: builder.query<MobileReleaseRun[], void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.RUNS,
      }),
      // Backend wraps the array as { runs: [...] } (MobileReleaseRunsResponseDto).
      transformResponse: (response: { runs: MobileReleaseRun[] }) => response.runs,
      providesTags: [TAG_TYPES.MOBILE_RELEASE_RUNS],
    }),

    getCurrentMobileVersions: builder.query<CurrentMobileVersionsResponse, void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.CURRENT_VERSION,
      }),
    }),

    // Manually dispatches the release pipeline for both platforms right now —
    // gated on the backend by a separate, stricter permission than viewing
    // this page. Re-fetches the run list on success so the new run shows up
    // without waiting on the next 30s poll; a failed dispatch (e.g. the
    // GitHub Actions token isn't write-scoped) leaves the list untouched.
    triggerMobileRelease: builder.mutation<TriggerMobileReleaseResponse, void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.TRIGGER,
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.MOBILE_RELEASE_RUNS],
    }),
  }),
});

export const {
  useGetMobileReleaseRunsQuery,
  useGetCurrentMobileVersionsQuery,
  useTriggerMobileReleaseMutation,
} = mobileReleasesAPI;
