import { useGetSimulationCreditsQuery } from "@api";
import { Permissions } from "@constants";

import { useUser } from "./useUser";

export const useSimulationCredits = () => {
  const { user, permissions } = useUser();
  const canViewCredits = !!user && permissions.includes(Permissions.VIEW_SIMULATION_CREDITS);

  const { data: credits } = useGetSimulationCreditsQuery(user?.id, { skip: !canViewCredits });

  const limitReached =
    ((credits?.creditLimit ?? 0) - (credits?.consumedCredits ?? 0)) *
      (credits?.secondsAllowedPerCredit ?? 0) <
    20 * 60;

  const Creditpercentage = credits?.creditLimit
    ? credits.creditLimit > 0
      ? Math.round((credits.consumedCredits / credits.creditLimit) * 100)
      : 0
    : null;

  return {
    //data
    limitReached,
    Creditpercentage,

    credits,
  };
};
