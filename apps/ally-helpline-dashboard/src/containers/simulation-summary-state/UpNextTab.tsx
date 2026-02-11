import { FC, useEffect } from "react";

import { logger } from "@ally-ui-mono/ui-shared/logger";
import { useLazyGetUpComingSimulationQuery } from "@api";
import { PermissionGuard } from "@components";
import { Permissions } from "@constants";

import { UpNextSimulationCard } from "./components";

interface UpNextTabProps {
  sessionId: string;
}

const EVENT_STATUS = {
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
};

const UpNextTab: FC<UpNextTabProps> = ({ sessionId }) => {
  const [getUpComingSimulation, { data: upComingSimulation }] = useLazyGetUpComingSimulationQuery();

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let upcomingPollCount = 0;
    const maxPolls = 5;

    const pollUpComingSimulation = async () => {
      try {
        const { data } = await getUpComingSimulation(sessionId);
        if (
          data?.currentSession?.eventStatus !== EVENT_STATUS.COMPLETED &&
          upcomingPollCount < maxPolls &&
          isMounted
        ) {
          upcomingPollCount++;
          timeoutId = setTimeout(pollUpComingSimulation, 3500);
        }
      } catch {
        logger.error("Polling error in upcoming simulation");
        if (isMounted && upcomingPollCount < maxPolls) {
          upcomingPollCount++;
          timeoutId = setTimeout(pollUpComingSimulation, 3500);
        }
      }
    };
    if (sessionId) pollUpComingSimulation();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [sessionId]);
  return (
    <div className="relative h-auto w-full overflow-auto border border-border-light pb-20 rounded-lg">
      {upComingSimulation?.currentSession?.eventStatus === "COMPLETED" && (
        <div className="text-typography-900 text-base font-semibold mb-[8px] border-b border-border-light p-2">
          Up Next
        </div>
      )}
      <PermissionGuard requiredPermissions={[Permissions.EDIT_SCENARIO_SESSION]}>
        <UpNextSimulationCard data={upComingSimulation} />
      </PermissionGuard>
    </div>
  );
};

export default UpNextTab;
