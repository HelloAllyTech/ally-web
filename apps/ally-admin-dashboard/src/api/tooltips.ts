import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { ActiveTooltip, Tooltip } from "@types";

import { baseAPI } from "./baseApi";

type TooltipQuery = {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
};

type CreateTooltipRequest = {
  location: string;
  tipText: string;
  active: boolean;
};

type UpdateTooltipRequest = {
  location?: string;
  tipText?: string;
  active?: boolean;
};

export const tooltipsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getTooltips: builder.query<Tooltip[], TooltipQuery>({
      query: params => ({
        url: ApiEndpoints.TOOLTIPS.GET_TOOLTIPS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.TOOLTIPS],
    }),
    getActiveTooltips: builder.query<ActiveTooltip[], void>({
      query: () => ({
        url: ApiEndpoints.TOOLTIPS.GET_ACTIVE_TOOLTIPS,
        method: HttpMethod.GET,
      }),
      providesTags: [{ type: TAG_TYPES.TOOLTIPS, id: "ACTIVE" }],
    }),
    createTooltip: builder.mutation<Tooltip, CreateTooltipRequest>({
      query: body => ({
        url: ApiEndpoints.TOOLTIPS.CREATE_TOOLTIP,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.TOOLTIPS],
    }),
    updateTooltip: builder.mutation<boolean, { id: string; data: UpdateTooltipRequest }>({
      query: ({ id, data }) => ({
        url: ApiEndpoints.TOOLTIPS.UPDATE_TOOLTIP(id),
        method: HttpMethod.PATCH,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.TOOLTIPS],
    }),
  }),
});

export const {
  useGetTooltipsQuery,
  useGetActiveTooltipsQuery,
  useCreateTooltipMutation,
  useUpdateTooltipMutation,
} = tooltipsAPI;
