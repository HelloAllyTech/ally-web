import { FC, useEffect } from "react";

import { logger } from "@ally-ui-mono/ui-shared/logger";
import { useLazyGetUpComingSimulationQuery } from "@api";
import { UpNextSimulationCard } from "@components";

interface UpNextTabProps {
  sessionId: string;
  pageType: string;
  metaData: {
    languageId?: number;
  };
}

const EVENT_STATUS = {
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
};

/**
 * Generic "up next" card for legacy pathway/case sessions. Track 2.0 sessions
 * never reach this tab — PostSimulationSummary routes them to a track-aware
 * breadcrumb + continue CTA instead, see useContinueTrack.
 */
export const UpNextTab: FC<UpNextTabProps> = ({ sessionId, pageType, metaData }) => {
  const [getUpComingSimulation, { data: upComingSimulation }] = useLazyGetUpComingSimulationQuery();

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let upcomingPollCount = 0;
    const maxPolls = 5;

    const pollUpComingSimulation = async () => {
      try {
        const { data } = await getUpComingSimulation({ sessionId, type: pageType });
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
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-y-auto rounded-lg border border-border-light pb-20">
      {upComingSimulation?.currentSession?.eventStatus === EVENT_STATUS.COMPLETED && (
        <div className="text-typography-900 text-base font-medium mb-2 border-b border-border-light p-3 font-primary mx-3">
          Up Next
        </div>
      )}
      <UpNextSimulationCard data={upComingSimulation} metaData={metaData} />
    </div>
  );
};
