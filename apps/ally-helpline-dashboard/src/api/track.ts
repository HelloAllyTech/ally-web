import { ApiEndpoints } from "@constants";

import { baseAPI } from "./baseAPI";

export const trackAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    reevaluateProgress: builder.mutation<void, string>({
      query: (enrollmentId: string) => ({
        url: `${ApiEndpoints.LEARN.ENROLLMENTS}/${enrollmentId}/reevaluate-progress`,
        method: "POST",
      }),
      invalidatesTags: [
        (result, error, enrollmentId) => ({ type: "TrackDetail", id: enrollmentId }),
      ],
    }),
  }),
});

export const { useReevaluateProgressMutation } = trackAPI;
