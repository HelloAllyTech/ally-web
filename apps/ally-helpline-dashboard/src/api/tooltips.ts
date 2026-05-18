import { ApiEndpoints, TAG_TYPES } from "@constants";
import { ActiveTooltip } from "@types";

import { baseAPI } from "./baseAPI";

const tooltipsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getActiveTooltips: builder.query<ActiveTooltip[], void>({
      query: () => ({ url: ApiEndpoints.TOOLTIPS.GET_ACTIVE_TOOLTIPS }),
      providesTags: [{ type: TAG_TYPES.TOOLTIPS, id: "ACTIVE" }],
    }),
  }),
});

export const { useGetActiveTooltipsQuery } = tooltipsAPI;
