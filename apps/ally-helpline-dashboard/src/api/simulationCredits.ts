import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { SimulationCredits } from "@types";

import { baseAPI } from "./baseAPI";

const SimulationCreditsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getSimulationCredits: builder.query<SimulationCredits, number>({
      query: userId => ({
        url: `${ApiEndpoints.SIMULATION.SIMULATION_CREDITS}/${userId}`,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.SIMULATION_CREDITS],
    }),
  }),
});

export const { useGetSimulationCreditsQuery } = SimulationCreditsAPI;
