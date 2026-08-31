import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CurrentMobileVersionsResponse,
  IosTestflightHistoryEntry,
  IosTestflightStatusResponse,
  MobileReleaseRun,
  TriggerAndroidPromotionRequest,
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

    // Live TestFlight state for the current iOS build, read straight from
    // App Store Connect by the backend — same permission gate as the reads
    // above, no new permission. Polled from useMobileReleases the same as
    // getMobileReleaseRuns so the admin sees Apple's Beta App Review move
    // through states without refreshing the page.
    getIosTestflightStatus: builder.query<IosTestflightStatusResponse, void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.IOS_TESTFLIGHT_STATUS,
      }),
    }),

    // Past TestFlight submissions for iOS builds, distinct from the
    // current-build-only status above — same permission gate as the reads
    // above, no new permission. Polled from useMobileReleases the same as
    // getMobileReleaseRuns/getIosTestflightStatus.
    getIosTestflightHistory: builder.query<IosTestflightHistoryEntry[], void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.IOS_TESTFLIGHT_HISTORY,
      }),
      // Backend wraps the array as { history: [...] } (IosTestflightHistoryResponse).
      transformResponse: (response: { history: IosTestflightHistoryEntry[] }) => response.history,
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

    // Promotes the current internal-track Android build to the Play Store
    // production track at a staged rollout — a real production action, and
    // gated on the backend by a stricter permission than triggerMobileRelease
    // above. Re-fetches the run list on success for the same reason as above.
    triggerAndroidPromotion: builder.mutation<
      TriggerMobileReleaseResponse,
      TriggerAndroidPromotionRequest
    >({
      query: body => ({
        url: ApiEndpoints.MOBILE_RELEASES.PROMOTE_ANDROID,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.MOBILE_RELEASE_RUNS],
    }),
  }),
});

export const {
  useGetMobileReleaseRunsQuery,
  useGetCurrentMobileVersionsQuery,
  useGetIosTestflightStatusQuery,
  useGetIosTestflightHistoryQuery,
  useTriggerMobileReleaseMutation,
  useTriggerAndroidPromotionMutation,
} = mobileReleasesAPI;
