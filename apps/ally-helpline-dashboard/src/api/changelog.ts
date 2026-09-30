import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseAPI";

export type ChangelogEntry = {
  id: string;
  releaseNoteText: string;
  mergedAt: string;
};

type GetPublicChangelogResponse = { entries: ChangelogEntry[]; count: number };

/** One UTC day of changed lines, summed across every Ally repo. */
export type CodeActivityDay = {
  date: string;
  added: number;
  deleted: number;
  /** added + deleted — what the heatmap colours by. */
  churn: number;
  /** True for today, which is still filling up. */
  partial: boolean;
};

export type CodeActivityResponse = {
  /** Every day from `from` to `until`, oldest first — zero days included. */
  days: CodeActivityDay[];
  from: string;
  until: string;
  today: string;
  earliestDate: string;
  hasOlder: boolean;
  /** Some repo could not be read, so the totals are lower than the truth. */
  incomplete: boolean;
  computedAt: string;
};

const changelogAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getPublicChangelog: builder.query<
      GetPublicChangelogResponse,
      { offset?: number; limit?: number } | void
    >({
      query: (params = {}) => ({
        url: ApiEndpoints.CHANGELOG.GET_PUBLIC,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
    }),
    getPublicCodeActivity: builder.query<CodeActivityResponse, { until?: string; days?: number }>({
      query: params => ({
        url: ApiEndpoints.CHANGELOG.GET_PUBLIC_CODE_ACTIVITY,
        method: HttpMethod.GET,
        params,
      }),
    }),
  }),
});

export const { useGetPublicChangelogQuery, useLazyGetPublicCodeActivityQuery } = changelogAPI;
