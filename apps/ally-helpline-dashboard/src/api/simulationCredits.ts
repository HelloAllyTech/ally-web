import { ApiEndpoints, HttpMethod } from "@constants";
import { SimulationCredits } from "@types";

import { baseAPI } from "./baseAPI";

const SimulationCreditsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getSimulationCredits: builder.query<SimulationCredits, number>({
      query: () => ({
        url: ApiEndpoints.SIMULATION.SIMULATION_CREDITS,
        method: HttpMethod.GET,
      }),
    }),
  }),
});

export const { useGetSimulationCreditsQuery } = SimulationCreditsAPI;
