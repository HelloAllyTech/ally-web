import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseAPI";

export type ChangelogEntry = {
  id: string;
  releaseNoteText: string;
  mergedAt: string;
};

type GetPublicChangelogResponse = { entries: ChangelogEntry[]; count: number };

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
  }),
});

export const { useGetPublicChangelogQuery } = changelogAPI;
