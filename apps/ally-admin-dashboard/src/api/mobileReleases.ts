import { baseAPI } from "@api";
import { ApiEndpoints } from "@constants";
import { CurrentMobileVersionsResponse, MobileReleaseRun } from "@types";

const mobileReleasesAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getMobileReleaseRuns: builder.query<MobileReleaseRun[], void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.RUNS,
      }),
    }),

    getCurrentMobileVersions: builder.query<CurrentMobileVersionsResponse, void>({
      query: () => ({
        url: ApiEndpoints.MOBILE_RELEASES.CURRENT_VERSION,
      }),
    }),
  }),
});

export const { useGetMobileReleaseRunsQuery, useGetCurrentMobileVersionsQuery } = mobileReleasesAPI;
