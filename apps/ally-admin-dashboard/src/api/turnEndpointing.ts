import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";

import { baseAPI } from "./baseApi";

type TurnEndpointingSettings = {
  turnMinEndpointingDelay: number;
  turnMaxEndpointingDelay: number;
};

export const turnEndpointingAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getTurnEndpointing: builder.query<TurnEndpointingSettings, void>({
      query: () => ({
        url: ApiEndpoints.SETTINGS.TURN_ENDPOINTING,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.SETTINGS],
    }),
    updateTurnEndpointing: builder.mutation<{ success: boolean }, TurnEndpointingSettings>({
      query: body => ({
        url: ApiEndpoints.SETTINGS.TURN_ENDPOINTING,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SETTINGS],
    }),
  }),
});

export const { useGetTurnEndpointingQuery, useUpdateTurnEndpointingMutation } = turnEndpointingAPI;
