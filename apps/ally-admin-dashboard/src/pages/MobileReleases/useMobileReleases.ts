import {
  useGetAndroidProductionStatusQuery,
  useGetCurrentMobileVersionsQuery,
  useGetIosAppStoreReviewHistoryQuery,
  useGetIosTestflightHistoryQuery,
  useGetIosTestflightStatusQuery,
  useGetMobileReleaseRunsQuery,
} from "@api";

/**
 * How often the run-history list re-polls. Mirrors the interval useAwsLogs
 * uses for its "Live" toggle (LIVE_POLL_MS there is 5s, for a much
 * higher-volume log stream); this page has no toggle to turn polling off —
 * the scheduled pipeline runs only every ~2 days, so a background 30s poll
 * is cheap and there is no "off" state worth offering.
 */
const RUNS_POLL_MS = 30_000;

/**
 * How often the two App Store Connect-backed queries re-poll. Deliberately much
 * slower than RUNS_POLL_MS: GitHub's API is cheap and this module already says
 * so in its own module doc comment, but Apple's isn't — ios-testflight-history
 * alone makes up to ~17 App Store Connect calls per request (1 app lookup + 1
 * build list + up to 15 per-build review-submission lookups), and that API key
 * is shared with the actual release pipeline (build uploads, TestFlight
 * submissions). At RUNS_POLL_MS a single open tab would burn roughly 2,000+
 * Apple API calls/hour for state that only meaningfully changes over hours,
 * not seconds — risking a rate-limit that breaks real releases, not just this
 * page. 5 minutes is still fast enough to notice a review outcome promptly.
 */
const TESTFLIGHT_POLL_MS = 5 * 60_000;

/**
 * Data-fetching for the super-duper-admin Mobile Releases page: the current
 * live App Store / Play Store versions, the automated release pipeline's
 * recent GitHub Actions run history, the current iOS build's live TestFlight
 * state, and past iOS builds' TestFlight submission history.
 */
export function useMobileReleases() {
  const {
    data: runs,
    isLoading: isRunsLoading,
    isFetching: isRunsFetching,
    isError: isRunsError,
  } = useGetMobileReleaseRunsQuery(undefined, { pollingInterval: RUNS_POLL_MS });

  const {
    data: versions,
    isLoading: isVersionsLoading,
    isError: isVersionsError,
  } = useGetCurrentMobileVersionsQuery();

  // TESTFLIGHT_POLL_MS, not RUNS_POLL_MS — see that constant's doc comment.
  const {
    data: testflightStatus,
    isLoading: isTestflightStatusLoading,
    isError: isTestflightStatusError,
  } = useGetIosTestflightStatusQuery(undefined, { pollingInterval: TESTFLIGHT_POLL_MS });

  // TESTFLIGHT_POLL_MS, not RUNS_POLL_MS — see that constant's doc comment.
  const {
    data: testflightHistory,
    isLoading: isTestflightHistoryLoading,
    isError: isTestflightHistoryError,
  } = useGetIosTestflightHistoryQuery(undefined, { pollingInterval: TESTFLIGHT_POLL_MS });

  // Same App Store Connect-backed cadence as the two queries above — this is
  // a separate resource (reviewSubmissions) from TestFlight's
  // betaAppReviewSubmissions, so it needs its own query, but it's cheap (2
  // Apple API calls, no per-build fan-out) so TESTFLIGHT_POLL_MS is generous
  // for it, not a bottleneck.
  const {
    data: appStoreReviewHistory,
    isLoading: isAppStoreReviewHistoryLoading,
    isError: isAppStoreReviewHistoryError,
  } = useGetIosAppStoreReviewHistoryQuery(undefined, { pollingInterval: TESTFLIGHT_POLL_MS });

  // Same "be gentle with an external API" reasoning as TESTFLIGHT_POLL_MS above — this fans out
  // to insert/get/delete calls against the Play Developer API each time, sharing that quota with
  // the actual release pipeline (builds, promotions).
  const {
    data: androidProductionStatus,
    isLoading: isAndroidProductionStatusLoading,
    isError: isAndroidProductionStatusError,
  } = useGetAndroidProductionStatusQuery(undefined, { pollingInterval: TESTFLIGHT_POLL_MS });

  return {
    runs: runs ?? [],
    isRunsLoading,
    isRunsFetching,
    isRunsError,
    versions,
    isVersionsLoading,
    isVersionsError,
    testflightStatus,
    isTestflightStatusLoading,
    isTestflightStatusError,
    testflightHistory: testflightHistory ?? [],
    isTestflightHistoryLoading,
    isTestflightHistoryError,
    appStoreReviewHistory: appStoreReviewHistory ?? [],
    isAppStoreReviewHistoryLoading,
    isAppStoreReviewHistoryError,
    androidProductionStatus,
    isAndroidProductionStatusLoading,
    isAndroidProductionStatusError,
  };
}
