import { useGetCurrentMobileVersionsQuery, useGetMobileReleaseRunsQuery } from "@api";

/**
 * How often the run-history list re-polls. Mirrors the interval useAwsLogs
 * uses for its "Live" toggle (LIVE_POLL_MS there is 5s, for a much
 * higher-volume log stream); this page has no toggle to turn polling off —
 * the scheduled pipeline runs only every ~2 days, so a background 30s poll
 * is cheap and there is no "off" state worth offering.
 */
const RUNS_POLL_MS = 30_000;

/**
 * Data-fetching for the super-duper-admin Mobile Releases page: the current
 * live App Store / Play Store versions, and the automated release pipeline's
 * recent GitHub Actions run history.
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

  return {
    runs: runs ?? [],
    isRunsLoading,
    isRunsFetching,
    isRunsError,
    versions,
    isVersionsLoading,
    isVersionsError,
  };
}
