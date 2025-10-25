import { useGetSimulationCreditsQuery } from "@api";

import { useUser } from "./useUser";

export const useSimulationCredits = () => {
  const { user } = useUser();
  const { data: credits } = useGetSimulationCreditsQuery(user?.id);

  const limitReached =
    ((credits?.creditLimit ?? 0) - (credits?.consumedCredits ?? 0)) *
      (credits?.secondsAllowedPerCredit ?? 0) <
    20 * 60;

  const Creditpercentage =
    credits?.creditLimit && credits.creditLimit > 0
      ? Math.round((credits.consumedCredits / credits.creditLimit) * 100)
      : 0;

  return {
    //data
    limitReached,
    Creditpercentage,

    credits,
  };
};
