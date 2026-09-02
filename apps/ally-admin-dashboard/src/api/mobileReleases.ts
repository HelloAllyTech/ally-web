import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  AndroidProductionStatusResponse,
  CurrentMobileVersionsResponse,
  IosAppStoreReviewSubmissionEntry,
  IosTestflightHistoryEntry,
  IosTestflightStatusResponse,
  MobileReleaseRun,
  SubmitIosAppStoreReviewRequest,
  TriggerAndroidPromotionRequest,
  TriggerMobileReleaseResponse,
  WhatsNewSuggestionResponse,
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

    // Live Play Developer API production-track state, read straight from
    // Google — same permission gate as the reads above, no new permission.
    // Polled from useMobileReleases at the same slower cadence as the App
    // Store Connect-backed queries, not the fast GitHub-runs one: this
    // fans out to insert/get/delete calls against Google's API each time.
    getAndroidProductionStatus: builder.query<AndroidProductionStatusResponse, void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.ANDROID_PRODUCTION_STATUS,
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

    // Apple's own full App Store review submission history (real public
    // distribution), distinct from getIosTestflightHistory above which only
    // ever covers TestFlight builds. Same permission gate, polled from
    // useMobileReleases at TESTFLIGHT_POLL_MS same as the other App Store
    // Connect-backed queries.
    getIosAppStoreReviewHistory: builder.query<IosAppStoreReviewSubmissionEntry[], void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.IOS_APP_STORE_REVIEW_HISTORY,
      }),
      // Backend wraps the array as { submissions: [...] } (IosAppStoreReviewSubmissionsResponseDto).
      transformResponse: (response: { submissions: IosAppStoreReviewSubmissionEntry[] }) =>
        response.submissions,
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

    // Submits the current iOS build for Apple's full App Store review — real
    // public distribution, not TestFlight. Optional `whatsNew` body — see
    // SubmitIosAppStoreReviewRequest. This is the most consequential action
    // on this page: unlike triggerAndroidPromotion above, there's no rollout
    // percentage to soften it, and Apple's review clock starts for real the
    // moment this call succeeds. The backend doesn't verify the App Store
    // Connect listing is ready first — an unready listing surfaces as an
    // Apple error through the same error-toast path as every other mutation
    // here. Release itself is still forced to manual, so approval alone
    // doesn't ship it to users. Re-fetches the run list on success for the
    // same reason as the mutations above, though whether this workflow
    // actually appears there depends on backend support that may land
    // separately.
    submitIosAppStoreReview: builder.mutation<
      TriggerMobileReleaseResponse,
      SubmitIosAppStoreReviewRequest
    >({
      query: body => ({
        url: ApiEndpoints.MOBILE_RELEASES.SUBMIT_APP_STORE_REVIEW,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.MOBILE_RELEASE_RUNS],
    }),

    // LLM-generated draft "What's New" text, summarized server-side from the
    // commits since the last release — same permission gate as the submit
    // mutation above (SUBMIT_APP_STORE_REVIEW). Deliberately a lazy query,
    // not a regular one: it calls an LLM and costs real tokens, so it must
    // only be triggered on-demand (right as the submit dialog opens), never
    // fetched automatically or kept in sync via polling/tags.
    getIosWhatsNewSuggestion: builder.query<WhatsNewSuggestionResponse, void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.IOS_WHATS_NEW_SUGGESTION,
      }),
    }),

    // Same draft as getIosWhatsNewSuggestion above (identical generation,
    // platform-agnostic) — a separate endpoint only so it carries the
    // Android promotion permission instead. Same lazy-query, on-demand-only
    // reasoning: real LLM tokens, fetched right as the promote dialog opens.
    getAndroidWhatsNewSuggestion: builder.query<WhatsNewSuggestionResponse, void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.ANDROID_WHATS_NEW_SUGGESTION,
      }),
    }),
  }),
});

export const {
  useGetMobileReleaseRunsQuery,
  useGetCurrentMobileVersionsQuery,
  useGetAndroidProductionStatusQuery,
  useGetIosTestflightStatusQuery,
  useGetIosTestflightHistoryQuery,
  useGetIosAppStoreReviewHistoryQuery,
  useTriggerMobileReleaseMutation,
  useTriggerAndroidPromotionMutation,
  useSubmitIosAppStoreReviewMutation,
  useLazyGetIosWhatsNewSuggestionQuery,
  useLazyGetAndroidWhatsNewSuggestionQuery,
} = mobileReleasesAPI;
