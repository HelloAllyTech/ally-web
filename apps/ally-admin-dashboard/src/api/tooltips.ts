import { baseAPI } from "./baseApi";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  Tooltip,
  GetTooltipsRequest,
  CreateTooltipRequest,
  UpdateTooltipRequest,
} from "@types";

const tooltipsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getTooltips: builder.query<Tooltip[], GetTooltipsRequest>({
      query: params => ({
        url: ApiEndpoints.TOOLTIPS.GET_TOOLTIPS,
        params,
      }),
      providesTags: [TAG_TYPES.TOOLTIPS],
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
  useCreateTooltipMutation,
  useUpdateTooltipMutation,
} = tooltipsAPI;
