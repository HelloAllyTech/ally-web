import { baseAPI } from "@/api/baseAPI";

const nudgesStatusAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getNudgeStatus: builder.query<boolean, void>({
      query: () => "/settings/nudge-status",
    }),
  }),
});

export const { useGetNudgeStatusQuery } = nudgesStatusAPI;
