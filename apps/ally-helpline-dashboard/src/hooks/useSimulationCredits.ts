import { useGetSimulationCreditsQuery } from "@api";

import { useUser } from "./useUser";

export const useSimulationCredits = () => {
  const { user } = useUser();

  const { data: credits } = useGetSimulationCreditsQuery(user?.id);

  return {
    credits,
  };
};
